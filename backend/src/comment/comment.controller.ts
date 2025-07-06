import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { CommentService } from './comment.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateCommentDto, FindRepliesDto } from './comment.dto';

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
}