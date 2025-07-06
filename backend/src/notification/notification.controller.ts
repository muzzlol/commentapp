import {
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Post,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/auth/user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getNotifications(@User() user: { id: string }) {
    return this.notificationService.getNotificationsForUser(user.id);
  }

  @Get('unread-count')
  getUnreadCount(@User() user: { id: string }) {
    return this.notificationService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @User() user: { id: string },
  ) {
    return this.notificationService.markAsRead(notificationId, user.id);
  }

  @Post('mark-all-read')
  markAllAsRead(@User() user: { id: string }) {
    return this.notificationService.markAllAsRead(user.id);
  }
} 