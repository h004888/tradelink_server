/**
 * Custom application error class.
 * Khởi tạo với HTTP status code và message.
 */
export class AppError extends Error {
  public status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
    // Đảm bảo prototype chain đúng khi extends Error trong TS
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
