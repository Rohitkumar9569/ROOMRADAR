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

const priorityRank = { low: 1, medium: 2, high: 3, urgent: 4 };

const maxPriority = (...values) => values
  .filter(Boolean)
  .sort((a, b) => (priorityRank[b] || 0) - (priorityRank[a] || 0))[0] || 'medium';

const autoTriageSupportTicket = ({ subject = '', issueDescription = '', category = 'other', issueType = 'general', priority = 'medium' }) => {
  const text = `${subject} ${issueDescription}`.toLowerCase();
  const triage = { category, issueType, priority };

  const applySignal = (nextCategory, nextIssueType, nextPriority) => {
    if (!triage.category || triage.category === 'other') triage.category = nextCategory;
    if (!triage.issueType || triage.issueType === 'general') triage.issueType = nextIssueType;
    triage.priority = maxPriority(triage.priority, nextPriority);
  };

  if (/\b(safety|unsafe|threat|fraud|scam|harass|abuse|police|danger|emergency)\b/.test(text)) {
    applySignal('safety', 'dispute', 'urgent');
  }
  if (/\b(payment|paid|refund|money|deposit|escrow|upi|transaction|payout|freeze|frozen)\b/.test(text)) {
    applySignal(text.includes('refund') ? 'refund' : 'payment', 'refund_request', 'high');
  }
  if (/\b(ban|banned|blocked|restricted|restriction|suspend|suspended|account paused|access paused)\b/.test(text)) {
    applySignal('account', 'dispute', 'high');
  }
  if (/\b(damage|broken|repair|deduct|security deposit)\b/.test(text)) {
    applySignal('damage', 'damage_claim', 'high');
  }
  if (/\b(room approval|approval|approve|listing|publish|published|reject|rejected|verification|kyc)\b/.test(text)) {
    applySignal(text.includes('kyc') || text.includes('verification') ? 'verification' : 'listing', 'misrepresentation', 'medium');
  }
  if (/\b(booking|booked|check-in|check in|check-out|check out|cancel|extend|leave room)\b/.test(text)) {
    applySignal('booking', 'dispute', 'medium');
  }

  return triage;
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

  const triage = autoTriageSupportTicket({ subject, issueDescription, category, issueType, priority });

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

  const shouldFreezeEscrow = Boolean(
    applicationId &&
    ['dispute', 'damage_claim', 'refund_request', 'security_deposit', 'misrepresentation'].includes(triage.issueType)
  );

  const ticket = await SupportTicket.create({
    user: req.user._id,
    application: applicationId || undefined,
    room: roomId || application?.room,
    subject,
    issueDescription,
    category: triage.category,
    issueType: triage.issueType,
    priority: triage.priority,
    evidence,
    requestedAmount,
    escrowAction: shouldFreezeEscrow ? 'freeze' : 'none',
    escrowFrozenAt: shouldFreezeEscrow ? new Date() : undefined,
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
  )
    .populate('user assignedAdmin', 'name email roles')
    .populate('application', 'status checkInDate checkOutDate amountBreakdown escrow')
    .populate('room', 'title location rent');

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
