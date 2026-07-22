"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Eye,
  Heart,
  Share2,
  Layers,
  TrendingUp,
  Link2,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatDate, cn } from "@/lib/utils";
import { CONTENT_STATUS_LABELS } from "@/lib/constants";

type PlatformDeep = {
  platform: string;
  label: string;
  color: string;
  accent: string;
  connected: boolean;
  accountName: string | null;
  metrics: {
    views: number;
    likes: number;
    shares: number;
    total: number;
    published: number;
    engagementRate: number;
    avgViews: number;
    publishRate: number;
    shareRate: number;
    likeRate: number;
  };
  funnel: { stage: string; count: number; key: string }[];
  typeMix: { type: string; count: number }[];
  topPosts: {
    id: string;
    title: string;
    status: string;
    views: number;
    likes: number;
    shares: number;
    type: string;
    author: string;
    team: string | null;
    updatedAt: string;
    engagement: number;
  }[];
  trend: { name: string; views: number; likes: number; shares: number }[];
  insights: string[];
  shareOfViews: number;
  shareOfContent: number;
};

type AnalyticsPayload = {
  overall: {
    views: number;
    likes: number;
    shares: number;
    total: number;
    published: number;
    draft: number;
    inReview: number;
    scheduled: number;
    approved: number;
    engagementRate: number;
    platformsActive: number;
    connectedPlatforms: number;
  };
  overallTrend: { name: string; views: number; likes: number; shares: number }[];
  platforms: PlatformDeep[];
  comparison: {
    platform: string;
    label: string;
    color: string;
    views: number;
    likes: number;
    shares: number;
    posts: number;
    published: number;
    engagementRate: number;
    connected: boolean;
  }[];
  teamStats: {
    id: string;
    name: string;
    color: string;
    members: number;
    contents: number;
    views: number;
    likes: number;
    shares: number;
  }[];
};

const TYPE_COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4"];

