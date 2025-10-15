import React from 'react';
import { useCountdown } from '../hooks/useCountdown';

interface EventCountdownProps {
  eventDate: string;
  className?: string;
}

const EventCountdown: React.FC<EventCountdownProps> = ({ eventDate, className = '' }) => {
  const countdown = useCountdown(eventDate);

  if (countdown.isExpired) {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ${className}`}>
        Event Started
      </span>
    );
  }

  // Show only hours if less than 24 hours remaining
  if (countdown.days === 0) {
    const totalHours = countdown.hours;
    const totalMinutes = countdown.minutes;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ${className}`}>
        {totalHours}h {totalMinutes}m
      </span>
    );
  }

  // Show days and hours if more than 24 hours remaining
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ${className}`}>
      {countdown.days}d {countdown.hours}h
    </span>
  );
};

export default EventCountdown;
