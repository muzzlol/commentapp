import { PrismaService } from '../prisma/prisma.service';

export async function seedComments(prisma: PrismaService) {
  // Create sample users first
  const user1 = await prisma.user.upsert({
    where: { email: 'alpha@example.com' },
    update: {},
    create: {
      email: 'alpha@example.com',
      passwordHash: 'dummy_hash_1',
      pfpUrl: null,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'beta@example.com' },
    update: {},
    create: {
      email: 'beta@example.com',
      passwordHash: 'dummy_hash_2',
      pfpUrl: null,
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'gamma@example.com' },
    update: {},
    create: {
      email: 'gamma@example.com',
      passwordHash: 'dummy_hash_3',
      pfpUrl: null,
    },
  });

  // Create sample comments with threading
  const time1 = new Date(Date.now() - 3600000); // 1 hour ago
  const comment1 = await prisma.comment.create({
    data: {
      content: 'top-level comment.',
      authorId: user1.id,
      createdAt: time1,
      updatedAt: time1,
    },
  });

  const time2 = new Date(Date.now() - 3000000); // 50 minutes ago
  const reply1 = await prisma.comment.create({
    data: {
      content: 'This is a child comment.',
      authorId: user2.id,
      parentId: comment1.id,
      createdAt: time2,
      updatedAt: time2,
    },
  });

  const time3 = new Date(Date.now() - 2400000); // 40 minutes ago
  const reply2 = await prisma.comment.create({
    data: {
      content: 'grandchild comment - reply to the child comment',
      authorId: user3.id,
      parentId: reply1.id,
      createdAt: time3,
      updatedAt: time3,
    },
  });

  const time4 = new Date(Date.now() - 2100000); // 35 minutes ago
  const reply3 = await prisma.comment.create({
    data: {
      content: 'Another child comment under the same parent.',
      authorId: user1.id,
      parentId: comment1.id,
      createdAt: time4,
      updatedAt: time4,
    },
  });

  const time5 = new Date(Date.now() - 1800000); // 30 minutes ago
  const comment2 = await prisma.comment.create({
    data: {
      content: 'Second top-level comment starting a new thread.',
      authorId: user2.id,
      createdAt: time5,
      updatedAt: time5,
    },
  });

  const time6 = new Date(Date.now() - 1500000); // 25 minutes ago
  const reply4 = await prisma.comment.create({
    data: {
      content: 'child comment under the second thread.',
      authorId: user3.id,
      parentId: comment2.id,
      createdAt: time6,
      updatedAt: time6,
    },
  });

  const time7 = new Date(Date.now() - 1200000); // 20 minutes ago
  const reply5 = await prisma.comment.create({
    data: {
      content: 'grandchild comment in the second thread.',
      authorId: user1.id,
      parentId: reply4.id,
      createdAt: time7,
      updatedAt: time7,
    },
  });

  const time8 = new Date(Date.now() - 900000); // 15 minutes ago
  const comment3 = await prisma.comment.create({
    data: {
      content: 'top-level comment 3.',
      authorId: user3.id,
      createdAt: time8,
      updatedAt: time8,
    },
  });

  const time9 = new Date(Date.now() - 600000); // 10 minutes ago
  const comment4 = await prisma.comment.create({
    data: {
      content: 'YOU CAN TEST OUT THE POST/REPLY/EDIT/DELETE FUNCTIONALITY WITH YOUR OWN COMMENTS. SIGNUP if you have not already.',
      authorId: user1.id,
      createdAt: time9,
      updatedAt: time9,
    },
  });

  const time10 = new Date(Date.now() - 300000); // 5 minutes ago
  const reply6 = await prisma.comment.create({
    data: {
      content: 'child comment under the third thread.',
      authorId: user2.id,
      parentId: comment3.id,
      createdAt: time10,
      updatedAt: time10,
    },
  });

  return {
    message: 'Sample comments created successfully!',
    counts: {
      users: 3,
      comments: 10,
      threads: 4,
    },
  };
} 