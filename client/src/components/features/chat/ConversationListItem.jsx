// client/src/components/ConversationListItem.jsx

import React from 'react';
import { format } from 'timeago.js'; // A great library for relative dates

const ConversationListItem = ({ conversation, onClick, isActive }) => {
  // We now get 'otherParticipant' directly from our refined API
  const { otherParticipant, lastMessage, unreadCount } = conversation;

  // Handle cases where a user or room might have been deleted
  if (!otherParticipant) {
    return null; // Or return a placeholder for a deleted user conversation
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center p-3 my-1 cursor-pointer rounded-lg transition-colors duration-200 ${
        isActive ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {/*  Avatar with Online Status Indicator --- */}
      <div className="relative mr-4 flex-shrink-0">
        <img
          className="w-12 h-12 rounded-full object-cover"
          src={otherParticipant.profilePicture || `https://ui-avatars.com/api/?name=${otherParticipant.name}&background=random`}
          alt={otherParticipant.name}
        />
        {otherParticipant.isOnline && (
          <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></span>
        )}
      </div>

      <div className="flex-grow overflow-hidden">
        <div className="flex justify-between items-center">
          <h3 className={`font-bold truncate ${isActive ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
            {otherParticipant.name}
          </h3>
          <p className={`text-xs flex-shrink-0 ml-2 ${isActive ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
            {lastMessage ? format(lastMessage.createdAt) : ''}
          </p>
        </div>
        <div className="flex justify-between items-start mt-1">
          <p className={`text-sm truncate pr-2 ${isActive ? 'text-indigo-100' : 'text-gray-600 dark:text-gray-300'}`}>
            {lastMessage?.text || 'No messages yet...'}
          </p>
          
          {/* Unread Message Count Badge --- */}
          {unreadCount > 0 && (
            <span className="bg-indigo-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationListItem;