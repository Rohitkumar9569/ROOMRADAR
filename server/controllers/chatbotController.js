const asyncHandler = require('express-async-handler');
const Room = require('../models/Room');
const {
    appendAndClause,
    buildLocationQuery,
    findDiscoveryFallbackRooms,
    getRequestedFilterLabels,
    normalizeDiscoveryFilters,
} = require('../utils/roomDiscoveryUtils');

let Anthropic = null;
try {
    Anthropic = require('@anthropic-ai/sdk');
} catch (error) {
    Anthropic = null;
}

const SYSTEM_PROMPT = `You are RoomRadar's ultra-premium AI assistant.

LANGUAGE DETECTION (MANDATORY - HIGHEST PRIORITY):
The language instruction at the start of this prompt overrides everything.
- If instruction says English, respond in English only.
- If instruction says Hindi, respond in Hindi only using Devanagari script.
- If instruction says Hinglish, respond in Hinglish only using Roman script.
- Never switch languages mid-conversation unless the latest user message switches.
- For creator/team info questions in English, answer in English.
- For room search results, always show prices with ₹ and keep explanation in the requested language.

ROOM SEARCH INTELLIGENCE:
- Extract city, max_price, min_price, room_type, gender, family_status, occupants, sort_by, and amenities.
- "sabse sasta", "cheapest", "lowest price", "kam budget" means sort_by = price_asc.
- "sabse mahanga", "sabse costly", "expensive", "premium", "luxury" means sort_by = price_desc.
- "best rooms", "top rooms", "good rooms", "recommended rooms" means sort_by = rating.
- "price wise", "by price", "low to high", "according to price" means sort_by = price_asc.
- "2 logo ke liye", "for 2 people", "hum 2 hain" means occupants = 2.
- "give/show/list me 7 rooms" means limit = 7.
- If a user asks for an unrealistically low budget such as ₹1 and no room exists, politely say rooms under that budget are unavailable and mention the minimum available rent from real data.
- Always return results in requested sort order.
- Never invent rooms. Only show real MongoDB data.

PERSONALITY:
- Ultra-premium, polished, helpful, concise, and friendly.
- Never repeat the same intro again and again.
- If user greets you, greet warmly and ask what room they want.

CREATOR KNOWLEDGE:
Created by four developers from Gurukul Kangri Vishwavidyalaya, Haridwar:
1. Rohit Kumar - Lead Developer, GATE DA and CSE qualifier, MERN Stack expert.
2. Shubhanshu - TCS Digital Engineer, NQT qualified, LinkedIn brain games lover.
3. Kamal Kumar - Multi-talented engineer, DSA expert, loves cooking.
4. Samrat Prajapati - Teacher plus engineer, cricket lover, DSA practitioner.
All four love reading and are excited about AI/ML daily discoveries.

RESPONSE FORMAT:
- For room results, keep the reply short and useful.
- For price_asc, mention that the first result is the cheapest.
- Always show real card data only from the database.`;

const JSON_INSTRUCTIONS = `Return only this JSON shape:
{
  "reply": "short helpful reply in the same language as the user",
  "filters": {
    "city": "string or null",
    "max_price": "number or null",
    "min_price": "number or null",
    "room_type": "Single Room, Shared Room, 1BHK, 2BHK, PG, Flat, Studio, or null",
    "gender": "Male, Female, Any, or null",
    "family_status": "Bachelors Only, Family Only, Any, or null",
    "occupants": "number or null",
    "sort_by": "price_asc, price_desc, rating, newest, or null",
    "limit": "number between 1 and 12, or null",
    "amenities": ["wifi, ac, parking, meals, security, cctv, gym, laundry, or empty array"]
  }
}`;

