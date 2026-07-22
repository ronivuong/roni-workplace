"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_OPTIONS } from "@/lib/constants";

type UserFormData = {
  id?: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  status: string;
  phone?: string;
  title?: string;
  bio?: string;
  teamIds?: string[];
};

export function UserFormDialog({
  open,
  onOpenChange,
  initial,
  actorRole,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<UserFormData> | null;
  actorRole?: string;
  onSuccess?: () => void;
}) {
  const isEdit = !!initial?.id;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<UserFormData>({
    name: "",
    email: "",
    password: "",
    role: "AGENT",
    status: "ACTIVE",
    phone: "",
    title: "",
    bio: "",
    teamIds: [],
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setForm({
        id: initial?.id,
        name: initial?.name || "",
        email: initial?.email || "",
        password: "",
        role: initial?.role || "AGENT",
        status: initial?.status || "ACTIVE",
        phone: initial?.phone || "",
        title: initial?.title || "",
        bio: initial?.bio || "",
        teamIds: initial?.teamIds || [],
      });
    }
  }, [open, initial]);

  const roleOptions =
    actorRole === "LEADER"
      ? ROLE_OPTIONS.filter((r) => r.value === "AGENT")
      : ROLE_OPTIONS;

  const submit = async () => {
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        status: form.status,
        phone: form.phone || null,
        title: form.title || null,
        bio: form.bio || null,
        teamIds: form.teamIds,
        ...(form.password ? { password: form.password } : {}),
        ...(!isEdit ? { password: form.password || "Agent@123" } : {}),
      };

      const res = await fetch(isEdit ? `/api/users/${form.id}` : "/api/users", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success(isEdit ? "Đã cập nhật user" : "Đã tạo tài khoản");
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thất bại");
    } finally {
      setLoading(false);
    }
  };

  const teams = teamsData?.teams || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chỉnh sửa người dùng" : "Tạo tài khoản mới"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin, role, team và trạng thái."
              : "Chỉ Admin/Leader mới tạo được tài khoản. Không có đăng ký công khai."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Họ tên</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@roni.vn"
            />
          </div>
          <div className="grid gap-2">
            <Label>{isEdit ? "Mật khẩu mới (để trống nếu giữ nguyên)" : "Mật khẩu"}</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={isEdit ? "••••••••" : "Tối thiểu 6 ký tự"}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Trạng thái</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Chức danh</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Content Writer"
              />
            </div>
            <div className="grid gap-2">
              <Label>Số điện thoại</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0901..."
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Bio</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={2}
            />
          </div>
          <div className="grid gap-2">
            <Label>Teams</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {teams.map((t: { id: string; name: string; color: string }) => {
                const checked = form.teamIds?.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      const set = new Set(form.teamIds || []);
                      if (set.has(t.id)) set.delete(t.id);
                      else set.add(t.id);
                      setForm({ ...form, teamIds: Array.from(set) });
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      checked
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.name}
                  </button>
                );
              })}
              {!teams.length && (
                <span className="text-xs text-slate-400">Chưa có team</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={loading || !form.name || !form.email}>
            {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo tài khoản"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
