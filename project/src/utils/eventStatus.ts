export interface EventStatus {
  status: 'upcoming' | 'started' | 'ended';
  canJoin: boolean;
  canLeave: boolean;
  canViewDetails: boolean;
  statusText: string;
  statusColor: string;
}

const formatTimeRemaining = (startDateTime: Date): string => {
  const now = new Date();
  const diffMs = startDateTime.getTime() - now.getTime();
  
  if (diffMs <= 0) return '';
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export const getEventStatus = (event: any): EventStatus => {
  const now = new Date();
  const eventStartDateTime = new Date(`${event.date}T${event.startTime}`);
  const eventEndDateTime = new Date(`${event.date}T${event.endTime}`);
  
  if (now < eventStartDateTime) {
    // Event hasn't started yet
    const timeRemaining = formatTimeRemaining(eventStartDateTime);
    return {
      status: 'upcoming',
      canJoin: true,
      canLeave: true,
      canViewDetails: true,
      statusText: `Upcoming ${timeRemaining}`,
      statusColor: 'bg-blue-100 text-blue-800'
    };
  } else if (now >= eventStartDateTime && now < eventEndDateTime) {
    // Event has started but not ended
    return {
      status: 'started',
      canJoin: true,
      canLeave: true,
      canViewDetails: true,
      statusText: 'Event Started',
      statusColor: 'bg-orange-100 text-orange-800'
    };
  } else {
    // Event has ended
    return {
      status: 'ended',
      canJoin: false,
      canLeave: false,
      canViewDetails: true,
      statusText: 'Event Ended',
      statusColor: 'bg-red-100 text-red-800'
    };
  }
};
