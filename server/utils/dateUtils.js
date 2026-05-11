const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

const toOptionalDate = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'invalid date') return undefined;

  const date = value instanceof Date ? value : new Date(value);
  return isValidDate(date) ? date : undefined;
};

const toRequiredDate = (value) => toOptionalDate(value) || null;

const isValidDateRange = (startDate, endDate) => {
  const start = toOptionalDate(startDate);
  const end = toOptionalDate(endDate);
  return Boolean(start && end && end.getTime() > start.getTime());
};

const sanitizeDateRange = (range = {}) => {
  const startDate = toOptionalDate(range.startDate);
  const endDate = toOptionalDate(range.endDate);

  if (!startDate || !endDate) return null;

  return {
    ...range,
    startDate,
    endDate,
  };
};

module.exports = {
  isValidDate,
  isValidDateRange,
  sanitizeDateRange,
  toOptionalDate,
  toRequiredDate,
};
