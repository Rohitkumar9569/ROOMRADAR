export const roomConfig = {
  sections: [
    {
      id: 'basicDetails',
      label: 'Basic Details',
      fields: [
        { key: 'title', label: 'Room Title', type: 'text', required: true, icon: 'home', showOnCard: true, showOnDetail: true, filterable: false, maxLength: 60 },
        { key: 'rent', label: 'Rent per Month', type: 'number', required: true, icon: 'rupee', showOnCard: true, showOnDetail: true, filterable: true, sortable: true },
        { key: 'beds', label: 'Number of Beds', type: 'number', required: true, icon: 'bed', showOnCard: true, showOnDetail: true, filterable: true },
        { key: 'maxOccupants', label: 'Maximum Occupants', type: 'number', required: true, default: 1, icon: 'users', showOnCard: true, showOnDetail: true, filterable: true, searchOperator: 'gte' },
        { key: 'bathrooms', label: 'Bathrooms', type: 'number', required: true, default: 1, icon: 'bath', showOnCard: false, showOnDetail: true, filterable: true, searchOperator: 'gte' },
        { key: 'washroomType', label: 'Washroom Type', type: 'select', required: true, default: 'Attached', options: ['Attached', 'Shared', 'Common'], icon: 'bath', showOnCard: true, showOnDetail: true, filterable: true },
        { key: 'furnishingStatus', label: 'Furnishing', type: 'select', required: true, default: 'Semi Furnished', options: ['Fully Furnished', 'Semi Furnished', 'Unfurnished'], icon: 'sofa', showOnCard: true, showOnDetail: true, filterable: true },
        { key: 'roomType', label: 'Room Type', type: 'select', required: true, options: ['Single Room', 'Shared Room', '1RK', '1BHK', '2BHK', '3BHK', 'PG', 'Flat', 'Studio', 'Hostel', 'Independent Room'], icon: 'building', showOnCard: true, showOnDetail: true, filterable: true },
        { key: 'listingCategory', label: 'Listing Category', type: 'select', required: false, default: 'Room', options: ['Room', 'PG', 'Hostel', 'Flat', 'Apartment', 'Studio', 'Co-living', 'Other'], icon: 'building', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'stayType', label: 'Stay Type', type: 'select', required: false, default: 'long_term', options: ['long_term', 'short_term', 'flexible'], icon: 'calendar', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'maxGuests', label: 'Maximum Guests', type: 'number', required: false, default: 1, icon: 'users', showOnCard: false, showOnDetail: true, filterable: false, searchOperator: 'gte' },
        { key: 'bedrooms', label: 'Bedrooms', type: 'number', required: false, default: 1, icon: 'bed', showOnCard: false, showOnDetail: true, filterable: true, searchOperator: 'gte' },
        { key: 'familyStatus', label: 'Family Status', type: 'select', required: true, options: ['Bachelors Only', 'Family Only', 'Any'], showOnCard: true, showOnDetail: true, filterable: true },
        { key: 'gender', label: 'Allowed Gender', type: 'select', required: true, options: ['Male', 'Female', 'Any'], showOnCard: true, showOnDetail: true, filterable: true },
        { key: 'preferredOccupant', label: 'Preferred Occupant', type: 'select', required: false, default: 'Any', options: ['Individual', 'Working Professional', 'Family', 'Couple', 'Any'], showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'description', label: 'Description', type: 'textarea', required: true, showOnCard: false, showOnDetail: true, maxWords: 100, maxLength: 700 },
        { key: 'availableFrom', label: 'Available From', type: 'date', required: false, showOnCard: true, showOnDetail: true, filterable: true },
      ],
    },
    {
      id: 'location',
      label: 'Location',
      fields: [
        { key: 'fullAddress', label: 'Full Address', type: 'text', required: true, showOnCard: true, showOnDetail: true, maxLength: 140 },
        { key: 'locality', label: 'Locality / Area', type: 'text', required: false, showOnCard: true, showOnDetail: true, filterable: true, maxLength: 40 },
        { key: 'landmark', label: 'Nearby Landmark', type: 'text', required: false, showOnCard: false, showOnDetail: true, maxLength: 45 },
        { key: 'city', label: 'City', type: 'text', required: true, showOnCard: true, showOnDetail: true, filterable: true, maxLength: 32 },
        { key: 'state', label: 'State', type: 'text', required: true, showOnCard: false, showOnDetail: true, maxLength: 32 },
        { key: 'pincode', label: 'Pincode', type: 'text', required: true, showOnCard: false, showOnDetail: true, maxLength: 10 },
      ],
    },
    {
      id: 'amenities',
      label: 'Amenities',
      fields: [
        { key: 'wifi', label: 'WiFi', type: 'boolean', icon: 'wifi', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'ac', label: 'AC', type: 'boolean', icon: 'wind', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'parking', label: 'Parking', type: 'boolean', icon: 'car', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'laundry', label: 'Laundry', type: 'boolean', icon: 'shirt', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'meals', label: 'Meals Included', type: 'boolean', icon: 'utensils', showOnCard: true, showOnDetail: true, filterable: true },
        { key: 'security', label: '24hr Security', type: 'boolean', icon: 'shield', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'cctv', label: 'CCTV', type: 'boolean', icon: 'camera', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'gym', label: 'Gym', type: 'boolean', icon: 'dumbbell', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'hotWater', label: 'Hot Water', type: 'boolean', icon: 'droplets', showOnCard: false, showOnDetail: true, filterable: false },
        { key: 'powerBackup', label: 'Power Backup', type: 'boolean', icon: 'zap', showOnCard: false, showOnDetail: true, filterable: false },
        { key: 'waterSupply', label: '24hr Water Supply', type: 'boolean', icon: 'droplets', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'attachedWashroom', label: 'Attached Washroom', type: 'boolean', icon: 'bath', showOnCard: true, showOnDetail: true, filterable: true },
        { key: 'balcony', label: 'Balcony', type: 'boolean', icon: 'sun', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'lift', label: 'Lift', type: 'boolean', icon: 'arrow-up', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'studyTable', label: 'Study Table', type: 'boolean', icon: 'book-open', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'wardrobe', label: 'Wardrobe', type: 'boolean', icon: 'archive', showOnCard: false, showOnDetail: true, filterable: false },
        { key: 'kitchenAccess', label: 'Kitchen Access', type: 'boolean', icon: 'chef-hat', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'waterPurifier', label: 'Water Purifier', type: 'boolean', icon: 'filter', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'housekeeping', label: 'Housekeeping', type: 'boolean', icon: 'sparkles', showOnCard: false, showOnDetail: true, filterable: true },
      ],
    },
    {
      id: 'pricing',
      label: 'Pricing & Payment',
      fields: [
        { key: 'pricingMode', label: 'Pricing Mode', type: 'select', required: false, default: 'monthly', options: ['monthly', 'daily', 'nightly'], icon: 'wallet', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'pricePerNight', label: 'Price per Night', type: 'number', required: false, default: 0, icon: 'rupee', format: 'currency', showOnCard: false, showOnDetail: true, filterable: false },
        { key: 'instantBook', label: 'Instant Book', type: 'boolean', icon: 'zap', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'securityDeposit', label: 'Security Deposit', type: 'number', required: true, default: 0, icon: 'shield', format: 'currency', showOnCard: false, showOnDetail: true },
        { key: 'maintenanceCharge', label: 'Maintenance Charge / Month', type: 'number', required: false, default: 0, icon: 'receipt', format: 'currency', showOnCard: false, showOnDetail: true },
        { key: 'electricityBilling', label: 'Electricity Billing', type: 'select', required: true, default: 'Metered separately', options: ['Included in rent', 'Metered separately', 'Fixed monthly', 'Not included'], icon: 'zap', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'waterCharge', label: 'Water Charge / Month', type: 'number', required: false, default: 0, icon: 'droplets', format: 'currency', showOnCard: false, showOnDetail: true },
        { key: 'paymentPreference', label: 'Payment Preference', type: 'select', required: true, default: 'Online or Offline', options: ['Online only', 'Offline cash allowed', 'UPI / Bank transfer', 'Online or Offline'], icon: 'wallet', showOnCard: true, showOnDetail: true, filterable: true },
        { key: 'offlinePaymentAllowed', label: 'Offline Payment Allowed', type: 'boolean', icon: 'banknote', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'rentNegotiable', label: 'Rent Negotiable', type: 'boolean', icon: 'handshake', showOnCard: false, showOnDetail: true, filterable: true },
        { key: 'minimumStay', label: 'Minimum Stay (months)', type: 'number', required: false, default: 1, icon: 'calendar', unit: 'months', valueUnit: true, showOnCard: false, showOnDetail: true },
        { key: 'cancellationPolicy', label: 'Cancellation Policy', type: 'select', required: true, default: 'Flexible', options: ['Flexible', 'Moderate', 'Strict'], icon: 'calendar-x', showOnCard: false, showOnDetail: true, filterable: true },
      ],
    },
    {
      id: 'rules',
      label: 'House Rules',
      fields: [
        { key: 'smokingAllowed', label: 'Smoking Allowed', type: 'boolean', showOnCard: false, showOnDetail: true },
        { key: 'petsAllowed', label: 'Pets Allowed', type: 'boolean', showOnCard: false, showOnDetail: true },
        { key: 'guestsAllowed', label: 'Visitors Allowed', type: 'boolean', showOnCard: false, showOnDetail: true },
        { key: 'drinkingAllowed', label: 'Drinking Allowed', type: 'boolean', showOnCard: false, showOnDetail: true },
        { key: 'entryTiming', label: 'Entry Timing', type: 'time', showOnCard: false, showOnDetail: true },
        { key: 'visitorTiming', label: 'Visitor Timing', type: 'time', showOnCard: false, showOnDetail: true },
        { key: 'quietHours', label: 'Quiet Hours', type: 'text', showOnCard: false, showOnDetail: true, maxLength: 60 },
        { key: 'noticePeriod', label: 'Notice Period (days)', type: 'number', showOnCard: false, showOnDetail: true },
      ],
    },
    {
      id: 'nearby',
      label: 'Nearby Access',
      fields: [
        { key: 'distanceCollege', label: 'College / University Distance', type: 'number', required: false, icon: 'graduation-cap', unit: 'm', unitOptions: ['m', 'km'], valueUnit: true, showOnCard: false, showOnDetail: true, filterable: false },
        { key: 'distanceHospital', label: 'Hospital Distance', type: 'number', required: false, icon: 'hospital', unit: 'm', unitOptions: ['m', 'km'], valueUnit: true, showOnCard: false, showOnDetail: true, filterable: false },
        { key: 'distanceMetro', label: 'Metro Distance', type: 'number', required: false, icon: 'train', unit: 'm', unitOptions: ['m', 'km'], valueUnit: true, showOnCard: false, showOnDetail: true, filterable: false },
        { key: 'distanceBusStand', label: 'Bus Stand Distance', type: 'number', required: false, icon: 'bus', unit: 'm', unitOptions: ['m', 'km'], valueUnit: true, showOnCard: false, showOnDetail: true, filterable: false },
        { key: 'distanceRailway', label: 'Railway Station Distance', type: 'number', required: false, icon: 'train-front', unit: 'm', unitOptions: ['m', 'km'], valueUnit: true, showOnCard: false, showOnDetail: true, filterable: false },
        { key: 'distanceMarket', label: 'Market Distance', type: 'number', required: false, icon: 'shopping-bag', unit: 'm', unitOptions: ['m', 'km'], valueUnit: true, showOnCard: false, showOnDetail: true, filterable: false },
      ],
    },
    {
      id: 'guidebook',
      label: 'Digital Guidebook',
      fields: [
        { key: 'wifiName', label: 'WiFi Name', type: 'text', required: false, icon: 'wifi', showOnCard: false, showOnDetail: false, postBookingOnly: true, maxLength: 40 },
        { key: 'wifiPassword', label: 'WiFi Password', type: 'text', required: false, icon: 'key', showOnCard: false, showOnDetail: false, postBookingOnly: true, maxLength: 40 },
        { key: 'checkInInstructions', label: 'Check-in Instructions', type: 'textarea', required: false, icon: 'door-open', showOnCard: false, showOnDetail: false, postBookingOnly: true, maxWords: 70, maxLength: 450 },
        { key: 'applianceInstructions', label: 'Appliance Instructions', type: 'textarea', required: false, icon: 'plug', showOnCard: false, showOnDetail: false, postBookingOnly: true, maxWords: 70, maxLength: 450 },
        { key: 'localTips', label: 'Local Tips', type: 'textarea', required: false, icon: 'map', showOnCard: false, showOnDetail: false, postBookingOnly: true, maxWords: 70, maxLength: 450 },
        { key: 'emergencyContactName', label: 'Emergency Contact Name', type: 'text', required: false, icon: 'user-check', showOnCard: false, showOnDetail: false, postBookingOnly: true, maxLength: 45 },
        { key: 'emergencyContactPhone', label: 'Emergency Contact Phone', type: 'tel', required: false, icon: 'phone', showOnCard: false, showOnDetail: false, postBookingOnly: true },
      ],
    },
  ],
};

export const getRoomFields = () => roomConfig.sections.flatMap((section) => section.fields.map((field) => ({ ...field, sectionId: section.id })));
export const getCardFields = () => getRoomFields().filter((field) => field.showOnCard);
export const getDetailFields = () => getRoomFields().filter((field) => field.showOnDetail);
export const getFilterableFields = () => getRoomFields().filter((field) => field.filterable);
export const getSection = (sectionId) => roomConfig.sections.find((section) => section.id === sectionId);

export default roomConfig;
