export type AppRole = "ADMIN" | "LEADER" | "AGENT";

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  LEADER: "Leader",
  AGENT: "Agent",
};

export const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-rose-100 text-rose-700 border-rose-200",
  LEADER: "bg-amber-100 text-amber-800 border-amber-200",
  AGENT: "bg-sky-100 text-sky-700 border-sky-200",
};

/** Hierarchy: ADMIN > LEADER > AGENT */
const ROLE_RANK: Record<string, number> = {
  ADMIN: 3,
  LEADER: 2,
  AGENT: 1,
};

export function hasMinRole(userRole: string | undefined | null, min: AppRole): boolean {
  if (!userRole) return false;
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[min] ?? 0);
}

export function isAdmin(role?: string | null) {
  return role === "ADMIN";
}

export function isLeaderOrAbove(role?: string | null) {
  return role === "ADMIN" || role === "LEADER";
}

export function canManageUsers(role?: string | null, allowLeaderCreate = true) {
  if (role === "ADMIN") return true;
  if (role === "LEADER" && allowLeaderCreate) return true;
  return false;
}

export function canManageTeams(role?: string | null) {
  return isLeaderOrAbove(role);
}

export function canAccessSettings(role?: string | null) {
  return isAdmin(role);
}

export function canEditUser(
  actorRole: string | undefined | null,
  targetRole: string,
  actorId: string,
  targetId: string
) {
  if (actorId === targetId) return true; // self profile basic
  if (actorRole === "ADMIN") return true;
  if (actorRole === "LEADER" && targetRole === "AGENT") return true;
  return false;
}

export const PERMISSIONS = {
  "users:read": ["ADMIN", "LEADER"],
  "users:write": ["ADMIN", "LEADER"],
  "users:delete": ["ADMIN"],
  "teams:read": ["ADMIN", "LEADER", "AGENT"],
  "teams:write": ["ADMIN", "LEADER"],
  "teams:delete": ["ADMIN"],
  "settings:ai": ["ADMIN"],
  "settings:general": ["ADMIN"],
  "analytics:team": ["ADMIN", "LEADER"],
  "analytics:all": ["ADMIN"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}
