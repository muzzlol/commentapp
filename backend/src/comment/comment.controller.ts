import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommentService, FormattedComment } from './comment.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateCommentDto, EditCommentDto, FindRepliesDto } from './comment.dto';
import { Comment } from '@prisma/client';
import { User } from 'src/auth/user.decorator';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createCommentDto: CreateCommentDto,
    @User() user: { id: string },
  ) {
    return this.commentService.create(createCommentDto, user.id);
  }

  @Get()
  findTopLevel(): Promise<FormattedComment[]> {
    return this.commentService.findTopLevel();
  }

  @Get(':parentId/replies')
  findReplies(
    @Param('parentId', ParseUUIDPipe) parentId: string,
    @Query() findRepliesDto: FindRepliesDto,
  ): Promise<FormattedComment[]> {
    return this.commentService.findReplies(parentId, findRepliesDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':commentId')
  update(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() editCommentDto: EditCommentDto,
    @User() user: { id: string },
  ): Promise<Comment> {
    return this.commentService.update(commentId, user.id, editCommentDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @User() user: { id: string },
  ): Promise<Comment> {
    return this.commentService.softDelete(commentId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':commentId/restore')
  restore(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @User() user: { id: string },
  ): Promise<Comment> {
    return this.commentService.restore(commentId, user.id);
  }
}