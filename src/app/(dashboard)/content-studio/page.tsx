import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PenTool, Sparkles, FileText, Plus } from "lucide-react";
import { CONTENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "AI Content Studio" };

export default async function ContentStudioPage() {
  const session = await getSession();
  const role = session!.user.role;
  const userId = session!.user.id;

  const contents = await prisma.content.findMany({
    where: role === "AGENT" ? { authorId: userId } : {},
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      author: { select: { name: true } },
      team: { select: { name: true, color: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="AI Content Studio"
        description="Viết bài, caption, script bằng AI — workflow duyệt nội bộ."
        actions={
          <Button disabled title="Tính năng đang được hoàn thiện">
            <Plus className="h-4 w-4" />
            Tạo nội dung AI
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Viết với AI</p>
              <p className="text-xs text-slate-500">Sinh nội dung bằng AI</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Editor</p>
              <p className="text-xs text-slate-500">Rich text + templates</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Workflow duyệt</p>
              <p className="text-xs text-slate-500">Draft → Review → Approve</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thư viện nội dung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {contents.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Chưa có nội dung</p>
          ) : (
            contents.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {c.author.name}
                    {c.team ? ` · ${c.team.name}` : ""} · {c.type} · {formatDate(c.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.platform && <Badge variant="outline">{c.platform}</Badge>}
                  <Badge variant="secondary">
                    {CONTENT_STATUS_LABELS[c.status] || c.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
