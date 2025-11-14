// client/src/components/ChatHeader.jsx (Refined)
import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'timeago.js';

const ChatHeader = ({ conversation, onBack }) => {
    // We now get the full participant object from our API
    const { otherParticipant, roomId } = conversation;

    if (!otherParticipant) return null; // Safety check

    return (
        <div className="flex items-center p-3 border-b border-gray-200 bg-white shadow-sm">
            {/* Mobile Back Button */}
            <button onClick={onBack} className="md:hidden p-2 text-gray-600 mr-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>

            {/* Avatar */}
            <img
                className="w-10 h-10 rounded-full object-cover"
                src={otherParticipant.profilePicture || `https://ui-avatars.com/api/?name=${otherParticipant.name}`}
                alt={otherParticipant.name}
            />

            {/* User Info */}
            <div className="ml-3">
                <p className="font-semibold text-gray-800">{otherParticipant.name}</p>
                <p className="text-xs text-gray-500">
                    {otherParticipant.isOnline 
                        ? <span className="text-green-500">Online</span>
                        : `Last seen ${format(otherParticipant.lastSeen)}`
                    }
                </p>
            </div>
            
            {/* Room Info on the right */}
            {roomId && (
                 <Link to={`/room/${roomId._id}`} className="ml-auto text-right">
                    <p className="font-semibold text-sm text-indigo-600 hover:underline">{roomId.title}</p>
                    <p className="text-xs text-gray-500">{roomId.location?.city}</p>
                </Link>
            )}
        </div>
    );
};

export default ChatHeader;