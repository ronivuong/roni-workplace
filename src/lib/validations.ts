import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const createUserSchema = z.object({
  name: z.string().min(2, "Tên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  role: z.enum(["ADMIN", "LEADER", "AGENT"]),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  phone: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  teamIds: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "LEADER", "AGENT"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  phone: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  teamIds: z.array(z.string()).optional(),
  password: z.string().min(6).optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(2, "Tên team tối thiểu 2 ký tự"),
  description: z.string().optional().nullable(),
  color: z.string().optional(),
  parentId: z.string().optional().nullable(),
  leaderId: z.string().optional().nullable(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional(),
  parentId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  leaderId: z.string().optional().nullable(),
});

export const teamMemberSchema = z.object({
  userId: z.string(),
  isLeader: z.boolean().optional(),
});

export const aiConfigSchema = z.object({
  type: z.enum(["CONTENT_WRITING", "IMAGE_GENERATION", "VIDEO_GENERATION", "FALLBACK"]),
  provider: z.string().min(1),
  model: z.string().optional().nullable(),
  apiKey: z.string().optional().nullable(),
  baseUrl: z.string().optional().nullable(),
  isEnabled: z.boolean().optional(),
});