const normalizeMessages = (messages = []) => {
    return messages
        .filter((message) => ['user', 'assistant'].includes(message.role) && message.content)
        .slice(-12)
        .map((message) => ({
            role: message.role,
            content: typeof message.content === 'string' ? message.content : String(message.content)
        }));
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeGender = (value = '') => {
    const normalized = value.toLowerCase();
    if (['boy', 'boys', 'male', 'males', 'men', 'ladka', 'ladke', 'ladko'].some((term) => normalized.includes(term))) return 'Male';
    if (['girl', 'girls', 'female', 'females', 'women', 'ladki', 'ladkiyo', 'ladkiyon', 'mahila'].some((term) => normalized.includes(term))) return 'Female';
    if (normalized.includes('any')) return 'Any';
    return value;
};

const normalizeFamilyStatus = (value = '') => {
    const normalized = value.toLowerCase();
    if (normalized.includes('bachelor')) return 'Bachelors Only';
    if (normalized.includes('family')) return 'Family Only';
    if (normalized.includes('any')) return 'Any';
    return value;
};

const getLastUserText = (messages) => {
    return [...messages].reverse().find((message) => message.role === 'user')?.content || '';
};

const detectLanguage = (text = '') => {
    if (/[\u0900-\u097F]/.test(text)) return 'hindi';
    const hinglishWords = [
        'kya', 'hai', 'h', 'nahi', 'mujhe', 'chahiye', 'batao', 'hain', 'kar',
        'mera', 'tera', 'yahan', 'wahan', 'acha', 'achha', 'theek', 'bhai',
        'yaar', 'karo', 'dedo', 'lelo', 'kaun', 'kisne', 'kisane', 'sasta',
        'mahanga', 'mehenga', 'andar', 'liye', 'mein', 'room chahiye'
    ];
    const lowerText = text.toLowerCase();
    const tokens = new Set(lowerText.match(/[a-z0-9]+/g) || []);
    const hinglishCount = hinglishWords.filter((word) => (word.includes(' ') ? lowerText.includes(word) : tokens.has(word))).length;
    return hinglishCount >= 1 ? 'hinglish' : 'english';
};

const getLanguageInstruction = (language) => {
    if (language === 'hindi') {
        return 'IMPORTANT: User is writing in Hindi. You MUST respond in Hindi using Devanagari script only.';
    }
    if (language === 'hinglish') {
        return 'IMPORTANT: User is writing in Hinglish. You MUST respond in Hinglish using Roman script Hindi-English mix only.';
    }
    return 'IMPORTANT: User is writing in English. You MUST respond in English only. Do NOT use Hindi, Hinglish, or Devanagari script.';
};

const getDynamicSystemPrompt = (language) => `${getLanguageInstruction(language)}\n\n${SYSTEM_PROMPT}`;

const activePublishedQuery = () => ({ status: { $in: ['Published', 'published'] }, isDeleted: { $ne: true } });

const sanitizeCity = (value = '') => {
    return value
        .replace(/^(mujhe|mujko|mereko|hame|hamko|i need|need|find me|show me|search|please|ek)\s+/i, '')
        .replace(/\b(room|rooms|pg|flat|bhk|under|below|andar|budget|for|boys|girls|male|female|family|chahiye|chaheye|ke|ka|ki|liye|near|mein|me)\b.*$/i, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const GENERIC_CITY_WORDS = new Set([
    'show', 'give', 'list', 'find', 'display', 'search', 'me', 'please',
    'room', 'rooms', 'pg', 'flat', 'flats', 'listing', 'listings',
    'best', 'top', 'good', 'recommended', 'price', 'view', 'price view',
    'budget', 'under', 'below', 'available', 'newest', 'latest', 'cheapest',
    'sasta', 'mahanga', 'mehenga', 'costly', 'expensive', 'near', 'city',
    'location', 'area', 'anywhere', 'all', 'pt', 'pdt', 'pandit'
]);

const normalizeCityFilter = (...values) => {
    for (const value of values) {
        const city = sanitizeCity(String(value || ''));
        const normalized = city.toLowerCase().replace(/\s+/g, ' ').trim();

        if (!normalized || normalized.length < 2 || /^\d+$/.test(normalized)) continue;
        if (GENERIC_CITY_WORDS.has(normalized) || GENERIC_CITY_WORDS.has(normalized.replace(/\s+/g, ''))) continue;

        return city;
    }

    return undefined;
};

const extractFiltersLocally = (text = '') => {
    const filters = {};
    const lower = text.toLowerCase();

    const cityBeforeHindi = text.match(/([a-zA-Z][a-zA-Z\s-]{1,40}?)\s+(?:mein|me)\b/i);
    const cityAfterEnglish = text.match(/\b(?:in|near|at|around|city|location|area)\s+([a-zA-Z][a-zA-Z\s-]{1,40}?)(?=\s+(?:under|below|upto|up to|for|boys|girls|male|female|family|room|rooms|pg|flat|1bhk|2bhk|studio|shared|single|chahiye|chaheye|ke|ka|ki)|[,.!?]|$)/i);
    const city = sanitizeCity(cityBeforeHindi?.[1] || cityAfterEnglish?.[1] || '');
    if (city) filters.city = city;

    const priceMatch = lower.match(/(?:under|below|upto|up to|within|budget|andar|kam)\D{0,12}(\d{1,7})/i)
        || lower.match(/(\d{1,7})\s*(?:ke andar|se kam|tak|budget|under|below)/i)
        || lower.match(/(?:rs\.?|inr|₹)\s*(\d{1,7})/i)
        || lower.match(/(\d{1,7})\s*(?:rs\.?|rupees?|rupaye|₹)\b/i);
    if (priceMatch) filters.max_price = Number(priceMatch[1]);

    const minPriceMatch = lower.match(/(?:above|over|minimum|min|zyada|upar)\D{0,12}(\d{3,7})/i)
        || lower.match(/(\d{3,7})\s*(?:se upar|se jyada|se zyada|above|over)/i);
    if (minPriceMatch) filters.min_price = Number(minPriceMatch[1]);

    const occupantsMatch = lower.match(/(\d{1,2})\s*(?:log|logo|people|persons|occupants|students|ladke|ladkiyan|members)/i)
        || lower.match(/(?:for|ke liye)\s*(\d{1,2})/i);
    if (occupantsMatch) filters.occupants = Number(occupantsMatch[1]);

    const limitMatch = lower.match(/(?:show|give|list|find|display|dikhao|batao|de do|dedo)?\s*(\d{1,2})\s*(?:room|rooms|pg|flats?|listings?)\b/i)
        || lower.match(/\b(?:top|best)\s*(\d{1,2})\b/i);
    if (limitMatch && !/\b(?:bhk|log|logo|people|persons|occupants)\b/i.test(lower.slice(Math.max(0, limitMatch.index - 3), limitMatch.index + limitMatch[0].length + 16))) {
        filters.limit = Math.min(Math.max(Number(limitMatch[1]) || 5, 1), 12);
    }

    if (/(sabse sasta|sasta|cheapest|lowest price|low price|kam budget|minimum rent)/i.test(lower)) filters.sort_by = 'price_asc';
    if (/(sabse costly|sabse mehenga|sabse mahanga|mahanga|expensive|costliest|highest price|premium|luxury)/i.test(lower)) filters.sort_by = 'price_desc';
    if (/(rating|rated|best rated|top rated|best room|best rooms|top room|top rooms|recommended|good room|good rooms|achha|accha)/i.test(lower)) filters.sort_by = 'rating';
    if (/(price\s*(wise|view|order)|price\s*(?:point\s*)?of\s*view|price\s*ke\s*(?:hisab|hisaab)|rent\s*wise|cost\s*wise|budget\s*wise|by price|according to price|low to high|lowest to highest|saste se|kam se)/i.test(lower)) filters.sort_by = 'price_asc';
    if (/(high to low|highest to lowest|price high|costly first|expensive first)/i.test(lower)) filters.sort_by = 'price_desc';
    if (/(newest|latest|naya|recent)/i.test(lower)) filters.sort_by = 'newest';

    if (/\b1\s*bhk\b/i.test(text)) filters.room_type = '1BHK';
    else if (/\b2\s*bhk\b/i.test(text)) filters.room_type = '2BHK';
    else if (/\bpg\b/i.test(text)) filters.room_type = 'PG';
    else if (/\bflat\b/i.test(text)) filters.room_type = 'Flat';
    else if (/\bstudio\b/i.test(text)) filters.room_type = 'Studio';
    else if (/\bshared\b|\bsharing\b/i.test(text)) filters.room_type = 'Shared Room';
    else if (/\bsingle\b/i.test(text)) filters.room_type = 'Single Room';

    const gender = normalizeGender(text);
    if (['Male', 'Female', 'Any'].includes(gender)) filters.gender = gender;

    const familyStatus = normalizeFamilyStatus(text);
    if (['Bachelors Only', 'Family Only', 'Any'].includes(familyStatus)) filters.family_status = familyStatus;

    const amenities = [];
    if (/\bwifi\b|wi-fi/i.test(text)) amenities.push('wifi');
    if (/\bac\b|air condition/i.test(text)) amenities.push('ac');
    if (/parking/i.test(text)) amenities.push('parking');
    if (/meal|food|khana/i.test(text)) amenities.push('meals');
    if (/security|guard/i.test(text)) amenities.push('security');
    if (/cctv|camera/i.test(text)) amenities.push('cctv');
    if (/gym/i.test(text)) amenities.push('gym');
    if (/laundry|washing/i.test(text)) amenities.push('laundry');
    if (/geyser|hot water/i.test(text)) amenities.push('hotWater');
    if (/power backup|inverter/i.test(text)) amenities.push('powerBackup');
    if (/24\s*(?:hr|hour)?\s*water|water supply/i.test(text)) amenities.push('waterSupply');
    if (/attached washroom|attached bathroom/i.test(text)) amenities.push('attachedWashroom');
    if (/balcony/i.test(text)) amenities.push('balcony');
    if (/\blift\b|elevator/i.test(text)) amenities.push('lift');
    if (/study table/i.test(text)) amenities.push('studyTable');
    if (/kitchen|cooking/i.test(text)) amenities.push('kitchenAccess');
    if (/water purifier|ro water/i.test(text)) amenities.push('waterPurifier');
    if (/housekeeping|cleaning/i.test(text)) amenities.push('housekeeping');
    if (amenities.length) filters.amenities = amenities;

    return filters;
};

const buildExtractionPrompt = (messages) => {
    const conversation = messages.map((message) => `${message.role}: ${message.content}`).join('\n');
    return `${JSON_INSTRUCTIONS}\n\nConversation:\n${conversation}`;
};

const parseJsonText = (text = '') => {
    const cleaned = text.replace(/```json|```/gi, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return {};

    try {
        return JSON.parse(cleaned.slice(start, end + 1));
    } catch (error) {
        return {};
    }
};

const getFetch = () => {
    if (typeof fetch !== 'function') throw new Error('Server fetch API is unavailable');
    return fetch;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 9000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await getFetch()(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
};

const providerErrorText = async (response) => {
    const text = await response.text();
    return `${response.status} ${text.slice(0, 220)}`;
};

const callGemini = async (messages, systemPrompt) => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY missing');

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: buildExtractionPrompt(messages) }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 512,
                responseMimeType: 'application/json'
            }
        })
    });

    if (!response.ok) throw new Error(await providerErrorText(response));
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') || '';
    return parseJsonText(text);
};

