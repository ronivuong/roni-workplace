import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.status === "INACTIVE") {
    redirect("/login?error=inactive");
  }

  return <AppShell>{children}</AppShell>;
}
