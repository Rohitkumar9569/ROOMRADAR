import React, { useState } from 'react';
import api from '../../../api';
import toast from 'react-hot-toast';
import { FaEnvelope } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const InquiryModal = ({ room, onClose }) => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Ask the Landlord a Question</h2>
                <p className="text-gray-600 mb-6">Your message will start a new conversation in your inbox.</p>
                <form onSubmit={handleSendInquiry}>
                    <div className="relative">
                        <FaEnvelope className="absolute left-4 top-4 text-gray-400" />
                        <textarea
                            id="message"
                            name="message"
                            rows="5"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="block w-full rounded-xl border-gray-300 shadow-sm pl-12 pr-4 py-3 focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder={`Questions about "${room.title}"?`}
                            required
                        />
                    </div>
                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="bg-teal-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-teal-700 disabled:bg-gray-400">
                            {loading ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InquiryModal;