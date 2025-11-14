const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Room = require('../models/Room');
const Application = require('../models/Application');

/**
 * @desc    
 * @route   
 * @access  
 */
exports.createReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const roomId = req.params.roomId;
  const studentId = req.user._id;

  const booking = await Application.findOne({
    room: roomId,
    student: studentId,
    status: 'confirmed', 
  });

  if (!booking) {
    res.status(403); // Forbidden
    throw new Error('You can only review a room after a confirmed booking.');
  }

  const existingReview = await Review.findOne({ booking: booking._id });
  if (existingReview) {
    res.status(400);
    throw new Error('You have already submitted a review for this booking.');
  }

  const room = await Room.findById(roomId);
  if (!room) {
      res.status(404);
      throw new Error('Room not found');
  }

  const review = await Review.create({
    rating,
    comment,
    room: roomId,
    student: studentId,
    landlord: room.landlord,
    booking: booking._id,
  });

  const reviews = await Review.find({ room: roomId });
  const numReviews = reviews.length;
  const averageRating = reviews.reduce((acc, item) => item.rating + acc, 0) / numReviews;

  await Room.findByIdAndUpdate(roomId, {
    averageRating: averageRating,
    numReviews: numReviews,
  });

  res.status(201).json({ message: 'Review added successfully!', review });
});


/**
 * @desc   
 * @route   GET /api/reviews/:roomId
 * @access  Public
 */
exports.getReviewsForRoom = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ room: req.params.roomId })
    .populate('student', 'name profileImage') 
    .sort({ createdAt: -1 }); 

  res.status(200).json(reviews);
});