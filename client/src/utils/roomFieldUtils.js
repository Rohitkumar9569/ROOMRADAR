import { getCardFields, getDetailFields, getFilterableFields, getSection } from '../config/roomConfig';
import { formatPreferenceLabel } from './listingDisplay';

const toFiniteNumber = (value) => {
  const rawValue = value && typeof value === 'object' ? value.value : value;
  if (rawValue === undefined || rawValue === null || rawValue === '') return undefined;
  if (typeof rawValue === 'string') {
    if (/\b(no\s*deposit|none|free|n\/a|na)\b/i.test(rawValue)) return 0;
    const withoutCurrencyWords = rawValue.replace(/\b(rs|inr)\b/gi, '');
    if (/[a-zA-Z]/.test(withoutCurrencyWords)) return undefined;
  }
  const numericValue = Number(String(rawValue).replace(/[^\d.-]/g, ''));
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const formatClockTime = (value) => {
  if (!value) return '';
  const rawValue = String(value).trim();
  const time24 = rawValue.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  let hours;
  let minutes;

  if (time24) {
    hours = Number(time24[1]);
    minutes = time24[2];
  } else {
    const time12 = rawValue.match(/^(\d{1,2})(?::([0-5]\d))?\s*(am|pm)$/i);
    if (!time12) return rawValue;
    hours = Number(time12[1]);
    minutes = time12[2] || '00';
    const period = time12[3].toLowerCase();
    if (hours < 1 || hours > 12) return rawValue;
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${period}`;
};

export const getRoomFieldValue = (room, field) => {
  if (!room || !field) return undefined;

  if (field.sectionId === 'location') {
    if (field.key === 'pincode') return room.location?.pincode || room.location?.postalCode;
    return room.location?.[field.key] || room[field.key];
  }

  if (field.key === 'familyStatus') {
    return room.familyStatus || room.tenantPreferences?.familyStatus;
  }

  if (field.key === 'gender') {
    return room.gender || room.tenantPreferences?.allowedGender;
  }

  if (field.sectionId === 'amenities') {
    return room.facilities?.[field.key] ?? room[field.key];
  }

  if (field.sectionId === 'rules') {
    if (field.key === 'noticePeriod' && typeof room.noticePeriod === 'object') return room.noticePeriod?.value;
    return room.rules?.[field.key] ?? room[field.key];
  }

  return room[field.key];
};

export const formatRoomFieldValue = (field, value) => {
  if (value === undefined || value === null || value === '') return '';
  if (field.type === 'boolean') return value ? field.label : '';
  if (field.key === 'pricePerNight') {
    const numericValue = toFiniteNumber(value);
    return numericValue === undefined || numericValue <= 0 ? '' : `\u20B9${numericValue.toLocaleString('en-IN')}/night`;
  }
  if (field.format === 'currency') {
    const numericValue = toFiniteNumber(value);
    return numericValue === undefined || numericValue < 0 ? '' : `\u20B9${numericValue.toLocaleString('en-IN')}`;
  }
  if (field.key === 'rent') {
    const numericValue = toFiniteNumber(value);
    return numericValue === undefined || numericValue < 0 ? '' : `\u20B9${numericValue.toLocaleString('en-IN')}/month`;
  }
  if (field.key === 'availableFrom') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (field.type === 'time' || field.key === 'entryTiming' || field.key === 'visitorTiming') {
    return formatClockTime(value);
  }
  if (field.key === 'beds') {
    const numericValue = toFiniteNumber(value);
    return numericValue === undefined || numericValue < 0 ? '' : `${numericValue} bed${numericValue === 1 ? '' : 's'}`;
  }
  if (field.key === 'bedrooms') {
    const numericValue = toFiniteNumber(value);
    return numericValue === undefined || numericValue < 0 ? '' : `${numericValue} bedroom${numericValue === 1 ? '' : 's'}`;
  }
  if (field.key === 'maxOccupants') {
    const numericValue = toFiniteNumber(value);
    return numericValue === undefined || numericValue < 0 ? '' : `${numericValue} occupant${numericValue === 1 ? '' : 's'}`;
  }
  if (field.key === 'maxGuests') {
    const numericValue = toFiniteNumber(value);
    return numericValue === undefined || numericValue < 0 ? '' : `Up to ${numericValue} guest${numericValue === 1 ? '' : 's'}`;
  }
  if (field.valueUnit && typeof value === 'object') {
    const numericValue = toFiniteNumber(value);
    if (numericValue === undefined || numericValue < 0) return '';
    const unit = value.unit || field.unit || '';
    const formattedValue = Number.isInteger(numericValue) ? numericValue : Number(numericValue.toFixed(2));
    return `${formattedValue}${unit ? ` ${unit}` : ''}`;
  }
  if (field.type === 'number') {
    const numericValue = toFiniteNumber(value);
    if (numericValue === undefined || numericValue < 0) return '';
    if (field.unit) return `${numericValue} ${field.unit}`;
    return String(numericValue);
  }
  if (field.unit) return `${value} ${field.unit}`;
  if (field.key === 'familyStatus') {
    if (value === 'Bachelors') return 'Bachelors Only';
    if (value === 'Family') return 'Family Only';
  }
  if (field.key === 'pricingMode') {
    if (value === 'monthly') return 'Monthly rent';
    if (value === 'daily') return 'Daily rent';
    if (value === 'nightly') return 'Nightly rent';
  }
  if (field.key === 'stayType') {
    if (value === 'long_term') return 'Long-term stay';
    if (value === 'short_term') return 'Short-term stay';
    if (value === 'flexible') return 'Flexible stay';
  }
  if (field.key === 'gender') return formatPreferenceLabel(value);
  return String(value);
};

export const getVisibleCardFields = (room) => getCardFields()
  .map((field) => ({ field, value: getRoomFieldValue(room, field) }))
  .filter(({ field, value }) => value !== undefined && value !== null && value !== '' && value !== false && formatRoomFieldValue(field, value) !== '');

export const getVisibleDetailFields = (room) => getDetailFields()
  .map((field) => ({ field, value: getRoomFieldValue(room, field) }))
  .filter(({ field, value }) => value !== undefined && value !== null && value !== '' && value !== false && formatRoomFieldValue(field, value) !== '');

export const getAmenitiesSection = () => getSection('amenities');
export const getRulesSection = () => getSection('rules');
export const getFiltersFromConfig = getFilterableFields;
