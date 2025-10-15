import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email configuration - Brevo SMTP
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '98922e001@smtp-brevo.com',
    pass: process.env.SMTP_PASS || 'your-brevo-smtp-key'
  }
};

// Alternative Gmail configuration for development
const gmailConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER || 'your-email@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'your-app-password'
  }
};

// Create primary transporter
const transporter = nodemailer.createTransport(emailConfig);

// Create Gmail fallback transporter
const gmailTransporter = nodemailer.createTransport(gmailConfig);

// Function to get working transporter
const getWorkingTransporter = async () => {
  try {
    // Test primary transporter
    await transporter.verify();
    console.log('✅ Primary email service (Brevo) is working');
    return transporter;
  } catch (error) {
    console.log('⚠️ Primary email service failed, trying Gmail fallback...');
    try {
      // Test Gmail transporter
      await gmailTransporter.verify();
      console.log('✅ Gmail fallback email service is working');
      return gmailTransporter;
    } catch (gmailError) {
      console.error('❌ Both email services failed');
      throw new Error('No working email service available');
    }
  }
};

// Generate verification token
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
export const sendVerificationEmail = async (
  email: string, 
  name: string, 
  verificationToken: string,
  userType: 'student' | 'organization'
): Promise<boolean> => {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: `"OneAU Platform" <${emailConfig.auth.user}>`,
      to: email,
      subject: 'Verify Your OneAU Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1>Welcome to OneAU!</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f8fafc;">
            <h2>Hello ${name}!</h2>
            
            <p>Thank you for registering with OneAU Platform. To complete your ${userType} account setup, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #1e40af;">${verificationUrl}</p>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This verification link will expire in 24 hours</li>
              <li>If you didn't create this account, please ignore this email</li>
              <li>For security reasons, do not share this link with anyone</li>
            </ul>
            
            <p>Best regards,<br>The OneAU Team</p>
          </div>
          
          <div style="background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2024 OneAU Platform. All rights reserved.</p>
          </div>
        </div>
      `
    };

    // Get working transporter
    const workingTransporter = await getWorkingTransporter();
    
    const result = await workingTransporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    return false;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string, 
  name: string, 
  resetToken: string
): Promise<boolean> => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: `"OneAU Platform" <${emailConfig.auth.user}>`,
      to: email,
      subject: 'Reset Your OneAU Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1>Password Reset Request</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f8fafc;">
            <h2>Hello ${name}!</h2>
            
            <p>We received a request to reset your password for your OneAU account. Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #dc2626;">${resetUrl}</p>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This reset link will expire in 1 hour</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>For security reasons, do not share this link with anyone</li>
            </ul>
            
            <p>Best regards,<br>The OneAU Team</p>
          </div>
          
          <div style="background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2024 OneAU Platform. All rights reserved.</p>
          </div>
        </div>
      `
    };

    // Get working transporter
    const workingTransporter = await getWorkingTransporter();
    
    const result = await workingTransporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return false;
  }
};

// Test email configuration
export const testEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ Email server connection verified');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error);
    return false;
  }
};


export default transporter;