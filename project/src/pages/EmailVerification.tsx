import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Mail, RefreshCw } from 'lucide-react';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');

    if (!token || !emailParam) {
      setVerificationStatus('error');
      setMessage('Invalid verification link. Please check your email and try again.');
      return;
    }

    setEmail(emailParam);
    verifyEmail(token, emailParam);
  }, [searchParams]);

  const verifyEmail = async (token: string, email: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/email/verify-email?token=${token}&email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (data.success) {
        setVerificationStatus('success');
        setMessage('Email verified successfully! You can now log in to your account.');
      } else {
        if (data.message.includes('expired')) {
          setVerificationStatus('expired');
          setMessage('Verification link has expired. Please request a new verification email.');
        } else {
          setVerificationStatus('error');
          setMessage(data.message || 'Email verification failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  const resendVerification = async () => {
    if (!email) return;

    setResending(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/email/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Verification email sent successfully! Please check your inbox.');
      } else {
        setMessage(data.message || 'Failed to send verification email. Please try again.');
      }
    } catch (error) {
      console.error('Resend error:', error);
      setMessage('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />;
      case 'error':
      case 'expired':
        return <XCircle className="h-16 w-16 text-red-500 mx-auto" />;
      default:
        return <Mail className="h-16 w-16 text-blue-500 mx-auto animate-pulse" />;
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'success':
        return 'text-green-600';
      case 'error':
      case 'expired':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <img src="/image copy copy.png" alt="OneAU Logo" className="h-16 w-auto" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {getStatusIcon()}
            
            <h3 className={`mt-4 text-lg font-medium ${getStatusColor()}`}>
              {verificationStatus === 'loading' && 'Verifying your email...'}
              {verificationStatus === 'success' && 'Email Verified!'}
              {verificationStatus === 'error' && 'Verification Failed'}
              {verificationStatus === 'expired' && 'Link Expired'}
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              {message}
            </p>

            {verificationStatus === 'success' && (
              <div className="mt-6">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Login
                </button>
              </div>
            )}

            {(verificationStatus === 'error' || verificationStatus === 'expired') && (
              <div className="mt-6 space-y-3">
                <button
                  onClick={resendVerification}
                  disabled={resending}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resending ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      Sending...
                    </>
                  ) : (
                    'Resend Verification Email'
                  )}
                </button>
                
                <button
                  onClick={() => navigate('/register')}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Registration
                </button>
              </div>
            )}

            {verificationStatus === 'loading' && (
              <div className="mt-6">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Please wait while we verify your email...
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              onClick={resendVerification}
              disabled={resending || !email}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              {resending ? 'Sending...' : 'resend verification email'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
