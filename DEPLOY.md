# Deploy Roni Workplace lên web (Vercel)

Repo GitHub: https://github.com/ronivuong/roni-workplace

> **Lưu ý quan trọng:** SQLite chỉ dùng local. Trên Vercel (serverless) **bắt buộc** dùng **PostgreSQL** (Neon / Vercel Postgres / Supabase).

---

## Cách nhanh nhất: Dashboard Vercel (khuyên dùng)

### Bước 1 — Tạo database Postgres (miễn phí)

1. Vào [https://neon.tech](https://neon.tech) → Sign up (có thể dùng GitHub).
2. **Create project** → copy **Connection string** dạng:
   ```
   postgresql://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```
3. Giữ chuỗi này — sẽ dán vào Vercel.

*(Hoặc trên Vercel: Storage → Create Database → Postgres / Neon.)*

### Bước 2 — Đổi Prisma sang PostgreSQL

Trong `prisma/schema.prisma`, sửa:

```prisma
datasource db {
  provider = "postgresql"   // trước là "sqlite"
  url      = env("DATABASE_URL")
}
```

Commit & push:

```bash
cd ~/roni-workplace
# sửa schema như trên
git add prisma/schema.prisma
git commit -m "chore: use PostgreSQL for production"
git push
```

### Bước 3 — Import project trên Vercel

1. Mở [https://vercel.com/new](https://vercel.com/new)
2. Đăng nhập bằng **GitHub** (`ronivuong`)
3. **Import** repo `roni-workplace`
4. Framework: **Next.js** (tự detect)
5. **Chưa bấm Deploy** — vào **Environment Variables** trước

### Bước 4 — Thêm Environment Variables

| Name | Value | Ghi chú |
|------|--------|---------|
| `DATABASE_URL` | `postgresql://...` (Neon) | Bắt buộc |
| `NEXTAUTH_SECRET` | chuỗi ngẫu nhiên dài | Tạo bằng lệnh bên dưới |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Cập nhật sau khi có domain |
| `BLOB_READ_WRITE_TOKEN` | (optional) | Vercel → Storage → Blob |
| `XAI_API_KEY` | (optional) | Cho tính năng AI sau |

Tạo secret:

```bash
openssl rand -base64 32
```

Áp dụng cho **Production**, **Preview**, **Development**.

### Bước 5 — Deploy

1. Bấm **Deploy**
2. Chờ build ~2–3 phút
3. Mở URL dạng `https://roni-workplace-xxx.vercel.app`

### Bước 6 — Cập nhật `NEXTAUTH_URL`

1. Vercel → Project → **Settings** → **Environment Variables**
2. Sửa `NEXTAUTH_URL` = URL production thật (vd. `https://roni-workplace.vercel.app`)
3. **Redeploy** (Deployments → ⋯ → Redeploy)

### Bước 7 — Seed dữ liệu demo

Trên máy local, trỏ tạm sang DB production:

```bash
cd ~/roni-workplace
DATABASE_URL="postgresql://...neon..." npm run db:seed
```

Sau đó đăng nhập:

- Admin: `admin@roni.vn` / `Admin@123`

---

## Cách 2 — CLI Vercel

```bash
cd ~/roni-workplace
npx vercel login
npx vercel          # preview
npx vercel --prod   # production
```

Vẫn cần set env vars (CLI hỏi hoặc `npx vercel env add`).

---

## Checklist sau deploy

- [ ] Trang landing mở được
- [ ] `/login` đăng nhập được
- [ ] Dashboard không lỗi 500
- [ ] Tạo user / team hoạt động
- [ ] (Optional) Upload avatar với Blob token

---

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|-----|-------------|------------|
| Build fail Prisma | Vẫn để `sqlite` | Đổi `provider = "postgresql"` |
| `NEXTAUTH` lỗi | Thiếu secret / URL sai | Set `NEXTAUTH_SECRET` + `NEXTAUTH_URL` |
| 500 khi login | DB chưa schema / chưa seed | `prisma db push` + seed |
| Data mất sau deploy | Dùng SQLite trên Vercel | Chuyển Neon Postgres |

---

## Domain riêng (tuỳ chọn)

Vercel → Project → **Settings** → **Domains** → thêm `app.yourdomain.com`.

Cập nhật lại `NEXTAUTH_URL` cho domain mới.
