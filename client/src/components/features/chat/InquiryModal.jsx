import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../api';
import toast from 'react-hot-toast';
import { 
    Mail, X, Send, MessageCircle, Home, User,
    Shield, Sparkles, ArrowRight, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- Premium Inquiry Modal Component ---
const InquiryModal = ({ room, onClose }) => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const navigate = useNavigate();

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
        if (!message.trim()) {
            return toast.error("Please enter a message.");
        }
        setLoading(true);
        try {
            // This API call creates the "application" record of the inquiry
            await api.post('/applications/inquiry', {
                roomId: room._id,
                message: message,
            });

            // This API call finds or creates the conversation and now sends the initial message
            const { data: conversationData } = await api.post('/chat/conversations/find-or-create', {
                roomId: room._id,
                otherUserId: room.landlord._id || room.landlord,
                message: message,
            });

            toast.success("Your message has been sent!");
            if (conversationData.conversationId) {
                navigate(`/profile/inbox/${conversationData.conversationId}`);
            }
            onClose(); // Close the modal
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Could not send your message.';
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
            className="fixed inset-0 z-[9999] flex justify-center items-center"
            onClick={onClose}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            {/* Premium Blur Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xl" 
            />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="relative bg-slate-50 dark:bg-slate-900 rounded-none md:rounded-2xl shadow-2xl w-full h-[100dvh] md:h-auto md:min-h-[600px] md:max-w-4xl z-[10000] overflow-hidden flex flex-col border-0 md:border md:border-slate-200 md:dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Compact Header - Premium Blue/Cyan */}
                <div className="relative bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-600 dark:from-blue-700 dark:via-cyan-700 dark:to-cyan-700 px-4 md:px-6 py-3 md:py-4 flex-shrink-0 shadow-lg">
                    <div className="absolute top-2 right-2 md:top-3 md:right-4 z-10">
                        <motion.button
                            onClick={onClose}
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
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                Contact Landlord
                            </h2>
                            <p className="text-blue-100 text-sm mt-0.5">Start a conversation</p>
                        </div>
                    </div>
                </div>

                {/* Content - Full height scrollable area with bottom padding for visibility */}
                <div className="flex-1 p-3 md:p-8 pb-20 md:pb-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                        {/* Left: Room Info */}
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-4"
                        >
                            {/* Room Info Card */}
                            <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-blue-50/80 to-cyan-50/80 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl border border-blue-200/50 dark:border-blue-800/40 shadow-lg shadow-blue-100/50 dark:shadow-black/20">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-xl shadow-blue-500/30">
                                    <Home className="w-8 h-8 text-white" />
                                </div>
                                <div className="min-w-0 flex-1 pt-1">
                                    <p className="font-bold text-slate-900 dark:text-slate-100 text-xl leading-tight mb-2">{room.title}</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-1.5">
                                        <div className="p-1 bg-slate-100 dark:bg-slate-700 rounded-md">
                                            <User className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="font-medium">{room.landlord?.name || 'Landlord'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-base">
                                        <span className="font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">₹{Number(room.rent || 0).toLocaleString('en-IN')}/month</span>
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
                                        <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
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
                            className="flex flex-col"
                        >
                            <form onSubmit={handleSendInquiry} className="flex flex-col h-full">
                                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">
                                    Your Message *
                                </label>
                                <div className="relative flex-1">
                                    <textarea
                                        id="message"
                                        name="message"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="block w-full h-full min-h-[200px] rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shadow-inner px-4 py-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:border-blue-400 dark:focus:ring-blue-400/30 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-600 leading-relaxed"
                                        placeholder={`Hi, I'm interested in "${room.title}". Could you please provide more information about availability, amenities, and move-in process?`}
                                        required
                                    />
                                </div>
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    Your message will start a new conversation in your inbox.
                                </p>

                                {/* Action Buttons - Part of form flow */}
                                <div className="mt-4 flex justify-end gap-3">
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
                                        onMouseEnter={() => setIsHovered(true)}
                                        onMouseLeave={() => setIsHovered(false)}
                                        whileHover={!loading ? { scale: 1.02 } : {}}
                                        whileTap={!loading ? { scale: 0.98 } : {}}
                                        className="group relative overflow-hidden px-5 py-2.5 bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-600 hover:from-blue-700 hover:via-cyan-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300"
                                    >
                                        {/* Shine Effect */}
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                                            animate={{ x: loading ? 200 : isHovered ? 200 : -200 }}
                                            transition={{ duration: 0.6 }}
                                        />
                                        
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
