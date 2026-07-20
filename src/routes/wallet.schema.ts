import { z } from 'zod';

export const requestWithdrawalSchema = z.object({
  amount: z.number('Số tiền không được để trống').positive('Số tiền rút phải lớn hơn 0'),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountHolder: z.string().optional(),
});

export const rejectWithdrawalSchema = z.object({
  note: z.string().optional(),
});
