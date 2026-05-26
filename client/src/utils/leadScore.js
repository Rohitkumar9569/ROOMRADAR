const DAY_MS = 24 * 60 * 60 * 1000;

export const daysUntil = (date) => {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / DAY_MS);
};

export const calculateLeadScore = (application = {}) => {
  let score = 0;
  const signals = [];
  const phone = application.mobileNumber || application.student?.mobileNumber || application.student?.phone;
  const email = application.student?.email;
  const moveInDays = daysUntil(application.checkInDate);
  const rating = Number(application.student?.guestAverageRating || 0);
  const reviewCount = Number(application.student?.guestReviewsCount || 0);
  const durationMonths = Number(application.durationMonths || application.amountBreakdown?.durationMonths || 0);
  const messageWords = String(application.message || '').trim().split(/\s+/).filter(Boolean).length;

  if (phone) {
    score += 12;
    signals.push('Phone provided');
  }
  if (email) {
    score += 8;
    signals.push('Email present');
  }
  if (application.idProofImage || application.idProofType) {
    score += 20;
    signals.push('ID uploaded');
  }
  if (application.agreedToTerms) {
    score += 10;
    signals.push('Terms accepted');
  }
  if (application.checkInDate) {
    score += 12;
    if (moveInDays !== null && moveInDays >= 0 && moveInDays <= 14) {
      score += 10;
      signals.push('Move-in soon');
    } else {
      signals.push('Dates provided');
    }
  }
  if (durationMonths >= 3) {
    score += 10;
    signals.push('Longer stay');
  }
  if (messageWords >= 8) {
    score += 8;
    signals.push('Clear message');
  }
  if (rating >= 4) {
    score += 15;
    signals.push('Rated guest');
  } else if (reviewCount > 0) {
    score += 8;
    signals.push('Guest history');
  }

  const finalScore = Math.min(100, score);
  return {
    score: finalScore,
    signals: signals.slice(0, 4),
    label: finalScore >= 75 ? 'Highly qualified' : finalScore >= 55 ? 'Review ready' : 'Needs details',
    tone: finalScore >= 75 ? 'emerald' : finalScore >= 55 ? 'cyan' : 'amber',
  };
};
