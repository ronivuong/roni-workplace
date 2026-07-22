import Link from "next/link";
import {
  Sparkles,
  Users,
  BarChart3,
  Bot,
  Video,
  Share2,
  Shield,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Sparkles,
    title: "AI Content Studio",
    desc: "Viết bài, caption, script viral bằng AI — tối ưu cho tiếng Việt.",
  },
  {
    icon: Video,
    title: "Viral Video Pipeline",
    desc: "Từ script đến video ngắn sẵn sàng đăng TikTok / Reels / Shorts.",
  },
  {
    icon: Share2,
    title: "Publish Hub",
    desc: "Xuất bản WordPress & mạng xã hội chỉ với một lần click.",
  },
  {
    icon: Users,
    title: "Team & Phân quyền",
    desc: "Admin · Leader · Agent — quản lý team, task và workflow rõ ràng.",
  },
  {
    icon: BarChart3,
    title: "Performance Dashboard",
    desc: "Theo dõi views, engagement theo cá nhân và theo team realtime.",
  },
  {
    icon: Bot,
    title: "AI Agent Scheduler",
    desc: "Agent tự nhắc lịch đăng bài, báo cáo hiệu suất và gợi ý nội dung.",
  },
];

const perks = [
  "Không đăng ký công khai — chỉ invite nội bộ",
  "RBAC chặt chẽ: Admin / Leader / Agent",
  "Thông báo realtime + lịch sử đầy đủ",
  "Cấu hình API AI riêng từng loại content",
  "Avatar upload, hồ sơ chi tiết, thống kê hoạt động",
  "Deploy sẵn sàng trên Vercel",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="#features">Tính năng</Link>
            </Button>
            <Button asChild>
              <Link href="/login">
                Đăng nhập
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/80 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 md:pt-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <Shield className="h-3.5 w-3.5" />
            Nền tảng nội bộ cho team sáng tạo
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
            AI Content{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Operating System
            </span>{" "}
            cho creator Việt Nam
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 md:text-lg">
            Roni Workplace giúp bạn và team quản lý toàn bộ quy trình sản xuất nội dung —
            từ ý tưởng, viết AI, video viral đến publish & đo lường hiệu suất.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="min-w-[180px]">
              <Link href="/login">
                Vào workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-w-[180px]">
              <Link href="#features">Khám phá tính năng</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Demo: admin@roni.vn / Admin@123
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Mọi thứ creator cần — trong một nơi
          </h2>
          <p className="mt-2 text-slate-500">
            Thiết kế cho team Việt Nam: tiếng Việt, workflow rõ ràng, AI tích hợp sâu.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Perks */}
      <section className="border-y border-slate-200/80 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
              Bảo mật & vận hành chuyên nghiệp
            </h2>
            <p className="mt-3 text-slate-500">
              Không mở đăng ký công khai. Admin/Leader tạo tài khoản, gán team,
              theo dõi hiệu suất và cấu hình AI theo từng use-case.
            </p>
          </div>
          <ul className="space-y-3">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-14 text-white shadow-xl shadow-emerald-500/20">
          <h2 className="text-2xl font-bold md:text-3xl">Sẵn sàng vận hành content bằng AI?</h2>
          <p className="mx-auto mt-3 max-w-lg text-emerald-50">
            Đăng nhập workspace của bạn và bắt đầu sản xuất nội dung thông minh hơn.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 bg-white text-emerald-700 hover:bg-emerald-50"
          >
            <Link href="/login">Đăng nhập ngay</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} Roni Workplace. Built for Vietnamese creators.
      </footer>
    </div>
  );
}
