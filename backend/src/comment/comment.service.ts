import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCommentDto, FindRepliesDto } from './comment.dto';
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
}