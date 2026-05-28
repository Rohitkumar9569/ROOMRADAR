import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { createGuestReview } from '../../../api';

const categories = [
  ['communication', 'Communication'],
  ['cleanliness', 'Cleanliness'],
  ['houseRules', 'House rules'],
  ['payment', 'Payment'],
];

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

const StarRow = ({ value, onChange, size = 22, showValue = false }) => {
  const [hover, setHover] = useState(0);
  const displayValue = hover || value;
  const buttonSize = size >= 30 ? 'h-10 w-10' : 'h-7 w-7';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: 5 }).map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={(event) => onChange(getRatingFromPointer(event, index))}
            onMouseMove={(event) => setHover(getRatingFromPointer(event, index))}
            className={`flex ${buttonSize} items-center justify-center rounded-full transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60`}
            aria-label={`Set rating up to star ${index + 1}`}
          >
            <StarFill fill={Number(displayValue || 0) - index} size={size} />
          </button>
        ))}
      </div>
      {showValue && (
        <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-300/10 dark:text-amber-200">
          {displayValue ? `${displayValue.toFixed(1)} / 5` : 'Tap to rate'}
        </span>
      )}
    </div>
  );
};

const GuestReviewModal = ({ application, isOpen, onClose, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState({});
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !application) return null;

  const guestName = application.student?.name || 'this guest';

  const submitReview = async (event) => {
    event.preventDefault();
    setError('');

    if (!rating) {
      setError('Please select an overall guest rating.');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Please write at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await createGuestReview(application._id, {
        rating,
        categoryRatings,
        comment: comment.trim(),
      });
      toast.success('Guest review added.');
      onSuccess?.(data.review, data.stats);
      setRating(0);
      setCategoryRatings({});
      setComment('');
      onClose?.();
    } catch (err) {
      const message = err.response?.data?.message || 'Could not submit guest review.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-[2rem] border border-light-border bg-light-card p-5 shadow-2xl dark:border-dark-border dark:bg-dark-card sm:rounded-[2rem] sm:p-7">
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-500">Guest trust</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-light-text dark:text-dark-text">Review {guestName}</h2>
          <p className="mt-1 text-sm font-semibold text-light-muted dark:text-dark-muted">
            Help future hosts understand this guest after a confirmed stay.
          </p>
        </div>

        <form onSubmit={submitReview} className="mt-6 space-y-5">
          <div className="flex justify-center">
            <StarRow value={rating} onChange={setRating} size={34} showValue />
          </div>

          <div className="grid gap-3 rounded-2xl bg-light-bg p-4 dark:bg-dark-input">
            {categories.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-light-text dark:text-dark-text">{label}</span>
                <StarRow
                  value={categoryRatings[key] || 0}
                  onChange={(nextRating) => setCategoryRatings((current) => ({ ...current, [key]: nextRating }))}
                  size={18}
                />
              </div>
            ))}
          </div>

          <textarea
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="w-full resize-none rounded-2xl border border-light-border bg-light-bg px-4 py-3 text-sm font-semibold text-light-text outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-dark-border dark:bg-dark-input dark:text-dark-text"
            placeholder="Example: Clear communication, kept the room clean, and followed house rules."
          />

          {error && <p className="text-center text-sm font-bold text-red-500">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl border border-light-border px-4 py-3 text-sm font-black text-light-text transition hover:bg-light-bg dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-input">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-600 disabled:opacity-60">
              {loading ? 'Submitting...' : 'Submit review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuestReviewModal;
