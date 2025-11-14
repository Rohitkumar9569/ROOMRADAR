// client/src/components/MessageBubble.jsx (Upgraded "WhatsApp" Style)
import React from 'react';

const MessageBubble = ({ message, prevMessage, isOwnMessage, otherParticipant }) => {
    // Helper to format time (e.g., "6:34 PM")
    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Check if the previous message was sent by the same person
    const isSameSenderAsPrevious = prevMessage?.sender?._id === message.sender?._id;

    // Determine the margin-top for grouping messages
    const marginTopClass = isSameSenderAsPrevious ? 'mt-1' : 'mt-4';

    return (
        <div className={`flex items-end w-full ${marginTopClass} ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-center max-w-xs md:max-w-md ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar: Show only for the FIRST message from the other user in a group */}
                {!isOwnMessage && (
                    <div className="flex-shrink-0 w-8 h-8">
                        {!isSameSenderAsPrevious && (
                            <img
                                className="w-full h-full rounded-full object-cover"
                                src={otherParticipant?.profilePicture || `https://ui-avatars.com/api/?name=${otherParticipant?.name}`}
                                alt={otherParticipant?.name}
                            />
                        )}
                    </div>
                )}
                
                {/* Message Bubble and Time */}
                <div className={`px-4 py-2 rounded-xl relative ${isOwnMessage ? 'bg-indigo-600 text-white ml-2 rounded-br-sm' : 'bg-white text-gray-800 mr-2 rounded-bl-sm shadow-sm border border-gray-100'}`}>
                    <p className="text-sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {message.text}
                    </p>
                    <p className={`text-xs mt-1 text-right ${isOwnMessage ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {formatTime(message.createdAt)}
                    </p>
                </div>

            </div>
        </div>
    );
};

export default MessageBubble;