import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCommentDto, FindRepliesDto } from './comment.dto';
import { Comment, User } from 'generated/prisma';


type CommentWithDetails = Comment & {
  author: { id: string, email: string, pfpUrl: string }
  _count: { replies: number }
}
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
      },
    });

    return topLevelComments.map((comment: any) => this.formatComment(comment));
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

    return replies.map((reply: any) => this.formatComment(reply));
  }

  private formatComment(comment: CommentWithDetails) {
    const { _count, ...rest } = comment;
    return {
      ...rest,
      replyCount: _count.replies,
    }
  }
}