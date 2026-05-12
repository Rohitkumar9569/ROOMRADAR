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
  if (field.key === 'beds') {
    const numericValue = toFiniteNumber(value);
    return numericValue === undefined || numericValue < 0 ? '' : `${numericValue} bed${numericValue === 1 ? '' : 's'}`;
  }
  if (field.key === 'maxOccupants') {
    const numericValue = toFiniteNumber(value);
    return numericValue === undefined || numericValue < 0 ? '' : `${numericValue} occupant${numericValue === 1 ? '' : 's'}`;
  }
  if (field.valueUnit && typeof value === 'object') {
    const numericValue = toFiniteNumber(value);
    if (numericValue === undefined || numericValue < 0) return '';
    const unit = value.unit || field.unit || '';
    return `${numericValue}${unit ? ` ${unit}` : ''}`;
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
