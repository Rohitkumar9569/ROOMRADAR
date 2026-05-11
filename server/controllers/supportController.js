const asyncHandler = require('express-async-handler');
const SupportTicket = require('../models/SupportTicket');
const Application = require('../models/Application');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');

const writeAuditLog = async (req, action, targetType = 'SupportTicket', target = null, metadata = {}) => {
  try {
    await AuditLog.create({
      action,
      admin: req.user?._id,
      targetType,
      target,
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  } catch (error) {}
};

const isApplicationMember = (application, userId) => {
  const normalizedUserId = userId.toString();
  return (
    application.student?.toString() === normalizedUserId ||
    application.landlord?.toString() === normalizedUserId
  );
};

const maybeFreezeEscrow = async ({ applicationId, ticket, reason }) => {
  if (!applicationId || !['dispute', 'damage_claim', 'refund_request', 'security_deposit', 'misrepresentation'].includes(ticket.issueType)) {
    return;
  }

  await Transaction.updateMany(
    { application: applicationId, status: { $in: ['pending', 'held'] } },
    {
      $set: {
        status: 'frozen',
        escrowFrozen: true,
        frozenAt: new Date(),
        notes: reason || 'Frozen because a dispute was raised.',
      },
    }
  );

  await Application.findByIdAndUpdate(applicationId, {
    $set: {
      'escrow.status': 'frozen',
      'escrow.frozenAt': new Date(),
      'escrow.notes': reason || 'Frozen because a dispute was raised.',
      checkInStatus: 'issue_reported',
    },
  });
};

exports.createSupportTicket = asyncHandler(async (req, res) => {
  const {
    subject,
    issueDescription,
    category = 'other',
    issueType = 'general',
    priority = 'medium',
    applicationId,
    roomId,
    evidence = [],
    requestedAmount = 0,
  } = req.body;

  if (!subject || !issueDescription) {
    res.status(400);
    throw new Error('Subject and issue description are required.');
  }

  let application = null;
  if (applicationId) {
    application = await Application.findById(applicationId);
    if (!application) {
      res.status(404);
      throw new Error('Application not found for this support request.');
    }
    if (!isApplicationMember(application, req.user._id)) {
      res.status(403);
      throw new Error('You can only raise a support request for your own booking.');
    }
  }

  const ticket = await SupportTicket.create({
    user: req.user._id,
    application: applicationId || undefined,
    room: roomId || application?.room,
    subject,
    issueDescription,
    category,
    issueType,
    priority,
    evidence,
    requestedAmount,
    escrowAction: issueType === 'general' ? 'none' : 'freeze',
    escrowFrozenAt: issueType === 'general' ? undefined : new Date(),
  });

  await maybeFreezeEscrow({
    applicationId,
    ticket,
    reason: `Support ticket raised: ${subject}`,
  });

  const io = req.app.get('io');
  if (io) {
    io.emit('admin_support_ticket_created', {
      ticketId: ticket._id,
      priority: ticket.priority,
      issueType: ticket.issueType,
    });
  }

  res.status(201).json(ticket);
});

exports.getMySupportTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('application room', 'status title checkInDate checkOutDate')
    .lean();

  res.json(tickets);
});

exports.updateSupportTicket = asyncHandler(async (req, res) => {
  const allowed = ['status', 'priority', 'assignedAdmin', 'resolutionNote', 'resolutionDecision', 'escrowAction'];
  const updates = {};
  allowed.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
  });

  if (updates.status === 'resolved' || updates.status === 'closed') {
    updates.resolvedAt = new Date();
  }

  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('user application room', 'name email status title');

  if (!ticket) {
    res.status(404);
    throw new Error('Support ticket not found.');
  }

  if (ticket.application && updates.escrowAction && updates.escrowAction !== 'freeze') {
    const statusMap = {
      release_to_landlord: 'released',
      refund_guest: 'refunded',
      partial_refund: 'refunded',
      none: 'pending',
    };

    await Transaction.updateMany(
      { application: ticket.application._id || ticket.application },
      {
        $set: {
          status: statusMap[updates.escrowAction] || 'pending',
          escrowFrozen: false,
          notes: updates.resolutionNote || `Admin action: ${updates.escrowAction}`,
        },
      }
    );

    await Application.findByIdAndUpdate(ticket.application._id || ticket.application, {
      $set: {
        'escrow.status': statusMap[updates.escrowAction] || 'pending',
        'escrow.notes': updates.resolutionNote || `Admin action: ${updates.escrowAction}`,
      },
    });
  }

  await writeAuditLog(req, 'SUPPORT_TICKET_UPDATED', 'SupportTicket', ticket._id, updates);

  const io = req.app.get('io');
  if (io && ticket.user?._id) {
    io.to(ticket.user._id.toString()).emit('support_ticket_updated', {
      ticketId: ticket._id,
      status: ticket.status,
      resolutionDecision: ticket.resolutionDecision,
    });
  }

  res.json(ticket);
});
