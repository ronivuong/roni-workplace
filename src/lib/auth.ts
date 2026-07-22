import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Vui lòng nhập email và mật khẩu");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: {
            teamMembers: {
              include: { team: true },
            },
          },
        });

        if (!user) {
          throw new Error("Email hoặc mật khẩu không đúng");
        }

        if (user.status === "INACTIVE") {
          throw new Error("Tài khoản đã bị vô hiệu hóa. Liên hệ Admin.");
        }

        const valid = await compare(credentials.password, user.password);
        if (!valid) {
          throw new Error("Email hoặc mật khẩu không đúng");
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            entity: "User",
            entityId: user.id,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
          teams: user.teamMembers.map((m) => ({
            id: m.team.id,
            name: m.team.name,
            isLeader: m.isLeader,
          })),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.teams = user.teams;
        token.picture = user.image;
        token.name = user.name;
      }

      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.image !== undefined) token.picture = session.image;
        if (session.role) token.role = session.role;
      }

      // Refresh role/status periodically from DB
      if (token.id && (!token._refreshed || Date.now() - (token._refreshed as number) > 60000)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              role: true,
              status: true,
              name: true,
              image: true,
              teamMembers: { include: { team: { select: { id: true, name: true } } } },
            },
          });
          if (dbUser) {
            if (dbUser.status === "INACTIVE") {
              token.status = "INACTIVE";
            } else {
              token.role = dbUser.role;
              token.status = dbUser.status;
              token.name = dbUser.name;
              token.picture = dbUser.image;
              token.teams = dbUser.teamMembers.map((m) => ({
                id: m.team.id,
                name: m.team.name,
                isLeader: false,
              }));
            }
          }
          token._refreshed = Date.now();
        } catch {
          // ignore refresh errors
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
        session.user.teams = (token.teams as { id: string; name: string; isLeader: boolean }[]) || [];
        session.user.image = (token.picture as string) || null;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  if (session.user.status === "INACTIVE") {
    throw new Error("INACTIVE");
  }
  return session;
}

export async function requireRole(minRole: "ADMIN" | "LEADER" | "AGENT") {
  const session = await requireSession();
  const rank: Record<string, number> = { ADMIN: 3, LEADER: 2, AGENT: 1 };
  if ((rank[session.user.role] ?? 0) < rank[minRole]) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