const callOpenAiCompatible = async ({ name, url, apiKey, model, headers = {} }, messages, systemPrompt) => {
    if (!apiKey) throw new Error(`${name} API key missing`);

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            ...headers
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: buildExtractionPrompt(messages) }
            ],
            temperature: 0.1,
            max_tokens: 512
        })
    });

    if (!response.ok) throw new Error(await providerErrorText(response));
    const data = await response.json();
    return parseJsonText(data.choices?.[0]?.message?.content || '');
};

const callGrok = (messages, systemPrompt) => callOpenAiCompatible({
    name: 'Grok',
    url: 'https://api.x.ai/v1/chat/completions',
    apiKey: process.env.GROK_API_KEY || process.env.XAI_API_KEY,
    model: process.env.GROK_MODEL || 'grok-2-latest'
}, messages, systemPrompt);

const callOpenRouter = (messages, systemPrompt) => callOpenAiCompatible({
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    headers: {
        'HTTP-Referer': process.env.CLIENT_URL || process.env.PUBLIC_APP_URL || '',
        'X-Title': 'RoomRadar'
    }
}, messages, systemPrompt);

const callAnthropic = async (messages, systemPrompt) => {
    if (!Anthropic) throw new Error('Anthropic SDK missing');
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 512,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: 'user', content: buildExtractionPrompt(messages) }]
    });
    const text = response.content?.filter((block) => block.type === 'text').map((block) => block.text).join('\n') || '';
    return parseJsonText(text);
};

const runAiExtraction = async (messages, systemPrompt) => {
    const providers = [
        { name: 'gemini', run: callGemini },
        { name: 'grok', run: callGrok },
        { name: 'anthropic', run: callAnthropic },
        { name: 'openrouter', run: callOpenRouter }
    ];
    const errors = [];

    for (const provider of providers) {
        try {
            const result = await provider.run(messages, systemPrompt);
            if (result && (result.filters || result.reply)) {
                return {
                    provider: provider.name,
                    fallback: false,
                    reply: result.reply,
                    filters: result.filters || {},
                    errors
                };
            }
            errors.push(`${provider.name}: empty response`);
        } catch (error) {
            errors.push(`${provider.name}: ${error.message}`);
        }
    }

    return {
        provider: 'local',
        fallback: true,
        reply: null,
        filters: {},
        errors
    };
};

