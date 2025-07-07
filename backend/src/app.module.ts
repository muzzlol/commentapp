import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CommentModule } from './comment/comment.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    PrismaModule, 
    AuthModule, 
    CommentModule, 
    NotificationModule
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
