import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Roni Workplace...");

  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.agentJob.deleteMany();
  await prisma.content.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.aiConfig.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const password = await hash("Admin@123", 12);
  const leaderPass = await hash("Leader@123", 12);
  const agentPass = await hash("Agent@123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Nguyễn Admin",
      email: "admin@roni.vn",
      password,
      role: "ADMIN",
      status: "ACTIVE",
      title: "Quản trị viên hệ thống",
      bio: "Founder & Admin của Roni Workplace",
      phone: "0901000001",
      lastLoginAt: new Date(),
    },
  });

  const leader1 = await prisma.user.create({
    data: {
      name: "Trần Minh Leader",
      email: "leader@roni.vn",
      password: leaderPass,
      role: "LEADER",
      status: "ACTIVE",
      title: "Trưởng nhóm Content",
      bio: "Quản lý team content marketing",
      phone: "0901000002",
    },
  });

  const leader2 = await prisma.user.create({
    data: {
      name: "Lê Thu Video",
      email: "video.lead@roni.vn",
      password: leaderPass,
      role: "LEADER",
      status: "ACTIVE",
      title: "Trưởng nhóm Video",
      bio: "Chuyên short-form & viral video",
      phone: "0901000003",
    },
  });

  const agents = await Promise.all(
    [
      { name: "Phạm An", email: "an.pham@roni.vn", title: "Content Writer" },
      { name: "Hoàng Bảo", email: "bao.hoang@roni.vn", title: "Social Media" },
      { name: "Đỗ Chi", email: "chi.do@roni.vn", title: "Script Writer" },
      { name: "Vũ Dũng", email: "dung.vu@roni.vn", title: "Video Editor" },
      { name: "Ngô Em", email: "em.ngo@roni.vn", title: "Designer" },
      { name: "Bùi Giang", email: "giang.bui@roni.vn", title: "SEO Specialist" },
    ].map((u) =>
      prisma.user.create({
        data: {
          ...u,
          password: agentPass,
          role: "AGENT",
          status: "ACTIVE",
        },
      })
    )
  );

  const rootTeam = await prisma.team.create({
    data: {
      name: "Roni Media",
      slug: "roni-media",
      description: "Tổ chức sáng tạo nội dung chính",
      color: "#10B981",
    },
  });

  const contentTeam = await prisma.team.create({
    data: {
      name: "Content Marketing",
      slug: "content-marketing",
      description: "Viết bài, SEO, blog & social copy",
      color: "#3B82F6",
      parentId: rootTeam.id,
    },
  });

  const videoTeam = await prisma.team.create({
    data: {
      name: "Video Production",
      slug: "video-production",
      description: "Short-form, viral, YouTube",
      color: "#8B5CF6",
      parentId: rootTeam.id,
    },
  });

  const socialTeam = await prisma.team.create({
    data: {
      name: "Social Growth",
      slug: "social-growth",
      description: "TikTok, Facebook, Instagram growth",
      color: "#F59E0B",
      parentId: contentTeam.id,
    },
  });

  await prisma.teamMember.createMany({
    data: [
      { teamId: rootTeam.id, userId: admin.id, isLeader: true },
      { teamId: contentTeam.id, userId: leader1.id, isLeader: true },
      { teamId: contentTeam.id, userId: agents[0].id, isLeader: false },
      { teamId: contentTeam.id, userId: agents[1].id, isLeader: false },
      { teamId: contentTeam.id, userId: agents[5].id, isLeader: false },
      { teamId: videoTeam.id, userId: leader2.id, isLeader: true },
      { teamId: videoTeam.id, userId: agents[2].id, isLeader: false },
      { teamId: videoTeam.id, userId: agents[3].id, isLeader: false },
      { teamId: socialTeam.id, userId: leader1.id, isLeader: true },
      { teamId: socialTeam.id, userId: agents[1].id, isLeader: false },
      { teamId: socialTeam.id, userId: agents[4].id, isLeader: false },
    ],
  });

  await prisma.aiConfig.createMany({
    data: [
      {
        type: "CONTENT_WRITING",
        provider: "xai",
        model: "grok-4.5",
        baseUrl: "https://api.x.ai/v1",
        isEnabled: true,
      },
      {
        type: "IMAGE_GENERATION",
        provider: "xai",
        model: "grok-imagine",
        baseUrl: "https://api.x.ai/v1",
        isEnabled: true,
      },
      {
        type: "VIDEO_GENERATION",
        provider: "xai",
        model: "grok-video",
        baseUrl: "https://api.x.ai/v1",
        isEnabled: false,
      },
      {
        type: "FALLBACK",
        provider: "xai",
        model: "grok-3-mini",
        baseUrl: "https://api.x.ai/v1",
        isEnabled: true,
      },
    ],
  });

  await prisma.content.createMany({
    data: [
      {
        title: "10 tips viết caption viral trên TikTok",
        body: "Nội dung mẫu về caption viral...",
        type: "article",
        status: "PUBLISHED",
        platform: "tiktok",
        authorId: agents[0].id,
        teamId: contentTeam.id,
        views: 12500,
        likes: 890,
        shares: 210,
        publishedAt: new Date(Date.now() - 3 * 86400000),
      },
      {
        title: "Script: Review sản phẩm skincare 60s",
        body: "Hook → Problem → Solution → CTA",
        type: "script",
        status: "APPROVED",
        platform: "tiktok",
        authorId: agents[2].id,
        assigneeId: agents[3].id,
        teamId: videoTeam.id,
        views: 0,
      },
      {
        title: "Bài SEO: Xu hướng content 2026",
        body: "Phân tích xu hướng AI content...",
        type: "article",
        status: "IN_REVIEW",
        platform: "blog",
        authorId: agents[5].id,
        teamId: contentTeam.id,
      },
      {
        title: "Video: Behind the scenes team Roni",
        type: "video",
        status: "DRAFT",
        platform: "youtube",
        authorId: agents[3].id,
        teamId: videoTeam.id,
      },
      {
        title: "Carousel Instagram: Checklist content tuần",
        type: "social",
        status: "SCHEDULED",
        platform: "instagram",
        authorId: agents[1].id,
        teamId: socialTeam.id,
        scheduledAt: new Date(Date.now() + 2 * 86400000),
      },
    ],
  });

  const notifData = [
    {
      userId: admin.id,
      type: "PERFORMANCE_MILESTONE",
      title: "Hiệu suất đạt mốc 10K views",
      message: "Bài «10 tips viết caption viral» đã vượt 10.000 lượt xem!",
      link: "/analytics",
    },
    {
      userId: admin.id,
      type: "CONTENT_APPROVED",
      title: "Nội dung đã được duyệt",
      message: "Script review skincare đã được Leader phê duyệt.",
      link: "/content-studio",
    },
    {
      userId: admin.id,
      type: "VIDEO_READY",
      title: "Video đã generate xong",
      message: "Video AI «Behind the scenes» sẵn sàng xem trước.",
      link: "/video-studio",
    },
    {
      userId: leader1.id,
      type: "TASK_ASSIGNED",
      title: "Task mới được gán",
      message: "Bạn được gán review bài SEO xu hướng content 2026.",
      link: "/content-studio",
    },
    {
      userId: leader1.id,
      type: "AI_SCHEDULE_REMINDER",
      title: "AI Agent nhắc lịch đăng bài",
      message: "Carousel Instagram sẽ đăng sau 2 ngày. Kiểm tra lại nội dung.",
      link: "/agents",
    },
    {
      userId: agents[0].id,
      type: "PUBLISH_SUCCESS",
      title: "Đăng bài thành công",
      message: "Bài viết đã được publish lên WordPress & Facebook.",
      link: "/publish",
      isRead: true,
    },
    {
      userId: agents[2].id,
      type: "MENTION",
      title: "Bạn được mention",
      message: "@Đỗ Chi hãy cập nhật hook cho script skincare.",
      link: "/content-studio",
    },
    {
      userId: agents[3].id,
      type: "TASK_ASSIGNED",
      title: "Task được assign",
      message: "Bạn được giao edit video từ script skincare.",
      link: "/video-studio",
    },
  ];

  for (const n of notifData) {
    await prisma.notification.create({ data: n });
  }

  await prisma.agentJob.createMany({
    data: [
      {
        name: "Nhắc lịch đăng bài hàng ngày",
        description: "Quét content SCHEDULED và nhắc team trước 1 giờ",
        cron: "0 * * * *",
        isActive: true,
        userId: admin.id,
        nextRunAt: new Date(Date.now() + 3600000),
      },
      {
        name: "Báo cáo hiệu suất tuần",
        description: "Tổng hợp views/likes theo team mỗi thứ 2",
        cron: "0 9 * * 1",
        isActive: true,
        userId: leader1.id,
        nextRunAt: new Date(Date.now() + 86400000 * 2),
      },
      {
        name: "Gợi ý ý tưởng content",
        description: "AI đề xuất 5 ý tưởng dựa trên trend",
        cron: "0 8 * * *",
        isActive: false,
        userId: admin.id,
      },
    ],
  });

  await prisma.appSetting.createMany({
    data: [
      { key: "allow_leader_create_user", value: "true" },
      { key: "app_name", value: "Roni Workplace" },
      { key: "default_locale", value: "vi" },
    ],
  });

  await prisma.activityLog.createMany({
    data: [
      { userId: admin.id, action: "LOGIN", entity: "User", entityId: admin.id },
      {
        userId: agents[0].id,
        action: "PUBLISH",
        entity: "Content",
        metadata: '{"platform":"tiktok"}',
      },
      { userId: leader1.id, action: "APPROVE", entity: "Content" },
    ],
  });

  console.log("✅ Seed hoàn tất!");
  console.log("");
  console.log(" mon tài khoản demo:");
  console.log("  Admin:  admin@roni.vn  / Admin@123");
  console.log("  Leader: leader@roni.vn / Leader@123");
  console.log("  Agent:  an.pham@roni.vn / Agent@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
