import { prisma } from "@/lib/prisma";

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function notifyUsers(
  userIds: string[],
  payload: Omit<Parameters<typeof createNotification>[0], "userId">
) {
  return Promise.all(userIds.map((userId) => createNotification({ ...payload, userId })));
}
