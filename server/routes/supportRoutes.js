const express = require('express');
const {
  createSupportTicket,
  getMySupportTickets,
  updateSupportTicket,
} = require('../controllers/supportController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getMySupportTickets)
  .post(createSupportTicket);

router.patch('/:id', restrictTo('Admin', 'Super_Admin', 'Moderator', 'Support'), updateSupportTicket);

module.exports = router;
