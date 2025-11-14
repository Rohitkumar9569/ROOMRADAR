import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { createReview } from '../../../api'; 
import toast from 'react-hot-toast';

const StarRating = ({ rating, setRating }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center justify-center space-x-2">
      {[...Array(5)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <label key={index}>
            <input
              type="radio"
              name="rating"
              value={ratingValue}
              onClick={() => setRating(ratingValue)}
              className="hidden"
            />
            <FaStar
              className="cursor-pointer transition-colors"
              color={ratingValue <= (hover || rating) ? '#ffc107' : '#e4e5e9'}
              size={40}
              onMouseEnter={() => setHover(ratingValue)}
              onMouseLeave={() => setHover(0)}
            />
          </label>
        );
      })}
    </div>
  );
};


function ReviewModal({ isOpen, onClose, booking, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }
    if (!comment.trim()) {
      setError('Please write a comment for your review.');
      return;
    }

    setLoading(true);
    try {
      const reviewData = { rating, comment };
      // API को कॉल करें, roomId बुकिंग ऑब्जेक्ट से मिलेगा
      await createReview(booking.room._id, reviewData);
      toast.success('Thank you! Your review has been submitted.');
      onSuccess(); // UI को रिफ्रेश करने के लिए
      onClose();   // Modal को बंद करें
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to submit review.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg mx-4">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Leave a Review</h2>
        <p className="text-center text-gray-600 mb-6">How was your stay at "{booking.room.title}"?</p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <StarRating rating={rating} setRating={setRating} />
          </div>
          <div className="mb-6">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Your Comment
            </label>
            <textarea
              id="comment"
              rows="5"
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            ></textarea>
          </div>
          
          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
          
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-semibold disabled:bg-indigo-300"
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewModal;