import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import apiClient from '../../utils/api';
import { getImageUrl, handleImageError } from '../../utils/imageUtils';
import EventStatusBadge from '../../components/EventStatusBadge';
import { getEventStatus } from '../../utils/eventStatus';
import NotificationsPage from '../NotificationsPage';
import {
  Home,
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Eye,
  Edit,
  Trash2,
  X,
  Settings,
  UserPlus,
  Upload,
  Image as ImageIcon,
  X as XIcon,
  Bell
} from 'lucide-react';

// Organization Dashboard Components
const OrgHome = () => {
  const { user } = useAuth();
  const { events, organizations, users, loadAuthenticatedData } = useData();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeEventTab, setActiveEventTab] = useState('upcoming');

  // Force refresh when events change
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [events.length]);

  
  // Get organization's events - use orgId if available, otherwise use user.id
  const orgId = user?.orgId || user?.id;
  const orgEvents = events.filter(event => event.orgId === orgId);
  const organization = organizations.find(org => org.id === orgId);
  
  // Get actual followers count (students who follow this organization)
  // Use orgId if available, otherwise use user.id
  const followersCount = users.filter(u => 
    u && u.role === 'student' && u.followedOrgs?.includes(orgId || 0)
  ).length;
  
  // Debug logging
  console.log('🔍 OrgHome Debug:');
  console.log('🔍 user?.orgId:', user?.orgId);
  console.log('🔍 user?.id:', user?.id);
  console.log('🔍 users array length:', users.length);
  console.log('🔍 users with role student:', users.filter(u => u && u.role === 'student').length);
  console.log('🔍 students with followedOrgs:', users.filter(u => u && u.role === 'student' && u.followedOrgs?.length > 0));
  console.log('🔍 students followedOrgs details:', users.filter(u => u && u.role === 'student' && u.followedOrgs?.length > 0).map(u => ({ name: u.name, followedOrgs: u.followedOrgs })));
  console.log('🔍 calculated followersCount:', followersCount);

  // Debug logging to track events changes
  useEffect(() => {
    console.log('🔍 OrgHome - Events changed:', events.length, 'events');
    console.log('🔍 OrgHome - OrgId:', orgId);
    console.log('🔍 OrgHome - Filtered events:', orgEvents.length);
    console.log('🔍 OrgHome - Events for this org:', orgEvents.map(e => ({ id: e.id, title: e.title })));
  }, [events, orgId]); // Removed orgEvents.length to prevent infinite loop
  
  // Filter events based on active tab
  const getFilteredEvents = () => {
    if (activeEventTab === 'upcoming') {
      // For upcoming tab, show events that haven't ended yet
      return orgEvents.filter(event => {
        if (event.status !== 'active') return false;
        
        // Check if event hasn't ended yet (current time < event end time)
        const now = new Date();
        const eventEndDateTime = new Date(`${event.date}T${event.endTime}`);
        
        return now < eventEndDateTime;
      });
    } else if (activeEventTab === 'all') {
      // For all events tab, show all active events
      return orgEvents.filter(event => event.status === 'active');
    }
    return [];
  };

  const filteredEvents = getFilteredEvents();
  
  // Keep the original upcomingEvents for the metrics card
  const upcomingEvents = orgEvents.filter(event => {
    if (event.status !== 'active') {
      return false;
    }
    
    // Check if event hasn't ended yet (current time < event end time)
    const now = new Date();
    const eventEndDateTime = new Date(`${event.date}T${event.endTime}`);
    
    return now < eventEndDateTime;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome, {user?.name}!</h2>
        <p className="text-green-100">Manage your organization and engage with your community</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/organization/events" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-6 w-6 text-blue-500 mr-2" />
              <p className="text-gray-600 font-medium">Events</p>
            </div>
            <p className="text-4xl font-bold text-blue-600">{orgEvents.length}</p>
          </div>
        </Link>
        <Link to="/organization/followers" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-6 w-6 text-green-500 mr-2" />
              <p className="text-gray-600 font-medium">Followers</p>
            </div>
            <p className="text-4xl font-bold text-green-600">{followersCount}</p>
          </div>
        </Link>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-6 w-6 text-yellow-500 mr-2" />
              <p className="text-gray-600 font-medium">Upcoming Events</p>
            </div>
            <p className="text-4xl font-bold text-yellow-600">{upcomingEvents.length}</p>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Recent Events</h3>
          <Link to="/organization/events" className="text-blue-600 hover:text-blue-800 text-sm">
            View all
          </Link>
        </div>

        {/* Event Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveEventTab('upcoming')}
              className={`py-3 px-6 text-sm font-medium border-b-2 ${
                activeEventTab === 'upcoming'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Upcoming Events ({orgEvents.filter(event => {
                if (event.status !== 'active') return false;
                const now = new Date();
                const eventEndDateTime = new Date(`${event.date}T${event.endTime}`);
                return now < eventEndDateTime;
              }).length})
            </button>
            <button
              onClick={() => setActiveEventTab('all')}
              className={`py-3 px-6 text-sm font-medium border-b-2 ${
                activeEventTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Events ({orgEvents.filter(event => event.status === 'active').length})
            </button>
          </nav>
        </div>

        <div className="p-6" key={refreshKey}>
          {filteredEvents.length > 0 ? (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                        <EventStatusBadge eventDate={event.date} startTime={event.startTime} endTime={event.endTime} />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{event.type}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {event.startTime} - {event.endTime}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {event.location}
                        </span>
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {event.registered || 0} participants
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <Link
                        to={`/organization/events/${event.id}`}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors text-center"
                      >
                        View Details
                      </Link>
                      <Link
                        to="/organization/events"
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors text-center"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {activeEventTab === 'upcoming' 
                  ? 'No upcoming events' 
                  : 'No events created yet'
                }
              </p>
              <Link to="/organization/events" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">
                {activeEventTab === 'upcoming' ? 'Create your first event' : 'Create an event'}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const OrgEvents = () => {
  const { user } = useAuth();
  const { events, createEvent, updateEvent, deleteEvent, loadAuthenticatedData } = useData();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    type: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    venue: '',
    description: '',
    partner: '',
    responsiblePerson: '',
    responsibleEmail: '',
    responsiblePhone: '',
    capacity: '',
    images: [] as File[]
  });
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get organization's events
  const orgId = user?.orgId || user?.id;
  const orgEvents = events.filter(event => event.orgId === orgId);

  // Debug logging to track events changes
  useEffect(() => {
    console.log('🔍 OrgEvents - Events changed:', events.length, 'events');
    console.log('🔍 OrgEvents - OrgId:', orgId);
    console.log('🔍 OrgEvents - Filtered events:', orgEvents.length);
    console.log('🔍 OrgEvents - Events for this org:', orgEvents.map(e => ({ id: e.id, title: e.title })));
  }, [events, orgId]); // Removed orgEvents.length to prevent infinite loop

  // Refresh data when component mounts to ensure we have the latest state
  useEffect(() => {
    const refreshData = async () => {
      try {
        await loadAuthenticatedData();
        console.log('🔄 OrgEvents: Data refreshed on mount');
      } catch (error) {
        console.error('❌ Error refreshing data:', error);
      }
    };
    
    refreshData();
  }, []); // Empty dependency array - only run on mount

  const handleViewEvent = (event: any) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEventForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files);
    const validImages: File[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    for (const file of newImages) {
      if (!allowedTypes.includes(file.type)) {
        alert(`File "${file.name}" is not a valid image type. Please upload JPG, JPEG, or PNG files only.`);
        continue;
      }
      if (file.size > maxSize) {
        alert(`File "${file.name}" is too large. Maximum file size is 5MB.`);
        continue;
      }
      validImages.push(file);
    }

    setEventForm(prev => {
      const maxExistingImages = Math.min(existingImages.length, 5);
      const totalImages = maxExistingImages + prev.images.length + validImages.length;
      if (totalImages > 5) {
        alert('Maximum 5 images allowed per event.');
        return prev;
      }
      return {
        ...prev,
        images: [...prev.images, ...validImages]
      };
    });

    // Reset the input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setEventForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      console.log('⚠️ Form submission already in progress, ignoring duplicate submit');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const formData = new FormData();

      // Add form fields
      Object.entries(eventForm).forEach(([key, value]) => {
        if (key !== 'images' && value) {
          formData.append(key, value.toString());
        }
      });

      // Add images
      eventForm.images.forEach((image, index) => {
        formData.append('images', image);
      });

      // For editing events, send information about existing images to keep
      if (editingEvent) {
        // Send the current existingImages array as JSON string
        formData.append('existingImages', JSON.stringify(existingImages));
      }

      console.log('🔍 Submitting event:', { editingEvent: !!editingEvent, formData: Object.fromEntries(formData) });

      const result = editingEvent
        ? await updateEvent(editingEvent.id, formData)
        : await createEvent(formData);

      if (result) {
        console.log('✅ Event saved successfully:', result);
        alert(editingEvent ? 'Event updated successfully!' : 'Event created successfully!');
        // Force component refresh
        setRefreshKey(prev => prev + 1);
        // Reload data to ensure UI is updated
        await loadAuthenticatedData();
      } else {
        console.log('❌ Event save failed');
        alert('Failed to save event');
      }
    } catch (error) {
      console.error('❌ Error saving event:', error);
      alert('Failed to save event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }

    setShowCreateModal(false);
    setEditingEvent(null);
    setEventForm({
      title: '',
      type: '',
      date: '',
      startTime: '',
      endTime: '',
      location: '',
      venue: '',
      description: '',
      partner: '',
      responsiblePerson: '',
      responsibleEmail: '',
      responsiblePhone: '',
      capacity: '',
      images: []
    });
    setExistingImages([]);
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title || '',
      type: event.type || '',
      date: event.date || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      location: event.location || '',
      venue: event.venue || '',
      description: event.description || '',
      partner: event.partner || '',
      responsiblePerson: event.responsiblePerson || '',
      responsibleEmail: event.responsibleEmail || '',
      responsiblePhone: event.responsiblePhone || '',
      capacity: event.capacity?.toString() || '',
      images: []
    });
    // Load existing images from the event
    setExistingImages(event.media || []);
    setShowCreateModal(true);
  };

  const handleDelete = async (eventId: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent(eventId);
        alert('Event deleted successfully!');
        // Force component refresh
        setRefreshKey(prev => prev + 1);
        // Reload data to ensure UI is updated
        await loadAuthenticatedData();
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Events Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden" key={refreshKey}>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participants
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orgEvents.map((event) => (
              <tr key={event.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{event.title}</div>
                    <div className="text-sm text-gray-500">{event.type}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Calendar className="w-4 h-4 mr-1" />
                    {event.date}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    {event.startTime} - {event.endTime}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <MapPin className="w-4 h-4 mr-1" />
                    {event.location}
                  </div>
                  <div className="text-sm text-gray-500">{event.venue}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Users className="w-4 h-4 mr-1" />
                    {event.registered || 0}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(() => {
                    const eventStatus = getEventStatus(event);
                    return (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        eventStatus.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                        eventStatus.status === 'started' ? 'bg-orange-100 text-orange-800' :
                        eventStatus.status === 'ended' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {eventStatus.statusText}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleViewEvent(event)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Event Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {(() => {
                      const eventStatus = getEventStatus(event);
                      const isEventEnded = eventStatus.status === 'ended';
                      
                      return (
                        <button 
                          onClick={() => handleEdit(event)}
                          disabled={isEventEnded}
                          className={`${
                            isEventEnded 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-yellow-600 hover:text-yellow-900'
                          }`}
                          title={isEventEnded ? "Cannot edit ended event" : "Edit Event"}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      );
                    })()}
                    <button 
                      onClick={() => handleDelete(event.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingEvent(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={eventForm.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type *
                  </label>
                  <select
                    name="type"
                    value={eventForm.type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="Academic">Academic</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Sports">Sports</option>
                    <option value="Social">Social</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Conference">Conference</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Volunteer">Volunteer</option>
                    <option value="Performance">Performance</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Lecture">Lecture</option>
                    <option value="Training">Training</option>
                    <option value="Competition">Competition</option>
                    <option value="Tournament">Tournament</option>
                    <option value="Exhibition">Exhibition</option>
                    <option value="Fundraiser">Fundraiser</option>
                    <option value="Networking">Networking</option>
                    <option value="Career Fair">Career Fair</option>
                    <option value="Job Fair">Job Fair</option>
                    <option value="Research Presentation">Research Presentation</option>
                    <option value="Panel Discussion">Panel Discussion</option>
                    <option value="Debate">Debate</option>
                    <option value="Film Screening">Film Screening</option>
                    <option value="Art Exhibition">Art Exhibition</option>
                    <option value="Music Concert">Music Concert</option>
                    <option value="Dance Performance">Dance Performance</option>
                    <option value="Theater">Theater</option>
                    <option value="Poetry Reading">Poetry Reading</option>
                    <option value="Book Club">Book Club</option>
                    <option value="Language Exchange">Language Exchange</option>
                    <option value="Cultural Festival">Cultural Festival</option>
                    <option value="Food Festival">Food Festival</option>
                    <option value="Fashion Show">Fashion Show</option>
                    <option value="Photography Contest">Photography Contest</option>
                    <option value="Coding Competition">Coding Competition</option>
                    <option value="Hackathon">Hackathon</option>
                    <option value="Startup Pitch">Startup Pitch</option>
                    <option value="Business Plan Competition">Business Plan Competition</option>
                    <option value="Case Study Competition">Case Study Competition</option>
                    <option value="Model UN">Model UN</option>
                    <option value="Student Council">Student Council</option>
                    <option value="Election">Election</option>
                    <option value="Town Hall">Town Hall</option>
                    <option value="Open Forum">Open Forum</option>
                    <option value="Community Service">Community Service</option>
                    <option value="Environmental Initiative">Environmental Initiative</option>
                    <option value="Health & Wellness">Health & Wellness</option>
                    <option value="Mental Health Awareness">Mental Health Awareness</option>
                    <option value="Diversity & Inclusion">Diversity & Inclusion</option>
                    <option value="Women's Empowerment">Women's Empowerment</option>
                    <option value="LGBTQ+ Support">LGBTQ+ Support</option>
                    <option value="International Students">International Students</option>
                    <option value="Study Abroad">Study Abroad</option>
                    <option value="Exchange Program">Exchange Program</option>
                    <option value="Mentorship Program">Mentorship Program</option>
                    <option value="Peer Tutoring">Peer Tutoring</option>
                    <option value="Study Group">Study Group</option>
                    <option value="Exam Preparation">Exam Preparation</option>
                    <option value="Graduation Ceremony">Graduation Ceremony</option>
                    <option value="Orientation">Orientation</option>
                    <option value="Welcome Party">Welcome Party</option>
                    <option value="Farewell Party">Farewell Party</option>
                    <option value="Alumni Reunion">Alumni Reunion</option>
                    <option value="Industry Visit">Industry Visit</option>
                    <option value="Field Trip">Field Trip</option>
                    <option value="Outdoor Adventure">Outdoor Adventure</option>
                    <option value="Team Building">Team Building</option>
                    <option value="Retreat">Retreat</option>
                    <option value="Camping">Camping</option>
                    <option value="Hiking">Hiking</option>
                    <option value="Beach Trip">Beach Trip</option>
                    <option value="City Tour">City Tour</option>
                    <option value="Museum Visit">Museum Visit</option>
                    <option value="Gaming Tournament">Gaming Tournament</option>
                    <option value="Board Game Night">Board Game Night</option>
                    <option value="Trivia Night">Trivia Night</option>
                    <option value="Karaoke Night">Karaoke Night</option>
                    <option value="Movie Night">Movie Night</option>
                    <option value="Game Night">Game Night</option>
                    <option value="Sports Day">Sports Day</option>
                    <option value="Fitness Challenge">Fitness Challenge</option>
                    <option value="Yoga Session">Yoga Session</option>
                    <option value="Meditation Session">Meditation Session</option>
                    <option value="Cooking Class">Cooking Class</option>
                    <option value="Art Workshop">Art Workshop</option>
                    <option value="Music Workshop">Music Workshop</option>
                    <option value="Dance Workshop">Dance Workshop</option>
                    <option value="Photography Workshop">Photography Workshop</option>
                    <option value="Writing Workshop">Writing Workshop</option>
                    <option value="Public Speaking">Public Speaking</option>
                    <option value="Leadership Training">Leadership Training</option>
                    <option value="Time Management">Time Management</option>
                    <option value="Stress Management">Stress Management</option>
                    <option value="Financial Literacy">Financial Literacy</option>
                    <option value="Digital Skills">Digital Skills</option>
                    <option value="Entrepreneurship">Entrepreneurship</option>
                    <option value="Innovation Lab">Innovation Lab</option>
                    <option value="Tech Talk">Tech Talk</option>
                    <option value="AI & Machine Learning">AI & Machine Learning</option>
                    <option value="Blockchain">Blockchain</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Sustainability">Sustainability</option>
                    <option value="Climate Action">Climate Action</option>
                    <option value="Social Justice">Social Justice</option>
                    <option value="Human Rights">Human Rights</option>
                    <option value="Gender Equality">Gender Equality</option>
                    <option value="Disability Awareness">Disability Awareness</option>
                    <option value="Mental Health Support">Mental Health Support</option>
                    <option value="Crisis Support">Crisis Support</option>
                    <option value="Emergency Response">Emergency Response</option>
                    <option value="Safety Training">Safety Training</option>
                    <option value="First Aid">First Aid</option>
                    <option value="CPR Training">CPR Training</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={eventForm.date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Starting Time *
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={eventForm.startTime}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ending Time *
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    value={eventForm.endTime}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={eventForm.location}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venue *
                  </label>
                  <input
                    type="text"
                    name="venue"
                    value={eventForm.venue}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity *
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={eventForm.capacity}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={eventForm.description}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partner
                </label>
                <input
                  type="text"
                  name="partner"
                  value={eventForm.partner}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Images
                </label>
                <div className="space-y-3">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          JPG, JPEG, PNG (max 5MB each, max 5 images)
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Existing Images */}
                  {existingImages.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Current Images:</p>
                      {existingImages.length > 5 && (
                        <div className="mb-2 p-2 bg-yellow-100 border border-yellow-400 rounded text-sm text-yellow-800">
                          ⚠️ This event has {existingImages.length} images. Only the first 5 are shown and can be managed.
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {existingImages.slice(0, 5).map((image, index) => (
                          <div key={`existing-${index}`} className="relative group">
                            <img
                              src={getImageUrl(image.url)}
                              alt={`Existing ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                              onError={handleImageError}
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XIcon className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                              {image.filename?.length > 10 ? `${image.filename.substring(0, 10)}...` : image.filename}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Image Previews */}
                  {eventForm.images.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">New Images:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {eventForm.images.map((image, index) => (
                          <div key={`new-${index}`} className="relative group">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XIcon className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                              {image.name.length > 10 ? `${image.name.substring(0, 10)}...` : image.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-500">
                    {Math.min(existingImages.length, 5) + eventForm.images.length}/5 images uploaded
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsible Person *
                  </label>
                  <input
                    type="text"
                    name="responsiblePerson"
                    value={eventForm.responsiblePerson}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsible Email *
                  </label>
                  <input
                    type="email"
                    name="responsibleEmail"
                    value={eventForm.responsibleEmail}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsible Phone *
                  </label>
                  <input
                    type="tel"
                    name="responsiblePhone"
                    value={eventForm.responsiblePhone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingEvent(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                    isSubmitting 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  {isSubmitting ? 'Creating...' : (editingEvent ? 'Update Event' : 'Create Event')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Event Details</h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event Title</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedEvent.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedEvent.startTime} - {selectedEvent.endTime}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.location}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Venue</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.venue || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Capacity</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedEvent.registered || 0} / {selectedEvent.capacity}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    {(() => {
                      const eventStatus = getEventStatus(selectedEvent);
                      return (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          eventStatus.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                          eventStatus.status === 'started' ? 'bg-orange-100 text-orange-800' :
                          eventStatus.status === 'ended' ? 'bg-red-100 text-red-800' :
                          selectedEvent.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          selectedEvent.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {eventStatus.statusText}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Additional Information */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Additional Information</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEvent.description || 'No description available'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Partner</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEvent.partner || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Responsible Person</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEvent.responsiblePerson || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEvent.responsibleEmail || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEvent.responsiblePhone || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Event Images */}
                {selectedEvent.media && selectedEvent.media.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Event Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedEvent.media.map((media: any, index: number) => (
                        <div key={index} className="relative">
                          <img
                            src={getImageUrl(media.url)}
                            alt={`Event image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                            onError={handleImageError}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t pt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Close
                  </button>
                  {(() => {
                    const eventStatus = getEventStatus(selectedEvent);
                    const isEventEnded = eventStatus.status === 'ended';
                    
                    return (
                      <button
                        onClick={() => {
                          setShowEventModal(false);
                          handleEdit(selectedEvent);
                        }}
                        disabled={isEventEnded}
                        className={`px-4 py-2 text-sm font-medium rounded-md ${
                          isEventEnded
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            : 'text-white bg-blue-600 hover:bg-blue-700'
                        }`}
                        title={isEventEnded ? "Cannot edit ended event" : "Edit Event"}
                      >
                        {isEventEnded ? 'Event Ended' : 'Edit Event'}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const OrgFollowers = () => {
  const { user } = useAuth();
  const { users, organizations, events } = useData();
  const [selectedFollower, setSelectedFollower] = useState<any>(null);
  const [showFollowerModal, setShowFollowerModal] = useState(false);
  
  // Get the organization - use orgId if available, otherwise use user.id
  const orgId = user?.orgId || user?.id;
  const organization = organizations.find(org => org.id === orgId);
  
  // Get followers (students who follow this organization)
  // Use orgId if available, otherwise use user.id
  const followers = users.filter(u => 
    u && u.role === 'student' && u.followedOrgs?.includes(orgId || 0)
  );
  
  // Debug logging
  console.log('🔍 OrgFollowers Debug:');
  console.log('🔍 user?.orgId:', user?.orgId);
  console.log('🔍 user?.id:', user?.id);
  console.log('🔍 users array length:', users.length);
  console.log('🔍 users with role student:', users.filter(u => u && u.role === 'student').length);
  console.log('🔍 students with followedOrgs:', users.filter(u => u && u.role === 'student' && u.followedOrgs?.length > 0));
  console.log('🔍 students followedOrgs details:', users.filter(u => u && u.role === 'student' && u.followedOrgs?.length > 0).map(u => ({ name: u.name, followedOrgs: u.followedOrgs })));
  console.log('🔍 calculated followers length:', followers.length);
  
  // Get events created by this organization
  const orgEvents = events.filter(event => event.orgId === orgId);
  
  // Get event IDs created by this organization
  const orgEventIds = orgEvents.map(event => event.id);
  
  // Calculate organization-specific statistics
  const activeParticipants = followers.filter(follower => {
    // Check if follower has joined any events created by this organization
    return follower.joinedEvents && follower.joinedEvents.some(eventId => orgEventIds.includes(eventId));
  });
  
  // Calculate events joined for each follower (organization-specific)
  const followersWithOrgEvents = followers.map(follower => {
    const joinedOrgEvents = follower.joinedEvents ? 
      follower.joinedEvents.filter(eventId => orgEventIds.includes(eventId)) : [];
    return {
      ...follower,
      joinedOrgEvents: joinedOrgEvents,
      joinedOrgEventsCount: joinedOrgEvents.length
    };
  });

  const handleViewFollower = (follower: any) => {
    setSelectedFollower(follower);
    setShowFollowerModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Followers</h2>
        <div className="text-sm text-gray-600">
          Total: {followers.length} followers
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{followers.length}</p>
              <p className="text-gray-600">Total Followers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <UserPlus className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">
                {followers.filter(f => {
                  const joinDate = new Date(f.joined);
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  return joinDate >= thirtyDaysAgo;
                }).length}
              </p>
              <p className="text-gray-600">New This Month</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">
                {activeParticipants.length}
              </p>
              <p className="text-gray-600">Active Participants</p>
            </div>
          </div>
        </div>
      </div>

      {/* Followers List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Follower List</h3>
        </div>
        {followers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faculty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Events Joined (This Org)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {followers.map((follower) => (
                  <tr key={follower.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                        onClick={() => handleViewFollower(follower)}
                        title="Click to view follower details"
                      >
                        <div className="h-10 w-10 rounded-full flex items-center justify-center overflow-hidden">
                          {follower.profileImage ? (
                            <img 
                              src={getImageUrl(follower.profileImage, 'profile')} 
                              alt={`${follower.name} profile`} 
                              className="h-full w-full object-cover"
                              onError={handleImageError}
                            />
                          ) : (
                            <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {follower.name.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{follower.name}</div>
                          <div className="text-sm text-gray-500">{follower.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {follower.faculty || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(follower.joined).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {followersWithOrgEvents.find(f => f.id === follower.id)?.joinedOrgEventsCount || 0} events
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        follower.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {follower.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No followers yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Students will appear here when they follow your organization
            </p>
          </div>
        )}
      </div>

      {/* Follower Detail Modal */}
      {showFollowerModal && selectedFollower && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Follower Details</h3>
                <button
                  onClick={() => setShowFollowerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Profile Section */}
                <div className="flex items-center space-x-4 pb-4 border-b border-gray-200">
                  <div className="h-16 w-16 rounded-full flex items-center justify-center overflow-hidden">
                    {selectedFollower.profileImage ? (
                      <img 
                        src={getImageUrl(selectedFollower.profileImage, 'profile')} 
                        alt={`${selectedFollower.name} profile`} 
                        className="h-full w-full object-cover"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="h-16 w-16 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xl font-medium">
                          {selectedFollower.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{selectedFollower.name}</h4>
                    <p className="text-sm text-gray-500">{selectedFollower.email}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      selectedFollower.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedFollower.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Student ID</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedFollower.studentId || selectedFollower.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Faculty</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedFollower.faculty || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Joined Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedFollower.joined).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Login</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedFollower.lastLogin ? new Date(selectedFollower.lastLogin).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>

                {/* Activity Information */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Activity Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Events Joined (This Organization)</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {followersWithOrgEvents.find(f => f.id === selectedFollower.id)?.joinedOrgEventsCount || 0} events
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Organizations Following</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedFollower.followedOrgs?.length || 0} organizations
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Following Since</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedFollower.followedOrgs?.includes(orgId) ? 
                          'Following this organization' : 'Not following'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {selectedFollower.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Additional Information</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bio/Description</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedFollower.bio || selectedFollower.description || 'No bio available'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Interests</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedFollower.interests || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Year of Study</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedFollower.yearOfStudy || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t pt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowFollowerModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OrgSettings = () => {
  const { user } = useAuth();
  const { organizations, updateOrganization } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [orgData, setOrgData] = useState({
    name: '',
    description: '',
    email: '',
    website: '',
    president: '',
    members: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: ''
    }
  });

  // Get organization ID from user
  const orgId = user?.orgId || user?.id;
  
  // Get organization data
  const organization = organizations.find(org => org.id === orgId);

  // Initialize form data
  React.useEffect(() => {
    if (organization) {
      setOrgData({
        name: organization.name || '',
        description: organization.description || '',
        email: organization.email || '',
        website: organization.website || '',
        president: organization.president || '',
        members: organization.members?.toString() || '',
        socialMedia: {
          facebook: organization.socialMedia?.facebook || '',
          instagram: organization.socialMedia?.instagram || '',
          twitter: organization.socialMedia?.twitter || ''
        }
      });
    }
  }, [organization]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('socialMedia.')) {
      const socialField = name.split('.')[1];
      setOrgData(prev => ({
        ...prev,
        socialMedia: {
          ...prev.socialMedia,
          [socialField]: value
        }
      }));
    } else {
      setOrgData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (organization) {
      try {
        const result = await updateOrganization(organization.id, orgData);
        if (result.success) {
          alert('Organization profile updated successfully!');
          setIsEditing(false);
        } else {
          alert('Failed to update organization profile');
        }
      } catch (error) {
        console.error('Error updating organization:', error);
        alert('Failed to update organization profile. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    if (organization) {
      setOrgData({
        name: organization.name || '',
        description: organization.description || '',
        email: organization.email || '',
        website: organization.website || '',
        president: organization.president || '',
        members: organization.members?.toString() || '',
        socialMedia: {
          facebook: organization.socialMedia?.facebook || '',
          instagram: organization.socialMedia?.instagram || '',
          twitter: organization.socialMedia?.twitter || ''
        }
      });
    }
    setIsEditing(false);
  };

  if (!organization) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Organization not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Organization Settings</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Information</h3>
            
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={orgData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={orgData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={orgData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={orgData.website}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      President
                    </label>
                    <input
                      type="text"
                      name="president"
                      value={orgData.president}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Members
                    </label>
                    <input
                      type="number"
                      name="members"
                      value={orgData.members}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Social Media</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Facebook
                      </label>
                      <input
                        type="url"
                        name="socialMedia.facebook"
                        value={orgData.socialMedia.facebook}
                        onChange={handleInputChange}
                        placeholder="https://facebook.com/yourorg"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Instagram
                      </label>
                      <input
                        type="text"
                        name="socialMedia.instagram"
                        value={orgData.socialMedia.instagram}
                        onChange={handleInputChange}
                        placeholder="@yourorg"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Twitter
                      </label>
                      <input
                        type="text"
                        name="socialMedia.twitter"
                        value={orgData.socialMedia.twitter}
                        onChange={handleInputChange}
                        placeholder="@yourorg"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Organization Name</label>
                  <p className="text-gray-900">{organization.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900">{organization.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{organization.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Website</label>
                    <p className="text-gray-900">{organization.website || 'Not set'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">President</label>
                    <p className="text-gray-900">{organization.president}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Number of Members</label>
                    <p className="text-gray-900">{organization.members || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  organization.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {organization.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Followers</span>
                <span className="font-medium">{organization.followers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Founded</span>
                <span className="font-medium">{organization.founded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type</span>
                <span className="font-medium">{organization.type}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media</h3>
            <div className="space-y-2">
              {organization.socialMedia?.facebook && (
                <a href={organization.socialMedia.facebook} target="_blank" rel="noopener noreferrer" 
                   className="block text-blue-600 hover:text-blue-800 text-sm">
                  Facebook
                </a>
              )}
              {organization.socialMedia?.instagram && (
                <p className="text-sm text-gray-900">
                  Instagram: {organization.socialMedia.instagram}
                </p>
              )}
              {organization.socialMedia?.twitter && (
                <p className="text-sm text-gray-900">
                  Twitter: {organization.socialMedia.twitter}
                </p>
              )}
              {!organization.socialMedia?.facebook && !organization.socialMedia?.instagram && !organization.socialMedia?.twitter && (
                <p className="text-sm text-gray-500">No social media links</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const OrgDashboard = () => {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'organization';

  const sidebarItems = [
    { id: 'organization', label: 'Dashboard', icon: Home, path: '/organization' },
    { id: 'events', label: 'Events', icon: Calendar, path: '/organization/events' },
    { id: 'followers', label: 'Followers', icon: UserPlus, path: '/organization/followers' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/organization/notifications' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/organization/settings' }
  ];

  const sidebarContent = (
    <nav className="mt-6 px-3">
      <div className="space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = (item.path === '/organization' && currentPath === 'organization') || 
                          (item.path !== '/organization' && currentPath === item.id);
          
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  const getPageTitle = () => {
    switch (currentPath) {
      case 'events': return 'Events Management';
      case 'followers': return 'Followers';
      case 'notifications': return 'Notifications';
      case 'settings': return 'Settings';
      default: return 'Organization Dashboard';
    }
  };

  return (
    <Layout sidebarContent={sidebarContent} title={getPageTitle()}>
      <Routes>
        <Route path="/" element={<OrgHome />} />
        <Route path="/events" element={<OrgEvents />} />
        <Route path="/followers" element={<OrgFollowers />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<OrgSettings />} />
      </Routes>
    </Layout>
  );
};

export default OrgDashboard;