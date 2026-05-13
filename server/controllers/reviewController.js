const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const GuestReview = require('../models/GuestReview');
const Room = require('../models/Room');
const Application = require('../models/Application');
const User = require('../models/User');

const ROOM_REVIEW_CATEGORIES = ['cleanliness', 'accuracy', 'checkIn', 'communication', 'location', 'value'];
const GUEST_REVIEW_CATEGORIES = ['communication', 'cleanliness', 'houseRules', 'payment'];

const normalizeRating = (value) => {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
  return Math.round(rating * 10) / 10;
};

const normalizeCategoryRatings = (ratings = {}, keys = []) => {
  return keys.reduce((acc, key) => {
    const rating = normalizeRating(ratings[key]);
    if (rating) acc[key] = rating;
    return acc;
  }, {});
};

const average = (values = []) => {
  const validValues = values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (!validValues.length) return 0;
  return Math.round((validValues.reduce((sum, value) => sum + value, 0) / validValues.length) * 100) / 100;
};

const syncRoomReviewStats = async (roomId) => {
  const reviews = await Review.find({ room: roomId }).select('rating categoryRatings').lean();
  const numReviews = reviews.length;
  const averageRating = average(reviews.map((review) => review.rating));
  const ratingBreakdown = ROOM_REVIEW_CATEGORIES.reduce((acc, key) => {
    acc[key] = average(reviews.map((review) => review.categoryRatings?.[key] || review.rating));
    return acc;
  }, {});

  await Room.findByIdAndUpdate(roomId, {
    averageRating,
    numReviews,
    ratingBreakdown,
  });

  return { averageRating, numReviews, ratingBreakdown };
};

const syncGuestReviewStats = async (guestId) => {
  const reviews = await GuestReview.find({ guest: guestId }).select('rating').lean();
  const guestReviewsCount = reviews.length;
  const guestAverageRating = average(reviews.map((review) => review.rating));

  await User.findByIdAndUpdate(guestId, {
    guestAverageRating,
    guestReviewsCount,
  });

  return { guestAverageRating, guestReviewsCount };
};

/**
 * @desc    
 * @route   
 * @access  
 */
exports.createReview = asyncHandler(async (req, res) => {
  const { rating, comment, bookingId } = req.body;
  const roomId = req.params.roomId;
  const studentId = req.user._id;
  const normalizedRating = normalizeRating(rating);
  const normalizedComment = String(comment || '').trim();

  if (!normalizedRating) {
    res.status(400);
    throw new Error('Please provide a rating between 1 and 5.');
  }

  if (normalizedComment.length < 10) {
    res.status(400);
    throw new Error('Please write at least 10 characters about your stay.');
  }

  const bookingQuery = bookingId
    ? { _id: bookingId, room: roomId, student: studentId, status: 'confirmed' }
    : { room: roomId, student: studentId, status: 'confirmed' };

  const booking = await Application.findOne(bookingQuery).sort({ confirmedAt: -1, createdAt: -1 });

  if (!booking) {
    res.status(403); // Forbidden
    throw new Error('You can only review a room after a confirmed booking.');
  }

  const existingReview = await Review.findOne({ booking: booking._id });
  if (existingReview) {
    res.status(400);
    throw new Error('You have already submitted a review for this booking.');
  }

  const room = await Room.findOne({ _id: roomId, isDeleted: { $ne: true } });
  if (!room) {
      res.status(404);
      throw new Error('Room not found');
  }

  const review = await Review.create({
    rating: normalizedRating,
    comment: normalizedComment,
    categoryRatings: normalizeCategoryRatings(req.body.categoryRatings, ROOM_REVIEW_CATEGORIES),
    room: roomId,
    student: studentId,
    landlord: room.landlord,
    booking: booking._id,
  });

  await syncRoomReviewStats(roomId);

  res.status(201).json({ message: 'Review added successfully!', review });
});


/**
 * @desc   
 * @route   GET /api/reviews/:roomId
 * @access  Public
 */
exports.getReviewsForRoom = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ room: req.params.roomId })
    .populate('student', 'name profilePicture avatarUrl verificationLevel trustScore') 
    .sort({ createdAt: -1 }); 

  res.status(200).json(reviews);
});

exports.createGuestReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const applicationId = req.params.applicationId;
  const landlordId = req.user._id;
  const normalizedRating = normalizeRating(rating);
  const normalizedComment = String(comment || '').trim();

  if (!normalizedRating) {
    res.status(400);
    throw new Error('Please provide a guest rating between 1 and 5.');
  }

  if (normalizedComment.length < 10) {
    res.status(400);
    throw new Error('Please write at least 10 characters about the guest.');
  }

  const booking = await Application.findOne({
    _id: applicationId,
    landlord: landlordId,
    status: 'confirmed',
  });

  if (!booking) {
    res.status(403);
    throw new Error('You can only review a guest after a confirmed booking.');
  }

  const existingReview = await GuestReview.findOne({ booking: booking._id });
  if (existingReview) {
    res.status(400);
    throw new Error('You have already reviewed this guest for this booking.');
  }

  const review = await GuestReview.create({
    rating: normalizedRating,
    comment: normalizedComment,
    categoryRatings: normalizeCategoryRatings(req.body.categoryRatings, GUEST_REVIEW_CATEGORIES),
    room: booking.room,
    guest: booking.student,
    landlord: landlordId,
    booking: booking._id,
  });

  const stats = await syncGuestReviewStats(booking.student);

  res.status(201).json({ message: 'Guest review added successfully!', review, stats });
});

exports.getGuestReviewsForUser = asyncHandler(async (req, res) => {
  const reviews = await GuestReview.find({ guest: req.params.userId })
    .populate('landlord', 'name profilePicture avatarUrl verificationLevel trustScore')
    .populate('room', 'title location')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(reviews);
});
