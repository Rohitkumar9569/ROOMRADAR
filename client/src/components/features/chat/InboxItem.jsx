import React from 'react';

const InboxItem = ({ conversation, onClick }) => {
  if (!conversation) {
    return null;
  }

  const { otherParticipant, lastMessage, unreadCount, applicationType } = conversation;

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center p-4 hover:bg-gray-100 cursor-pointer border-b border-gray-200 transition-colors duration-200"
    >
      <div className="flex-shrink-0 mr-4 relative">
        <img
          className="w-14 h-14 rounded-full object-cover"
          src={otherParticipant?.profilePicture || 'https://via.placeholder.com/150'}
          alt={`${otherParticipant?.name}'s profile`}
        />
      </div>

      {/* Middle: Name, Status, Last Message */}
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-gray-800 truncate">{otherParticipant?.name || 'Unknown User'}</h3>
        </div>
        
        {/* Conditional Status Tag */}
        {applicationType === 'request' ? (
          <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            Booking Request
          </span>
        ) : (
          <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
            Inquiry
          </span>
        )}

        <p className="text-sm text-gray-500 truncate mt-1">
          {lastMessage?.text || 'No messages yet...'}
        </p>
      </div>

      {/* Right Side: Timestamp and Unread Count */}
      <div className="flex flex-col items-end flex-shrink-0 ml-4">
        <p className="text-xs text-gray-500 mb-2">
          {formatTimestamp(lastMessage?.createdAt)}
        </p>
        {unreadCount > 0 && (
          <span className="w-5 h-5 flex items-center justify-center text-white bg-red-500 rounded-full text-xs font-bold">
            {unreadCount}
          </span>
        )}
      </div>
    </div>
  );
};

export default InboxItem;