import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Upload, X, FileText, Image } from 'lucide-react';
import RegistrationGuard from '../components/RegistrationGuard';
import { FcGoogle } from 'react-icons/fc';

interface GoogleProfile {
  email: string;
  name: string;
  googleId: string;
  profileImage: string;
  emailPattern: 'student' | 'organization';
}

const GoogleProfileCompletion = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<GoogleProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    faculty: '',
    studentId: '',
    year: '',
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

  useEffect(() => {
    const profileParam = searchParams.get('profile');
    if (profileParam) {
      try {
        const profile = JSON.parse(decodeURIComponent(profileParam));
        setProfileData(profile);
        setFormData(prev => ({
          ...prev,
          name: profile.name || ''
        }));
      } catch (error) {
        console.error('Error parsing profile data:', error);
        navigate('/register');
      }
    } else {
      navigate('/register');
    }
  }, [searchParams, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

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

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const formDataToSend = new FormData();
      formDataToSend.append('profileData', JSON.stringify(profileData));
      formDataToSend.append('formData', JSON.stringify(formData));
      
      if (verificationFile) {
        formDataToSend.append('verificationFile', verificationFile);
      }

      const response = await fetch(`${apiUrl}/auth/google/complete`, {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();

      if (data.success) {
        if (data.token) {
          console.log('✅ GoogleProfileCompletion - Registration successful, storing auth data');
          // Store token and user data for authentication
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Dispatch custom event to notify AuthContext about successful login
          window.dispatchEvent(new CustomEvent('auth:loginSuccess', {
            detail: { user: data.user, token: data.token }
          }));
          
          if (data.approvalId) {
            console.log('🔄 GoogleProfileCompletion - Organization pending approval, navigating to status page');
            // Organization registration pending approval
            navigate(`/organization-status?approvalId=${data.approvalId}`);
          } else {
            console.log('🔄 GoogleProfileCompletion - Student registration successful, navigating to home');
            // Student registration successful
            navigate('/', { replace: true });
          }
        } else {
          console.log('❌ GoogleProfileCompletion - No authentication token received');
          setError('No authentication token received');
        }
      } else {
        console.log('❌ GoogleProfileCompletion - Registration failed:', data.message);
        setError(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your Google profile...</p>
        </div>
      </div>
    );
  }

  const isStudent = profileData.emailPattern === 'student';

  return (
    <RegistrationGuard>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <img src="/image copy copy.png" alt="OneAU Logo" className="h-16 w-auto" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete Your Registration
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've verified your Google account. Please complete your profile information.
          </p>
          <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-500">
            <FcGoogle className="h-5 w-5" />
            <span>Signed in as {profileData.email}</span>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

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

          {isStudent ? (
            <>
              {/* Student-specific fields */}
              <div>
                <label htmlFor="faculty" className="block text-sm font-medium text-gray-700">
                  Faculty
                </label>
                <select
                  id="faculty"
                  name="faculty"
                  required
                  value={formData.faculty}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="Business Administration">Business Administration</option>
                  <option value="Liberal Arts">Liberal Arts</option>
                  <option value="Science and Technology">Science and Technology</option>
                  <option value="Communication Arts">Communication Arts</option>
                  <option value="Nursing">Nursing</option>
                  <option value="Law">Law</option>
                  <option value="Graduate School">Graduate School</option>
                  <option value="Architecture">Architecture</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Education">Education</option>
                  <option value="Fine Arts">Fine Arts</option>
                  <option value="International Studies">International Studies</option>
                  <option value="Psychology">Psychology</option>
                  <option value="Social Work">Social Work</option>
                  <option value="Theology">Theology</option>
                  <option value="Veterinary Medicine">Veterinary Medicine</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Dentistry">Dentistry</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Public Health">Public Health</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Hospitality and Tourism">Hospitality and Tourism</option>
                  <option value="Economics">Economics</option>
                  <option value="Political Science">Political Science</option>
                  <option value="Sociology">Sociology</option>
                  <option value="Anthropology">Anthropology</option>
                  <option value="History">History</option>
                  <option value="Philosophy">Philosophy</option>
                  <option value="Languages">Languages</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Environmental Science">Environmental Science</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                  Student ID
                </label>
                <input
                  id="studentId"
                  name="studentId"
                  type="text"
                  required
                  value={formData.studentId}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your student ID"
                />
              </div>

              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                  Academic Year
                </label>
                <select
                  id="year"
                  name="year"
                  required
                  value={formData.year}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select your academic year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Graduate">Graduate</option>
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Organization-specific fields */}
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

          {/* Verification file upload - Organizations only */}
          {!isStudent && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Verification Document
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

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Completing Registration...' : 'Complete Registration'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Cancel and go back to registration
            </button>
          </div>
        </form>
      </div>
    </div>
    </RegistrationGuard>
  );
};

export default GoogleProfileCompletion;
