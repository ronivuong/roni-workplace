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

const COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6"];

type TeamForm = {
  id?: string;
  name: string;
  description: string;
  color: string;
  parentId: string | null;
  leaderId: string | null;
};

export function TeamFormDialog({
  open,
  onOpenChange,
  initial,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<TeamForm> | null;
  onSuccess?: () => void;
}) {
  const isEdit = !!initial?.id;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<TeamForm>({
    name: "",
    description: "",
    color: "#10B981",
    parentId: null,
    leaderId: null,
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      return res.json();
    },
    enabled: open,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setForm({
        id: initial?.id,
        name: initial?.name || "",
        description: initial?.description || "",
        color: initial?.color || "#10B981",
        parentId: initial?.parentId || null,
        leaderId: initial?.leaderId || null,
      });
    }
  }, [open, initial]);

  const submit = async () => {
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        color: form.color,
        parentId: form.parentId,
        leaderId: form.leaderId,
      };
      const res = await fetch(isEdit ? `/api/teams/${form.id}` : "/api/teams", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success(isEdit ? "Đã cập nhật team" : "Đã tạo team");
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thất bại");
    } finally {
      setLoading(false);
    }
  };

  const teams = (teamsData?.teams || []).filter(
    (t: { id: string }) => t.id !== form.id
  );
  const users = usersData?.users || [];
  const leaders = users.filter(
    (u: { role: string; status: string }) =>
      (u.role === "LEADER" || u.role === "ADMIN") && u.status === "ACTIVE"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chỉnh sửa team" : "Tạo team mới"}</DialogTitle>
          <DialogDescription>
            Tổ chức team theo cấu trúc phân cấp, gán Leader phụ trách.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Tên team</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Content Marketing"
            />
          </div>
          <div className="grid gap-2">
            <Label>Mô tả</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="grid gap-2">
            <Label>Màu nhận diện</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    form.color === c ? "border-slate-900 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Team cha (phân cấp)</Label>
            <Select
              value={form.parentId || "none"}
              onValueChange={(v) =>
                setForm({ ...form, parentId: v === "none" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Không có" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Không có —</SelectItem>
                {teams.map((t: { id: string; name: string }) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Gán Leader</Label>
            <Select
              value={form.leaderId || "none"}
              onValueChange={(v) =>
                setForm({ ...form, leaderId: v === "none" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn leader" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Chưa gán —</SelectItem>
                {leaders.map((u: { id: string; name: string; email: string }) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={loading || !form.name}>
            {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
