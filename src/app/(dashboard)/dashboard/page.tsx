import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Eye,
  Users,
  Bell,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { formatNumber, formatDate, relativeTime } from "@/lib/utils";
import { CONTENT_STATUS_LABELS } from "@/lib/constants";
import Link from "next/link";

export const metadata = { title: "Tổng quan" };

export default async function DashboardPage() {
  const session = await getSession();
  const userId = session!.user.id;
  const role = session!.user.role;

  const [
    contentCount,
    publishedCount,
    userCount,
    teamCount,
    unreadNotifs,
    recentContents,
    recentNotifs,
    totalViews,
  ] = await Promise.all([
    prisma.content.count(
      role === "AGENT" ? { where: { authorId: userId } } : undefined
    ),
    prisma.content.count({
      where: {
        status: "PUBLISHED",
        ...(role === "AGENT" ? { authorId: userId } : {}),
      },
    }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.team.count({ where: { isActive: true } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.content.findMany({
      where: role === "AGENT" ? { authorId: userId } : {},
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        author: { select: { name: true } },
        team: { select: { name: true, color: true } },
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.content.aggregate({
      _sum: { views: true },
      where: role === "AGENT" ? { authorId: userId } : {},
    }),
  ]);

  const views = totalViews._sum.views || 0;

  return (
    <div>
      <PageHeader
        title={`Xin chào, ${session!.user.name?.split(" ").slice(-1)[0]} 👋`}
        description="Tổng quan hoạt động content của bạn và team hôm nay."
      />

      <div className="grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4 mb-4 sm:mb-6">
        <StatCard
          title="Nội dung"
          value={formatNumber(contentCount)}
          subtitle={`${publishedCount} đã đăng`}
          icon={FileText}
        />
        <StatCard
          title="Tổng lượt xem"
          value={formatNumber(views)}
          trend={{ value: "+12%", positive: true }}
          subtitle="so với tuần trước"
          icon={Eye}
        />
        <StatCard
          title="Thành viên active"
          value={formatNumber(userCount)}
          subtitle={`${teamCount} teams`}
          icon={Users}
        />
        <StatCard
          title="Thông báo mới"
          value={formatNumber(unreadNotifs)}
          subtitle="chưa đọc"
          icon={Bell}
        />
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Nội dung gần đây</CardTitle>
            <Link
              href="/content-studio"
              className="text-xs font-medium text-emerald-600 hover:underline shrink-0"
            >
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            {recentContents.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">Chưa có nội dung</p>
            ) : (
              recentContents.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{c.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                      {c.author.name}
                      {c.team ? ` · ${c.team.name}` : ""} · {formatDate(c.updatedAt)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">
                    {CONTENT_STATUS_LABELS[c.status] || c.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Thông báo mới</CardTitle>
            <Link
              href="/notifications"
              className="text-xs font-medium text-emerald-600 hover:underline shrink-0"
            >
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            {recentNotifs.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">Không có thông báo</p>
            ) : (
              recentNotifs.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 rounded-xl border p-3 ${
                    n.isRead ? "border-slate-100" : "border-emerald-100 bg-emerald-50/40"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {n.isRead ? (
                      <CheckCircle2 className="h-4 w-4 text-slate-300" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">{n.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{n.message}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{relativeTime(n.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
