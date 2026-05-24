const { getRequiredFields, getRoomFields, hasValue, readRoomField } = require('../utils/roomConfigUtils');

const countWords = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;

const validateRoomConfig = (req, res, next) => {
  const missingFields = getRequiredFields()
    .filter((field) => !hasValue(readRoomField(req.body, field)))
    .map((field) => field.label);

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: 'Please complete all required room fields.',
      missingFields,
    });
  }

  if (!req.body.location?.coordinates || req.body.location.coordinates.length !== 2) {
    return res.status(400).json({
      message: 'Please select a valid map location for the room.',
      missingFields: ['Map Location'],
    });
  }

  const overLimitFields = getRoomFields()
    .filter((field) => field.maxLength || field.maxWords)
    .map((field) => {
      const value = readRoomField(req.body, field);
      if (!hasValue(value)) return null;
      const textValue = String(value);
      if (field.maxLength && textValue.length > field.maxLength) {
        return `${field.label} must be ${field.maxLength} characters or less.`;
      }
      if (field.maxWords && countWords(textValue) > field.maxWords) {
        return `${field.label} must be ${field.maxWords} words or less.`;
      }
      return null;
    })
    .filter(Boolean);

  if (overLimitFields.length > 0) {
    return res.status(400).json({
      message: 'Some room details are too long.',
      errors: overLimitFields,
    });
  }

  return next();
};

module.exports = { validateRoomConfig };
