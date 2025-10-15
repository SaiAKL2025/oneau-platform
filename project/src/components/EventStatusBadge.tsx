import React, { useState, useEffect } from 'react';
import { getEventStatus } from '../utils/eventStatus';

interface EventStatusBadgeProps {
  eventDate: string;
  startTime: string;
  endTime: string;
  className?: string;
}

const EventStatusBadge: React.FC<EventStatusBadgeProps> = ({ eventDate, startTime, endTime, className = '' }) => {
  const event = { date: eventDate, startTime, endTime };
  const [eventStatus, setEventStatus] = useState(() => getEventStatus(event));

  useEffect(() => {
    const interval = setInterval(() => {
      setEventStatus(getEventStatus(event));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [eventDate, startTime, endTime]);

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${eventStatus.statusColor} ${className}`}>
      {eventStatus.statusText}
    </span>
  );
};

export default EventStatusBadge;

