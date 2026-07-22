"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Search, UserCog, MoreHorizontal, Pencil, UserX, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { getInitials, formatDate, cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_COLORS, canManageUsers } from "@/lib/rbac";
import { toast } from "sonner";

export default function UsersPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [teamId, setTeamId] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<Record<string, unknown> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", role, status, teamId, q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (role !== "all") params.set("role", role);
      if (status !== "all") params.set("status", status);
      if (teamId !== "all") params.set("teamId", teamId);
      if (q) params.set("q", q);
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      return res.json();
    },
  });

  const users = data?.users || [];
  const canManage = canManageUsers(session?.user?.role);

  const toggleStatus = async (user: { id: string; status: string; name: string }) => {
    const next = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error || "Lỗi");
      return;
    }
    toast.success(
      next === "ACTIVE" ? `Đã kích hoạt ${user.name}` : `Đã vô hiệu hóa ${user.name}`
    );
    qc.invalidateQueries({ queryKey: ["users"] });
  };

  return (
    <div>
      <PageHeader
        title="Quản lý người dùng"
        description="Xem, tạo và chỉnh sửa tài khoản. Chỉ Admin/Leader được tạo user."
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setEditUser(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Tạo tài khoản
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Tìm theo tên hoặc email..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mọi role</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="LEADER">Leader</SelectItem>
                <SelectItem value="AGENT">Agent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mọi status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mọi team</SelectItem>
                {(teamsData?.teams || []).map((t: { id: string; name: string }) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <UserCog className="h-10 w-10 text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">Không tìm thấy user</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(
            (u: {
              id: string;
              name: string;
              email: string;
              image: string | null;
              role: string;
              status: string;
              title: string | null;
              createdAt: string;
              lastLoginAt: string | null;
              teamMembers: { team: { id: string; name: string; color: string }; isLeader: boolean }[];
              _count: { contents: number };
            }) => (
              <div
                key={u.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={u.image || undefined} />
                    <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/users/${u.id}`}
                        className="font-semibold text-slate-900 hover:text-emerald-600 truncate"
                      >
                        {u.name}
                      </Link>
                      <Badge className={cn("border", ROLE_COLORS[u.role])} variant="outline">
                        {ROLE_LABELS[u.role]}
                      </Badge>
                      <Badge variant={u.status === "ACTIVE" ? "default" : "destructive"}>
                        {u.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {u.email}
                      {u.title ? ` · ${u.title}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {u.teamMembers.map((m) => (
                        <span
                          key={m.team.id}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 border border-slate-100"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: m.team.color }}
                          />
                          {m.team.name}
                          {m.isLeader && " ★"}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:pl-4">
                  <div className="text-right text-xs text-slate-400 hidden sm:block">
                    <p>{u._count.contents} nội dung</p>
                    <p>Tham gia {formatDate(u.createdAt)}</p>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/users/${u.id}`}>Xem hồ sơ</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditUser({
                              id: u.id,
                              name: u.name,
                              email: u.email,
                              role: u.role,
                              status: u.status,
                              title: u.title,
                              teamIds: u.teamMembers.map((m) => m.team.id),
                            });
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(u)}>
                          {u.status === "ACTIVE" ? (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              Vô hiệu hóa
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Kích hoạt
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editUser as never}
        actorRole={session?.user?.role}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["users"] })}
      />
    </div>
  );
}
