"use client";

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
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Heart, Share2, Users } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Client analytics using teams API data + mock series for charts
const weekSeries = [
  { name: "T2", views: 2400, likes: 180 },
  { name: "T3", views: 1398, likes: 120 },
  { name: "T4", views: 4800, likes: 320 },
  { name: "T5", views: 3908, likes: 280 },
  { name: "T6", views: 4800, likes: 410 },
  { name: "T7", views: 3800, likes: 290 },
  { name: "CN", views: 4300, likes: 350 },
];

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["teams-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      return res.json();
    },
  });

  const teams = data?.teams || [];
  const totals = teams.reduce(
    (acc: { views: number; likes: number; shares: number; members: number }, t: {
      stats: { views: number; likes: number; shares: number };
      _count: { members: number };
    }) => ({
      views: acc.views + (t.stats?.views || 0),
      likes: acc.likes + (t.stats?.likes || 0),
      shares: acc.shares + (t.stats?.shares || 0),
      members: acc.members + (t._count?.members || 0),
    }),
    { views: 0, likes: 0, shares: 0, members: 0 }
  );

  const teamChart = teams.map((t: { name: string; stats: { views: number; likes: number } }) => ({
    name: t.name.length > 14 ? t.name.slice(0, 12) + "…" : t.name,
    views: t.stats?.views || 0,
    likes: t.stats?.likes || 0,
  }));

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Hiệu suất cá nhân & team — views, engagement, xu hướng."
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <StatCard title="Tổng views" value={formatNumber(totals.views)} icon={Eye} trend={{ value: "+18%" }} />
          <StatCard title="Likes" value={formatNumber(totals.likes)} icon={Heart} />
          <StatCard title="Shares" value={formatNumber(totals.shares)} icon={Share2} />
          <StatCard title="Thành viên (teams)" value={formatNumber(totals.members)} icon={Users} />
        </div>
      )}

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Cá nhân / Tuần</TabsTrigger>
          <TabsTrigger value="team">Theo team</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lượt xem 7 ngày gần nhất</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: "#10B981" }}
                    name="Views"
                  />
                  <Line
                    type="monotone"
                    dataKey="likes"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Likes"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">So sánh hiệu suất theo team</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {teamChart.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-16">Chưa có dữ liệu team</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="views" fill="#10B981" radius={[6, 6, 0, 0]} name="Views" />
                    <Bar dataKey="likes" fill="#6EE7B7" radius={[6, 6, 0, 0]} name="Likes" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
