import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
/** Vercel serverless max — keep short so stream doesn't hang for 5 min */
export const maxDuration = 25;

/**
 * Lightweight SSE: send current unread snapshot then close.
 * Client uses React Query polling as primary; SSE is optional boost.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  const payload = `data: ${JSON.stringify({
    type: "init",
    notifications,
    unreadCount,
  })}\n\n`;

  return new Response(payload, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
