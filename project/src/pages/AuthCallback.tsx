import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../utils/api';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true' && token) {
      // Store token and redirect
      localStorage.setItem('token', token);
      
      // Fetch user profile with the token using ApiClient
      apiClient.request('/auth/profile')
      .then(data => {
        console.log('🔍 AuthCallback - Profile data received:', data);
        if (data.success) {
          console.log('✅ AuthCallback - Storing user data and dispatching event');
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Dispatch custom event to notify AuthContext about successful login
          window.dispatchEvent(new CustomEvent('auth:loginSuccess', {
            detail: { user: data.user, token }
          }));
          
          console.log('🔄 AuthCallback - Navigating to home page');
          navigate('/', { replace: true });
        } else {
          console.log('❌ AuthCallback - Authentication failed');
          navigate('/login?error=Authentication failed');
        }
      })
      .catch(() => {
        navigate('/login?error=Authentication failed');
      });
    } else {
      navigate(`/login?error=${error || 'Authentication failed'}`);
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

