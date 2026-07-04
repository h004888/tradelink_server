export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserResponse {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

/**
 * Loại bỏ các field nhạy cảm trước khi trả về client.
 */
export const sanitizeUser = (user: IUser): IUserResponse => {
  const { password, ...safe } = user;
  return safe;
};
