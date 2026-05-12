import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { createReview } from '../../../api';
import toast from 'react-hot-toast';
import { formatListingTitle } from '../../../utils/listingDisplay';

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
              color={ratingValue <= (hover || rating) ? '#f59e0b' : '#d1d5db'}
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

  if (!isOpen) return null;
  const displayTitle = formatListingTitle(booking?.room?.title, 'this room');

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
      await createReview(booking.room._id, { rating, comment });
      toast.success('Thank you! Your review has been submitted.');
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to submit review.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-light-border bg-light-card p-6 shadow-2xl dark:border-dark-border dark:bg-dark-card sm:p-8">
        <h2 className="mb-3 text-center text-2xl font-bold tracking-tight text-light-text dark:text-dark-text">
          Leave a Review
        </h2>
        <p className="mb-6 text-center text-sm text-light-muted dark:text-dark-muted">
          How was your stay at "{displayTitle}"?
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <StarRating rating={rating} setRating={setRating} />
          </div>

          <div className="mb-6">
            <label htmlFor="comment" className="mb-2 block text-sm font-medium text-light-text2 dark:text-dark-text2">
              Your Comment
            </label>
            <textarea
              id="comment"
              rows="5"
              className="w-full rounded-2xl border border-light-border bg-light-bg px-4 py-3 text-light-text outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-dark-border dark:bg-dark-input dark:text-dark-text"
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>

          {error && <p className="mb-4 text-center text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-light-border px-5 py-2.5 font-semibold text-light-text transition hover:bg-light-bg dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-input"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-cyan-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-600 disabled:opacity-50"
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
