import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type NotificationWithSender = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  sender: {
    id: string;
    email: string;
    pfpUrl: string | null;
  };
  comment: {
    id: string;
    content: string;
  };
};

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createReplyNotification(
    recipientId: string,
    senderId: string,
    commentId: string,
    senderEmail: string,
  ) {
    // Don't create notification if user is replying to their own comment
    if (recipientId === senderId) {
      return null;
    }

    const message = `${senderEmail} replied to your comment`;

    return this.prisma.notification.create({
      data: {
        type: 'reply',
        message,
        recipientId,
        senderId,
        commentId,
      },
    });
  }

  async getNotificationsForUser(userId: string): Promise<NotificationWithSender[]> {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            pfpUrl: true,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
          },
        },
      },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId: userId, // Ensure user can only mark their own notifications as read
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }
} 