const mergeFilters = (aiFilters = {}, localFilters = {}) => {
    const maxPrice = Number(aiFilters.max_price || aiFilters.maxPrice || aiFilters.budget || localFilters.max_price);
    const minPrice = Number(aiFilters.min_price || aiFilters.minPrice || localFilters.min_price);
    const occupants = Number(aiFilters.occupants || aiFilters.people || localFilters.occupants);
    const limit = Number(aiFilters.limit || aiFilters.count || aiFilters.number_of_rooms || localFilters.limit);
    const amenities = Array.isArray(aiFilters.amenities) && aiFilters.amenities.length
        ? aiFilters.amenities
        : (Array.isArray(localFilters.amenities) ? localFilters.amenities : []);
    const merged = {
        city: normalizeCityFilter(aiFilters.city, aiFilters.location, localFilters.city),
        max_price: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : undefined,
        min_price: Number.isFinite(minPrice) && minPrice > 0 ? minPrice : undefined,
        room_type: aiFilters.room_type || aiFilters.roomType || localFilters.room_type,
        gender: normalizeGender(aiFilters.gender || aiFilters.gender_preference || localFilters.gender || ''),
        family_status: normalizeFamilyStatus(aiFilters.family_status || aiFilters.familyStatus || localFilters.family_status || ''),
        occupants: Number.isFinite(occupants) && occupants > 0 ? occupants : undefined,
        sort_by: aiFilters.sort_by || aiFilters.sortBy || localFilters.sort_by,
        limit: Number.isFinite(limit) && limit > 0 ? Math.min(Math.max(Math.round(limit), 1), 12) : undefined,
        amenities
    };

    Object.keys(merged).forEach((key) => {
        if (!merged[key] || (Array.isArray(merged[key]) && merged[key].length === 0)) delete merged[key];
    });

    return merged;
};

const hasSearchIntent = (text = '', filters = {}) => {
    const lower = text.toLowerCase();
    if (isGreeting(text) || isCreatorQuestion(text) || isIdentityQuestion(text) || getTeamProfileKey(text)) return false;
    return Object.keys(filters).length > 0
        || /\b(room|rooms|pg|flat|bhk|rent|budget|under|below|andar|search|find|show|give|list|best|top|price|chahiye|available|boys|girls|family|sasta|cheapest|costly|expensive|mahanga|mehenga|people|logo)\b/i.test(lower);
};

const isHinglish = (text = '') => detectLanguage(text) === 'hinglish';

const getDeveloperCredit = () => process.env.PLATFORM_DEVELOPERS || 'Rohit Kumar, Shubhanshu, Kamal Kumar, and Samrat Prajapati';

const teamProfiles = {
    rohit: `SARATHI'S INSIGHT (The Direct Answer)
Rohit Kumar Sarathi aur RoomRadar ke lead creator hain. Woh Gurukul Kangri Vishwavidyalaya, Haridwar me B.Tech CSE final-year student hain.

The Core Idea
Rohit ka focus technology aur education ko connect karna hai, taaki complex topics simple, clear aur motivating tareeke se samjhaye ja sakein.

Detailed Profile
Rohit Kumar 2022-2026 batch ke B.Tech CSE student hain. Woh GATE CSE aur GATE DA qualified hain, including DA AIR 7275. Unka focus MERN Stack, TypeScript, Data Science, Cybersecurity, Cloud Computing, Python, C++, React Three Fiber aur AI/ML par hai.

Major projects: RoomRadar, MockPanel, Study Hub, aur 3D Interactive Portfolio. Long-term goal: UPSC/UPPSC ke through SDM banna. Rohit daily AI/ML discoveries explore karna pasand karte hain.

Key Takeaways
- Rohit Kumar RoomRadar ke lead developer aur Sarathi ke creator hain.
- GATE CSE aur DA qualified hain.
- MERN, TypeScript, Data Science, Cybersecurity aur AI/ML me strong interest rakhte hain.
- Unka vision learning ko simple, accessible aur motivating banana hai.`,
    shubhanshu: `Shubhanshu RoomRadar team ke software engineer hain. Unhone TCS NQT exam qualify kiya, interview clear kiya, aur TCS Digital role ke liye select hue. Ab woh TCS me kaam karte hain.

Unka focus DSA, real-world coding problems, LinkedIn brain games, books aur novels par bhi hai. RoomRadar me unka contribution platform ko practical, reliable aur premium engineering direction dene me important hai.`,
    kamal: `Kamal Kumar RoomRadar team ke software engineer hain. Woh multi-talented hain: coding unki favorite skill hai, DSA me strong interest rakhte hain, aur cooking me bhi kaafi achhe hain.

Kamal novels/books padhna pasand karte hain aur naye AI/ML inventions ko explore karte rehte hain. RoomRadar team me woh product quality, problem solving aur implementation energy add karte hain.`,
    samrat: `Samrat Prajapati RoomRadar team ke teacher plus software engineer profile wale member hain. Woh same college se connected hain, students ko teach karte hain, aur free time me software engineering/coding par kaam karte hain.

Samrat cricket dekhna pasand karte hain, DSA practice karte hain, books/novels padhte hain, aur AI/ML ke naye ideas ko follow karte hain. RoomRadar team me woh teaching mindset aur engineering discipline dono add karte hain.`
};

const teamProfilesEnglish = {
    rohit: `Rohit Kumar is the lead developer and creator behind RoomRadar. He is a final-year B.Tech CSE student at Gurukul Kangri Vishwavidyalaya, Haridwar, and is GATE qualified in both CSE and DA, including DA AIR 7275.

He focuses on MERN Stack, TypeScript, Data Science, Cybersecurity, Cloud Computing, Python, C++, React Three Fiber, and AI/ML. His major projects include RoomRadar, MockPanel, Study Hub, and a 3D Interactive Portfolio. His long-term goal is UPSC/UPPSC through the SDM path.`,
    shubhanshu: `Shubhanshu is a software engineer on the RoomRadar team. He qualified TCS NQT, cleared the interview, was selected for the TCS Digital role, and currently works at TCS.

He practices DSA, enjoys LinkedIn brain games, reads books and novels, and likes solving real-world premium coding problems.`,
    kamal: `Kamal Kumar is a software engineer on the RoomRadar team. He is multi-talented, loves coding, has strong interest in DSA, and is also an excellent cook.

He reads books and novels, follows new AI/ML inventions, and contributes strong problem-solving energy to RoomRadar.`,
    samrat: `Samrat Prajapati is a teacher plus software engineer connected with the same college. He teaches students and works on software engineering in his free time.

He enjoys cricket, practices DSA, reads books and novels, and follows new AI/ML ideas. He brings a teaching mindset and engineering discipline to RoomRadar.`
};

