const normalizeIndianMobile = (value = '') => {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return digits;
};

const isValidIndianMobile = (value = '') => /^[6-9]\d{9}$/.test(normalizeIndianMobile(value));

const requireValidIndianMobile = (value, label = 'Mobile number') => {
    const normalized = normalizeIndianMobile(value);
    if (!isValidIndianMobile(normalized)) {
        const error = new Error(`${label} must be a valid 10-digit mobile number.`);
        error.statusCode = 400;
        throw error;
    }
    return normalized;
};

const normalizeOptionalIndianMobile = (value, label = 'Mobile number') => {
    if (value === undefined || value === null || String(value).trim() === '') return '';
    return requireValidIndianMobile(value, label);
};

module.exports = {
    isValidIndianMobile,
    normalizeIndianMobile,
    normalizeOptionalIndianMobile,
    requireValidIndianMobile,
};
