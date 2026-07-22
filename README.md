# Roni Workplace

**AI Content Operating System**.

Nền tảng giúp creator quản lý toàn bộ quy trình: ý tưởng → AI content → video viral → publish → analytics → agent scheduler.

---

## Tech Stack

| Layer | Technology |
|--------|------------|
| Framework | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS v4 + shadcn-style components + Framer Motion |
| Auth | NextAuth.js (Credentials + JWT) |
| Database | Prisma + SQLite (local) / Vercel Postgres (production) |
| Upload | Vercel Blob (prod) + data-URL fallback (local) |
| State | Zustand + TanStack React Query |
| Charts | Recharts |
| AI | Vercel AI SDK + SpaceXAI / xAI (`XAI_API_KEY`) |
| Deploy | Vercel |

---

## Tính năng đã implement (Phase 1 — ưu tiên)

### Authentication & RBAC
- Đăng nhập Credentials (không có Register công khai)
- Role: **Admin** · **Leader** · **Agent**
- Middleware bảo vệ route + kiểm tra status `INACTIVE`
- JWT session kèm teams & role refresh định kỳ

### Team Management
- Tạo / sửa / xóa team (xóa: Admin)
- Tree view + danh sách phân cấp
- Thêm / xóa thành viên
- Gán Leader
- Chuyển thành viên giữa teams
- Thống kê views/likes/shares theo team

### User Management
- Danh sách user (filter role, team, status, search)
- Hồ sơ chi tiết (avatar, bio, teams, content, activity)
- Tạo / chỉnh sửa user (Leader chỉ tạo Agent)
- Upload avatar: drag & drop, crop vuông, preview
- Đặt lại mật khẩu
- Kích hoạt / vô hiệu hóa tài khoản

### Notifications
- Bell icon realtime (SSE + React Query polling)
- Đánh dấu đọc / đọc tất cả / xóa đã đọc
- Các loại: duyệt content, video ready, publish, milestone, AI reminder, mention, assign, team update
- Lịch sử đầy đủ trang `/notifications`

### AI Configuration (Settings — Admin only)
- API key riêng: Content Writing · Image · Video · Fallback
- Test Connection cho từng provider
- Mặc định SpaceXAI (xAI)

### Scaffold (UI + data seed — AI logic phase 2)
- AI Content Studio
- Publish Hub
- Video Studio
- Analytics (cá nhân + team charts)
- AI Agent Scheduler

---

## Bắt đầu nhanh

### 1. Cài đặt

```bash
cd roni-workplace
npm install
```

### 2. Biến môi trường

Copy `.env.example` → `.env` (đã có sẵn cho local):

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="roni-workplace-dev-secret-change-in-production-32chars"
BLOB_READ_WRITE_TOKEN=""   # optional
XAI_API_KEY=""             # optional — AI phase 2
```

### 3. Database + seed

```bash
npx prisma db push
npm run db:seed
```

### 4. Chạy dev

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

---

## Tài khoản demo

| Role | Email | Password |
|------|--------|----------|
| **Admin** | `admin@roni.vn` | `Admin@123` |
| **Leader** | `leader@roni.vn` | `Leader@123` |
| **Agent** | `an.pham@roni.vn` | `Agent@123` |

Teams mẫu: **Roni Media** → Content Marketing → Social Growth · Video Production.

---

## Scripts

```bash
npm run dev          # Next.js dev (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run db:push      # Sync Prisma schema
npm run db:seed      # Seed admin + teams + notifications
npm run db:studio    # Prisma Studio
npm run lint         # ESLint
```

---

## Cấu trúc thư mục

```
roni-workplace/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (dashboard)/     # App shell pages
│   │   ├── api/             # REST + SSE
│   │   ├── login/
│   │   └── page.tsx         # Landing
│   ├── components/
│   │   ├── layout/          # Sidebar, header, bottom nav
│   │   ├── users/           # Avatar upload, forms
│   │   ├── teams/
│   │   ├── notifications/
│   │   └── ui/              # Design system
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── prisma.ts
│   │   ├── rbac.ts
│   │   └── ...
│   ├── middleware.ts
│   └── types/
└── README.md
```

---

## Phân quyền (tóm tắt)

| Hành động | Admin | Leader | Agent |
|-----------|:-----:|:------:|:-----:|
| Xem dashboard | ✅ | ✅ | ✅ |
| Tạo user | ✅ | ✅ (Agent only) | ❌ |
| Quản lý team | ✅ | ✅ | Xem |
| Xóa team / user | ✅ | ❌ | ❌ |
| AI Settings | ✅ | ❌ | ❌ |
| Analytics team | ✅ | ✅ | Cá nhân |

---

## Deploy Vercel

1. Push repo lên GitHub.
2. Import project trên [vercel.com](https://vercel.com).
3. Thêm **Vercel Postgres** → copy `DATABASE_URL`.
4. Trong `prisma/schema.prisma`, đổi:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
5. Env vars trên Vercel:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` = `https://your-domain.vercel.app`
   - `NEXTAUTH_SECRET` (openssl rand -base64 32)
   - `BLOB_READ_WRITE_TOKEN` (Vercel Blob)
   - `XAI_API_KEY` (SpaceXAI)
6. Build command:
   ```bash
   npx prisma generate && npx prisma db push && npm run build
   ```
7. Chạy seed một lần (local trỏ prod URL hoặc Vercel CLI):
   ```bash
   DATABASE_URL="postgres://..." npm run db:seed
   ```

---

## Avatar upload

- Có `BLOB_READ_WRITE_TOKEN` → upload lên **Vercel Blob**
- Không có token → lưu **data URL** trong DB (tiện local dev, không dùng production lớn)

Hỗ trợ: JPEG/PNG/WebP/GIF, max 2MB, crop vuông client-side.

---

## Realtime notifications

- `GET /api/notifications/stream` — Server-Sent Events (poll DB 5s)
- Client fallback: React Query `refetchInterval` 30s
- Bell dropdown + trang lịch sử đầy đủ

---

## Roadmap Phase 2 (AI)

- [ ] Streaming chat content generation (Vercel AI SDK + `@ai-sdk/xai`)
- [ ] Image / video generation pipeline
- [ ] Publish connectors (WordPress REST, Meta, TikTok)
- [ ] Agent cron worker (Vercel Cron)
- [ ] Email invite flow

---

## License

Private / proprietary — Roni Workplace © 2026
