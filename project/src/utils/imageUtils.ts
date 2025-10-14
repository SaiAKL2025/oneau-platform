// Utility functions for handling image URLs

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * Constructs the full URL for an image from a relative path
 * @param imageUrl - The image URL from the database (could be full URL or filename)
 * @param type - The type of image ('event', 'profile', 'organization')
 * @returns The full URL for the image
 */
export const getImageUrl = (imageUrl: string, type: 'event' | 'profile' | 'organization' = 'event'): string => {
  if (!imageUrl) return '';
  
  // If it's already a full URL, check if it's an old event image URL that needs conversion
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Check if it's an old event image URL that should use the API endpoint
    if (imageUrl.includes('/uploads/events/') && type === 'event') {
      const filename = imageUrl.split('/').pop();
      const eventUrl = `${BACKEND_URL}/api/events/images/${filename}`;
      console.log('🔍 Converting old event URL to API endpoint:', { oldUrl: imageUrl, newUrl: eventUrl });
      return eventUrl;
    }
    
    // For Google profile images (Google OAuth users), use the URL directly
    if (imageUrl.includes('googleusercontent.com') || imageUrl.includes('googleapis.com')) {
      console.log('🔍 Using Google profile image URL directly:', imageUrl);
      // Add error handling for Google images
      return imageUrl;
    }
    
    console.log('🔍 Using full URL directly:', imageUrl);
    return imageUrl;
  }
  
  // For profile images, use the users API endpoint
  if (type === 'profile') {
    const profileUrl = `${BACKEND_URL}/api/users/images/${imageUrl}`;
    console.log('🔍 Profile image URL:', { imageUrl, profileUrl, BACKEND_URL });
    return profileUrl;
  }
  
  // For event images, use the events API endpoint
  if (type === 'event') {
    const eventUrl = `${BACKEND_URL}/api/events/images/${imageUrl}`;
    console.log('🔍 Event image URL:', { imageUrl, eventUrl, BACKEND_URL });
    return eventUrl;
  }
  
  // Fallback for old relative URLs
  if (imageUrl.startsWith('/')) {
    const fullUrl = `${BACKEND_URL}${imageUrl}`;
    console.log('🔍 Fallback: constructed URL from relative path:', { imageUrl, fullUrl, BACKEND_URL });
    return fullUrl;
  }
  
  // Last resort fallback
  const fallbackUrl = `${BACKEND_URL}/uploads/${imageUrl}`;
  console.log('🔍 Last resort fallback:', { imageUrl, fallbackUrl, BACKEND_URL });
  return fallbackUrl;
};

/**
 * Handles image loading errors by providing a fallback avatar
 * @param event - The error event from the img element
 */
export const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
  console.error('Failed to load image:', event.currentTarget.src);
  
  // Set a fallback avatar image instead of hiding
  const img = event.currentTarget;
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNFNUU3RUIiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSIjOUI5QkE1Ii8+CjxwYXRoIGQ9Ik0xMiAxNEM5Ljc5MDg2IDE0IDggMTUuNzkwOSA4IDE4VjIwSDE2VjE4QzE2IDE1Ljc5MDkgMTQuMjA5MSAxNCAxMiAxNFoiIGZpbGw9IiM5QjlCQTUiLz4KPC9zdmc+Cjwvc3ZnPgo=';
  img.alt = 'Default Avatar';
  img.style.display = 'block';
  
  // Remove any error styling
  img.classList.remove('opacity-50');
  img.classList.add('opacity-100');
};