const teamProfilesHindi = {
    rohit: `रोहित कुमार RoomRadar के lead developer और creator हैं। वे Gurukul Kangri Vishwavidyalaya, Haridwar में B.Tech CSE final-year student हैं और GATE CSE तथा GATE DA qualified हैं, जिसमें DA AIR 7275 शामिल है।

उनका focus MERN Stack, TypeScript, Data Science, Cybersecurity, Cloud Computing, Python, C++, React Three Fiber और AI/ML पर है। उनके major projects RoomRadar, MockPanel, Study Hub और 3D Interactive Portfolio हैं।`,
    shubhanshu: `शुभांशु RoomRadar team के software engineer हैं। उन्होंने TCS NQT qualify किया, interview clear किया, TCS Digital role के लिए select हुए, और currently TCS में काम करते हैं।

वे DSA practice करते हैं, LinkedIn brain games पसंद करते हैं, books/novels पढ़ते हैं, और real-world coding problems solve करना पसंद करते हैं।`,
    kamal: `कमल कुमार RoomRadar team के software engineer हैं। वे multi-talented हैं, coding पसंद करते हैं, DSA में strong interest रखते हैं, और cooking में भी अच्छे हैं।

वे books/novels पढ़ते हैं और नए AI/ML inventions explore करते रहते हैं।`,
    samrat: `सम्राट प्रजापति teacher plus software engineer profile वाले RoomRadar team member हैं। वे same college से connected हैं, students को teach करते हैं, और free time में software engineering पर काम करते हैं।

वे cricket पसंद करते हैं, DSA practice करते हैं, books/novels पढ़ते हैं, और AI/ML ideas follow करते हैं।`
};

const getTeamProfileReply = (profileKey, text = '') => {
    const language = detectLanguage(text);
    if (language === 'english') return teamProfilesEnglish[profileKey] || teamProfilesEnglish.rohit;
    if (language === 'hindi') {
        const hindiProfiles = {
            rohit: 'रोहित कुमार RoomRadar के lead developer और creator हैं। वे Gurukul Kangri Vishwavidyalaya, Haridwar में B.Tech CSE final-year student हैं और GATE CSE तथा GATE DA qualified हैं।',
            shubhanshu: 'शुभांशु RoomRadar team के software engineer हैं। वे TCS Digital role के लिए selected हुए और real-world coding, DSA और product quality पर strong focus रखते हैं।',
            kamal: 'कमल कुमार RoomRadar team के software engineer हैं। उन्हें coding, DSA, books, AI/ML ideas और cooking में strong interest है।',
            samrat: 'सम्राट प्रजापति RoomRadar team के teacher plus software engineer profile वाले member हैं। वे students को teach करते हैं और software engineering पर काम करते हैं।'
        };
        return hindiProfiles[profileKey] || hindiProfiles.rohit;
    }
    return teamProfiles[profileKey] || teamProfiles.rohit;
};

const createDeveloperCreditReply = (text = '') => (
    detectLanguage(text) === 'hindi'
        ? `RoomRadar और इस AI assistant को ${getDeveloperCredit()} ने बनाया है। Rohit, Shubhanshu, Kamal और Samrat इस project की developer team हैं।`
        : isHinglish(text)
            ? `RoomRadar aur is AI assistant ko ${getDeveloperCredit()} ne banaya hai. Rohit, Shubhanshu, Kamal aur Samrat is project ke developer team members hain.`
            : `RoomRadar and this AI assistant were built by ${getDeveloperCredit()}. Rohit, Shubhanshu, Kamal, and Samrat are the developer team behind this project.`
);

const createRohitProfileReply = () => teamProfiles.rohit;

const isGreeting = (text = '') => /^(hi|hii|hello|hey|namaste|namaskar)\b/i.test(text.trim()) || /^\s*[\u0928][\u092e][\u0938]/.test(text);

const isCreatorQuestion = (text = '') => {
    const lower = text.toLowerCase();
    return /(kisne|kisane|kaun banaya|banaya h|banaya hai|banaya|developer|developed by|creator|founder|owner)/i.test(lower)
        && /(platform|roomradar|room radar|website|app|project|isako|isaka|iska|ye|yeh|tumko|tumhe|tujhe|aapko|assistant|chatbot|bot|ai)/i.test(lower);
};

const isIdentityQuestion = (text = '') => /(tum kaun|aap kaun|who are you|what are you)/i.test(text);

const getTeamProfileKey = (text = '') => {
    if (/\brohit\b|\brk\b|sarathi|sārathi/i.test(text)) return 'rohit';
    if (/shubhanshu|subhanshu/i.test(text)) return 'shubhanshu';
    if (/\bkamal\b/i.test(text)) return 'kamal';
    if (/samrat|prajapati/i.test(text)) return 'samrat';
    return null;
};

const getExtremeIntent = (text = '') => {
    const lower = text.toLowerCase();
    const wantsCheapest = /(sabse sasta|sasta|cheapest|lowest|minimum|kam rent|low price)/i.test(lower);
    const wantsCostliest = /(sabse costly|sabse mehenga|mahanga|expensive|costliest|highest|max rent|premium room)/i.test(lower);
    if (wantsCheapest && wantsCostliest) return 'both';
    if (wantsCheapest) return 'cheapest';
    if (wantsCostliest) return 'costliest';
    return null;
};

