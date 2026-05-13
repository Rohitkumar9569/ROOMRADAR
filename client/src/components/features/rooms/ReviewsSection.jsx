import React from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { format } from 'date-fns';

const RatingBreakdownItem = ({ label, score = 0 }) => (
    <div className="flex items-center justify-between">
        <span className="text-neutral-700 dark:text-secondary-300">{label}</span>
        <div className="flex items-center gap-2">
            <div className="h-1 w-24 rounded-full bg-neutral-200 dark:bg-secondary-700">
                <div className="h-1 rounded-full bg-neutral-800 dark:bg-white" style={{ width: `${(score / 5) * 100}%` }} />
            </div>
            <span className="w-8 text-right text-sm font-semibold">{score.toFixed(1)}</span>
        </div>
    </div>
);

const StarRatingDisplay = ({ rating = 0, size = 'h-5 w-5' }) => (
    <div className="flex items-center">
        {[...Array(5)].map((_, index) => (
            <StarIcon key={index} className={`${size} ${index < Math.round(rating) ? 'text-black dark:text-white' : 'text-neutral-300 dark:text-secondary-600'}`} />
        ))}
    </div>
);

const ReviewCard = ({ review }) => (
    <div className="py-4">
        <div className="mb-2 flex items-center">
            <div className="mr-4 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-neutral-800 text-lg font-bold text-white dark:bg-white dark:text-secondary-950">
                {review.student?.avatarUrl || review.student?.profilePicture ? (
                    <img src={review.student.avatarUrl || review.student.profilePicture} alt={review.student.name} className="h-full w-full object-cover" />
                ) : (
                    review.student?.name ? review.student.name.charAt(0).toUpperCase() : 'A'
                )}
            </div>
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
                <StarIcon className="mr-2 h-7 w-7 text-black dark:text-white" />
                <h3 className="text-2xl font-semibold">{displayAverage ? displayAverage.toFixed(1) : 'New'} · {reviewCount} review{reviewCount > 1 && 's'}</h3>
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
