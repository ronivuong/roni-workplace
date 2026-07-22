"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Users,
  Trash2,
  UserPlus,
  Pencil,
  ChevronRight,
  GitBranch,
  BarChart3,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
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
import { TeamFormDialog } from "@/components/teams/team-form-dialog";
import { canManageTeams, isAdmin } from "@/lib/rbac";
import { formatNumber, getInitials, cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Team = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  parentId: string | null;
  isActive: boolean;
  parent?: { id: string; name: string } | null;
  children: { id: string; name: string; color: string }[];
  members: {
    id: string;
    isLeader: boolean;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
      role: string;
      status: string;
    };
  }[];
  stats: { views: number; likes: number; shares: number };
  _count: { members: number; contents: number };
};

function buildTree(teams: Team[]) {
  const map = new Map<string, Team & { childNodes: Team[] }>();
  teams.forEach((t) => map.set(t.id, { ...t, childNodes: [] }));
  const roots: (Team & { childNodes: Team[] })[] = [];
  map.forEach((t) => {
    if (t.parentId && map.has(t.parentId)) {
      map.get(t.parentId)!.childNodes.push(t);
    } else {
      roots.push(t);
    }
  });
  return roots;
}

function TeamTreeNode({
  team,
  depth = 0,
  onSelect,
  selectedId,
}: {
  team: Team & { childNodes?: Team[] };
  depth?: number;
  onSelect: (t: Team) => void;
  selectedId?: string;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(team)}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
          selectedId === team.id
            ? "bg-emerald-50 text-emerald-800 font-medium"
            : "hover:bg-slate-50 text-slate-700"
        )}
        style={{ paddingLeft: 12 + depth * 16 }}
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: team.color }}
        />
        <span className="truncate flex-1">{team.name}</span>
        <span className="text-[10px] text-slate-400">{team._count.members}</span>
        {team.childNodes && team.childNodes.length > 0 && (
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        )}
      </button>
      {team.childNodes?.map((c) => (
        <TeamTreeNode
          key={c.id}
          team={c as Team & { childNodes?: Team[] }}
          depth={depth + 1}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}

export default function TeamsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Partial<Team> | null>(null);
  const [selected, setSelected] = useState<Team | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [pickUserId, setPickUserId] = useState("");
  const [toTeamId, setToTeamId] = useState("");
  const [moveUserId, setMoveUserId] = useState("");

  const canManage = canManageTeams(session?.user?.role);
  const admin = isAdmin(session?.user?.role);

  const { data, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ teams: Team[] }>;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
    enabled: canManage,
  });

  const teams = useMemo(() => data?.teams || [], [data?.teams]);
  const tree = useMemo(() => buildTree(teams), [teams]);

  // Keep selected in sync
  const current = selected
    ? teams.find((t) => t.id === selected.id) || selected
    : teams[0] || null;

  const addMember = async () => {
    if (!current || !pickUserId) return;
    const res = await fetch(`/api/teams/${current.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: pickUserId }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast.error(d.error || "Lỗi");
      return;
    }
    toast.success("Đã thêm thành viên");
    setAddMemberOpen(false);
    setPickUserId("");
    qc.invalidateQueries({ queryKey: ["teams"] });
  };

  const removeMember = async (userId: string) => {
    if (!current) return;
    if (!confirm("Xóa thành viên khỏi team?")) return;
    const res = await fetch(
      `/api/teams/${current.id}/members?userId=${userId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      toast.error("Không thể xóa");
      return;
    }
    toast.success("Đã xóa thành viên");
    qc.invalidateQueries({ queryKey: ["teams"] });
  };

  const moveMember = async () => {
    if (!current || !moveUserId || !toTeamId) return;
    const res = await fetch(`/api/teams/${current.id}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: moveUserId, toTeamId }),
    });
    if (!res.ok) {
      toast.error("Chuyển team thất bại");
      return;
    }
    toast.success("Đã chuyển thành viên");
    setMoveOpen(false);
    setMoveUserId("");
    setToTeamId("");
    qc.invalidateQueries({ queryKey: ["teams"] });
  };

  const deleteTeam = async (id: string) => {
    if (!confirm("Xóa team này? Thành viên sẽ bị gỡ khỏi team.")) return;
    const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error || "Không thể xóa");
      return;
    }
    toast.success("Đã xóa team");
    setSelected(null);
    qc.invalidateQueries({ queryKey: ["teams"] });
  };

  const setLeader = async (userId: string) => {
    if (!current) return;
    const res = await fetch(`/api/teams/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaderId: userId }),
    });
    if (!res.ok) {
      toast.error("Không gán được Leader");
      return;
    }
    toast.success("Đã gán Leader");
    qc.invalidateQueries({ queryKey: ["teams"] });
  };

  return (
    <div>
      <PageHeader
        title="Quản lý Team"
        description="Tạo team, phân cấp, gán Leader và theo dõi hiệu suất."
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setEditTeam(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Tạo team
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80" />
          <Skeleton className="h-80 lg:col-span-2" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Tree / list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-emerald-600" />
                Cấu trúc team
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <Tabs defaultValue="tree">
                <TabsList className="w-full mb-2">
                  <TabsTrigger value="tree" className="flex-1">
                    Tree
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex-1">
                    Danh sách
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="tree" className="mt-0 space-y-0.5">
                  {tree.map((t) => (
                    <TeamTreeNode
                      key={t.id}
                      team={t}
                      onSelect={setSelected}
                      selectedId={current?.id}
                    />
                  ))}
                </TabsContent>
                <TabsContent value="list" className="mt-0 space-y-1">
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelected(t)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm",
                        current?.id === t.id
                          ? "bg-emerald-50 text-emerald-800 font-medium"
                          : "hover:bg-slate-50"
                      )}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="truncate flex-1">{t.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {t._count.members}
                      </Badge>
                    </button>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Detail */}
          <div className="lg:col-span-2 space-y-4">
            {!current ? (
              <Card>
                <CardContent className="flex flex-col items-center py-16 text-slate-400">
                  <Users className="h-10 w-10 mb-2" />
                  Chọn một team để xem chi tiết
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: current.color }}
                          />
                          <h2 className="text-xl font-bold text-slate-900">
                            {current.name}
                          </h2>
                          {!current.isActive && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {current.description || "Chưa có mô tả"}
                        </p>
                        {current.parent && (
                          <p className="mt-1 text-xs text-slate-400">
                            Thuộc: {current.parent.name}
                          </p>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const leader = current.members.find((m) => m.isLeader);
                              setEditTeam({
                                id: current.id,
                                name: current.name,
                                description: current.description,
                                color: current.color,
                                parentId: current.parentId,
                                // @ts-expect-error leaderId for form
                                leaderId: leader?.user.id || null,
                              });
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Sửa
                          </Button>
                          <Button size="sm" onClick={() => setAddMemberOpen(true)}>
                            <UserPlus className="h-3.5 w-3.5" />
                            Thêm TV
                          </Button>
                          {admin && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteTeam(current.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        <p className="text-xs text-slate-500">Thành viên</p>
                        <p className="text-lg font-bold text-slate-900">
                          {current._count.members}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        <p className="text-xs text-slate-500">Nội dung</p>
                        <p className="text-lg font-bold text-slate-900">
                          {current._count.contents}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-3 text-center">
                        <p className="text-xs text-emerald-700">Views</p>
                        <p className="text-lg font-bold text-emerald-700">
                          {formatNumber(current.stats?.views || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Thành viên</CardTitle>
                    {canManage && current.members.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setMoveOpen(true)}
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Chuyển team
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {current.members.length === 0 ? (
                      <p className="text-sm text-slate-500 py-4 text-center">
                        Chưa có thành viên
                      </p>
                    ) : (
                      current.members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={m.user.image || undefined} />
                              <AvatarFallback>
                                {getInitials(m.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-900">
                                  {m.user.name}
                                </p>
                                {m.isLeader && (
                                  <Badge variant="warning" className="text-[10px]">
                                    Leader
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{m.user.email}</p>
                            </div>
                          </div>
                          {canManage && (
                            <div className="flex gap-1">
                              {!m.isLeader && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setLeader(m.user.id)}
                                >
                                  Gán Leader
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500"
                                onClick={() => removeMember(m.user.id)}
                              >
                                Xóa
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-emerald-600" />
                      Hiệu suất team
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-slate-900">
                          {formatNumber(current.stats?.views || 0)}
                        </p>
                        <p className="text-xs text-slate-500">Views</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">
                          {formatNumber(current.stats?.likes || 0)}
                        </p>
                        <p className="text-xs text-slate-500">Likes</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">
                          {formatNumber(current.stats?.shares || 0)}
                        </p>
                        <p className="text-xs text-slate-500">Shares</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      <TeamFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTeam as never}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["teams"] })}
      />

      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm thành viên vào {current?.name}</DialogTitle>
          </DialogHeader>
          <Select value={pickUserId} onValueChange={setPickUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn user" />
            </SelectTrigger>
            <SelectContent>
              {(usersData?.users || []).map(
                (u: { id: string; name: string; email: string }) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} — {u.email}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
              Hủy
            </Button>
            <Button onClick={addMember} disabled={!pickUserId}>
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chuyển thành viên sang team khác</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={moveUserId} onValueChange={setMoveUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn thành viên" />
              </SelectTrigger>
              <SelectContent>
                {current?.members.map((m) => (
                  <SelectItem key={m.user.id} value={m.user.id}>
                    {m.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={toTeamId} onValueChange={setToTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Team đích" />
              </SelectTrigger>
              <SelectContent>
                {teams
                  .filter((t) => t.id !== current?.id)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>
              Hủy
            </Button>
            <Button onClick={moveMember} disabled={!moveUserId || !toTeamId}>
              Chuyển
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
