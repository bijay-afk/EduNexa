import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(1).max(120),
  role: z.enum(['STUDENT', 'TEACHER']).default('STUDENT'),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const userProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  avatarUrl: z.string().url().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;