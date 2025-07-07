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
import { CommentService, ThreadsResponse } from './comment.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateCommentDto, EditCommentDto, FindThreadsDto } from './comment.dto';
import { Comment } from '@prisma/client';
import { User } from 'src/auth/user.decorator';
import { seedComments } from './seed';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('comment')
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createCommentDto: CreateCommentDto,
    @User() user: { id: string },
  ) {
    return this.commentService.create(createCommentDto, user.id);
  }

  @Get()
  findThreads(@Query() dto: FindThreadsDto): Promise<ThreadsResponse> {
    return this.commentService.findThreads(dto);
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

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seed() {
    return seedComments(this.prisma);
  }
}