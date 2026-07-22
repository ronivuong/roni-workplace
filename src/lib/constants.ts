export const NOTIFICATION_LABELS: Record<string, string> = {
  CONTENT_APPROVED: "Nội dung duyệt",
  CONTENT_REJECTED: "Nội dung từ chối",
  VIDEO_READY: "Video sẵn sàng",
  PUBLISH_SUCCESS: "Đăng bài thành công",
  PERFORMANCE_MILESTONE: "Mốc hiệu suất",
  AI_SCHEDULE_REMINDER: "Nhắc lịch AI",
  MENTION: "Mention",
  TASK_ASSIGNED: "Giao việc",
  SYSTEM: "Hệ thống",
  TEAM_UPDATE: "Cập nhật team",
};

export const AI_TYPE_LABELS: Record<string, string> = {
  CONTENT_WRITING: "Viết nội dung",
  IMAGE_GENERATION: "Tạo hình ảnh",
  VIDEO_GENERATION: "Tạo video",
  FALLBACK: "Model dự phòng",
};

export const CONTENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  IN_REVIEW: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  PUBLISHED: "Đã đăng",
  SCHEDULED: "Lên lịch",
};

export const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "LEADER", label: "Leader" },
  { value: "AGENT", label: "Agent" },
] as const;