const findExtremeRooms = async (intent) => {
    const baseQuery = activePublishedQuery();
    const select = 'title rent location roomType gender familyStatus imageUrl images averageRating _id';
    if (intent === 'both') {
        const [cheapest, costliest] = await Promise.all([
            Room.findOne(baseQuery).select(select).sort({ rent: 1 }).lean(),
            Room.findOne(baseQuery).select(select).sort({ rent: -1 }).lean()
        ]);
        return [cheapest, costliest].filter(Boolean);
    }
    return Room.find(baseQuery)
        .select(select)
        .sort({ rent: intent === 'cheapest' ? 1 : -1 })
        .limit(1)
        .lean();
};

const createExtremeMessage = (intent, rooms, sourceText) => {
    const language = detectLanguage(sourceText);
    if (!rooms.length) {
        if (language === 'hindi') return 'अभी published rooms में rent data available नहीं मिला।';
        return isHinglish(sourceText)
            ? 'Abhi published rooms me rent data available nahi mila.'
            : 'I could not find published rooms with rent data right now.';
    }

    const rent = (room) => `₹${Number(room.rent || 0).toLocaleString('en-IN')}/month`;
    if (language === 'hindi') {
        if (intent === 'both' && rooms.length > 1) {
            return `सबसे सस्ता room ${rooms[0].title} है: ${rent(rooms[0])}. सबसे costly room ${rooms[1].title} है: ${rent(rooms[1])}.`;
        }
        return intent === 'cheapest'
            ? `सबसे सस्ता available room ${rooms[0].title} है: ${rent(rooms[0])}.`
            : `सबसे costly available room ${rooms[0].title} है: ${rent(rooms[0])}.`;
    }
    if (isHinglish(sourceText)) {
        if (intent === 'both' && rooms.length > 1) {
            return `Sabse sasta room ${rooms[0].title} hai: ${rent(rooms[0])}. Sabse costly room ${rooms[1].title} hai: ${rent(rooms[1])}.`;
        }
        return intent === 'cheapest'
            ? `Sabse sasta available room ${rooms[0].title} hai: ${rent(rooms[0])}.`
            : `Sabse costly available room ${rooms[0].title} hai: ${rent(rooms[0])}.`;
    }

    if (intent === 'both' && rooms.length > 1) {
        return `The cheapest room is ${rooms[0].title} at ${rent(rooms[0])}. The costliest room is ${rooms[1].title} at ${rent(rooms[1])}.`;
    }
    return intent === 'cheapest'
        ? `The cheapest available room is ${rooms[0].title} at ${rent(rooms[0])}.`
        : `The costliest available room is ${rooms[0].title} at ${rent(rooms[0])}.`;
};

const createSearchMessage = ({ rooms, filters, sourceText }) => {
    const cityText = filters.city ? ` in ${filters.city}` : '';
    const language = detectLanguage(sourceText);
    const count = rooms.length;
    const sortText = filters.sort_by === 'price_asc'
        ? (language === 'hindi' ? ' ये rooms price low to high के अनुसार arranged हैं।' : isHinglish(sourceText) ? ' Ye rooms price low to high ke according arranged hain.' : ' These rooms are arranged by price from low to high.')
        : filters.sort_by === 'price_desc'
            ? (language === 'hindi' ? ' ये rooms price high to low के अनुसार arranged हैं।' : isHinglish(sourceText) ? ' Ye rooms price high to low ke according arranged hain.' : ' These rooms are arranged by price from high to low.')
            : filters.sort_by === 'rating'
                ? (language === 'hindi' ? ' ये best rooms rating और popularity के अनुसार arranged हैं।' : isHinglish(sourceText) ? ' Ye best rooms rating aur popularity ke according arranged hain.' : ' These best rooms are arranged by rating and popularity.')
                : filters.sort_by === 'newest'
                    ? (language === 'hindi' ? ' नए listings पहले दिख रहे हैं।' : isHinglish(sourceText) ? ' Newest listings pehle dikh rahe hain.' : ' The newest listings are shown first.')
                    : '';
    if (language === 'hindi') {
        if (rooms.length > 0) {
            return `मैंने ${count} real matching room${count > 1 ? 's' : ''}${cityText} ढूँढ लिए हैं।${sortText} Card में photo, price और details साफ दिखेंगे।`;
        }
        return 'इस exact requirement पर room नहीं मिला। Budget, city या room type थोड़ा adjust करके फिर से try करें।';
    }
    if (isHinglish(sourceText)) {
        if (rooms.length > 0) {
            return `Maine ${count} real matching room${count > 1 ? 's' : ''}${cityText} dhoondh liye hain.${sortText} Card me photo, price aur details clear dikhengi.`;
        }
        return 'Is exact requirement par room nahi mila. Budget, city ya room type thoda adjust karke dobara try karo, main real listings me search kar dunga.';
    }

    if (rooms.length > 0) {
        return `I found ${count} real matching room${count > 1 ? 's' : ''}${cityText}.${sortText} Open a card to view details and continue booking.`;
    }
    return 'No exact match found for this requirement. Try adjusting the city, budget, or room type and I will search real listings again.';
};

const createBudgetUnavailableMessage = ({ requestedBudget, minimumRoom, sourceText }) => {
    const language = detectLanguage(sourceText);
    const requested = `₹${Number(requestedBudget || 0).toLocaleString('en-IN')}`;
    const minimum = `₹${Number(minimumRoom?.rent || 0).toLocaleString('en-IN')}/month`;

    if (language === 'hindi') {
        return `${requested} के अंदर room available नहीं है। सबसे कम available room ${minimum} से शुरू हो रहा है। मैंने वह option नीचे दिखा दिया है।`;
    }
    if (isHinglish(sourceText)) {
        return `${requested} ke andar room available nahi hai. Minimum available room ${minimum} se start ho raha hai. Maine wo option neeche dikha diya hai.`;
    }
    return `Rooms under ${requested} are not available. The lowest available room starts at ${minimum}, so I have shown that option below.`;
};

