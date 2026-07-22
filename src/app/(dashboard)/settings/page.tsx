"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Key,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Image,
  Video,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AI_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const TYPE_ICONS: Record<string, typeof Sparkles> = {
  CONTENT_WRITING: Sparkles,
  IMAGE_GENERATION: Image,
  VIDEO_GENERATION: Video,
  FALLBACK: Shield,
};

type AiConfig = {
  id: string;
  type: string;
  provider: string;
  model: string | null;
  apiKey: string | null;
  baseUrl: string | null;
  isEnabled: boolean;
  hasKey: boolean;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
};

function AiConfigCard({
  config,
  onSaved,
}: {
  config: AiConfig;
  onSaved: () => void;
}) {
  const [provider, setProvider] = useState(config.provider);
  const [model, setModel] = useState(config.model || "");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || "");
  const [enabled, setEnabled] = useState(config.isEnabled);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setProvider(config.provider);
    setModel(config.model || "");
    setBaseUrl(config.baseUrl || "");
    setEnabled(config.isEnabled);
    setApiKey("");
  }, [config]);

  const Icon = TYPE_ICONS[config.type] || Settings;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: config.type,
          provider,
          model: model || null,
          apiKey: apiKey || undefined,
          baseUrl: baseUrl || null,
          isEnabled: enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success(`Đã lưu cấu hình ${AI_TYPE_LABELS[config.type]}`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/settings/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: config.type }),
      });
      const data = await res.json();
      if (data.ok) toast.success(data.message);
      else toast.error(data.message || "Kết nối thất bại");
      onSaved();
    } catch {
      toast.error("Không test được kết nối");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">
                {AI_TYPE_LABELS[config.type] || config.type}
              </CardTitle>
              <CardDescription className="text-xs">
                {config.type}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.lastTestOk === true && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> OK
              </Badge>
            )}
            {config.lastTestOk === false && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> Fail
              </Badge>
            )}
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">Provider</Label>
            <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="xai" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Model</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="grok-4.5" />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Key className="h-3 w-3" />
            API Key {config.hasKey && <span className="text-slate-400">(đã lưu: {config.apiKey})</span>}
          </Label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={config.hasKey ? "Nhập key mới để thay thế" : "sk-..."}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Base URL</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.x.ai/v1"
          />
        </div>
        {config.lastTestedAt && (
          <p className="text-[11px] text-slate-400">
            Test lần cuối: {formatDateTime(config.lastTestedAt)}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Lưu
          </Button>
          <Button size="sm" variant="outline" onClick={test} disabled={testing}>
            {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Test Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.replace("/dashboard?error=forbidden");
    }
  }, [session, status, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["ai-config"],
    queryFn: async () => {
      const res = await fetch("/api/settings/ai");
      if (!res.ok) throw new Error("Forbidden");
      return res.json() as Promise<{ configs: AiConfig[] }>;
    },
    enabled: session?.user?.role === "ADMIN",
  });

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="py-20 text-center text-slate-500">
        Chỉ Admin mới truy cập được Cài đặt.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Cài đặt"
        description="Cấu hình AI providers, API keys và tùy chọn hệ thống."
      />

      <Tabs defaultValue="ai">
        <TabsList>
          <TabsTrigger value="ai">AI Configuration</TabsTrigger>
          <TabsTrigger value="general">Chung</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-4 space-y-4">
          <p className="text-sm text-slate-500">
            Mỗi loại AI có API key & model riêng. Mặc định dùng SpaceXAI (xAI) qua{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">XAI_API_KEY</code> nếu
            chưa nhập key trong form. Nút <strong>Test Connection</strong> kiểm tra
            kết nối thực tế.
          </p>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(data?.configs || []).map((c) => (
                <AiConfigCard
                  key={c.id}
                  config={c}
                  onSaved={() => qc.invalidateQueries({ queryKey: ["ai-config"] })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cài đặt chung</CardTitle>
              <CardDescription>
                Tùy chọn vận hành workspace (có thể mở rộng thêm).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                <div>
                  <p className="text-sm font-medium">Cho phép Leader tạo user</p>
                  <p className="text-xs text-slate-500">
                    Leader chỉ tạo được role Agent
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                <div>
                  <p className="text-sm font-medium">Tắt đăng ký công khai</p>
                  <p className="text-xs text-slate-500">
                    Luôn bật — bảo mật nội bộ
                  </p>
                </div>
                <Switch checked disabled />
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-800">Thông tin môi trường</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>App: Roni Workplace</li>
                  <li>Locale: vi-VN</li>
                  <li>Auth: NextAuth Credentials (JWT)</li>
                  <li>DB: Prisma + SQLite (local) / Vercel Postgres (prod)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
