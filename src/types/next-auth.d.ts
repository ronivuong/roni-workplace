import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      status: string;
      teams: { id: string; name: string; isLeader: boolean }[];
    };
  }

  interface User {
    id: string;
    role: string;
    status: string;
    teams?: { id: string; name: string; isLeader: boolean }[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    status?: string;
    teams?: { id: string; name: string; isLeader: boolean }[];
    _refreshed?: number;
  }
}
