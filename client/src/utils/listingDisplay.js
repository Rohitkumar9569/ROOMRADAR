const ROOM_TERM_REPLACEMENTS = [
  [/\bGirls'?\s+(?=Hostel|PG|Room|Flat|Accommodation|Stay|Listing)/gi, "Women's "],
  [/\bGirl's\s+(?=Hostel|PG|Room|Flat|Accommodation|Stay|Listing)/gi, "Women's "],
  [/\bBoys'?\s+(?=Hostel|PG|Room|Flat|Accommodation|Stay|Listing)/gi, "Men's "],
  [/\bBoy's\s+(?=Hostel|PG|Room|Flat|Accommodation|Stay|Listing)/gi, "Men's "],
  [/\bGirls\b/gi, 'Women'],
  [/\bGirl\b/gi, 'Woman'],
  [/\bBoys\b/gi, 'Men'],
  [/\bBoy\b/gi, 'Man'],
  [/\bRoommates\b/gi, 'Co-living'],
  [/\bRoommate\b/gi, 'Co-living'],
];

const PREFERENCE_LABELS = {
  Male: 'Men',
  Female: 'Women',
  Bachelors: 'Bachelors',
  'Bachelors Only': 'Bachelors Only',
};

export const formatListingTitle = (value, fallback = 'Room listing') => {
  const rawTitle = String(value || '').trim();
  if (!rawTitle) return fallback;

  return ROOM_TERM_REPLACEMENTS.reduce(
    (title, [pattern, replacement]) => title.replace(pattern, replacement),
    rawTitle
  ).replace(/\s{2,}/g, ' ').trim();
};

export const formatPreferenceLabel = (value) => PREFERENCE_LABELS[value] || value;
