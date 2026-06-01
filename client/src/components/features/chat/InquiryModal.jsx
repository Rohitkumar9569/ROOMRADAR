import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../api';
import toast from 'react-hot-toast';
import { 
    Mail, X, Send, MessageCircle, Home, User,
    Shield, ArrowRight, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatListingTitle } from '../../../utils/listingDisplay';
import { triggerHaptic } from '../../../utils/haptics';

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;

// --- Premium Inquiry Modal Component ---
const InquiryModal = ({ room, onClose }) => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const displayTitle = formatListingTitle(room?.title, 'Room listing');

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = 'var(--scrollbar-width, 0px)';
        
        // Calculate scrollbar width
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
        
        return () => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };
    }, []);

    const handleSendInquiry = async (e) => {
        e.preventDefault();
        const cleanMessage = message.trim();
        if (cleanMessage.length < 10) {
            return toast.error('Please write at least 10 characters.');
        }
        setLoading(true);
        try {
            // This API call creates the "application" record of the inquiry
            await api.post('/applications/inquiry', {
                roomId: room._id,
                message: cleanMessage,
            });

            // This API call finds or creates the conversation and now sends the initial message
            const { data: conversationData } = await api.post('/chat/conversations/find-or-create', {
                roomId: room._id,
                otherUserId: room.landlord._id || room.landlord,
                message: cleanMessage,
            });

            toast.success("Your message has been sent!");
            triggerHaptic('success');
            if (conversationData.conversationId) {
                navigate(`/profile/inbox/${conversationData.conversationId}`);
            }
            onClose(); // Close the modal
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Could not send your message.';
            triggerHaptic('error');
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const modalContent = (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-[calc(var(--rr-bottom-nav-height)+env(safe-area-inset-bottom,0px))] left-0 right-0 top-[var(--rr-mobile-header-offset)] z-[45] flex items-stretch justify-center bg-slate-50 dark:bg-slate-900 md:inset-0 md:z-[9999] md:items-center md:bg-transparent"
            onClick={onClose}
        >
            {/* Premium Blur Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 hidden bg-slate-900/70 backdrop-blur-xl dark:bg-black/80 md:block" 
            />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: 48 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 48 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="relative flex h-full max-h-full w-full flex-col overflow-hidden border-0 bg-slate-50 shadow-none dark:bg-slate-900 md:h-auto md:max-h-[92vh] md:min-h-[600px] md:max-w-4xl md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl md:dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative flex-shrink-0 bg-slate-950 px-4 py-3 shadow-lg md:px-6 md:py-4">
                    <div className="absolute top-2 right-2 md:top-3 md:right-4 z-10">
                        <motion.button
                            onClick={onClose}
                            aria-label="Close contact landlord form"
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors shadow-md"
                        >
                            <X className="w-5 h-5" />
                        </motion.button>
                    </div>
                    
                    <div className="flex items-center gap-3 pr-12">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-white md:text-xl">
                                Contact Landlord
                            </h2>
                            <p className="text-blue-100 text-sm mt-0.5">Start a conversation</p>
                        </div>
                    </div>
                </div>

                {/* Content - Full height scrollable area with bottom padding for visibility */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-3 dark:bg-slate-900 md:p-8 md:pb-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 md:min-h-[480px]">
                        {/* Left: Room Info */}
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-4"
                        >
                            {/* Room Info Card */}
                            <div className="flex items-start gap-4 rounded-2xl border border-blue-200/50 bg-blue-50/80 p-5 shadow-lg shadow-blue-100/50 dark:border-blue-800/40 dark:bg-blue-900/20 dark:shadow-black/20">
                                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-500 shadow-xl shadow-cyan-500/20">
                                    <Home className="w-8 h-8 text-white" />
                                </div>
                                <div className="min-w-0 flex-1 pt-1">
                                    <p className="font-bold text-slate-900 dark:text-slate-100 text-xl leading-tight mb-2">{displayTitle}</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-1.5">
                                        <div className="p-1 bg-slate-100 dark:bg-slate-700 rounded-md">
                                            <User className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="font-medium">{room.landlord?.name || 'Landlord'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-base">
                                        <span className="font-bold text-cyan-700 dark:text-cyan-300">{money(room.rent)}/month</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Info Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm text-center">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Room Type</p>
                                    <p className="font-bold text-slate-900 dark:text-slate-200">{room.roomType || 'N/A'}</p>
                                </div>
                                <div className="p-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm text-center">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Beds</p>
                                    <p className="font-bold text-slate-900 dark:text-slate-200">{room.beds || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Trust Indicators */}
                            <div className="p-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                        <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="font-medium">Secure messaging</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                                        <CheckCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                    </div>
                                    <span className="font-medium">Instant delivery</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span className="font-medium">Direct to landlord</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right: Message Form */}
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex min-h-0 flex-col"
                        >
                            <form onSubmit={handleSendInquiry} className="flex min-h-full flex-col md:h-full">
                                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">
                                    Your Message *
                                </label>
                                <div className="relative md:flex-1">
                                    <textarea
                                        id="message"
                                        name="message"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        maxLength={1000}
                                        className="block min-h-[240px] w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-4 text-slate-900 shadow-inner transition-all duration-300 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/30 md:h-full md:min-h-[200px]"
                                        placeholder={`Hi, I'm interested in "${displayTitle}". Could you please provide more information about availability, amenities, and move-in process?`}
                                        required
                                    />
                                </div>
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    Your message will start a new conversation in your inbox.
                                </p>

                                {/* Action Buttons - Part of form flow */}
                                <div className="sticky bottom-0 z-20 -mx-3 mt-4 grid grid-cols-2 gap-2 border-t border-slate-200/80 bg-slate-50/95 px-3 py-3 shadow-[0_-14px_32px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/95 md:static md:mx-0 md:flex md:justify-end md:gap-3 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0">
                                    <motion.button 
                                        type="button" 
                                        onClick={onClose}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="px-5 py-2.5 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Cancel
                                    </motion.button>
                                    
                                    <motion.button 
                                        type="submit" 
                                        disabled={loading}
                                        whileHover={!loading ? { scale: 1.02 } : {}}
                                        whileTap={!loading ? { scale: 0.98 } : {}}
                                        className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-cyan-500 px-5 py-2.5 font-bold text-white shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        
                                        {loading ? (
                                            <>
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                                />
                                                <span className="relative text-sm">Sending...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4 relative" />
                                                <span className="relative text-sm">Send Message</span>
                                                <ArrowRight className="w-4 h-4 relative group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );

    // Render modal at body level using Portal to ensure it's on top of everything
    return createPortal(modalContent, document.body);
};

export default InquiryModal;
