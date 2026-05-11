const { getRequiredFields, hasValue, readRoomField } = require('../utils/roomConfigUtils');

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

  return next();
};

module.exports = { validateRoomConfig };
