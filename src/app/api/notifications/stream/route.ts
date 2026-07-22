import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream for realtime notifications.
 * Polls DB every 5s and pushes unread count + latest notifications.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  let lastCheck = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Initial payload
      const initial = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });
      send({ type: "init", notifications: initial, unreadCount });

      const interval = setInterval(async () => {
        try {
          const fresh = await prisma.notification.findMany({
            where: {
              userId,
              createdAt: { gt: lastCheck },
            },
            orderBy: { createdAt: "asc" },
          });
          lastCheck = new Date();

          if (fresh.length) {
            const count = await prisma.notification.count({
              where: { userId, isRead: false },
            });
            send({ type: "new", notifications: fresh, unreadCount: count });
          } else {
            // heartbeat
            send({ type: "ping", ts: Date.now() });
          }
        } catch {
          // ignore transient errors
        }
      }, 5000);

      // cleanup after 5 minutes max per connection
      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 5 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
