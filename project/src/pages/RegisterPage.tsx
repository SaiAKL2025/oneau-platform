import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Upload, X, FileText, Image } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import RegistrationGuard from '../components/RegistrationGuard';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    faculty: '',
    studentId: '',
    orgName: '',
    orgType: '',
    description: '',
    president: '',
    founded: '',
    members: '',
    website: ''
  });
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [emailVerificationMessage, setEmailVerificationMessage] = useState('');
  const [emailValidation, setEmailValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    message: string;
  }>({
    isValidating: false,
    isValid: null,
    message: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Send verification code
  const sendVerificationCode = async () => {
    if (!formData.email) {
      setError('Please enter your email address first');
      return;
    }

    setSendingCode(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email })
      });

      const result = await response.json();

      if (result.success) {
        setCodeSent(true);
        setError('');
      } else {
        setError(result.message || 'Failed to send verification code');
      }
    } catch (error: any) {
      console.error('Send code error:', error);
      setError('Failed to send verification code');
    }

    setSendingCode(false);
  };

  // Verify the entered code
  const verifyCode = async (code: string) => {
    if (!formData.email || code.length !== 6) {
      return;
    }

    setVerifyingCode(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/verify-code-frontend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email,
          code: code
        })
      });

      const result = await response.json();

      if (result.success) {
        setCodeVerified(true);
        setError('');
      } else {
        setCodeVerified(false);
        setError(result.message || 'Invalid verification code');
      }
    } catch (error: any) {
      console.error('Verify code error:', error);
      setCodeVerified(false);
      setError('Failed to verify code');
    }

    setVerifyingCode(false);
  };

  // Real-time email validation
  const validateEmail = async (email: string) => {
    if (!email || email.length < 5) {
      setEmailValidation({
        isValidating: false,
        isValid: null,
        message: ''
      });
      return;
    }

    setEmailValidation({
      isValidating: true,
      isValid: null,
      message: 'Validating email...'
    });

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/validate-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          role: formData.role
        })
      });

      const result = await response.json();

      if (result.success && result.valid) {
        setEmailValidation({
          isValidating: false,
          isValid: true,
          message: 'Email format and domain are valid. Verification email will be sent to confirm.'
        });
      } else {
        setEmailValidation({
          isValidating: false,
          isValid: false,
          message: result.message || 'Email validation failed'
        });
      }
    } catch (error) {
      console.error('Email validation error:', error);
      setEmailValidation({
        isValidating: false,
        isValid: false,
        message: 'Email validation failed. Please try again.'
      });
    }
  };

  // Debounced email validation
  const debouncedValidateEmail = (() => {
    let timeoutId: NodeJS.Timeout;
    return (email: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => validateEmail(email), 1000);
    };
  })();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a valid file (JPG, PNG, or PDF)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      
      setVerificationFile(file);
      setFilePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const removeFile = () => {
    setVerificationFile(null);
    setFilePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check if email is valid before submission
    if (emailValidation.isValid === false) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (emailValidation.isValidating) {
      setError('Please wait for email validation to complete');
      setLoading(false);
      return;
    }

    try {
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        faculty: formData.faculty,
        studentId: formData.studentId,
        year: formData.role === 'student' ? '1st Year' : undefined,
        orgName: formData.orgName,
        orgType: formData.orgType,
        description: formData.description,
        president: formData.president,
        founded: formData.founded,
        members: formData.members,
        website: formData.website,
        verificationCode: verificationCode
      };

      if (formData.role === 'organization') {
        // For organizations, create FormData to handle file upload
        const formDataToSend = new FormData();
        
        // Append all form fields
        Object.entries(registrationData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formDataToSend.append(key, value.toString());
          }
        });

        // Append verification file if uploaded
        if (verificationFile) {
          formDataToSend.append('verificationFile', verificationFile);
        }

        // Use the register function which now handles FormData
        const result = await register(formDataToSend);

        if (result.success) {
          if (result.requiresVerification) {
            setRegistrationSuccess(true);
            setEmailVerificationMessage(result.message || 'Please check your email to verify your account.');
          } else if (result.requiresApproval) {
            // Store organization data for status tracking
            localStorage.setItem('pendingOrganization', JSON.stringify(registrationData));
            navigate('/organization-status');
          } else {
            navigate('/');
          }
        } else {
          setError(result.error || result.message || 'Registration failed');
        }
      } else {
        // For students, use the regular register function
        const result = await register(registrationData);

        if (result.success) {
          if (result.requiresVerification) {
            setRegistrationSuccess(true);
            setEmailVerificationMessage(result.message || 'Please check your email to verify your account.');
          } else if (result.requiresApproval) {
            // Store organization data for status tracking
            localStorage.setItem('pendingOrganization', JSON.stringify(registrationData));
            navigate('/organization-status');
          } else {
            navigate('/');
          }
        } else {
          setError(result.error || 'Registration failed');
        }
      }

      // Note: Organization registration now uses the same register function with FormData
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed');
    }

    setLoading(false);
  };

  const handleGoogleRegister = () => {
    // Store registration intent
    localStorage.setItem('registrationIntent', JSON.stringify({
      role: formData.role,
      timestamp: Date.now()
    }));
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${apiUrl}/auth/google`;
  };

  // Show email verification success message
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <img src="/image copy copy.png" alt="OneAU Logo" className="h-16 w-auto" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Registration Successful!
            </h2>
          </div>

          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Check Your Email
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {emailVerificationMessage}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RegistrationGuard>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <img src="/image copy copy.png" alt="OneAU Logo" className="h-16 w-auto" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join OneAU
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account to get started
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Account Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Account Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={formData.role === 'student'}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Student</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="organization"
                  checked={formData.role === 'organization'}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Organization</span>
              </label>
            </div>
          </div>

          {/* Social Login */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or register with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
            className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FcGoogle className="h-5 w-5 mr-2" />
            Sign up with Google
          </button>

          {/* Manual form fields - Only for organizations */}
          {formData.role === 'organization' && (
            <>
              {/* Name field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => {
                      handleChange(e);
                      debouncedValidateEmail(e.target.value);
                    }}
                    className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                      emailValidation.isValid === true 
                        ? 'border-green-300 bg-green-50' 
                        : emailValidation.isValid === false 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    placeholder="your.email@example.com"
                  />
                  {emailValidation.isValidating && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {emailValidation.isValid === true && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {emailValidation.isValid === false && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Email validation message */}
                {emailValidation.message && (
                  <p className={`mt-1 text-xs ${
                    emailValidation.isValid === true 
                      ? 'text-green-600' 
                      : emailValidation.isValid === false 
                      ? 'text-red-600' 
                      : 'text-gray-500'
                  }`}>
                    {emailValidation.message}
                  </p>
                )}
              </div>

              {/* Verification Code field */}
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                  Verification Code
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <div className="relative flex-grow">
                    <input
                      id="verificationCode"
                      name="verificationCode"
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => {
                        const newCode = e.target.value.replace(/\D/g, '');
                        setVerificationCode(newCode);
                        // Auto-verify when 6 digits are entered
                        if (newCode.length === 6) {
                          verifyCode(newCode);
                        }
                      }}
                      className={`appearance-none relative block w-full px-3 py-2 border ${
                        codeVerified ? 'border-green-300 bg-green-50' : 
                        error && verificationCode.length === 6 ? 'border-red-300 bg-red-50' : 
                        'border-gray-300'
                      } placeholder-gray-500 text-gray-900 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center tracking-widest`}
                      placeholder="000000"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      {verifyingCode ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : codeVerified ? (
                        <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={sendVerificationCode}
                    disabled={sendingCode || !formData.email}
                    className="relative -ml-px inline-flex items-center px-4 py-2 border border-gray-300 bg-green-600 text-white text-sm font-medium rounded-r-md hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingCode ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      'Send code'
                    )}
                  </button>
                </div>
                {codeSent && !codeVerified && (
                  <p className="mt-1 text-xs text-green-600">
                    Verification code sent to your email
                  </p>
                )}
                {codeVerified && (
                  <p className="mt-1 text-xs text-green-600">
                    ✅ Email verified successfully! You can now fill out the rest of the form.
                  </p>
                )}
                {error && verificationCode.length === 6 && (
                  <p className="mt-1 text-xs text-red-600">
                    ❌ {error}
                  </p>
                )}
                {!codeVerified && (
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the 6-digit code sent to your email
                  </p>
                )}
              </div>
            </>
          )}

          {/* Organization message - Email verification required */}
          {formData.role === 'organization' && !codeVerified && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Email Verification Required
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Please enter your email address and click "Send code" to receive a verification code. You must verify your email before you can fill out the rest of the form.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student message - Google OAuth only */}
          {formData.role === 'student' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Students must use Google OAuth
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>As a student, you can only register using your Google account. Please click the "Sign up with Google" button above to create your account.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Organization-specific fields - Only show after email verification */}
          {formData.role === 'organization' && codeVerified && (
            <>
              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">
                  Organization Name
                </label>
                <input
                  id="orgName"
                  name="orgName"
                  type="text"
                  required
                  value={formData.orgName}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter organization name"
                />
              </div>

              <div>
                <label htmlFor="orgType" className="block text-sm font-medium text-gray-700">
                  Organization Type
                </label>
                <select
                  id="orgType"
                  name="orgType"
                  required
                  value={formData.orgType}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select organization type</option>
                  <option value="Academic Club">Academic Club</option>
                  <option value="Sports Club">Sports Club</option>
                  <option value="Cultural Club">Cultural Club</option>
                  <option value="Religious Club">Religious Club</option>
                  <option value="Volunteer Group">Volunteer Group</option>
                  <option value="Student Government">Student Government</option>
                  <option value="Faculty Community">Faculty Community</option>
                  <option value="Department Association">Department Association</option>
                  <option value="Professional Society">Professional Society</option>
                  <option value="Research Group">Research Group</option>
                  <option value="Debate Society">Debate Society</option>
                  <option value="Model United Nations">Model United Nations</option>
                  <option value="Entrepreneurship Club">Entrepreneurship Club</option>
                  <option value="Technology Club">Technology Club</option>
                  <option value="Art Society">Art Society</option>
                  <option value="Music Club">Music Club</option>
                  <option value="Dance Club">Dance Club</option>
                  <option value="Theater Group">Theater Group</option>
                  <option value="Photography Club">Photography Club</option>
                  <option value="Film Society">Film Society</option>
                  <option value="Language Exchange">Language Exchange</option>
                  <option value="International Students Association">International Students Association</option>
                  <option value="Environmental Club">Environmental Club</option>
                  <option value="Health and Wellness Club">Health and Wellness Club</option>
                  <option value="Mental Health Support Group">Mental Health Support Group</option>
                  <option value="LGBTQ+ Alliance">LGBTQ+ Alliance</option>
                  <option value="Women's Society">Women's Society</option>
                  <option value="Alumni Association">Alumni Association</option>
                  <option value="Career Development Club">Career Development Club</option>
                  <option value="Investment Club">Investment Club</option>
                  <option value="Gaming Club">Gaming Club</option>
                  <option value="Book Club">Book Club</option>
                  <option value="Cooking Club">Cooking Club</option>
                  <option value="Travel Club">Travel Club</option>
                  <option value="Chess Club">Chess Club</option>
                  <option value="Robotics Club">Robotics Club</option>
                  <option value="AI and Machine Learning Club">AI and Machine Learning Club</option>
                  <option value="Cybersecurity Club">Cybersecurity Club</option>
                  <option value="Data Science Society">Data Science Society</option>
                  <option value="Blockchain Club">Blockchain Club</option>
                  <option value="Startup Incubator">Startup Incubator</option>
                  <option value="Social Impact Organization">Social Impact Organization</option>
                  <option value="Community Service Group">Community Service Group</option>
                  <option value="Disaster Relief Organization">Disaster Relief Organization</option>
                  <option value="Animal Welfare Group">Animal Welfare Group</option>
                  <option value="Children's Support Group">Children's Support Group</option>
                  <option value="Elderly Care Group">Elderly Care Group</option>
                  <option value="Disability Support Group">Disability Support Group</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Organization Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  required
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Describe your organization's purpose and activities"
                />
              </div>

              <div>
                <label htmlFor="president" className="block text-sm font-medium text-gray-700">
                  President/Leader Name
                </label>
                <input
                  id="president"
                  name="president"
                  type="text"
                  required
                  value={formData.president}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter president/leader name"
                />
              </div>

              <div>
                <label htmlFor="founded" className="block text-sm font-medium text-gray-700">
                  Founded Year
                </label>
                <input
                  id="founded"
                  name="founded"
                  type="number"
                  required
                  value={formData.founded}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter founded year"
                />
              </div>

              <div>
                <label htmlFor="members" className="block text-sm font-medium text-gray-700">
                  Number of Members
                </label>
                <input
                  id="members"
                  name="members"
                  type="number"
                  required
                  value={formData.members}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter number of members"
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                  Website (Optional)
                </label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter website URL"
                />
              </div>
            </>
          )}

          {/* Password fields - Only for organizations and after verification */}
          {formData.role === 'organization' && codeVerified && (
            <>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm your password"
                />
              </div>
            </>
          )}

          {/* Verification file upload for organizations */}
          {formData.role === 'organization' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Verification Document (Optional)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {filePreview ? (
                    <div className="flex items-center justify-center">
                      {filePreview.includes('data:image') ? (
                        <img src={filePreview} alt="Preview" className="h-20 w-20 object-cover rounded" />
                      ) : (
                        <FileText className="h-20 w-20 text-gray-400" />
                      )}
                      <button
                        type="button"
                        onClick={removeFile}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="verification-file"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="verification-file"
                            name="verification-file"
                            type="file"
                            className="sr-only"
                            onChange={handleFileUpload}
                            accept=".jpg,.jpeg,.png,.pdf"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit button - Only for organizations and after verification */}
          {formData.role === 'organization' && codeVerified && (
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
    </RegistrationGuard>
  );
};

export default RegisterPage;