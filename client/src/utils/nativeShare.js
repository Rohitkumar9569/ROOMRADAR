const getShareErrorName = (error) => String(error?.name || '').toLowerCase();

export const copyTextToClipboard = async (text) => {
  const value = String(text || '');
  if (!value) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
};

export const shareContent = async ({ title, text, url, fallbackText } = {}) => {
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const payload = {
    title: title || 'RoomRadar',
    text: text || '',
    url: shareUrl,
  };

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(payload);
      return { status: 'shared', method: 'native' };
    } catch (error) {
      const errorName = getShareErrorName(error);
      if (errorName === 'aborterror' || errorName === 'notallowederror') {
        return { status: 'cancelled', method: 'native' };
      }
    }
  }

  const copied = await copyTextToClipboard(fallbackText || shareUrl);
  return copied
    ? { status: 'copied', method: 'clipboard' }
    : { status: 'failed', method: 'clipboard' };
};