const joinLabels = (labels = []) => {
    if (labels.length <= 1) return labels[0] || '';
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
    return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
};

const createRelaxedSearchMessage = ({ rooms, filters, sourceText }) => {
    const language = detectLanguage(sourceText);
    const hinglish = isHinglish(sourceText);
    const normalized = normalizeDiscoveryFilters(filters);
    const requestedLabels = getRequestedFilterLabels(filters);
    const topMatch = rooms[0]?._match || {};
    const matchedLabels = topMatch.matchedLabels || [];
    const relaxedLabels = requestedLabels.filter((label) => !matchedLabels.includes(label));
    const count = rooms.length;
    const matchedText = matchedLabels.length ? joinLabels(matchedLabels.slice(0, 3)) : 'available listings';
    const relaxedText = relaxedLabels.length ? joinLabels(relaxedLabels.slice(0, 3)) : '';
    const sortText = normalized.sort === 'price_asc'
        ? (hinglish ? ' Price low to high rakha hai.' : ' Results are ordered from low price to high.')
        : normalized.sort === 'price_desc'
            ? (hinglish ? ' Price high to low rakha hai.' : ' Results are ordered from high price to low.')
            : normalized.sort === 'rating'
                ? (hinglish ? ' Best rated options pehle hain.' : ' Best rated options are shown first.')
                : '';

    if (!count) {
        if (language === 'hindi' || hinglish) return 'Is category me abhi koi published room available nahi mila. Thoda location, budget ya room type change karke try karo.';
        return 'No published room is available for this category right now. Try changing the location, budget, or room type.';
    }

    if (language === 'hindi' || hinglish) {
        if (relaxedText) {
            return `Exact match nahi mila. ${relaxedText} exact available nahi tha, isliye maine ${matchedText} ke hisaab se ${count} closest real room${count > 1 ? 's' : ''} dikhaye hain.${sortText}`;
        }
        return `Exact phrase match nahi mila, lekin maine ${matchedText} ke hisaab se ${count} closest real room${count > 1 ? 's' : ''} dikhaye hain.${sortText}`;
    }

    if (relaxedText) {
        return `No exact match found. ${relaxedText} was relaxed, so I found ${count} closest real room${count > 1 ? 's' : ''} based on ${matchedText}.${sortText}`;
    }
    return `No exact phrase match found, so I found ${count} closest real room${count > 1 ? 's' : ''} based on ${matchedText}.${sortText}`;
};

const createKnowledgeReply = (text = '') => {
    const lower = text.toLowerCase();
    const language = detectLanguage(text);
    const hinglish = isHinglish(text);

    if (isGreeting(text)) {
        if (language === 'hindi') return 'नमस्ते! मैं RoomRadar AI हूँ। अपना city, budget या room type बताइए, मैं real listings से rooms दिखा दूँगा।';
        return hinglish
            ? 'Hi! Main RoomRadar AI hoon. City, budget ya room type bhejo, main real listings se exact rooms dikha dunga.'
            : 'Hi! I am RoomRadar AI. Send a city, budget, or room type and I will search real listings.';
    }
    const profileKey = getTeamProfileKey(text);
    if (profileKey) {
        return getTeamProfileReply(profileKey, text);
    }
    if (isCreatorQuestion(text)) {
        return createDeveloperCreditReply(text);
    }
    if (isIdentityQuestion(text)) {
        if (language === 'hindi') return 'मैं RoomRadar AI assistant हूँ। मैं real rooms खोजने, booking steps समझाने और landlord/travelling workflow में help करता हूँ।';
        return hinglish
            ? 'Main RoomRadar AI assistant hoon. Main real rooms dhoondhne, booking steps samjhane, aur landlord/travelling workflow me help karta hoon.'
            : 'I am the RoomRadar AI assistant. I help users find real rooms, understand booking steps, and navigate landlord/travelling workflows.';
    }
    if (/book|booking|request|confirm|kaise/i.test(lower)) {
        if (language === 'hindi') return 'Room book करने के लिए room card open करें, Request to Book दबाएँ, stay details fill करें, फिर landlord approval के बाद final confirmation complete होता है।';
        return hinglish
            ? 'Room book karne ke liye room card open karo, Request to Book dabao, stay details fill karo, phir landlord approval ke baad final confirmation complete hota hai.'
            : 'To book, open a room, click Request to Book, fill stay details, then complete confirmation after landlord approval.';
    }
    if (/landlord|host|list|add room|listing/i.test(lower)) {
        if (language === 'hindi') return 'Room list करने के लिए Hosting dashboard में Add Room open करें, photos, rent, location, amenities और rules add करें, फिर publish करें।';
        return hinglish
            ? 'Room list karne ke liye Hosting dashboard me Add Room open karo, photos, rent, location aur rules add karo, phir publish karo.'
            : 'To list a room, open the Hosting dashboard, add photos, rent, location, amenities, rules, and publish the listing.';
    }
    if (/cancel|refund|policy/i.test(lower)) {
        if (language === 'hindi') return 'Cancellation policy room और booking status के हिसाब से apply होती है। Booking summary में final policy दिख जाएगी।';
        return hinglish
            ? 'Cancellation policy room aur booking status ke hisaab se apply hoti hai. Booking summary me final policy dikh jayegi.'
            : 'Cancellation policy depends on the room and booking status. The final policy appears in the booking summary.';
    }
    if (language === 'hindi') return 'मैं RoomRadar पर real rooms search कर सकता हूँ। City, budget, room type और boys/girls/family preference भेजिए।';
    return hinglish
        ? 'Main RoomRadar par real rooms search kar sakta hoon. City, budget, room type aur boys/girls/family preference bhejo.'
        : 'I can search real RoomRadar listings. Send city, budget, room type, and gender/family preference.';
};

