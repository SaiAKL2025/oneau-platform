import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, Bell } from 'lucide-react';
import apiClient from '../utils/api';

const LandingPage = () => {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularOrganizations = async () => {
      try {
        const response = await apiClient.getPopularOrganizations(6);
        if (response.success) {
          setOrganizations(response.organizations);
        }
      } catch (error) {
        console.error('Error fetching popular organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularOrganizations();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <img src="/image copy copy.png" alt="OneAU Logo" className="h-12 w-auto" />
              <h1 className="text-2xl font-bold text-gray-900">OneAU</h1>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Connect with</span>
            <span className="block text-blue-600">AU Communities</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Discover, join, and engage with student organizations at Assumption University. 
            From AUSO to specialized clubs, find your community and enhance your university experience.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link
                to="/register"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
              >
                Get Started
              </Link>
            </div>
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
              <Link
                to="/login"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-gray-900">Join Communities</h3>
              <p className="mt-2 text-base text-gray-500">
                Connect with student organizations that match your interests and goals.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-gray-900">Discover Events</h3>
              <p className="mt-2 text-base text-gray-500">
                Stay updated with upcoming events, workshops, and volunteer opportunities.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-gray-900">Get Notified</h3>
              <p className="mt-2 text-base text-gray-500">
                Receive notifications about activities from organizations you follow.
              </p>
            </div>

          </div>
        </div>

        {/* Organizations Preview */}
        <div className="mt-24">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Popular Organizations</h2>
            <p className="mt-4 text-lg text-gray-500">Join these active communities at AU</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              ))
            ) : organizations.length > 0 ? (
              organizations.map((org, index) => (
                <div key={org.id || index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center space-x-3 mb-3">
                    {org.profileImage ? (
                      <img
                        src={`http://localhost:5000/api/users/images/${org.profileImage}`}
                        alt={`${org.name} logo`}
                        className="h-10 w-10 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {org.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                      <p className="text-sm text-gray-600">{org.type}</p>
                    </div>
                  </div>
                  {org.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{org.description}</p>
                  )}
                  <p className="text-sm text-blue-600 font-medium">{org.followers} followers</p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Users className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizations Yet</h3>
                <p className="text-gray-500">Be the first to create an organization!</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-24">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <img src="/image copy copy.png" alt="OneAU Logo" className="h-8 w-auto" />
              <span className="text-xl font-bold text-gray-900">OneAU</span>
            </div>
            <p className="text-gray-500">
              Connecting Assumption University students with their communities
            </p>
            <p className="text-sm text-gray-400 mt-4">
              © 2025 OneAU Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;