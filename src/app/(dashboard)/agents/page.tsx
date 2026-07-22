import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Clock, Zap } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "AI Agent" };

export default async function AgentsPage() {
  const session = await getSession();
  const jobs = await prisma.agentJob.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
    },
  });

  // Non-admin sees own + org jobs simplified
  const visible =
    session!.user.role === "AGENT"
      ? jobs.filter((j) => j.userId === session!.user.id)
      : jobs;

  return (
    <div>
      <PageHeader
        title="AI Agent Scheduler"
        description="Agent nhắc lịch đăng bài, báo cáo hiệu suất và gợi ý content tự động."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Bot, title: "Schedule Agent", desc: "Cron-based reminders" },
          { icon: Clock, title: "Nhắc lịch đăng", desc: "Trước 1 giờ scheduled" },
          { icon: Zap, title: "Insight Agent", desc: "Gợi ý ý tưởng + report" },
        ].map((s) => (
          <Card key={s.title} className="border-dashed">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{s.title}</p>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jobs đã cấu hình</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Chưa có agent job</p>
          ) : (
            visible.map((j) => (
              <div
                key={j.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{j.name}</p>
                    <Badge variant={j.isActive ? "default" : "secondary"}>
                      {j.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{j.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Cron: <code className="rounded bg-slate-100 px-1">{j.cron || "—"}</code>
                    {" · "}Owner: {j.user.name}
                    {j.nextRunAt && ` · Next: ${formatDateTime(j.nextRunAt)}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
