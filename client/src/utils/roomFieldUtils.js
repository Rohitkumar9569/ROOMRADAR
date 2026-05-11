import { getCardFields, getDetailFields, getFilterableFields, getSection } from '../config/roomConfig';

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
  if (field.format === 'currency') return `₹${Number(value || 0).toLocaleString('en-IN')}`;
  if (field.key === 'rent') return `₹${Number(value || 0).toLocaleString('en-IN')}/month`;
  if (field.key === 'availableFrom') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (field.key === 'beds') return `${value} bed${Number(value) === 1 ? '' : 's'}`;
  if (field.key === 'maxOccupants') return `${value} occupant${Number(value) === 1 ? '' : 's'}`;
  if (field.valueUnit && typeof value === 'object') {
    const numericValue = value.value ?? '';
    const unit = value.unit || field.unit || '';
    return `${numericValue}${unit ? ` ${unit}` : ''}`;
  }
  if (field.unit) return `${value} ${field.unit}`;
  if (field.key === 'familyStatus') {
    if (value === 'Bachelors') return 'Bachelors Only';
    if (value === 'Family') return 'Family Only';
  }
  return String(value);
};

export const getVisibleCardFields = (room) => getCardFields()
  .map((field) => ({ field, value: getRoomFieldValue(room, field) }))
  .filter(({ value }) => value !== undefined && value !== null && value !== '' && value !== false);

export const getVisibleDetailFields = (room) => getDetailFields()
  .map((field) => ({ field, value: getRoomFieldValue(room, field) }))
  .filter(({ value }) => value !== undefined && value !== null && value !== '' && value !== false);

export const getAmenitiesSection = () => getSection('amenities');
export const getRulesSection = () => getSection('rules');
export const getFiltersFromConfig = getFilterableFields;
