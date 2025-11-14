// src/components/ReviewsSection.jsx

import React from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { format } from 'date-fns';

// --- Helper Components ---

// 1. Rating Breakdown Item (with Progress Bar)
const RatingBreakdownItem = ({ label, score = 0 }) => (
    <div className="flex items-center justify-between">
        <span className="text-neutral-700">{label}</span>
        <div className="flex items-center gap-2">
            <div className="w-24 h-1 bg-neutral-200 rounded-full">
                <div 
                    className="h-1 bg-neutral-800 rounded-full" 
                    style={{ width: `${(score / 5) * 100}%` }} // Calculate width based on score
                ></div>
            </div>
            <span className="font-semibold text-sm w-8 text-right">{score.toFixed(1)}</span>
        </div>
    </div>
);


// 2. Star Rating Display (No changes needed)
const StarRatingDisplay = ({ rating = 0, size = 'h-5 w-5' }) => (
    <div className="flex items-center">
        {[...Array(5)].map((_, index) => (
            <StarIcon 
                key={index} 
                className={`${size} ${index < Math.round(rating) ? 'text-black' : 'text-neutral-300'}`} 
            />
        ))}
    </div>
);


// 3. Review Card (Slightly restyled)
const ReviewCard = ({ review }) => (
    <div className="py-4">
        <div className="flex items-center mb-2">
            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-lg text-white mr-4 overflow-hidden">
                {review.user?.avatarUrl ? (
                    <img src={review.user.avatarUrl} alt={review.user.name} className="w-full h-full object-cover" />
                ) : (
                    review.user?.name ? review.user.name.charAt(0).toUpperCase() : 'A'
                )}
            </div>
            <div>
                <p className="font-semibold text-gray-900">{review.user?.name || 'Anonymous'}</p>
                <p className="text-sm text-gray-500">{format(new Date(review.createdAt), 'MMMM yyyy')}</p>
            </div>
        </div>
        <StarRatingDisplay rating={review.rating} size="h-4 w-4" />
        <p className="mt-3 text-gray-700 leading-relaxed">{review.comment}</p>
    </div>
);


// --- Main ReviewsSection Component ---

const ReviewsSection = ({ reviews, averageRating, numReviews, ratingBreakdown = {} }) => {
    
    // Placeholder data in case it's not provided from backend yet
    const breakdown = {
        cleanliness: ratingBreakdown.cleanliness || 4.8,
        accuracy: ratingBreakdown.accuracy || 4.9,
        checkIn: ratingBreakdown.checkIn || 5.0,
        communication: ratingBreakdown.communication || 5.0,
        location: ratingBreakdown.location || 4.7,
        value: ratingBreakdown.value || 4.6,
    };
    
    if (!reviews || numReviews === 0) {
        return (
            <div>
                <h3 className="text-2xl font-semibold mb-4">No reviews yet</h3>
                <p className="text-gray-600">Be the first to leave a review!</p>
            </div>
        );
    }

    return (
        <div>
            {/* --- Overall Rating Header --- */}
            <div className="flex items-center mb-8">
                <StarIcon className="h-7 w-7 text-black mr-2" />
                <h3 className="text-2xl font-semibold">{averageRating?.toFixed(1)} · {numReviews} review{numReviews > 1 && 's'}</h3>
            </div>

            {/* --- Rating Breakdown Section --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-4 mb-10">
                <RatingBreakdownItem label="Cleanliness" score={breakdown.cleanliness} />
                <RatingBreakdownItem label="Accuracy" score={breakdown.accuracy} />
                <RatingBreakdownItem label="Check-in" score={breakdown.checkIn} />
                <RatingBreakdownItem label="Communication" score={breakdown.communication} />
                <RatingBreakdownItem label="Location" score={breakdown.location} />
                <RatingBreakdownItem label="Value" score={breakdown.value} />
            </div>

            {/* --- Individual Reviews Grid --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {reviews.slice(0, 6).map(review => ( // Show first 6 reviews
                    <ReviewCard key={review._id} review={review} />
                ))}
            </div>
            
            {numReviews > 6 && (
                 <div className="mt-8">
                    <button className="border border-black text-black font-semibold py-3 px-6 rounded-lg hover:bg-neutral-100 transition">
                        Show all {numReviews} reviews
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReviewsSection;