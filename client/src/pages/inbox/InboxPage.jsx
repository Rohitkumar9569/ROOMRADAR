import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { PaperAirplaneIcon, InboxIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';
import ActionBlock from '../../components/features/chat/ActionBlock';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { io } from "socket.io-client"; //  Socket.IO client is imported

// --- Sub-components (These are your existing components, unchanged) ---
const ConversationCard = ({ convo, onClick, isSelected, currentUser }) => {
    const otherMember = convo.members?.find(m => m._id !== currentUser?._id);
    if (!otherMember) return null;
    const getStatusBadge = (status) => {
        const styles = { pending: 'bg-yellow-500', approved: 'bg-blue-500', confirmed: 'bg-green-500', rejected: 'bg-red-500', cancelled: 'bg-gray-500' };
        return <span className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-white ${styles[status] || 'hidden'}`} title={`Status: ${status}`}></span>;
    };
    return (
        <div onClick={onClick} className={`flex items-start p-3 border-b hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-teal-50' : ''}`}>
            <div className="relative flex-shrink-0">
                <img src={otherMember.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${otherMember.name}`} alt={otherMember.name} className="h-12 w-12 rounded-full" />
                {convo.application?.status && getStatusBadge(convo.application.status)}
            </div>
            <div className="flex-1 overflow-hidden ml-3">
                <div className="flex justify-between items-baseline">
                    <p className="font-bold text-gray-800 truncate">{otherMember.name}</p>
                    <p className="text-xs text-gray-400 flex-shrink-0">{convo.lastMessage ? formatDistanceToNow(new Date(convo.lastMessage.createdAt), { addSuffix: true }) : ''}</p>
                </div>
                <p className="text-sm text-teal-600 font-semibold truncate">{convo.room?.title || 'General Inquiry'}</p>
                <p className="text-sm text-gray-500 truncate">{convo.lastMessage?.text || (convo.lastMessage?.messageType ? convo.lastMessage.messageType.replace('_', ' ') : 'No messages yet')}</p>
            </div>
        </div>
    );
};
const MessageBubble = ({ message, isOwnMessage }) => (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${isOwnMessage ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
            <p className="text-sm break-words">{message.text}</p>
        </div>
    </div>
);
const EmptyState = ({ icon, title, message }) => (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500 h-full">
        <div className="w-24 h-24 text-gray-300">{icon}</div>
        <h2 className="mt-4 text-xl font-semibold text-gray-700">{title}</h2>
        <p className="mt-1 text-sm">{message}</p>
    </div>
);
const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(window.matchMedia(query).matches);
    useEffect(() => {
        const media = window.matchMedia(query);
        const listener = () => setMatches(media.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);
    return matches;
};

// --- Main Inbox Page Component ---
const InboxPage = () => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { searchTerm, setActiveChatName } = useOutletContext();
    const location = useLocation();
    const isDesktop = useMediaQuery('(min-width: 768px)');
    const [allConversations, setAllConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const messagesEndRef = useRef(null);
    const socket = useRef(); // A ref is created for the socket instance
    const selectedConversation = useMemo(() => allConversations.find(c => c._id === conversationId), [allConversations, conversationId]);

    useEffect(() => {
        socket.current = io("ws://localhost:5000");

        socket.current.on("getMessage", (data) => {
            // Check if the incoming message belongs to the currently open conversation
            if (data.conversationId === conversationId) {
                const incomingMessage = {
                    ...data,
                    sender: { _id: data.senderId },
                    createdAt: new Date().toISOString()
                };
                setMessages((prev) => [...prev, incomingMessage]);
            }
        });
        
        return () => {
            socket.current.disconnect();
        };
    }, [conversationId]); // Add conversationId as a dependency

    useEffect(() => {
        if (currentUser && socket.current) {
            socket.current.emit("addUser", currentUser._id);
        }
    }, [currentUser]);

    useEffect(() => {
        if (selectedConversation) {
            const otherMember = selectedConversation.members?.find(m => m._id !== currentUser?._id);
            setActiveChatName(otherMember ? otherMember.name : null);
        } else { setActiveChatName(null); }
        return () => setActiveChatName(null);
    }, [selectedConversation, currentUser, setActiveChatName]);
    
    const fetchConversations = useCallback(async () => {
        setLoading(true);
        const isLandlordView = location.pathname.startsWith('/landlord');
        const endpoint = isLandlordView ? '/chat/conversations/as-landlord' : '/chat/conversations/as-student';
        try { const { data } = await api.get(endpoint); setAllConversations(data); } catch (error) { toast.error('Failed to fetch conversations.'); } finally { setLoading(false); }
    }, [location.pathname]);

    const fetchMessages = useCallback(async (id) => {
        if (!id) return;
        setLoadingMessages(true);
        try { const { data } = await api.get(`/chat/messages/${id}`); setMessages(data); } catch (error) { toast.error('Failed to fetch messages.'); } finally { setLoadingMessages(false); }
    }, []);

    useEffect(() => { fetchConversations(); }, [fetchConversations]);
    useEffect(() => { fetchMessages(conversationId); }, [conversationId, fetchMessages]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleConversationClick = (convoId) => {
        const isLandlordView = location.pathname.startsWith('/landlord');
        const basePath = isLandlordView ? '/landlord' : '/profile';
        navigate(`${basePath}/inbox/${convoId}`);
    };

  
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !conversationId) return;

        const otherMember = selectedConversation.members.find(m => m._id !== currentUser._id);
        if (!otherMember) return;

        // Emit the message to the server via the socket for real-time delivery
        socket.current.emit("sendMessage", {
            senderId: currentUser._id,
            receiverId: otherMember._id,
            text: newMessage,
            conversationId: conversationId,
        });

        // Optimistically update the UI for a snappy feel
        setMessages(prev => [...prev, { 
            text: newMessage, 
            sender: { _id: currentUser._id },
            createdAt: new Date().toISOString()
        }]);
        const textToSend = newMessage;
        setNewMessage('');
        
        // Also save the message to the database in the background
        try {
            await api.post('/chat/messages', { conversationId, text: textToSend });
            // Optionally refetch conversations to update lastMessage, but socket can handle this too
        } catch (error) {
            toast.error("Failed to save message.");
            setNewMessage(textToSend); // If saving fails, restore the text
        }
    };
    
    const filteredConversations = useMemo(() => {
        let conversations = allConversations;
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            conversations = conversations.filter(c => c.members?.some(m => m._id !== currentUser._id && m.name.toLowerCase().includes(lowercasedFilter)) || c.room?.title.toLowerCase().includes(lowercasedFilter));
        }
        switch (activeFilter) {
            case 'Requests': return conversations.filter(c => c.conversationType === 'booking' && c.application?.status === 'pending');
            case 'Inquiries': return conversations.filter(c => c.conversationType === 'inquiry');
            case 'Upcoming': return conversations.filter(c => c.conversationType === 'booking' && ['approved', 'confirmed'].includes(c.application?.status));
            case 'Archived': return conversations.filter(c => c.conversationType === 'booking' && ['rejected', 'cancelled'].includes(c.application?.status));
            default: return conversations;
        }
    }, [allConversations, activeFilter, searchTerm, currentUser]);
    
    const isLandlordView = location.pathname.startsWith('/landlord');
    const FILTERS = isLandlordView ? ['All', 'Requests', 'Inquiries', 'Upcoming', 'Archived'] : ['All', 'Upcoming', 'Archived'];

    const ConversationListPanel = (
        <div className="h-full flex flex-col overflow-hidden border-r border-gray-200 bg-zinc-50">
            <div className="sticky top-0 z-10 flex-shrink-0 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-wrap gap-2 p-2">
                    {FILTERS.map(filter => ( <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-3 py-1.5 text-sm font-semibold rounded-full flex-shrink-0 ${activeFilter === filter ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>{filter}</button>))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {loading ? <div className="flex justify-center items-center h-full"><Spinner /></div> : ( filteredConversations.length > 0 ? ( filteredConversations.map(convo => (<ConversationCard key={convo._id} convo={convo} onClick={() => handleConversationClick(convo._id)} isSelected={selectedConversation?._id === convo._id} currentUser={currentUser} />)) ) : (<div className="p-6 text-center text-gray-500"><p>No conversations in this category.</p></div>))}
            </div>
        </div>
    );

    const ChatWindowPanel = (
        <div className="h-full flex-1 flex flex-col bg-zinc-50">
            {!isDesktop && conversationId && (
                <div className="p-2 border-b bg-white flex-shrink-0">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 p-2 text-sm font-semibold text-gray-600"><ArrowLeftIcon className="h-5 w-5"/>Back to Inbox</button>
                </div>
            )}
            {selectedConversation ? (
                <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {loadingMessages ? <div className="flex justify-center items-center h-full"><Spinner /></div> : messages.map(message => {
                            if (message.messageType === 'booking_request') { return <ActionBlock key={message._id} message={message} onUpdateRequest={() => fetchMessages(conversationId)} />; } else { const isOwnMessage = message.sender?._id === currentUser?._id; return <MessageBubble key={message._id} message={message} isOwnMessage={isOwnMessage} />; }
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 border-t bg-zinc-50 flex-shrink-0">
                        <div className="relative">
                            <input type="text" placeholder="Type a message..." className="w-full p-3 pr-12 border border-gray-300 rounded-full focus:ring-2 focus:ring-teal-500" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={isSending} />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:bg-gray-400" disabled={isSending || !newMessage.trim()}><PaperAirplaneIcon className="h-5 w-5" /></button>
                        </div>
                    </form>
                </>
            ) : ( <EmptyState icon={<InboxIcon />} title="Select a conversation" message="Choose from the list on the left to view messages." />)}
        </div>
    );

    return isDesktop ? (
        <PanelGroup direction="horizontal" className="h-full bg-zinc-50">
            <Panel defaultSize={37} minSize={25} maxSize={45}>{ConversationListPanel}</Panel>
            <PanelResizeHandle className="w-px bg-gray-200 hover:bg-teal-500 active:bg-teal-600 transition-colors cursor-col-resize" />
            <Panel defaultSize={63}>{ChatWindowPanel}</Panel>
        </PanelGroup>
    ) : (
        <div className="h-full">{conversationId ? ChatWindowPanel : ConversationListPanel}</div>
    );
};

export default InboxPage;