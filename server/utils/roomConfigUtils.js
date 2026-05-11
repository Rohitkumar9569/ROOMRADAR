const roomConfig = require('../config/roomConfig');

const getRoomFields = () => roomConfig.sections.flatMap((section) => section.fields.map((field) => ({ ...field, sectionId: section.id })));
const getRequiredFields = () => getRoomFields().filter((field) => field.required);
const getFilterableFields = () => getRoomFields().filter((field) => field.filterable);

const hasValue = (value) => {
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== '';
};

const readRoomField = (payload, field) => {
  if (Object.prototype.hasOwnProperty.call(payload, field.key)) {
    return payload[field.key];
  }

  if (field.sectionId === 'location') {
    if (field.key === 'pincode') return payload.location?.pincode || payload.location?.postalCode;
    return payload.location?.[field.key];
  }

  if (field.key === 'familyStatus') {
    return payload.tenantPreferences?.familyStatus || payload.familyStatus;
  }

  if (field.key === 'gender') {
    return payload.tenantPreferences?.allowedGender || payload.gender;
  }

  if (field.sectionId === 'amenities') {
    return payload.facilities?.[field.key] ?? payload[field.key];
  }

  if (field.sectionId === 'rules') {
    return payload.rules?.[field.key] ?? payload[field.key];
  }

  return payload[field.key];
};

module.exports = {
  roomConfig,
  getRoomFields,
  getRequiredFields,
  getFilterableFields,
  hasValue,
  readRoomField,
};
