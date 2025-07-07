import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommentService } from './comment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

// Mock types for cleaner testing
type MockPrismaService = {
  comment: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  $queryRaw: jest.Mock;
};

type MockNotificationService = {
  createReplyNotification: jest.Mock;
};

describe('CommentService', () => {
  let service: CommentService;
  let prismaService: MockPrismaService;
  let notificationService: MockNotificationService;

  const mockUser = { id: 'user-1', email: 'test@example.com', pfpUrl: null };
  const mockComment = {
    id: 'comment-1',
    content: 'Test comment',
    authorId: 'user-1',
    parentId: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
    author: mockUser,
  };

  beforeEach(async () => {
    const mockPrismaService: MockPrismaService = {
      comment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const mockNotificationService: MockNotificationService = {
      createReplyNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
    prismaService = module.get(PrismaService) as MockPrismaService;
    notificationService = module.get(NotificationService) as MockNotificationService;
  });

  describe('create', () => {
    it('should create a top-level comment', async () => {
      const createDto = { content: 'Test comment' };
      
      prismaService.comment.create.mockResolvedValue(mockComment);

      const result = await service.create(createDto, 'user-1');

      expect(prismaService.comment.create).toHaveBeenCalledWith({
        data: {
          content: 'Test comment',
          authorId: 'user-1',
          parentId: undefined,
        },
        include: {
          author: { select: { email: true } },
        },
      });
      expect(result).toEqual(mockComment);
      expect(notificationService.createReplyNotification).not.toHaveBeenCalled();
    });

    it('should create a reply and send notification', async () => {
      const createDto = { content: 'Test reply', parentId: 'parent-comment-1' };
      const replyComment = { ...mockComment, parentId: 'parent-comment-1' };
      const parentComment = { authorId: 'parent-author-1' };

      prismaService.comment.create.mockResolvedValue(replyComment);
      prismaService.comment.findUnique.mockResolvedValue(parentComment);

      await service.create(createDto, 'user-1');

      expect(prismaService.comment.findUnique).toHaveBeenCalledWith({
        where: { id: 'parent-comment-1' },
        select: { authorId: true },
      });
      expect(notificationService.createReplyNotification).toHaveBeenCalledWith(
        'parent-author-1',
        'user-1',
        replyComment.id,
        replyComment.author.email,
      );
    });
  });

  describe('findThreads', () => {
    it('should return paginated threads with metadata', async () => {
      const dto = { limit: 10 };
      const topLevelComments = [{ id: 'comment-1' }, { id: 'comment-2' }];
      
      prismaService.comment.findMany.mockResolvedValue(topLevelComments);
      prismaService.comment.count.mockResolvedValue(50);
      
      // Mock the recursive CTE query
      prismaService.$queryRaw.mockImplementation((template: any, ...values: any[]) => {
        const rootId = values[0]; // The ID passed to the query
        
        if (rootId === 'comment-1') {
          return Promise.resolve([
            {
              id: 'comment-1',
              content: 'First comment',
              createdAt: new Date('2025-01-01'),
              updatedAt: new Date('2025-01-01'),
              deletedAt: null,
              authorId: 'user-1',
              parentId: null,
              email: 'test@example.com',
              pfpUrl: null,
            },
          ]);
        }
        
        // For any other ID (e.g., 'comment-2' in this test), return nothing.
        return Promise.resolve([]);
      });

      const result = await service.findThreads(dto);

      expect(result.comments).toHaveLength(1);
      expect(result.info.count).toBe(50);
      expect(result.info.last_comment).toBe('comment-1');
    });

    it('should respect the limit and first-thread exception', async () => {
      const dto = { limit: 1 };
      const topLevelComments = [{ id: 'comment-1' }];
      
      prismaService.comment.findMany.mockResolvedValue(topLevelComments);
      prismaService.comment.count.mockResolvedValue(10);
      
      // Mock a thread with 3 comments (exceeds limit of 1)
      prismaService.$queryRaw.mockResolvedValue([
        { 
          id: 'comment-1', 
          parentId: null, 
          content: 'Root', 
          authorId: 'user-1', 
          email: 'test@example.com', 
          pfpUrl: null, 
          createdAt: new Date(), 
          updatedAt: new Date(), 
          deletedAt: null 
        },
        { 
          id: 'reply-1', 
          parentId: 'comment-1', 
          content: 'Reply 1', 
          authorId: 'user-2', 
          email: 'test2@example.com', 
          pfpUrl: null, 
          createdAt: new Date(), 
          updatedAt: new Date(), 
          deletedAt: null 
        },
        { 
          id: 'reply-2', 
          parentId: 'comment-1', 
          content: 'Reply 2', 
          authorId: 'user-3', 
          email: 'test3@example.com', 
          pfpUrl: null, 
          createdAt: new Date(), 
          updatedAt: new Date(), 
          deletedAt: null 
        },
      ]);

      const result = await service.findThreads(dto);

      // Should include first thread even though it exceeds limit
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].replies).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update comment within 15 minutes', async () => {
      const recentComment = {
        ...mockComment,
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      };
      const editDto = { content: 'Updated content' };

      prismaService.comment.findUnique.mockResolvedValue(recentComment);
      prismaService.comment.update.mockResolvedValue({ ...recentComment, content: 'Updated content' });

      await service.update('comment-1', 'user-1', editDto);

      expect(prismaService.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { content: 'Updated content' },
      });
    });

    it('should throw error when editing after 15 minutes', async () => {
      const oldComment = {
        ...mockComment,
        createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      };

      prismaService.comment.findUnique.mockResolvedValue(oldComment);

      await expect(
        service.update('comment-1', 'user-1', { content: 'Updated' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error when user is not the author', async () => {
      prismaService.comment.findUnique.mockResolvedValue(mockComment);

      await expect(
        service.update('comment-1', 'different-user', { content: 'Updated' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a comment', async () => {
      prismaService.comment.findUnique.mockResolvedValue(mockComment);
      prismaService.comment.update.mockResolvedValue({ ...mockComment, deletedAt: new Date() });

      await service.softDelete('comment-1', 'user-1');

      expect(prismaService.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw error when comment not found', async () => {
      prismaService.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.softDelete('comment-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should restore deleted comment within 15 minutes', async () => {
      const deletedComment = {
        ...mockComment,
        deletedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      };

      prismaService.comment.findUnique.mockResolvedValue(deletedComment);
      prismaService.comment.update.mockResolvedValue({ ...deletedComment, deletedAt: null });

      await service.restore('comment-1', 'user-1');

      expect(prismaService.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { deletedAt: null },
      });
    });

    it('should throw error when restoring after 15 minutes', async () => {
      const deletedComment = {
        ...mockComment,
        deletedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      };

      prismaService.comment.findUnique.mockResolvedValue(deletedComment);

      await expect(
        service.restore('comment-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error when comment is not deleted', async () => {
      prismaService.comment.findUnique.mockResolvedValue(mockComment); // not deleted

      await expect(
        service.restore('comment-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('buildTreeFromFlatList', () => {
    it('should build nested tree from flat comment list', () => {
      const flatComments = [
        {
          id: 'comment-1',
          content: 'Root comment',
          parentId: null,
          author: mockUser,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 'reply-1',
          content: 'First reply',
          parentId: 'comment-1',
          author: mockUser,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 'reply-2',
          content: 'Second reply',
          parentId: 'comment-1',
          author: mockUser,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      // Access the private method for testing
      const result = (service as any).buildTreeFromFlatList(flatComments);

      expect(result.roots).toHaveLength(1);
      expect(result.roots[0].comment.id).toBe('comment-1');
      expect(result.roots[0].replies).toHaveLength(2);
      expect(result.size).toBe(3);
    });
  });
}); 