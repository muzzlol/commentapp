import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCommentDto, EditCommentDto, FindThreadsDto } from './comment.dto';
import { Comment } from '@prisma/client';
import { NotificationService } from 'src/notification/notification.service';

export type BasicComment = {
  id: string;
  content: string;
  author: { id: string; email: string; pfpUrl: string | null };
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type CommentNode = {
  comment: BasicComment;
  replies: CommentNode[];
};

export type ThreadsResponse = {
  comments: CommentNode[];
  info: {
    count: number;
    count_left: number;
    last_comment: string | null;
  };
};

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createCommentDto: CreateCommentDto, authorId: string) {
    const { content, parentId } = createCommentDto;
    
    const comment = await this.prisma.comment.create({
      data: {
        content,
        authorId,
        parentId,
      },
      include: {
        author: {
          select: {
            email: true,
          },
        },
      },
    });

    // If this is a reply (has parentId), create a notification for the parent comment's author
    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
        select: { authorId: true },
      });

      if (parentComment) {
        await this.notificationService.createReplyNotification(
          parentComment.authorId,
          authorId,
          comment.id,
          comment.author.email,
        );
      }
    }

    return comment;
  }

  async findThreads(dto: FindThreadsDto): Promise<ThreadsResponse> {
    const { limit, offset_id } = dto;

    //  for paging
    let cursorFilter = {};
    if (offset_id) {
      const offsetComment = await this.prisma.comment.findUnique({ where: { id: offset_id } });
      if (offsetComment) {
        cursorFilter = { createdAt: { gt: offsetComment.createdAt } };
      }
    }

    // fetch potential top-level roots in creation order
    const topLevels = await this.prisma.comment.findMany({
      where: { parentId: null, deletedAt: null, ...cursorFilter },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    const resultThreads: CommentNode[] = [];
    let runningTotal = 0;

    for (const tl of topLevels) {
      const { node, size } = await this.buildThread(tl.id);

      if (node && (runningTotal + size <= limit || resultThreads.length === 0)) {
        resultThreads.push(node);
        runningTotal += size;
        if (runningTotal >= limit) break;           // exceeded due to first thread
      } else if (node) {
        break;                                      // next thread would overflow
      }
    }

    // overall counts (soft-deleted excluded)
    const totalCount = await this.prisma.comment.count({ where: { deletedAt: null } });

    return {
      comments: resultThreads,
      info: {
        count: totalCount,
        count_left: totalCount - runningTotal,
        last_comment: resultThreads.at(-1)?.comment.id ?? null,
      },
    };
  }

  private async buildThread(rootId: string): Promise<{ node: CommentNode | null; size: number }> {
    const flatComments = await this.fetchThreadWithDescendants(rootId);
    
    // This case should not be hit if called from findThreads (which filters for non-deleted
    // roots), but serves as a defensive check.
    if (flatComments.length === 0) {
      return { node: null, size: 0 };
    }
    
    const { roots, size } = this.buildTreeFromFlatList(flatComments);
    
    // The CTE guarantees we only get descendants of rootId, so there will be one root.
    return { node: roots[0], size };
  }

  private async fetchThreadWithDescendants(rootId: string): Promise<(BasicComment & { parentId: string | null })[]> {
    const results: any[] = await this.prisma.$queryRaw`
      WITH RECURSIVE "CommentTree" AS (
        -- Anchor: Select the root comment
        SELECT 
          c."id", c."content", c."createdAt", c."updatedAt", c."deletedAt", c."authorId", c."parentId",
          u."email", u."pfpUrl"
        FROM "comments" c
        JOIN "users" u ON c."authorId" = u."id"
        WHERE c.id = ${rootId} AND c."deletedAt" IS NULL

        UNION ALL

        -- Recursive: Select replies to comments in the tree
        SELECT 
          c."id", c."content", c."createdAt", c."updatedAt", c."deletedAt", c."authorId", c."parentId",
          u."email", u."pfpUrl"
        FROM "comments" c
        JOIN "users" u ON c."authorId" = u."id"
        JOIN "CommentTree" ct ON c."parentId" = ct.id
        WHERE c."deletedAt" IS NULL
      )
      SELECT * FROM "CommentTree" ORDER BY "createdAt" ASC;
    `;
    
    // Format the raw SQL result into our BasicComment type
    return results.map(r => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      deletedAt: r.deletedAt,
      parentId: r.parentId,
      author: {
        id: r.authorId,
        email: r.email,
        pfpUrl: r.pfpUrl,
      },
    }));
  }
  
  private buildTreeFromFlatList(comments: (BasicComment & { parentId: string | null })[]): { roots: CommentNode[], size: number } {
    const nodeMap = new Map<string, CommentNode>();
    const rootNodes: CommentNode[] = [];

    // First pass: create a node for each comment and store it in a map
    for (const c of comments) {
      const node: CommentNode = { comment: c, replies: [] };
      nodeMap.set(c.id, node);
    }

    // Second pass: link nodes to their parents
    for (const c of comments) {
      const node = nodeMap.get(c.id)!;
      if (c.parentId && nodeMap.has(c.parentId)) {
        nodeMap.get(c.parentId)!.replies.push(node);
      } else {
        rootNodes.push(node); // This is a top-level comment in the list
      }
    }
    
    return { roots: rootNodes, size: comments.length };
  }

  async update(
    commentId: string,
    userId: string,
    editCommentDto: EditCommentDto,
  ) {
    const comment = await this.findCommentForUpdate(commentId, userId);

    // Rule: User can only edit within 15 minutes of creation.
    const fifteenMinutes = 15 * 60 * 1000;
    if (new Date().getTime() - comment.createdAt.getTime() > fifteenMinutes) {
      throw new ForbiddenException(
        'You can no longer edit this comment.',
      );
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content: editCommentDto.content },
    });
  }

  async softDelete(commentId: string, userId: string) {
    await this.findCommentForUpdate(commentId, userId);

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }

  async restore(commentId: string, userId: string) {
    const comment = await this.findCommentForUpdate(commentId, userId);

    if (!comment.deletedAt) {
      throw new ForbiddenException('This comment has not been deleted.');
    }

    // Rule: User can only restore within 15 minutes of deletion.
    const fifteenMinutes = 15 * 60 * 1000;
    if (new Date().getTime() - comment.deletedAt.getTime() > fifteenMinutes) {
      throw new ForbiddenException(
        'The 15-minute grace period for restoring this comment has passed.',
      );
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: null },
    });
  }

  private async findCommentForUpdate(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You are not the author of this comment.');
    }

    return comment;
  }
}