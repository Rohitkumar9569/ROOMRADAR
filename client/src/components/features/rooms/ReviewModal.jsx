import React, { useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { createReview } from '../../../api';
import toast from 'react-hot-toast';
import { formatListingTitle } from '../../../utils/listingDisplay';

const getRatingFromPointer = (event, index) => {
  if (!event.clientX) return index + 1;
  const rect = event.currentTarget.getBoundingClientRect();
  const isHalf = event.clientX - rect.left < rect.width / 2;
  return Math.max(1, index + (isHalf ? 0.5 : 1));
};

const StarFill = ({ fill, size }) => {
  const fillWidth = `${Math.max(0, Math.min(1, fill)) * 100}%`;

  return (
    <span className="relative inline-flex leading-none" aria-hidden="true">
      <FaStar className="text-slate-300 dark:text-slate-700" size={size} />
      <span className="absolute inset-0 overflow-hidden text-amber-400 drop-shadow-[0_0_9px_rgba(251,191,36,0.35)]" style={{ width: fillWidth }}>
        <FaStar size={size} />
      </span>
    </span>
  );
};

const StarRating = ({ rating, setRating, compact = false, showValue = true }) => {
  const [hover, setHover] = useState(0);
  const displayRating = hover || rating;
  const size = compact ? 18 : 40;
  const buttonClass = compact
    ? 'flex h-7 w-7 items-center justify-center rounded-full transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60'
    : 'flex h-11 w-11 items-center justify-center rounded-full transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60';

  return (
    <div className={compact ? 'flex items-center gap-1' : 'flex flex-col items-center gap-2'}>
      <div className="flex items-center justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: 5 }).map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={(event) => setRating(getRatingFromPointer(event, index))}
            onMouseMove={(event) => setHover(getRatingFromPointer(event, index))}
            className={buttonClass}
            aria-label={`Set rating up to star ${index + 1}`}
          >
            <StarFill fill={Number(displayRating || 0) - index} size={size} />
          </button>
        ))}
      </div>
      {showValue && (
        <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-300/10 dark:text-amber-200">
          {displayRating ? `${displayRating.toFixed(1)} / 5` : 'Tap to rate'}
        </span>
      )}
    </div>
  );
};

const categoryLabels = [
  ['cleanliness', 'Cleanliness'],
  ['accuracy', 'Accuracy'],
  ['checkIn', 'Check-in'],
  ['communication', 'Communication'],
  ['location', 'Location'],
  ['value', 'Value'],
];

const CompactRating = ({ value, onChange }) => (
  <StarRating rating={value} setRating={onChange} compact showValue={false} />
);

function ReviewModal({ isOpen, onClose, booking, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState({});
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setRating(0);
    setCategoryRatings({});
    setComment('');
    setError('');
  }, [booking?._id, isOpen]);

  if (!isOpen) return null;
  const displayTitle = formatListingTitle(booking?.room?.title, 'this room');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }

    const cleanComment = comment.trim();
    if (cleanComment.length < 10) {
      setError('Please write at least 10 characters for your review.');
      return;
    }

    setLoading(true);
    try {
      await createReview(booking.room._id, {
        rating,
        comment: cleanComment,
        bookingId: booking._id,
        categoryRatings,
      });
      toast.success('Thank you! Your review has been submitted.');
      setRating(0);
      setCategoryRatings({});
      setComment('');
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

          <div className="mb-6 grid gap-3 rounded-2xl bg-light-bg p-4 dark:bg-dark-input">
            {categoryLabels.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-light-text dark:text-dark-text">{label}</span>
                <CompactRating
                  value={categoryRatings[key] || 0}
                  onChange={(nextRating) => setCategoryRatings((current) => ({ ...current, [key]: nextRating }))}
                />
              </div>
            ))}
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
