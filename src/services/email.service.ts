import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTP = async (email: string, otp: string): Promise<void> => {
  const mailOptions = {
    from: `"TradeLink" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Mã xác nhận OTP - TradeLink',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1A365D; margin-bottom: 16px;">Xác nhận tài khoản TradeLink</h2>
        <p style="color: #333; margin-bottom: 16px;">Mã OTP của bạn là:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;
                    color: #1A365D; background: #f0f4f8; padding: 20px;
                    text-align: center; border-radius: 8px; margin-bottom: 16px;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 14px; margin-bottom: 8px;">
          Mã này sẽ hết hạn trong <strong>5 phút</strong>.
        </p>
        <p style="color: #999; font-size: 12px;">
          Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error);
    return false;
  }
};
