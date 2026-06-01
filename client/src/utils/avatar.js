const AVATAR_PALETTE = [
  { bg: '#4285f4', fg: '#ffffff' },
  { bg: '#e53935', fg: '#ffffff' },
  { bg: '#43a047', fg: '#ffffff' },
  { bg: '#7e57c2', fg: '#ffffff' },
  { bg: '#d81b60', fg: '#ffffff' },
  { bg: '#009688', fg: '#ffffff' },
  { bg: '#3f51b5', fg: '#ffffff' },
  { bg: '#f4511e', fg: '#ffffff' },
  { bg: '#8e24aa', fg: '#ffffff' },
  { bg: '#039be5', fg: '#ffffff' },
  { bg: '#00897b', fg: '#ffffff' },
  { bg: '#c2185b', fg: '#ffffff' },
];

const getCleanSource = (values) => values
  .map((value) => String(value || '').trim())
  .find(Boolean) || 'RoomRadar';

export const getAvatarInitial = (...values) => {
  const source = getCleanSource(values);
  const readableSource = source.includes('@') ? source.split('@')[0] : source;
  const match = readableSource.match(/[A-Za-z0-9]/);
  return (match?.[0] || 'R').toUpperCase();
};

export const getAvatarColorStyle = (...values) => {
  const source = getCleanSource(values);
  const hash = Array.from(source.toLowerCase()).reduce((total, letter) => (
    ((total * 31) + letter.charCodeAt(0)) >>> 0
  ), 7);
  const color = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];

  return {
    '--rr-avatar-bg': color.bg,
    '--rr-avatar-fg': color.fg,
  };
};
