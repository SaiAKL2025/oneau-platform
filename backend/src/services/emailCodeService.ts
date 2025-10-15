import sgMail from '@sendgrid/mail';

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// Function to generate a 6-digit verification code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

// Function to send a verification code email using SendGrid
export const sendVerificationCode = async (
  email: string,
  name: string,
  code: string
): Promise<boolean> => {
  try {
    console.log('📧 Attempting to send email via SendGrid...');
    console.log('📧 To:', email);
    console.log('📧 Code:', code);
    
    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@oneau-platform.com',
        name: process.env.SENDGRID_FROM_NAME || 'OneAU Platform'
      },
      subject: 'OneAU Platform: Your Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #007bff; color: #ffffff; padding: 20px; text-align: center; background-image: linear-gradient(to right, #0056b3, #007bff);">
            <h1 style="margin: 0; font-size: 24px;">OneAU Platform</h1>
          </div>
          <div style="padding: 30px;">
            <p>Dear ${name},</p>
            <p>Thank you for registering with OneAU Platform. To complete your registration, please use the following verification code:</p>
            <div style="background: #f5f5f5; border: 2px dashed #007bff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h2 style="font-size: 36px; color: #007bff; text-align: center; margin: 20px 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</h2>
            </div>
            <p>This code is valid for <strong>10 minutes</strong>. Please do not share this code with anyone.</p>
            <p>Once your email is verified, your organization application will be submitted for admin approval. We will notify you once it has been reviewed.</p>
            <p>If you did not request this, please ignore this email.</p>
            <p>Best regards,</p>
            <p>The OneAU Team</p>
          </div>
          <div style="background-color: #f4f4f4; color: #777; padding: 20px; text-align: center; font-size: 12px; border-top: 1px solid #eee;">
            <p>&copy; ${new Date().getFullYear()} OneAU Platform. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      `
    };

    const response = await sgMail.send(msg);
    console.log('✅ SendGrid email sent successfully!');
    console.log('✅ Response status:', response[0].statusCode);
    console.log('✅ Message ID:', response[0].headers['x-message-id']);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send SendGrid email:', error);
    if (error.response) {
      console.error('❌ SendGrid error response:', error.response.body);
    }
    return false;
  }
};

// Function to verify the code (keep existing logic)
export const verifyCode = async (
  email: string,
  inputCode: string,
  storedCode: string,
  codeExpiry: Date
): Promise<boolean> => {
  if (!storedCode || !codeExpiry) {
    console.log('❌ No stored code or expiry found.');
    return false;
  }

  if (inputCode !== storedCode) {
    console.log('❌ Invalid verification code.');
    return false;
  }

  if (new Date() > codeExpiry) {
    console.log('❌ Verification code has expired.');
    return false;
  }

  console.log('✅ Verification code is valid');
  return true;
};

export default {
  generateVerificationCode,
  sendVerificationCode,
  verifyCode
};
