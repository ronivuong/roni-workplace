import { PrismaClient } from "@prisma/client";
import { buildPublishedUrl } from "../src/lib/publish-url";

const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.content.findMany({
    where: { status: "PUBLISHED" },
  });
  const conns = await prisma.platformConnection.findMany();
  const map = Object.fromEntries(conns.map((c) => [c.platform, c]));
  let n = 0;
  for (const p of posts) {
    if (p.publishedUrl) continue;
    const conn = map[p.platform || ""] || null;
    let config: Record<string, string> | null = null;
    try {
      config = conn?.config ? JSON.parse(conn.config) : null;
    } catch {
      config = null;
    }
    const url = buildPublishedUrl({
      contentId: p.id,
      title: p.title,
      platform: p.platform,
      accountId: conn?.accountId,
      accountName: conn?.accountName,
      config,
    });
    await prisma.content.update({
      where: { id: p.id },
      data: { publishedUrl: url },
    });
    n++;
    console.log(" +", p.title.slice(0, 40), "→", url);
  }
  console.log("backfilled", n, "of", posts.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
