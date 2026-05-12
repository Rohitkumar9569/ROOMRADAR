export const sanitizePhoneInput = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '');
  const withoutCountryCode = digits.length > 10 && digits.startsWith('91')
    ? digits.slice(2)
    : digits;
  return withoutCountryCode.slice(0, 10);
};

export const isValidIndianMobile = (value = '') => /^[6-9]\d{9}$/.test(sanitizePhoneInput(value));

export const isPhoneFieldKey = (key = '') => /phone|mobile|contactnumber/i.test(String(key));

export const phoneInputProps = {
  type: 'tel',
  inputMode: 'numeric',
  maxLength: 10,
  pattern: '[0-9]{10}',
  autoComplete: 'tel',
};
