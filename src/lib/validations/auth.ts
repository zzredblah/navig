import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
});

export const signInSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다').optional(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
