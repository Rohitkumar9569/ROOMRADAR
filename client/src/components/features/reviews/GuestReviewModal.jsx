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

const StarRow = ({ value, onChange, size = 22 }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((ratingValue) => (
      <button
        key={ratingValue}
        type="button"
        onClick={() => onChange(ratingValue)}
        className="rounded-full p-0.5 transition hover:scale-105"
        aria-label={`${ratingValue} stars`}
      >
        <FaStar color={ratingValue <= value ? '#f59e0b' : '#d1d5db'} size={size} />
      </button>
    ))}
  </div>
);

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
            <StarRow value={rating} onChange={setRating} size={34} />
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
