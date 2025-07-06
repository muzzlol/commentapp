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
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { CommentService } from './comment.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateCommentDto, EditCommentDto, FindRepliesDto } from './comment.dto';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: ExpressRequest,
  ) {
    const authorId = (req.user as any).id;
    return this.commentService.create(createCommentDto, authorId);
  }

  @Get()
  findTopLevel() {
    return this.commentService.findTopLevel();
  }

  @Get(':parentId/replies')
  findReplies(
    @Param('parentId', ParseUUIDPipe) parentId: string,
    @Query() findRepliesDto: FindRepliesDto,
  ) {
    return this.commentService.findReplies(parentId, findRepliesDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':commentId')
  update(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() editCommentDto: EditCommentDto,
    @Request() req: ExpressRequest,
  ) {
    const userId = (req.user as any).id;
    return this.commentService.update(commentId, userId, editCommentDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Request() req: ExpressRequest,
  ) {
    const userId = (req.user as any).id;
    return this.commentService.softDelete(commentId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':commentId/restore')
  restore(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Request() req: ExpressRequest,
  ) {
    const userId = (req.user as any).id;
    return this.commentService.restore(commentId, userId);
  }
}