import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCommentDto, EditCommentDto, FindRepliesDto } from './comment.dto';
import { Comment } from 'generated/prisma';

type CommentWithDetails = Comment & {
  author: { id: string; email: string; pfpUrl: string | null };
  _count?: { replies: number };
  replies?: CommentWithDetails[];
};

type FormattedComment = {
  id: string;
  content: string;
  author: { id: string; email: string; pfpUrl: string | null };
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
  replyCount: number;
  replies: FormattedComment[];
  hasMoreReplies: boolean;
};

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCommentDto: CreateCommentDto, authorId: string) {
    const { content, parentId } = createCommentDto;
    return this.prisma.comment.create({
      data: {
        content,
        authorId,
        parentId,
      },
    });
  }

  async findTopLevel() {
    const topLevelComments = await this.prisma.comment.findMany({
      where: { parentId: null, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, email: true, pfpUrl: true } },
        _count: { select: { replies: true } },
        replies: {
          take: 2, // Include a sample of 2 replies (prisma optimizes this to be a few queries not N+1)
          orderBy: { createdAt: 'asc' },
          where: { deletedAt: null },
          include: {
            author: { select: { id: true, email: true, pfpUrl: true } },
            _count: { select: { replies: true } },
          },
        },
      },
    });

    return topLevelComments.map((comment: CommentWithDetails) =>
      this.formatComment(comment),
    );
  }

  async findReplies(parentId: string, findRepliesDto: FindRepliesDto) {
    const { offset, limit } = findRepliesDto;

    const replies = await this.prisma.comment.findMany({
      where: { parentId: parentId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      skip: offset,
      take: limit,
      include: {
        author: { select: { id: true, email: true, pfpUrl: true } },
        _count: { select: { replies: true } },
      },
    });

    return replies.map((reply: CommentWithDetails) => this.formatComment(reply));
  }

  private formatComment(comment: CommentWithDetails): FormattedComment {
    const replyCount = comment._count?.replies ?? 0;
    const formattedReplies =
      comment.replies?.map((r) => this.formatComment(r)) ?? [];

    const { _count, ...rest } = comment;

    return {
      ...rest,
      replies: formattedReplies,
      replyCount: replyCount,
      hasMoreReplies: replyCount > formattedReplies.length,
    };
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