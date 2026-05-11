const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Email Verification
  email: {
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    token: String,
    tokenExpires: Date
  },
  
  // Phone Verification
  phone: {
    number: String,
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    otp: String,
    otpExpires: Date
  },
  
  // Identity Verification
  identity: {
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    documentType: { type: String, enum: ['passport', 'driving_license', 'aadhar', 'pan', 'voter_id'] },
    documentNumber: String,
    documentImage: String,
    verifiedBy: String
  },
  
  // Address Verification
  address: {
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    address: String,
    city: String,
    state: String,
    pincode: String,
    documentImage: String
  },
  
  // Student Verification
  student: {
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    institutionName: String,
    course: String,
    studentId: String,
    idCardImage: String
  },
  
  // Employment Verification
  employment: {
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    companyName: String,
    designation: String,
    employeeId: String,
    offerLetter: String
  },
  
  // Property Verification (for landlords)
  property: {
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    propertyDocuments: [String],
    ownershipType: { type: String, enum: ['owned', 'rented', 'managed'] }
  },
  
  // Background Check
  background: {
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    checkType: { type: String, enum: ['basic', 'comprehensive'] },
    reportUrl: String,
    verifiedBy: String
  }
}, {
  timestamps: true
});

// Calculate trust score
verificationSchema.methods.calculateTrustScore = function() {
  const weights = {
    email: 10,
    phone: 15,
    identity: 25,
    address: 10,
    student: 10,
    employment: 10,
    property: 15,
    background: 20
  };
  
  let score = 0;
  
  if (this.email?.verified) score += weights.email;
  if (this.phone?.verified) score += weights.phone;
  if (this.identity?.verified) score += weights.identity;
  if (this.address?.verified) score += weights.address;
  if (this.student?.verified) score += weights.student;
  if (this.employment?.verified) score += weights.employment;
  if (this.property?.verified) score += weights.property;
  if (this.background?.verified) score += weights.background;
  
  return Math.min(score, 100);
};

// Get verification level
verificationSchema.methods.getVerificationLevel = function() {
  const score = this.calculateTrustScore();
  const verifiedCount = [
    this.email?.verified,
    this.phone?.verified,
    this.identity?.verified,
    this.address?.verified,
    this.student?.verified,
    this.employment?.verified,
    this.property?.verified,
    this.background?.verified
  ].filter(Boolean).length;
  
  if (score >= 80 && verifiedCount >= 5) return 'premium';
  if (score >= 60 && verifiedCount >= 3) return 'verified';
  if (score >= 30 && verifiedCount >= 2) return 'basic';
  return 'unverified';
};

// Get verification summary
verificationSchema.methods.getSummary = function() {
  return {
    trustScore: this.calculateTrustScore(),
    level: this.getVerificationLevel(),
    verifications: {
      email: this.email?.verified || false,
      phone: this.phone?.verified || false,
      identity: this.identity?.verified || false,
      address: this.address?.verified || false,
      student: this.student?.verified || false,
      employment: this.employment?.verified || false,
      property: this.property?.verified || false,
      background: this.background?.verified || false
    },
    verifiedCount: [
      this.email?.verified,
      this.phone?.verified,
      this.identity?.verified,
      this.address?.verified,
      this.student?.verified,
      this.employment?.verified,
      this.property?.verified,
      this.background?.verified
    ].filter(Boolean).length
  };
};

module.exports = mongoose.model('Verification', verificationSchema);
