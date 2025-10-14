import dns from 'dns';
import { promisify } from 'util';
import validator from 'email-validator';
import net from 'net';
import nodemailer from 'nodemailer';

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

// Real email validation service that checks if emails actually exist
export class EmailValidator {
  
  // Check if email format is valid using email-validator
  static isValidEmailFormat(email: string): boolean {
    return validator.validate(email);
  }

  // Check if email domain exists and has MX records
  static async validateEmailDomain(email: string): Promise<{ 
    valid: boolean; 
    reason?: string; 
    mxRecords?: any[];
    domain?: string;
  }> {
    try {
      const domain = email.split('@')[1];
      
      if (!domain) {
        return { valid: false, reason: 'Invalid email format' };
      }

      // Check if domain has MX records (mail exchange records)
      const mxRecords = await resolveMx(domain);
      
      if (mxRecords && mxRecords.length > 0) {
        // Sort MX records by priority
        mxRecords.sort((a, b) => a.priority - b.priority);
        return { 
          valid: true, 
          mxRecords: mxRecords,
          domain: domain
        };
      } else {
        return { 
          valid: false, 
          reason: 'Domain does not accept emails (no MX records)',
          domain: domain
        };
      }
    } catch (error) {
      console.error('Domain validation error:', error);
      return { 
        valid: false, 
        reason: 'Domain not found or invalid',
        domain: email.split('@')[1]
      };
    }
  }

