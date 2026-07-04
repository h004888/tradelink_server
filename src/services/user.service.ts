import { IUser, IUserResponse, sanitizeUser } from '../models/user.model';
import { AppError } from '../utils/AppError';

// Mock database — thay bằng database thật (MongoDB, PostgreSQL, etc.)
const users: IUser[] = [];

export const findAll = async (): Promise<IUserResponse[]> => {
  return users.map(sanitizeUser);
};

export const findById = async (id: string): Promise<IUserResponse> => {
  const user = users.find(u => u.id === id);
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  return sanitizeUser(user);
};

export const findByEmail = async (email: string): Promise<IUser | undefined> => {
  return users.find(u => u.email === email);
};

export const create = async (data: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUserResponse> => {
  // Kiểm tra email trùng
  const existing = await findByEmail(data.email);
  if (existing) throw new AppError('Email đã được sử dụng', 409);

  const now = new Date();
  const user: IUser = {
    id: Date.now().toString(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  users.push(user);
  return sanitizeUser(user);
};

export const update = async (id: string, data: Partial<IUser>): Promise<IUserResponse> => {
  const index = users.findIndex(u => u.id === id);
  if (index === -1) throw new AppError('Không tìm thấy người dùng', 404);

  users[index] = { ...users[index], ...data, updatedAt: new Date() };
  return sanitizeUser(users[index]);
};

export const remove = async (id: string): Promise<void> => {
  const index = users.findIndex(u => u.id === id);
  if (index === -1) throw new AppError('Không tìm thấy người dùng', 404);

  users.splice(index, 1);
};