const searchRooms = async (input = {}) => {
    const query = activePublishedQuery();
    const andClauses = [];
    const city = input.city?.trim();
    const roomType = input.room_type?.trim();
    const maxPrice = Number(input.max_price);
    const minPrice = Number(input.min_price);
    const occupants = Number(input.occupants);
    const gender = normalizeGender(input.gender || '');
    const familyStatus = normalizeFamilyStatus(input.family_status || '');
    const limit = Number.isFinite(Number(input.limit)) ? Math.min(Math.max(Math.round(Number(input.limit)), 1), 12) : 5;

    if (city) {
        const locationQuery = buildLocationQuery(city, { matchAll: true });
        if (locationQuery) appendAndClause(query, locationQuery);
    }
    if (Number.isFinite(maxPrice) && maxPrice > 0) query.rent = { ...query.rent, $lte: maxPrice };
    if (Number.isFinite(minPrice) && minPrice > 0) query.rent = { ...query.rent, $gte: minPrice };
    if (roomType) query.roomType = new RegExp(escapeRegex(roomType), 'i');
    if (Number.isFinite(occupants) && occupants > 1) {
        andClauses.push({
            $or: [
                { maxOccupants: { $gte: occupants } },
                { beds: { $gte: occupants } }
            ]
        });
    }
    if (gender && gender !== 'Any') {
        andClauses.push({
            $or: [
                { gender },
                { gender: 'Any' },
                { 'tenantPreferences.gender': gender },
                { 'tenantPreferences.gender': 'Any' },
                { 'tenantPreferences.allowedGender': gender },
                { 'tenantPreferences.allowedGender': 'Any' }
            ]
        });
    }
    if (familyStatus && familyStatus !== 'Any') {
        const familyRegex = familyStatus.includes('Bachelor') ? /bachelor/i : /family/i;
        andClauses.push({
            $or: [
                { familyStatus: familyRegex },
                { familyStatus: 'Any' },
                { 'tenantPreferences.familyStatus': familyRegex },
                { 'tenantPreferences.familyStatus': 'Any' }
            ]
        });
    }
    if (Array.isArray(input.amenities)) {
        input.amenities.forEach((amenity) => {
            if (typeof amenity === 'string' && /^[a-zA-Z]+$/.test(amenity)) {
                query[`facilities.${amenity}`] = true;
            }
        });
    }
    if (andClauses.length > 0) query.$and = [...(query.$and || []), ...andClauses];

    const sortMap = {
        price_asc: { rent: 1 },
        price_desc: { rent: -1 },
        rating: { averageRating: -1, views: -1 },
        newest: { createdAt: -1 }
    };
    const sort = sortMap[input.sort_by] || { views: -1, createdAt: -1 };

    return Room.find(query)
        .select('title rent location roomType gender familyStatus beds maxOccupants facilities imageUrl images averageRating numReviews views _id')
        .sort(sort)
        .limit(limit)
        .lean();
};

exports.chat = asyncHandler(async (req, res) => {
    const messages = normalizeMessages(req.body.messages);
    if (messages.length === 0) {
        return res.status(400).json({ error: 'Messages are required' });
    }

    const lastUserText = getLastUserText(messages);
    const detectedLanguage = detectLanguage(lastUserText);
    const dynamicSystemPrompt = getDynamicSystemPrompt(detectedLanguage);
    const localFilters = extractFiltersLocally(lastUserText);
    const extremeIntent = getExtremeIntent(lastUserText);

    if (isGreeting(lastUserText) || isCreatorQuestion(lastUserText) || isIdentityQuestion(lastUserText) || getTeamProfileKey(lastUserText)) {
        return res.json({
            message: createKnowledgeReply(lastUserText),
            rooms: [],
            provider: 'local',
            fallback: false
        });
    }

    if (extremeIntent === 'both') {
        const rooms = await findExtremeRooms(extremeIntent);
        return res.json({
            message: createExtremeMessage(extremeIntent, rooms, lastUserText),
            rooms,
            sort: 'price_asc',
            provider: 'local-db',
            fallback: false
        });
    }

    const aiResult = await runAiExtraction(messages, dynamicSystemPrompt);
    const filters = mergeFilters(aiResult.filters, localFilters);

    if (!hasSearchIntent(lastUserText, filters)) {
        return res.json({
            message: aiResult.reply || createKnowledgeReply(lastUserText),
            rooms: [],
            provider: aiResult.provider,
            fallback: aiResult.fallback
        });
    }

    let rooms = await searchRooms(filters);
    let message = createSearchMessage({ rooms, filters, sourceText: lastUserText });
    let responseSort = filters.sort_by;
    let matchType = rooms.length > 0 ? 'exact' : 'none';

    if (rooms.length === 0 && Number(filters.max_price) > 0) {
        const minimumCandidates = await searchRooms({
            ...filters,
            max_price: undefined,
            sort_by: 'price_asc',
            limit: 1
        });
        const minimumRoom = minimumCandidates[0];
        if (minimumRoom && Number(minimumRoom.rent || 0) > Number(filters.max_price)) {
            rooms = minimumCandidates;
            message = createBudgetUnavailableMessage({
                requestedBudget: filters.max_price,
                minimumRoom,
                sourceText: lastUserText
            });
            responseSort = 'price_asc';
            matchType = 'budget_floor';
        }
    }

    if (rooms.length === 0) {
        const relaxedRooms = await findDiscoveryFallbackRooms(Room, filters, {
            resultLimit: filters.limit || 5,
            candidateLimit: 180,
        });

        if (relaxedRooms.length > 0) {
            rooms = relaxedRooms;
            message = createRelaxedSearchMessage({ rooms, filters, sourceText: lastUserText });
            responseSort = filters.sort_by;
            matchType = 'relaxed';
        }
    }

    res.json({
        message,
        rooms,
        filters,
        sort: responseSort,
        matchType,
        provider: aiResult.provider,
        fallback: aiResult.fallback || matchType === 'relaxed'
    });
});