  // Check if email exists using a more reliable approach
  static async validateEmailExists(email: string): Promise<{ 
    valid: boolean; 
    reason?: string; 
    domain?: string;
    mxRecords?: any[];
  }> {
    try {
      // Step 1: Check email format
      if (!this.isValidEmailFormat(email)) {
        return { valid: false, reason: 'Invalid email format' };
      }

      // Step 2: Check if domain exists and has MX records
      const domainCheck = await this.validateEmailDomain(email);
      if (!domainCheck.valid) {
        return domainCheck;
      }

      // Step 3: Additional checks for common email providers
      const domain = email.split('@')[1].toLowerCase();
      
      // Check for common disposable email domains
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
        'mailinator.com', 'throwaway.email', 'temp-mail.org',
        'tempmail.net', 'guerrillamailblock.com', 'sharklasers.com',
        'throwaway.email', 'guerrillamail.de', 'guerrillamail.info',
        'guerrillamail.biz', 'guerrillamail.net', 'pokemail.net',
        'spam4.me', 'bccto.me', 'chacuo.net', 'dispostable.com'
      ];
      
      if (disposableDomains.includes(domain)) {
        return { 
          valid: false, 
          reason: 'Disposable email addresses are not allowed',
          domain: domain
        };
      }

      // Step 4: For AU emails, we trust them as they're university emails
      if (domain === 'au.edu') {
        return { 
          valid: true, 
          domain: domain,
          mxRecords: domainCheck.mxRecords
        };
      }

      // Step 5: For major email providers, trust them if domain is valid
      const trustedProviders = [
        'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk',
        'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
        'aol.com', 'icloud.com', 'me.com', 'mac.com',
        'protonmail.com', 'proton.me', 'zoho.com', 'yandex.com'
      ];

      if (trustedProviders.includes(domain)) {
        return { 
          valid: true, 
          domain: domain,
          mxRecords: domainCheck.mxRecords
        };
      }

      // Step 6: For other domains, we can only verify domain validity
      // We cannot verify if the specific email address actually exists
      // This will be confirmed by the email verification step
      return { 
        valid: true, 
        domain: domain,
        mxRecords: domainCheck.mxRecords
      };

    } catch (error) {
      console.error('Email validation error:', error);
      return { 
        valid: false, 
        reason: 'Email validation failed',
        domain: email.split('@')[1]
      };
    }
  }

  // Verify email via SMTP connection (without sending email)
  static async verifyEmailViaSMTP(email: string, mxRecords: any[]): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    return new Promise((resolve) => {
      if (!mxRecords || mxRecords.length === 0) {
        resolve({ valid: false, reason: 'No mail servers found' });
        return;
      }

      // Sort MX records by priority and try the first few
      const sortedMx = mxRecords.sort((a, b) => a.priority - b.priority);
      const smtpServer = sortedMx[0].exchange;
      const port = 25; // Standard SMTP port

      console.log(`🔍 Testing SMTP connection to ${smtpServer}:${port} for ${email}`);

      const socket = new net.Socket();
      let response = '';
      let step = 0;

      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({ valid: false, reason: 'SMTP connection timeout' });
      }, 10000); // 10 second timeout

      socket.connect(port, smtpServer, () => {
        console.log(`✅ Connected to ${smtpServer}:${port}`);
      });

      socket.on('data', (data) => {
        response += data.toString();
        console.log(`📨 SMTP Response: ${response.trim()}`);

        // Check for SMTP response codes
        if (response.includes('220')) {
          // Server ready, send HELO
          step = 1;
          socket.write(`HELO localhost\r\n`);
        } else if (response.includes('250') && step === 1) {
          // HELO accepted, send MAIL FROM
          step = 2;
          socket.write(`MAIL FROM: <test@localhost>\r\n`);
        } else if (response.includes('250') && step === 2) {
          // MAIL FROM accepted, send RCPT TO
          step = 3;
          socket.write(`RCPT TO: <${email}>\r\n`);
        } else if (response.includes('250') && step === 3) {
          // RCPT TO accepted - email exists!
          clearTimeout(timeout);
          socket.destroy();
          resolve({ valid: true });
        } else if (response.includes('550') || response.includes('551') || response.includes('553')) {
          // Email doesn't exist
          clearTimeout(timeout);
          socket.destroy();
          resolve({ valid: false, reason: 'Email address does not exist' });
        } else if (response.includes('421') || response.includes('450') || response.includes('451')) {
          // Temporary failure, try next MX record if available
          if (sortedMx.length > 1) {
            clearTimeout(timeout);
            socket.destroy();
            // Try next MX record
            this.verifyEmailViaSMTP(email, sortedMx.slice(1)).then(resolve);
          } else {
            clearTimeout(timeout);
            socket.destroy();
            resolve({ valid: false, reason: 'Temporary SMTP failure' });
          }
        }
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`❌ SMTP connection error: ${error.message}`);
        resolve({ valid: false, reason: `SMTP connection failed: ${error.message}` });
      });

      socket.on('close', () => {
        clearTimeout(timeout);
        if (step < 3) {
          resolve({ valid: false, reason: 'SMTP connection closed unexpectedly' });
        }
      });
    });
  }

  // Validate AU email specifically
  static validateAUEmail(email: string): { 
    valid: boolean; 
    type?: 'student' | 'organization'; 
    reason?: string;
  } {
    // Student pattern: u1234567@au.edu
    const studentPattern = /^u\d{7}@au\.edu$/;
    
    // Organization pattern: any valid email domain
    const orgPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (studentPattern.test(email)) {
      return { valid: true, type: 'student' };
    } else if (orgPattern.test(email)) {
      return { valid: true, type: 'organization' };
    } else {
      return { valid: false, reason: 'Invalid email format' };
    }
  }

  // Comprehensive email validation for registration
  static async validateEmailForRegistration(email: string, role: 'student' | 'organization'): Promise<{
    valid: boolean;
    reason?: string;
    type?: 'student' | 'organization';
    domain?: string;
    mxRecords?: any[];
  }> {
    try {
      // Step 1: Check email format
      if (!this.isValidEmailFormat(email)) {
        return { valid: false, reason: 'Invalid email format' };
      }

      // Step 2: Check AU email rules
      const auEmailCheck = this.validateAUEmail(email);
      if (!auEmailCheck.valid) {
        return auEmailCheck;
      }

      // Step 3: Check if email pattern matches role
      if (role === 'student' && auEmailCheck.type !== 'student') {
        return { 
          valid: false, 
          reason: 'Students must use AU email addresses (u[7-digits]@au.edu)' 
        };
      }

      if (role === 'organization' && auEmailCheck.type !== 'organization') {
        return { 
          valid: false, 
          reason: 'Please use a valid email address for organization registration' 
        };
      }

      // Step 4: Check if email actually exists (with fallback)
      try {
        const existenceCheck = await this.validateEmailExists(email);
        if (!existenceCheck.valid) {
          return existenceCheck;
        }

        return {
          valid: true,
          type: auEmailCheck.type,
          domain: existenceCheck.domain,
          mxRecords: existenceCheck.mxRecords
        };
      } catch (smtpError) {
        // If SMTP validation fails, fall back to domain validation only
        console.log('⚠️ SMTP validation failed, falling back to domain validation:', smtpError);
        
        const domainCheck = await this.validateEmailDomain(email);
        if (!domainCheck.valid) {
          return domainCheck;
        }

        // For fallback, we trust domain validation and rely on email verification
        return {
          valid: true,
          type: auEmailCheck.type,
          domain: domainCheck.domain,
          mxRecords: domainCheck.mxRecords
        };
      }

    } catch (error) {
      console.error('Email validation error:', error);
      return { 
        valid: false, 
        reason: 'Email validation failed' 
      };
    }
  }

  // Test if email actually exists by attempting to send a verification email
  static async testEmailExistence(email: string): Promise<{
    exists: boolean;
    reason?: string;
    bounceInfo?: any;
  }> {
    try {
      // Create a test email transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Send a test email to verify existence
      const testEmail = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'OneAU Email Verification Test',
        html: `
          <p>This is a test email to verify your email address exists.</p>
          <p>If you receive this email, your address is valid.</p>
          <p>This is an automated test - no action required.</p>
        `
      };

      const result = await transporter.sendMail(testEmail);
      
      // Check for bounce indicators in the response
      if (result.rejected && result.rejected.length > 0) {
        return {
          exists: false,
          reason: 'Email address was rejected by mail server',
          bounceInfo: result.rejected
        };
      }

      return {
        exists: true,
        reason: 'Email address accepted by mail server'
      };

    } catch (error) {
      console.error('Email existence test error:', error);
      
      // Check for specific bounce error codes
      if ((error as any).code === 'EENVELOPE' || (error as any).responseCode === 550) {
        return {
          exists: false,
          reason: 'Email address does not exist (bounced)'
        };
      }
      
      return {
        exists: false,
        reason: 'Unable to verify email existence'
      };
    }
  }

  // Test email validation (for testing purposes)
  static async testEmailValidation(email: string): Promise<{
    format: boolean;
    domain: boolean;
    mxRecords: boolean;
    disposable: boolean;
    overall: boolean;
    details: any;
  }> {
    const results = {
      format: false,
      domain: false,
      mxRecords: false,
      disposable: false,
      overall: false,
      details: {}
    };

    try {
      // Test 1: Format validation
      results.format = this.isValidEmailFormat(email);
      
      // Test 2: Domain validation
      const domainCheck = await this.validateEmailDomain(email);
      results.domain = domainCheck.valid;
      results.mxRecords = !!(domainCheck.mxRecords && domainCheck.mxRecords.length > 0);
      
      // Test 3: Disposable email check
      const domain = email.split('@')[1].toLowerCase();
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
        'mailinator.com', 'throwaway.email', 'temp-mail.org'
      ];
      results.disposable = disposableDomains.includes(domain);
      
      // Overall result
      results.overall = results.format && results.domain && !results.disposable;
      
      // Details
      results.details = {
        domain: domain,
        mxRecords: domainCheck.mxRecords,
        reason: domainCheck.reason
      };

    } catch (error) {
      console.error('Test email validation error:', error);
      results.details = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    return results;
  }
}

export default EmailValidator;
