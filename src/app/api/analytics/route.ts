import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const PLATFORM_META: Record<
  string,
  { label: string; color: string; accent: string }
> = {
  tiktok: { label: "TikTok", color: "#000000", accent: "#25F4EE" },
  instagram: { label: "Instagram", color: "#E4405F", accent: "#F77737" },
  facebook: { label: "Facebook", color: "#1877F2", accent: "#42B72A" },
  youtube: { label: "YouTube", color: "#FF0000", accent: "#282828" },
  wordpress: { label: "WordPress", color: "#21759B", accent: "#464646" },
  blog: { label: "Blog", color: "#10B981", accent: "#059669" },
  threads: { label: "Threads", color: "#000000", accent: "#808080" },
  social: { label: "Social khác", color: "#6366F1", accent: "#818CF8" },
};

function normalizePlatform(p: string | null | undefined) {
  const key = (p || "other").toLowerCase().trim();
  if (key === "blog" || key === "wordpress") return key;
  if (PLATFORM_META[key]) return key;
  if (!p) return "other";
  return key;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    const contents = await prisma.content.findMany({
      where: role === "AGENT" ? { authorId: session.user.id } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        author: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, color: true } },
      },
    });

    const connections = await prisma.platformConnection.findMany();
    const connMap = Object.fromEntries(connections.map((c) => [c.platform, c]));

    // Overall
    const overall = contents.reduce(
      (acc, c) => {
        acc.views += c.views;
        acc.likes += c.likes;
        acc.shares += c.shares;
        acc.total += 1;
        if (c.status === "PUBLISHED") acc.published += 1;
        if (c.status === "DRAFT") acc.draft += 1;
        if (c.status === "IN_REVIEW") acc.inReview += 1;
        if (c.status === "SCHEDULED") acc.scheduled += 1;
        if (c.status === "APPROVED") acc.approved += 1;
        return acc;
      },
      {
        views: 0,
        likes: 0,
        shares: 0,
        total: 0,
        published: 0,
        draft: 0,
        inReview: 0,
        scheduled: 0,
        approved: 0,
      }
    );

    const engagementRate =
      overall.views > 0
        ? Number((((overall.likes + overall.shares) / overall.views) * 100).toFixed(2))
        : 0;

    // Group by platform
    const byPlatform = new Map<
      string,
      {
        platform: string;
        views: number;
        likes: number;
        shares: number;
        total: number;
        published: number;
        draft: number;
        inReview: number;
        scheduled: number;
        approved: number;
        rejected: number;
        contents: typeof contents;
      }
    >();

    for (const c of contents) {
      const key = normalizePlatform(c.platform);
      if (!byPlatform.has(key)) {
        byPlatform.set(key, {
          platform: key,
          views: 0,
          likes: 0,
          shares: 0,
          total: 0,
          published: 0,
          draft: 0,
          inReview: 0,
          scheduled: 0,
          approved: 0,
          rejected: 0,
          contents: [],
        });
      }
      const g = byPlatform.get(key)!;
      g.views += c.views;
      g.likes += c.likes;
      g.shares += c.shares;
      g.total += 1;
      g.contents.push(c);
      if (c.status === "PUBLISHED") g.published += 1;
      else if (c.status === "DRAFT") g.draft += 1;
      else if (c.status === "IN_REVIEW") g.inReview += 1;
      else if (c.status === "SCHEDULED") g.scheduled += 1;
      else if (c.status === "APPROVED") g.approved += 1;
      else if (c.status === "REJECTED") g.rejected += 1;
    }

    // Synthetic daily trend from content activity (last 7 buckets)
    const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const overallTrend = days.map((name, i) => {
      const factor = 0.7 + ((i * 17) % 10) / 20;
      return {
        name,
        views: Math.round((overall.views / 7) * factor) || (i + 1) * 120,
        likes: Math.round((overall.likes / 7) * factor) || (i + 1) * 12,
        shares: Math.round((overall.shares / 7) * factor) || (i + 1) * 3,
      };
    });

    const platforms = Array.from(byPlatform.values())
      .map((g) => {
        const meta = PLATFORM_META[g.platform] || {
          label: g.platform,
          color: "#64748B",
          accent: "#94A3B8",
        };
        const eng =
          g.views > 0
            ? Number((((g.likes + g.shares) / g.views) * 100).toFixed(2))
            : 0;
        const avgViews = g.total ? Math.round(g.views / g.total) : 0;
        const publishRate = g.total
          ? Number(((g.published / g.total) * 100).toFixed(1))
          : 0;

        const topPosts = [...g.contents]
          .sort((a, b) => b.views + b.likes * 2 - (a.views + a.likes * 2))
          .slice(0, 5)
          .map((c) => ({
            id: c.id,
            title: c.title,
            status: c.status,
            views: c.views,
            likes: c.likes,
            shares: c.shares,
            type: c.type,
            author: c.author.name,
            team: c.team?.name || null,
            updatedAt: c.updatedAt,
            engagement:
              c.views > 0
                ? Number((((c.likes + c.shares) / c.views) * 100).toFixed(1))
                : 0,
          }));

        // Content type mix
        const typeMix: Record<string, number> = {};
        for (const c of g.contents) {
          typeMix[c.type] = (typeMix[c.type] || 0) + 1;
        }

        // Status funnel
        const funnel = [
          { stage: "Nháp", count: g.draft, key: "DRAFT" },
          { stage: "Chờ duyệt", count: g.inReview, key: "IN_REVIEW" },
          { stage: "Đã duyệt", count: g.approved, key: "APPROVED" },
          { stage: "Lên lịch", count: g.scheduled, key: "SCHEDULED" },
          { stage: "Đã đăng", count: g.published, key: "PUBLISHED" },
        ];

        // Per-platform weekly trend (deterministic from stats)
        const trend = days.map((name, i) => {
          const wobble = 0.65 + ((i * 13 + g.platform.length * 3) % 11) / 15;
          return {
            name,
            views: Math.max(0, Math.round((g.views / 7) * wobble)),
            likes: Math.max(0, Math.round((g.likes / 7) * wobble)),
            shares: Math.max(0, Math.round((g.shares / 7) * wobble)),
          };
        });

        // Audience insight placeholders derived from platform
        const insights = buildInsights(g.platform, {
          views: g.views,
          likes: g.likes,
          shares: g.shares,
          published: g.published,
          eng,
          publishRate,
        });

        const connected = !!connMap[g.platform]?.isConnected;

        return {
          platform: g.platform,
          label: meta.label,
          color: meta.color,
          accent: meta.accent,
          connected,
          accountName: connMap[g.platform]?.accountName || null,
          metrics: {
            views: g.views,
            likes: g.likes,
            shares: g.shares,
            total: g.total,
            published: g.published,
            engagementRate: eng,
            avgViews,
            publishRate,
            shareRate:
              g.views > 0
                ? Number(((g.shares / g.views) * 100).toFixed(2))
                : 0,
            likeRate:
              g.views > 0
                ? Number(((g.likes / g.views) * 100).toFixed(2))
                : 0,
          },
          funnel,
          typeMix: Object.entries(typeMix).map(([type, count]) => ({
            type,
            count,
          })),
          topPosts,
          trend,
          insights,
          shareOfViews:
            overall.views > 0
              ? Number(((g.views / overall.views) * 100).toFixed(1))
              : 0,
          shareOfContent:
            overall.total > 0
              ? Number(((g.total / overall.total) * 100).toFixed(1))
              : 0,
        };
      })
      .sort((a, b) => b.metrics.views - a.metrics.views || b.metrics.total - a.metrics.total);

    // Comparison table data
    const comparison = platforms.map((p) => ({
      platform: p.platform,
      label: p.label,
      color: p.color,
      views: p.metrics.views,
      likes: p.metrics.likes,
      shares: p.metrics.shares,
      posts: p.metrics.total,
      published: p.metrics.published,
      engagementRate: p.metrics.engagementRate,
      connected: p.connected,
    }));

    // Teams rollup for overview
    const teams = await prisma.team.findMany({
      include: {
        contents: { select: { views: true, likes: true, shares: true } },
        _count: { select: { members: true, contents: true } },
      },
    });
    const teamStats = teams.map((t) => {
      const stats = t.contents.reduce(
        (a, c) => ({
          views: a.views + c.views,
          likes: a.likes + c.likes,
          shares: a.shares + c.shares,
        }),
        { views: 0, likes: 0, shares: 0 }
      );
      return {
        id: t.id,
        name: t.name,
        color: t.color,
        members: t._count.members,
        contents: t._count.contents,
        ...stats,
      };
    });

    return NextResponse.json({
      overall: {
        ...overall,
        engagementRate,
        platformsActive: platforms.length,
        connectedPlatforms: connections.filter((c) => c.isConnected).length,
      },
      overallTrend,
      platforms,
      comparison,
      teamStats,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function buildInsights(
  platform: string,
  m: {
    views: number;
    likes: number;
    shares: number;
    published: number;
    eng: number;
    publishRate: number;
  }
) {
  const tips: string[] = [];

  if (m.published === 0) {
    tips.push("Chưa có bài published — đẩy content APPROVED sang Publish Hub.");
  }
  if (m.eng < 2 && m.views > 0) {
    tips.push("Engagement thấp (<2%). Thử hook mạnh hơn và CTA rõ ràng hơn.");
  } else if (m.eng >= 5) {
    tips.push("Engagement tốt (≥5%). Nhân bản format bài top để scale.");
  }
  if (m.publishRate < 30 && m.published + m.views > 0) {
    tips.push("Tỷ lệ publish thấp — rút ngắn vòng duyệt hoặc lên lịch trước.");
  }

  switch (platform) {
    case "tiktok":
      tips.push("Ưu tiên video 15–45s, text on-screen, trend sound nếu phù hợp.");
      tips.push("Post khung giờ vàng 19h–22h và theo dõi completion rate.");
      break;
    case "instagram":
      tips.push("Carousel + Reels thường save cao hơn single image.");
      tips.push("Theo dõi saves & shares nhiều hơn like thuần.");
      break;
    case "facebook":
      tips.push("Post native (không link ngoài) thường reach tốt hơn.");
      tips.push("Khuyến khích comment bằng câu hỏi cuối bài.");
      break;
    case "youtube":
      tips.push("Tối ưu title/thumbnail — CTR thumbnail quyết định views.");
      tips.push("Thêm chapters & end screen để tăng watch time.");
      break;
    case "wordpress":
    case "blog":
      tips.push("SEO: H1 rõ, internal link, meta description 150–160 ký tự.");
      tips.push("Đo scroll depth & time on page, không chỉ pageviews.");
      break;
    case "threads":
      tips.push("Thread ngắn 1–3 ý + hỏi đáp tăng reply rate.");
      break;
    default:
      tips.push("Đồng bộ lịch đăng và message theo từng kênh.");
  }

  return tips.slice(0, 4);
}
