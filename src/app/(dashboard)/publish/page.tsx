"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Rocket,
  Link2,
  Unlink,
  CheckCircle2,
  XCircle,
  Settings2,
  ExternalLink,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformIcon, PlatformIconInline } from "@/components/platforms/platform-icon";
import { CONTENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import { isLeaderOrAbove } from "@/lib/rbac";
import type { PlatformDefinition, PlatformField } from "@/lib/platforms";
import { buildPublishedUrl } from "@/lib/publish-url";

type PlatformItem = PlatformDefinition & {
  connection: {
    id: string;
    platform: string;
    name: string;
    isConnected: boolean;
    accountId: string | null;
    accountName: string | null;
    hasToken: boolean;
    accessTokenMasked: string | null;
    config: Record<string, string>;
    lastTestedAt: string | null;
    lastTestOk: boolean | null;
    lastError: string | null;
    connectedAt: string | null;
  };
};

type Content = {
  id: string;
  title: string;
  status: string;
  platform: string | null;
  type: string;
  updatedAt: string;
  publishedAt?: string | null;
  publishedUrl?: string | null;
  author: { name: string };
};

export default function PublishPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const canManage = isLeaderOrAbove(session?.user?.role);

  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<PlatformItem | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [publishPlatform, setPublishPlatform] = useState<string>("");

  const { data: platformData, isLoading: loadingPlatforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const res = await fetch("/api/platforms");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        platforms: PlatformItem[];
        connectedCount: number;
      }>;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["contents-publish"],
    queryFn: async () => {
      const res = await fetch("/api/content");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ contents: Content[] }>;
    },
  });

  const platforms = platformData?.platforms || [];
  const connected = platforms.filter((p) => p.connection.isConnected);
  const queue = (data?.contents || []).filter((c) =>
    ["APPROVED", "SCHEDULED", "IN_REVIEW"].includes(c.status)
  );
  const published = (data?.contents || []).filter((c) => c.status === "PUBLISHED");

  const openConnect = (p: PlatformItem) => {
    setActivePlatform(p);
    const initial: Record<string, string> = {};
    for (const f of p.fields) {
      if (f.key === "accessToken") {
        initial[f.key] = "";
      } else if (f.key === "accountId") {
        initial[f.key] = p.connection.accountId || "";
      } else if (f.key === "accountName") {
        initial[f.key] = p.connection.accountName || "";
      } else if (f.key === "siteUrl") {
        initial[f.key] =
          p.connection.config.siteUrl || p.connection.accountId || "";
      } else if (f.key === "username") {
        initial[f.key] =
          p.connection.config.username || p.connection.accountName || "";
      } else {
        initial[f.key] = p.connection.config[f.key] || "";
      }
    }
    setFields(initial);
    setConnectOpen(true);
  };

  const saveConnection = async (connect: boolean) => {
    if (!activePlatform) return;
    setSaving(true);
    try {
      const res = await fetch("/api/platforms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: activePlatform.key,
          fields,
          connect,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Lỗi");
      toast.success(d.message || "Đã lưu");
      setConnectOpen(false);
      qc.invalidateQueries({ queryKey: ["platforms"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thất bại");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (platformKey: string) => {
    setTesting(true);
    try {
      const res = await fetch("/api/platforms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: platformKey }),
      });
      const d = await res.json();
      if (d.ok) toast.success(d.message);
      else toast.error(d.message || "Test thất bại");
      qc.invalidateQueries({ queryKey: ["platforms"] });
    } catch {
      toast.error("Không test được kết nối");
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async (platformKey: string) => {
    if (!confirm("Ngắt kết nối nền tảng này?")) return;
    const res = await fetch("/api/platforms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: platformKey, fields: {}, connect: false }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast.error(d.error || "Lỗi");
      return;
    }
    toast.success(d.message);
    qc.invalidateQueries({ queryKey: ["platforms"] });
  };

  const publish = async (id: string, platform?: string) => {
    const target = platform || publishPlatform;
    if (!target) {
      toast.error("Chọn nền tảng để đăng");
      return;
    }
    const plat = platforms.find((p) => p.key === target);
    if (!plat?.connection.isConnected) {
      toast.error(`Chưa kết nối ${plat?.name || target}. Vào tab Kết nối nền tảng.`);
      return;
    }

    setPublishingId(id);
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PUBLISHED",
          platform: target,
          views: Math.floor(Math.random() * 500) + 50,
          likes: Math.floor(Math.random() * 80) + 5,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Publish thất bại");
      const url = d.content?.publishedUrl as string | undefined;
      toast.success(
        url ? `Đã đăng lên ${plat.name}` : `Đã đăng lên ${plat.name}`,
        url
          ? {
              action: {
                label: "Mở link",
                onClick: () => window.open(url, "_blank"),
              },
            }
          : undefined
      );
      qc.invalidateQueries({ queryKey: ["contents-publish"] });
      qc.invalidateQueries({ queryKey: ["contents"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setPublishingId(null);
    }
  };

  const resolvePostUrl = (c: Content) => {
    if (c.publishedUrl) return c.publishedUrl;
    const plat = platforms.find((p) => p.key === c.platform);
    return buildPublishedUrl({
      contentId: c.id,
      title: c.title,
      platform: c.platform,
      accountId: plat?.connection.accountId,
      accountName: plat?.connection.accountName,
      config: plat?.connection.config,
    });
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Đã copy link bài đăng");
    } catch {
      toast.error("Không copy được — hãy chọn và copy thủ công");
    }
  };

  return (
    <div>
      <PageHeader
        title="Publish Hub"
        description="Kết nối WordPress & social, rồi xuất bản nội dung đã duyệt."
      />

      <Tabs defaultValue="connections">
        <TabsList className="mb-4">
          <TabsTrigger value="connections">
            Kết nối nền tảng
            {platformData && (
              <Badge className="ml-2" variant="secondary">
                {platformData.connectedCount}/{platforms.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="queue">Hàng đợi đăng</TabsTrigger>
          <TabsTrigger value="history">Đã đăng</TabsTrigger>
        </TabsList>

        {/* ===== CONNECTIONS ===== */}
        <TabsContent value="connections" className="space-y-4">
          <Card className="border-emerald-100 bg-emerald-50/40">
            <CardContent className="p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900 mb-1">Cách kết nối</p>
              <ol className="list-decimal list-inside space-y-0.5 text-xs sm:text-sm">
                <li>Chọn nền tảng → điền Site URL / Token / Page ID theo form</li>
                <li>Bấm <strong>Kết nối</strong> để lưu credential (mã hóa phía server)</li>
                <li>Bấm <strong>Test Connection</strong> để kiểm tra API thật</li>
                <li>Vào tab <strong>Hàng đợi đăng</strong> để publish nội dung đã duyệt</li>
              </ol>
              {!canManage && (
                <p className="mt-2 text-xs text-amber-700">
                  Bạn chỉ xem được trạng thái. Admin/Leader mới cấu hình kết nối.
                </p>
              )}
            </CardContent>
          </Card>

          {loadingPlatforms ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-44" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {platforms.map((p) => {
                const c = p.connection;
                return (
                  <Card
                    key={p.key}
                    className={cn(
                      "transition-colors",
                      c.isConnected
                        ? "border-emerald-200 shadow-sm"
                        : "border-slate-200"
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <PlatformIcon platform={p.key} size="md" />
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            {p.name}
                            {c.isConnected ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Connected
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Chưa kết nối</Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {p.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {c.isConnected && (
                        <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 space-y-0.5">
                          {c.accountName && <p>Tài khoản: <strong>{c.accountName}</strong></p>}
                          {c.accountId && (
                            <p className="truncate">ID/URL: {c.accountId}</p>
                          )}
                          {c.lastTestedAt && (
                            <p className="flex items-center gap-1">
                              Test:{" "}
                              {c.lastTestOk ? (
                                <span className="text-emerald-600 flex items-center gap-0.5">
                                  <CheckCircle2 className="h-3 w-3" /> OK
                                </span>
                              ) : (
                                <span className="text-red-500 flex items-center gap-0.5">
                                  <XCircle className="h-3 w-3" /> Fail
                                </span>
                              )}
                              <span className="text-slate-400">
                                · {formatDateTime(c.lastTestedAt)}
                              </span>
                            </p>
                          )}
                          {c.lastError && (
                            <p className="text-red-500 line-clamp-2">{c.lastError}</p>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {canManage && (
                          <Button size="sm" onClick={() => openConnect(p)}>
                            <Settings2 className="h-3.5 w-3.5" />
                            {c.isConnected ? "Cấu hình" : "Kết nối"}
                          </Button>
                        )}
                        {c.isConnected && canManage && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={testing}
                              onClick={() => testConnection(p.key)}
                            >
                              {testing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              Test
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500"
                              onClick={() => disconnect(p.key)}
                            >
                              <Unlink className="h-3.5 w-3.5" />
                              Ngắt
                            </Button>
                          </>
                        )}
                        {p.docsUrl && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={p.docsUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Docs
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== QUEUE ===== */}
        <TabsContent value="queue" className="space-y-4">
          {connected.length === 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 text-sm text-amber-800">
                Chưa có nền tảng nào được kết nối. Vào tab <strong>Kết nối nền tảng</strong> trước
                khi publish.
              </CardContent>
            </Card>
          )}

          {connected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-sm text-slate-600">Đăng lên:</Label>
              <Select value={publishPlatform} onValueChange={setPublishPlatform}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Chọn nền tảng" />
                </SelectTrigger>
                <SelectContent>
                  {connected.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      <span className="inline-flex items-center gap-2">
                        <PlatformIconInline platform={p.key} />
                        {p.name}
                        {p.connection.accountName
                          ? ` · ${p.connection.accountName}`
                          : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hàng đợi xuất bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : queue.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">
                  Không có bài chờ đăng. Duyệt nội dung ở Content Studio trước.
                </p>
              ) : (
                queue.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{c.title}</p>
                      <p className="text-xs text-slate-500">
                        {c.author.name} · {c.platform || "chưa chọn nền tảng"} ·{" "}
                        {CONTENT_STATUS_LABELS[c.status]} · {formatDate(c.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {connected.map((p) => (
                        <Button
                          key={p.key}
                          size="sm"
                          variant="outline"
                          disabled={publishingId === c.id}
                          onClick={() => publish(c.id, p.key)}
                          className="gap-1.5"
                        >
                          {publishingId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PlatformIconInline platform={p.key} className="h-3.5 w-3.5" />
                          )}
                          {p.name}
                        </Button>
                      ))}
                      {connected.length === 0 && (
                        <Button size="sm" disabled>
                          Chưa kết nối
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== HISTORY ===== */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Đã đăng gần đây</CardTitle>
              <CardDescription>
                Mỗi bài có link công khai theo nền tảng — mở hoặc copy để chia sẻ.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {published.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  Chưa có bài published
                </p>
              ) : (
                published.slice(0, 30).map((c) => {
                  const url = resolvePostUrl(c);
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {c.platform && (
                            <PlatformIcon platform={c.platform} size="sm" />
                          )}
                          <p className="text-sm font-medium text-slate-900">
                            {c.title}
                          </p>
                          <Badge>Published</Badge>
                          {c.platform && (
                            <Badge variant="outline" className="capitalize gap-1">
                              <PlatformIconInline platform={c.platform} className="h-3 w-3" />
                              {c.platform}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {c.author.name} ·{" "}
                          {formatDate(c.publishedAt || c.updatedAt)}
                        </p>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline break-all"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{url}</span>
                        </a>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 sm:pl-3">
                        <Button size="sm" variant="outline" asChild>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Mở bài
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyLink(url)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy link
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connect dialog */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activePlatform && (
                <PlatformIcon platform={activePlatform.key} size="sm" />
              )}
              Kết nối {activePlatform?.name}
            </DialogTitle>
            <DialogDescription>
              Credential chỉ lưu trên server, không hiển thị lại full token sau khi lưu.
              {activePlatform?.docsUrl && (
                <>
                  {" "}
                  <a
                    href={activePlatform.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 hover:underline"
                  >
                    Xem tài liệu API →
                  </a>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2 max-h-[50vh] overflow-y-auto">
            {activePlatform?.fields.map((f: PlatformField) => (
              <div key={f.key} className="grid gap-1.5">
                <Label>
                  {f.label}
                  {f.required && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  type={f.type === "password" ? "password" : "text"}
                  value={fields[f.key] || ""}
                  onChange={(e) =>
                    setFields({ ...fields, [f.key]: e.target.value })
                  }
                  placeholder={
                    f.type === "password" && activePlatform.connection.hasToken
                      ? "•••• đã lưu — nhập mới để thay"
                      : f.placeholder
                  }
                />
                {f.help && (
                  <p className="text-[11px] text-slate-400">{f.help}</p>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConnectOpen(false)}>
              Hủy
            </Button>
            {activePlatform?.connection.isConnected && (
              <Button
                variant="ghost"
                className="text-red-500"
                disabled={saving}
                onClick={() => saveConnection(false)}
              >
                Ngắt kết nối
              </Button>
            )}
            <Button disabled={saving} onClick={() => saveConnection(true)}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Link2 className="h-4 w-4" />
              Kết nối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
