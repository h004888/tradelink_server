import { z } from 'zod';

const emailStr = (msg: string) => z.string(msg).email('Email không hợp lệ').transform((v) => v.toLowerCase().trim());
const passwordStr = z.string('Mật khẩu không được để trống').min(6, 'Mật khẩu tối thiểu 6 ký tự');
const tokenStr = z.string('Token không được để trống').min(1, 'Token không được để trống');

export const registerSchema = z.object({
  email: emailStr('Email không được để trống'),
  password: passwordStr,
  name: z.string('Tên không được để trống').min(2, 'Tên phải từ 2 ký tự').max(100, 'Tên tối đa 100 ký tự'),
});

export const loginSchema = z.object({
  email: emailStr('Email không được để trống'),
  password: z.string('Mật khẩu không được để trống').min(1, 'Mật khẩu không được để trống'),
});

export const refreshSchema = z.object({
  refreshToken: z.string('Thiếu refreshToken').min(1, 'Refresh token không được để trống'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string('Thiếu mật khẩu cũ').min(1, 'Mật khẩu cũ không được để trống'),
  newPassword: passwordStr,
});

export const forgotPasswordSchema = z.object({
  email: emailStr('Thiếu email'),
});

export const resetPasswordSchema = z.object({
  token: tokenStr,
  newPassword: passwordStr,
});

export const verifyEmailSchema = z.object({
  token: tokenStr,
});
