"use client";

import { use, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Shield,
  FileText,
  Activity,
  KeyRound,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AvatarUpload } from "@/components/users/avatar-upload";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_COLORS, canManageUsers } from "@/lib/rbac";
import { CONTENT_STATUS_LABELS } from "@/lib/constants";
import { toast } from "sonner";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const user = data?.user;
  const canManage = canManageUsers(session?.user?.role);
  const isSelf = session?.user?.id === id;

  const resetPassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error || "Lỗi");
      return;
    }
    toast.success("Đã đặt lại mật khẩu");
    setResetOpen(false);
    setNewPassword("");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Không tìm thấy người dùng</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/users">Quay lại</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/users">
            <ArrowLeft className="h-4 w-4" />
            Danh sách user
          </Link>
        </Button>
      </div>

      <PageHeader
        title={user.name}
        description={user.title || user.email}
        actions={
          (canManage || isSelf) && (
            <div className="flex gap-2">
              {canManage && (
                <Button variant="outline" onClick={() => setResetOpen(true)}>
                  <KeyRound className="h-4 w-4" />
                  Đặt lại MK
                </Button>
              )}
              {canManage && (
                <Button onClick={() => setEditOpen(true)}>Chỉnh sửa</Button>
              )}
            </div>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-6 flex flex-col items-center">
            {(canManage || isSelf) ? (
              <AvatarUpload
                userId={user.id}
                name={user.name}
                image={user.image}
                onUploaded={() => {
                  qc.invalidateQueries({ queryKey: ["user", id] });
                  qc.invalidateQueries({ queryKey: ["users"] });
                }}
              />
            ) : (
              <div className="h-28 w-28 rounded-full bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-700">
                {user.name.slice(0, 1)}
              </div>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Badge className={cn("border", ROLE_COLORS[user.role])} variant="outline">
                <Shield className="mr-1 h-3 w-3" />
                {ROLE_LABELS[user.role]}
              </Badge>
              <Badge variant={user.status === "ACTIVE" ? "default" : "destructive"}>
                {user.status}
              </Badge>
            </div>
            {user.bio && (
              <p className="mt-4 text-center text-sm text-slate-500">{user.bio}</p>
            )}
            <div className="mt-6 w-full space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" />
                {user.email}
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {user.phone}
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400" />
                Tham gia {formatDate(user.createdAt)}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Activity className="h-4 w-4 text-slate-400" />
                Login cuối: {formatDateTime(user.lastLoginAt)}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Teams</CardTitle>
            </CardHeader>
            <CardContent>
              {user.teamMembers?.length ? (
                <div className="flex flex-wrap gap-2">
                  {user.teamMembers.map(
                    (m: {
                      id: string;
                      isLeader: boolean;
                      team: { id: string; name: string; color: string; description: string | null };
                    }) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: m.team.color }}
                          />
                          <span className="font-medium">{m.team.name}</span>
                          {m.isLeader && (
                            <Badge variant="warning" className="text-[10px]">
                              Leader
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Chưa thuộc team nào</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Nội dung gần đây
                <Badge variant="secondary">{user._count?.contents || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(user.contents || []).length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có nội dung</p>
              ) : (
                user.contents.map(
                  (c: {
                    id: string;
                    title: string;
                    status: string;
                    type: string;
                    views: number;
                    createdAt: string;
                  }) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{c.title}</p>
                        <p className="text-xs text-slate-400">
                          {c.type} · {formatDate(c.createdAt)} · {c.views} views
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {CONTENT_STATUS_LABELS[c.status] || c.status}
                      </Badge>
                    </div>
                  )
                )
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hoạt động gần đây</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(user.activities || []).length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có activity</p>
              ) : (
                user.activities.map(
                  (a: { id: string; action: string; entity: string | null; createdAt: string }) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between text-sm border-b border-slate-50 py-2 last:border-0"
                    >
                      <span className="font-medium text-slate-700">
                        {a.action}
                        {a.entity ? ` · ${a.entity}` : ""}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(a.createdAt)}
                      </span>
                    </div>
                  )
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <UserFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          phone: user.phone,
          title: user.title,
          bio: user.bio,
          teamIds: user.teamMembers?.map((m: { team: { id: string } }) => m.team.id) || [],
        }}
        actorRole={session?.user?.role}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["user", id] })}
      />

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Mật khẩu mới</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Hủy
            </Button>
            <Button onClick={resetPassword}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
