import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự").max(100),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  role: z.enum(["admin", "user"]).default("user"),
});

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(100, "Tên không được vượt quá 100 ký tự")
    .optional(),
  phone: z
    .string()
    .trim()
    .min(8, "Số điện thoại không hợp lệ")
    .max(20, "Số điện thoại không được vượt quá 20 ký tự")
    .optional(),
  address: z
    .string()
    .trim()
    .min(5, "Địa chỉ không hợp lệ")
    .max(200, "Địa chỉ không được vượt quá 200 ký tự")
    .optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  bankName: z.string().trim().max(100).optional(),
  bankAccountNumber: z.string().trim().max(30).optional(),
  bankAccountHolder: z.string().trim().max(100).optional(),
});

export const updateUserSettingsSchema = z
  .object({
    settings: z
      .object({
        notifications: z.boolean().optional(),
        language: z
          .string()
          .trim()
          .min(2, "Ngôn ngữ không hợp lệ")
          .max(10, "Ngôn ngữ không hợp lệ")
          .optional(),
      })
      .optional(),
    hasSeenOnboarding: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.settings !== undefined || data.hasSeenOnboarding !== undefined,
    { message: "Phải cung cấp settings hoặc hasSeenOnboarding" },
  );

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