export default function AnalyticsPage() {
  const [activePlatform, setActivePlatform] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics-deep"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<AnalyticsPayload>;
    },
  });

  const overall = data?.overall;
  const platforms = useMemo(() => data?.platforms || [], [data?.platforms]);
  const selected = useMemo(() => {
    if (!platforms.length) return null;
    const key = activePlatform || platforms[0]?.platform;
    return platforms.find((p) => p.platform === key) || platforms[0];
  }, [platforms, activePlatform]);

  if (isError) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-600 mb-3">Không tải được analytics</p>
        <Button onClick={() => refetch()}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Analytics"
        description="Tổng quan toàn bộ kênh, sau đó đào sâu hiệu suất từng nền tảng."
      />

      {/* ========== TỔNG QUAN CHUNG ========== */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-7 sm:h-8 w-1 rounded-full bg-emerald-500" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Tổng quan chung</h2>
          <Badge variant="secondary" className="text-[10px] sm:text-xs">
            Toàn bộ nền tảng
          </Badge>
        </div>

        {isLoading || !overall ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 sm:h-28" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Tổng views"
                value={formatNumber(overall.views)}
                icon={Eye}
                trend={{ value: `ER ${overall.engagementRate}%` }}
                subtitle="engagement rate"
              />
              <StatCard
                title="Likes"
                value={formatNumber(overall.likes)}
                icon={Heart}
                subtitle={`${overall.published} bài đã đăng`}
              />
              <StatCard
                title="Shares"
                value={formatNumber(overall.shares)}
                icon={Share2}
                subtitle={`${overall.total} nội dung tổng`}
              />
              <StatCard
                title="Nền tảng"
                value={`${overall.platformsActive}`}
                icon={Layers}
                subtitle={`${overall.connectedPlatforms} đã kết nối`}
              />
            </div>

            <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Xu hướng 7 ngày (toàn kênh)</CardTitle>
                  <CardDescription>Views · Likes · Shares tổng hợp</CardDescription>
                </CardHeader>
                <CardContent className="h-56 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.overallTrend}>
                      <defs>
                        <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="#10B981"
                        fill="url(#gViews)"
                        strokeWidth={2}
                        name="Views"
                      />
                      <Line
                        type="monotone"
                        dataKey="likes"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={false}
                        name="Likes"
                      />
                      <Line
                        type="monotone"
                        dataKey="shares"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        dot={false}
                        name="Shares"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Phễu nội dung</CardTitle>
                  <CardDescription>Trạng thái toàn hệ thống</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { l: "Nháp", v: overall.draft, c: "bg-slate-300" },
                    { l: "Chờ duyệt", v: overall.inReview, c: "bg-amber-400" },
                    { l: "Đã duyệt", v: overall.approved, c: "bg-sky-400" },
                    { l: "Lên lịch", v: overall.scheduled, c: "bg-violet-400" },
                    { l: "Đã đăng", v: overall.published, c: "bg-emerald-500" },
                  ].map((row) => {
                    const pct = overall.total
                      ? Math.round((row.v / overall.total) * 100)
                      : 0;
                    return (
                      <div key={row.l}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-slate-600">{row.l}</span>
                          <span className="font-medium text-slate-900">
                            {row.v} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", row.c)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">So sánh nhanh các nền tảng</CardTitle>
                <CardDescription>
                  Click một nền tảng bên dưới để xem phân tích sâu
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 sm:h-80">
                {(data.comparison || []).length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-20">
                    Chưa có dữ liệu theo nền tảng — tạo & publish content trước.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.comparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="views" fill="#10B981" radius={[6, 6, 0, 0]} name="Views" />
                      <Bar dataKey="likes" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Likes" />
                      <Bar dataKey="shares" fill="#F59E0B" radius={[6, 6, 0, 0]} name="Shares" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Team overview strip */}
            {(data.teamStats || []).length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.teamStats.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        <p className="text-sm font-semibold truncate">{t.name}</p>
                      </div>
                      <p className="text-lg font-bold text-slate-900">
                        {formatNumber(t.views)}
                        <span className="text-xs font-normal text-slate-400 ml-1">views</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {t.contents} content · {t.members} TV · {formatNumber(t.likes)} likes
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ========== PHÂN TÍCH SÂU TỪNG NỀN TẢNG ========== */}
      <section className="space-y-3 sm:space-y-4 border-t border-slate-200 pt-6 sm:pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-2">
            <div className="h-7 sm:h-8 w-1 shrink-0 rounded-full bg-violet-500 mt-0.5 sm:mt-0" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Phân tích sâu theo nền tảng
              </h2>
              <p className="text-xs text-slate-500">
                Metrics, funnel, top posts, trend & insight cho từng kênh
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : platforms.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-slate-500 text-sm">
              Chưa có content gắn nền tảng. Hãy tạo bài trong Content Studio và chọn platform.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Platform picker chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 tabs-scroll sm:flex-wrap sm:overflow-visible">
              {platforms.map((p) => {
                const active = selected?.platform === p.platform;
                return (
                  <button
                    key={p.platform}
                    type="button"
                    onClick={() => setActivePlatform(p.platform)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all min-w-[132px] sm:min-w-[140px] shrink-0",
                      active
                        ? "border-violet-300 bg-violet-50 ring-2 ring-violet-200 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {p.label}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {formatNumber(p.metrics.views)} views · ER {p.metrics.engagementRate}%
                      </p>
                    </div>
                    {p.connected && (
                      <Badge variant="default" className="ml-auto text-[9px] px-1.5 py-0">
                        Live
                      </Badge>
                    )}
                    {active && <ChevronRight className="h-3.5 w-3.5 text-violet-500 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Platform header */}
                <Card
                  className="overflow-hidden border-0 shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${selected.color} 0%, ${selected.accent} 100%)`,
                  }}
                >
                  <CardContent className="p-5 md:p-6 text-white">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-2xl font-bold">{selected.label}</h3>
                          {selected.connected ? (
                            <Badge className="bg-white/20 text-white border-0 gap-1">
                              <Link2 className="h-3 w-3" />
                              Đã kết nối
                              {selected.accountName ? ` · ${selected.accountName}` : ""}
                            </Badge>
                          ) : (
                            <Badge className="bg-black/20 text-white border-0">
                              Chưa kết nối API
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-white/80">
                          Chiếm {selected.shareOfViews}% views · {selected.shareOfContent}% content
                          toàn hệ thống
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">
                            {formatNumber(selected.metrics.views)}
                          </p>
                          <p className="text-[11px] text-white/75">Views</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {selected.metrics.engagementRate}%
                          </p>
                          <p className="text-[11px] text-white/75">Engagement</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{selected.metrics.published}</p>
                          <p className="text-[11px] text-white/75">Published</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KPI row */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      l: "TB views / bài",
                      v: formatNumber(selected.metrics.avgViews),
                      icon: Eye,
                    },
                    {
                      l: "Like rate",
                      v: `${selected.metrics.likeRate}%`,
                      icon: Heart,
                    },
                    {
                      l: "Share rate",
                      v: `${selected.metrics.shareRate}%`,
                      icon: Share2,
                    },
                    {
                      l: "Tỷ lệ publish",
                      v: `${selected.metrics.publishRate}%`,
                      icon: TrendingUp,
                    },
                  ].map((k) => (
                    <Card key={k.l}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <k.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">{k.l}</p>
                          <p className="text-lg font-bold text-slate-900">{k.v}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-5">
                  {/* Trend */}
                  <Card className="lg:col-span-3">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Trend {selected.label} · 7 ngày
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selected.trend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="views"
                            stroke={selected.color === "#000000" ? "#10B981" : selected.color}
                            strokeWidth={2}
                            name="Views"
                          />
                          <Line
                            type="monotone"
                            dataKey="likes"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            name="Likes"
                          />
                          <Line
                            type="monotone"
                            dataKey="shares"
                            stroke="#F59E0B"
                            strokeWidth={2}
                            name="Shares"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Type mix pie */}
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Cơ cấu loại content</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                      {selected.typeMix.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-16">Không có data</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={selected.typeMix}
                              dataKey="count"
                              nameKey="type"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={(props) => {
                                const name = String(props.name ?? "");
                                const value = Number(props.value ?? 0);
                                return `${name} (${value})`;
                              }}
                            >
                              {selected.typeMix.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={TYPE_COLORS[i % TYPE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Funnel */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Funnel trạng thái · {selected.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={selected.funnel} layout="vertical" margin={{ left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis
                            type="category"
                            dataKey="stage"
                            width={80}
                            tick={{ fontSize: 11 }}
                            stroke="#94a3b8"
                          />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            fill={selected.color === "#000000" ? "#8B5CF6" : selected.color}
                            radius={[0, 6, 6, 0]}
                            name="Số bài"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Insights */}
                  <Card className="border-violet-100 bg-violet-50/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-violet-600" />
                        Insight & gợi ý · {selected.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selected.insights.map((tip, i) => (
                        <div
                          key={i}
                          className="flex gap-2 rounded-xl bg-white border border-violet-100 px-3 py-2.5 text-sm text-slate-700"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                            {i + 1}
                          </span>
                          {tip}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Top posts */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Top nội dung · {selected.label}
                    </CardTitle>
                    <CardDescription>
                      Xếp theo views + likes (engagement)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selected.topPosts.length === 0 ? (
                      <p className="text-sm text-slate-500 py-6 text-center">
                        Chưa có bài trên kênh này
                      </p>
                    ) : (
                      selected.topPosts.map((post, idx) => (
                        <div
                          key={post.id}
                          className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                                idx === 0
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                              )}
                            >
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {post.title}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {post.author}
                                {post.team ? ` · ${post.team}` : ""} · {post.type} ·{" "}
                                {formatDate(post.updatedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:pl-10">
                            <Badge variant="secondary">
                              {CONTENT_STATUS_LABELS[post.status] || post.status}
                            </Badge>
                            <span className="text-xs text-slate-600">
                              👁 {formatNumber(post.views)}
                            </span>
                            <span className="text-xs text-slate-600">
                              ❤ {formatNumber(post.likes)}
                            </span>
                            <span className="text-xs text-slate-600">
                              ↗ {formatNumber(post.shares)}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              ER {post.engagement}%
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Metrics table all platforms */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Bảng so sánh chi tiết</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                          <th className="pb-2 pr-3 font-medium">Nền tảng</th>
                          <th className="pb-2 pr-3 font-medium">Views</th>
                          <th className="pb-2 pr-3 font-medium">Likes</th>
                          <th className="pb-2 pr-3 font-medium">Shares</th>
                          <th className="pb-2 pr-3 font-medium">Posts</th>
                          <th className="pb-2 pr-3 font-medium">Published</th>
                          <th className="pb-2 pr-3 font-medium">ER %</th>
                          <th className="pb-2 font-medium">Kết nối</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.comparison || []).map((row) => (
                          <tr
                            key={row.platform}
                            className={cn(
                              "border-b border-slate-50 cursor-pointer hover:bg-slate-50",
                              selected?.platform === row.platform && "bg-violet-50/50"
                            )}
                            onClick={() => setActivePlatform(row.platform)}
                          >
                            <td className="py-2.5 pr-3">
                              <span className="inline-flex items-center gap-2 font-medium">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: row.color }}
                                />
                                {row.label}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3">{formatNumber(row.views)}</td>
                            <td className="py-2.5 pr-3">{formatNumber(row.likes)}</td>
                            <td className="py-2.5 pr-3">{formatNumber(row.shares)}</td>
                            <td className="py-2.5 pr-3">{row.posts}</td>
                            <td className="py-2.5 pr-3">{row.published}</td>
                            <td className="py-2.5 pr-3 font-medium text-emerald-700">
                              {row.engagementRate}%
                            </td>
                            <td className="py-2.5">
                              {row.connected ? (
                                <Badge variant="default">On</Badge>
                              ) : (
                                <Badge variant="secondary">Off</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
