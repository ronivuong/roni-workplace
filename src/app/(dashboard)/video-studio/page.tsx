import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Clapperboard, Film } from "lucide-react";
import { CONTENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Video Studio" };

export default async function VideoStudioPage() {
  const session = await getSession();
  const videos = await prisma.content.findMany({
    where: {
      OR: [{ type: "video" }, { type: "script" }],
      ...(session!.user.role === "AGENT" ? { authorId: session!.user.id } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { author: { select: { name: true } }, team: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Video Studio"
        description="Viral Script & Video Pipeline — từ hook đến video sẵn sàng đăng."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Clapperboard, title: "Script viral", desc: "Hook → Body → CTA" },
          { icon: Film, title: "AI Video gen", desc: "SpaceXAI video models" },
          { icon: Video, title: "Export multi-platform", desc: "9:16 · 1:1 · 16:9" },
        ].map((s) => (
          <Card key={s.title} className="border-dashed">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
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
          <CardTitle className="text-base">Script & Video pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {videos.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Chưa có script/video</p>
          ) : (
            videos.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{v.title}</p>
                  <p className="text-xs text-slate-500">
                    {v.author.name} · {v.type} · {formatDate(v.updatedAt)}
                  </p>
                </div>
                <Badge variant="secondary">
                  {CONTENT_STATUS_LABELS[v.status] || v.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
