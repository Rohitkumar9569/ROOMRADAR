import React, { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { format } from 'date-fns';

const clampRatingFill = (value) => Math.max(0, Math.min(1, value));

const RatingBreakdownItem = ({ label, score = 0 }) => (
    <div className="flex items-center justify-between">
        <span className="text-neutral-700 dark:text-secondary-300">{label}</span>
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400 shadow-[0_0_16px_rgba(251,191,36,0.28)]"
                    style={{ width: `${Math.max(0, Math.min(100, (score / 5) * 100))}%` }}
                />
            </div>
            <span className="w-8 text-right text-sm font-bold text-neutral-900 dark:text-white">{score.toFixed(1)}</span>
        </div>
    </div>
);

const RatingStar = ({ fill, size = 'h-5 w-5' }) => (
    <span className={`relative inline-flex flex-none ${size}`} aria-hidden="true">
        <StarIcon className={`absolute inset-0 ${size} text-neutral-300 dark:text-secondary-700`} />
        <span className="absolute inset-0 overflow-hidden" style={{ width: `${clampRatingFill(fill) * 100}%` }}>
            <StarIcon className={`${size} text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.34)]`} />
        </span>
    </span>
);

const StarRatingDisplay = ({ rating = 0, size = 'h-5 w-5' }) => (
    <div className="flex items-center gap-0.5" aria-label={`${Number(rating || 0).toFixed(1)} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, index) => (
            <RatingStar key={index} size={size} fill={Number(rating || 0) - index} />
        ))}
    </div>
);

const ReviewAvatar = ({ student }) => {
    const [imageFailed, setImageFailed] = useState(false);
    const imageUrl = !imageFailed ? (student?.avatarUrl || student?.profilePicture) : '';
    const initial = (student?.name || 'Anonymous').trim().charAt(0).toUpperCase() || 'A';

    return (
        <div className="mr-4 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-500 via-sky-500 to-amber-400 text-lg font-black text-white shadow-lg shadow-cyan-500/15 ring-1 ring-white/70 dark:ring-white/10">
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={student?.name || 'Reviewer'}
                    className="h-full w-full object-cover"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <span>{initial}</span>
            )}
        </div>
    );
};

const ReviewCard = ({ review }) => (
    <div className="rounded-2xl border border-neutral-200/70 bg-white/70 p-4 shadow-sm shadow-neutral-900/5 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
        <div className="mb-3 flex items-center">
            <ReviewAvatar student={review.student} />
            <div>
                <p className="font-semibold text-gray-900 dark:text-white">{review.student?.name || 'Anonymous'}</p>
                <p className="text-sm text-gray-500 dark:text-secondary-400">{review.createdAt ? format(new Date(review.createdAt), 'MMMM yyyy') : 'Recently'}</p>
            </div>
        </div>
        <StarRatingDisplay rating={review.rating} size="h-4 w-4" />
        <p className="mt-3 leading-relaxed text-gray-700 dark:text-secondary-300">{review.comment}</p>
    </div>
);

const ReviewsSection = ({ reviews = [], averageRating, numReviews, ratingBreakdown = {} }) => {
    const reviewCount = numReviews ?? reviews.length;
    const derivedAverage = reviews.length
        ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
        : 0;
    const displayAverage = averageRating || derivedAverage;
    const getCategoryAverage = (key) => {
        if (typeof ratingBreakdown[key] === 'number' && ratingBreakdown[key] > 0) return ratingBreakdown[key];
        const values = reviews
            .map((review) => Number(review.categoryRatings?.[key] || 0))
            .filter((score) => Number.isFinite(score) && score > 0);
        if (!values.length) return null;
        return values.reduce((sum, score) => sum + score, 0) / values.length;
    };
    const breakdown = [
        ['Cleanliness', getCategoryAverage('cleanliness')],
        ['Accuracy', getCategoryAverage('accuracy')],
        ['Check-in', getCategoryAverage('checkIn')],
        ['Communication', getCategoryAverage('communication')],
        ['Location', getCategoryAverage('location')],
        ['Value', getCategoryAverage('value')],
    ].filter(([, score]) => typeof score === 'number');

    if (reviewCount === 0) {
        return (
            <div>
                <h3 className="mb-4 text-2xl font-semibold">No reviews yet</h3>
                <p className="text-gray-600 dark:text-secondary-300">Verified reviews will appear after confirmed stays.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8 flex items-center">
                <StarIcon className="mr-2 h-7 w-7 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]" />
                <h3 className="text-2xl font-black text-neutral-950 dark:text-white">{displayAverage ? displayAverage.toFixed(1) : 'New'} · {reviewCount} review{reviewCount > 1 && 's'}</h3>
            </div>

            {breakdown.length > 0 && (
                <div className="mb-10 grid grid-cols-1 gap-x-16 gap-y-4 sm:grid-cols-2">
                    {breakdown.map(([label, score]) => (
                        <RatingBreakdownItem key={label} label={label} score={score} />
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
                {reviews.slice(0, 6).map((review) => (
                    <ReviewCard key={review._id} review={review} />
                ))}
            </div>

            {reviewCount > 6 && (
                <div className="mt-8">
                    <button type="button" className="rounded-lg border border-black px-6 py-3 font-semibold text-black transition hover:bg-neutral-100 dark:border-white dark:text-white dark:hover:bg-secondary-800">
                        Show all {reviewCount} reviews
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReviewsSection;
