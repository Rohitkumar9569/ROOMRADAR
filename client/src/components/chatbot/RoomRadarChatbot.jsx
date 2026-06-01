import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    BedDouble,
    CheckCircle2,
    ImageOff,
    Loader2,
    MapPin,
    MessageCircle,
    Search,
    Send,
    ShieldCheck,
    Star,
    Users,
    X
} from 'lucide-react';
import api from '../../api';
import { formatListingTitle } from '../../utils/listingDisplay';

const suggestions = [
    { label: 'Haridwar rooms', Icon: MapPin },
    { label: 'Booking', Icon: CheckCircle2 },
    { label: 'Verified', Icon: ShieldCheck },
    { label: 'Top rated', Icon: Star }
];

const sanitizeHelpCopy = (value = '') => String(value)
    .replace(/RoomRadar\s+AI/gi, 'RoomRadar Help')
    .replace(/\bAI[-\s]?powered\b/gi, 'RoomRadar')
    .replace(/\bAI\s+assistant\b/gi, 'RoomRadar Help')
    .replace(/\bassistant\b/gi, 'RoomRadar Help')
    .replace(/\bchatbot\b/gi, 'help panel')
    .replace(/\bbot\b/gi, 'help panel')
    .replace(/\bAI\b(?!\/ML)/g, 'RoomRadar')
    .replace(/\bsmart\s+search\b/gi, 'quick search')
    .replace(/\bsmart\s+help\b/gi, 'room help')
    .replace(/\bsentiment\b/gi, 'feedback')
    .replace(/\bintent\b/gi, 'request')
    .replace(/\banalysis\b/gi, 'review')
    .replace(/\bproject\b/gi, 'service')
    .replace(/\btech stack\b/gi, 'service setup');

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const getRoomImage = (room) => {
    const firstImage = room?.images?.[0];
    if (typeof firstImage === 'string') return firstImage;
    return firstImage?.url || firstImage?.secure_url || firstImage?.imageUrl || room?.imageUrl || '';
};

const getRoomLocation = (room) => {
    const raw = room?.location?.fullAddress || [room?.location?.locality, room?.location?.city, room?.location?.state].filter(Boolean).join(', ');
    if (raw && room?.title && raw.trim().toLowerCase() === room.title.trim().toLowerCase()) {
        return [room?.location?.city, room?.location?.state].filter(Boolean).join(', ');
    }
    return raw;
};

const getRoomAmenityLabels = (room) => {
    const facilities = room?.facilities || {};
    return [
        facilities.wifi ? 'WiFi' : '',
        facilities.ac ? 'AC' : '',
        facilities.parking ? 'Parking' : '',
        facilities.meals ? 'Meals' : '',
        facilities.security ? 'Security' : '',
    ].filter(Boolean).slice(0, 3);
};

const getRoomCapacityLabel = (room) => {
    const beds = Number(room?.beds || 0);
    const occupants = Number(room?.maxOccupants || 0);
    if (occupants > 0) return `${occupants} guest${occupants > 1 ? 's' : ''}`;
    if (beds > 0) return `${beds} bed${beds > 1 ? 's' : ''}`;
    return room?.roomType || '';
};

const getRoomRating = (room) => {
    const rating = Number(room?.averageRating || 0);
    const reviews = Number(room?.numReviews || 0);
    if (rating > 0) return `${rating.toFixed(1)}${reviews ? ` (${reviews})` : ''}`;
    return '';
};

const detectLanguage = (text = '') => {
    if (/[\u0900-\u097F]/.test(text)) return 'hindi';
    const hinglishWords = ['kya', 'hai', 'h', 'nahi', 'mujhe', 'chahiye', 'batao', 'kaun', 'sasta', 'saste', 'sasti', 'sabse', 'mahanga', 'mahinga', 'mehenga', 'mehanga', 'mehangi', 'andar', 'liye', 'mein', 'me', 'baare', 'bare', 'isake', 'iske', 'details', 'research', 'profile', 'member', 'team', 'bhai', 'yaar', 'khana', 'khaana', 'banata', 'banate', 'banati', 'banane', 'padhna', 'padhta', 'pasand', 'achhe', 'achha', 'accha', 'badhiya', 'badia', 'kaafi', 'karta', 'karte'];
    const lowerText = text.toLowerCase();
    const tokens = new Set(lowerText.match(/[a-z0-9]+/g) || []);
    return hinglishWords.some((word) => (word.includes(' ') ? lowerText.includes(word) : tokens.has(word))) ? 'hinglish' : 'english';
};

const isHinglish = (text = '') => detectLanguage(text) === 'hinglish';

const developerCredit = 'Rohit Kumar, Shubhanshu, Kamal Kumar, and Samrat Prajapati';

const createDeveloperCreditReply = (text = '') => (
    detectLanguage(text) === 'hindi'
        ? `RoomRadar को ${developerCredit} ने बनाया है। Rohit Kumar lead developer और creator हैं।`
        : isHinglish(text)
            ? `RoomRadar ko ${developerCredit} ne banaya hai. Rohit Kumar lead developer aur creator hain.`
            : `RoomRadar was built by ${developerCredit}. Rohit Kumar is the lead developer and creator.`
);

const isTeamOverviewQuestion = (text = '') => {
    const lower = text.toLowerCase();
    return /(team|team member|team members|developer team|developers|founders|creators|sabhi member|sare member|roomradar team)/i.test(lower)
        && /(kaun|who|about|baare|bare|detail|details|research|profile|bio|batao|bataye|members?)/i.test(lower);
};

const createTeamOverviewReply = (text = '') => {
    if (detectLanguage(text) === 'english') {
        return 'RoomRadar was built by Rohit Kumar, Shubhanshu, Kamal Kumar, and Samrat Prajapati. Rohit Kumar is the lead developer and creator.';
    }

    return 'RoomRadar team me Rohit Kumar, Shubhanshu, Kamal Kumar aur Samrat Prajapati hain. Rohit Kumar lead developer aur creator hain.';
};

const isPriceNegotiationQuestion = (text = '') => {
    const lower = text.toLowerCase();
    const hasPriceContext = /\b(room|rooms|pg|flat|listing|rent|price|daam|dam|kiraya|rate|cost|mahanga|mahinga|mehanga|mehenga|expensive|costly)\b/i.test(lower);
    const hasHighConcern = /(?:daam|dam|price|rent|kiraya|rate|cost)\s+(?:bahut|bohot|jyada|zyada|jada|high|expensive|costly)\b/i.test(lower)
        || /\b(?:bahut|bohot|jyada|zyada|jada)\s+(?:mahanga|mahinga|mehanga|mehenga|expensive|costly|high)\b/i.test(lower);
    const hasNegotiationAsk = /(?:kam\s+(?:ho|hoga|hogi|honge|kar|karo|kara|hota|ho\s+jayega|ho\s+sakta)|reduce|reduced|discount|negotia(?:te|ble|tion)|bargain|offer|deal|lower\s+(?:price|rent)|price\s+drop|rent\s+kam|daam\s+kam|dam\s+kam|kiraya\s+kam|rate\s+kam)/i.test(lower);
    return hasPriceContext && (hasNegotiationAsk || hasHighConcern);
};

const createPriceNegotiationReply = (text = '') => {
    if (detectLanguage(text) === 'english') {
        return 'RoomRadar does not automatically reduce the rent. The final price is confirmed by the landlord/host. If the listing is negotiable, open the room, send a booking request or chat message, and politely ask for a better price. You can also tell me your budget and I will show cheaper verified options.';
    }

    return 'RoomRadar se rent automatic kam nahi hota. Final price landlord/host confirm karta hai. Agar listing negotiable hai, room open karke booking request ya chat me politely better price/discount ask kar sakte ho. Budget bata doge to main cheaper verified options bhi dikha dunga.';
};

const getDirectFallbackReply = (text = '') => {
    const lower = text.toLowerCase();
    if (/^(hi|hii|hello|hey|namaste|namaskar)\b/i.test(text.trim()) || /^\s*[\u0928][\u092e][\u0938]/.test(text)) {
        if (detectLanguage(text) === 'hindi') {
            return 'नमस्ते! City, budget या room type भेजिए।';
        }
        return isHinglish(text)
            ? 'Hi! City, budget ya room type bhejo.'
            : 'Hi! Send a city, budget, or room type.';
    }
    if (isTeamOverviewQuestion(text)) {
        return createTeamOverviewReply(text);
    }
    if (/(kisne|kisane|kaun banaya|developer|developed by|creator|founder|owner)/i.test(lower)
        && /(platform|roomradar|room radar|website|app|project|isako|isaka|iska|ye|yeh|tumko|tumhe|tujhe|aapko|assistant|chatbot|bot|ai)/i.test(lower)) {
        return createDeveloperCreditReply(text);
    }
    if (/(tum kaun|aap kaun|who are you|what are you)/i.test(lower)) {
        if (detectLanguage(text) === 'hindi') {
            return 'मैं room search और booking help करता हूँ।';
        }
        return isHinglish(text)
            ? 'Main room search aur booking help karta hoon.'
            : 'I help with room search and booking.';
    }
    if (isPriceNegotiationQuestion(text)) {
        return createPriceNegotiationReply(text);
    }
    return '';
};

const priceAscIntentRegex = /(?:sabse\s+(?:sasta|saste|sasti|cheap|low(?:est)?|kam\s+(?:price|rent|budget))|cheapest|cheap(?:est)?\s*(?:room|rooms|pg|flat|listing|listings)?|lowest\s+(?:price|rent|budget)|low\s+(?:price|rent|budget)|minimum\s+rent|min\s+rent|kam\s+(?:budget|rent|price)|sasta|saste|sasti|affordable|budget\s*friendly|pocket\s*friendly|low\s*to\s*high|lowest\s*to\s*highest|saste\s+se|kam\s+se|price\s*(?:wise|view|order|ke\s*(?:hisab|hisaab))|rent\s*wise|cost\s*wise|budget\s*wise|by\s+price|according\s+to\s+price)/i;
const priceDescIntentRegex = /(?:sabse\s+(?:maha?nga|mahi?nga|meha?nga|mehe?nga|mehe?ngi|costly|expensive|high(?:est|t)?\s+(?:price|rent|budget))|high(?:est|t)?\s+(?:price|rent|budget)|maximum\s+rent|max\s+rent|most\s+expensive|costliest|expensive|costly|maha?nga|mahi?nga|meha?nga|mehe?nga|mehe?ngi|price\s+high(?:est|t)?|high(?:est|t)?\s*to\s*low|highest\s*to\s*lowest|costly\s+first|expensive\s+first|luxury)/i;
const ratingIntentRegex = /(?:sabse\s+(?:best|achha|accha|badhiya|badia)|best\s+(?:room|rooms|pg|flat|listing|listings|rated|option|options)?|top\s+(?:room|rooms|pg|flat|rated|option|options)?|recommended|recommendation|good\s+(?:room|rooms|pg|flat|option|options)|achha|accha|badhiya|badia|rating|rated|popular|trust(?:ed)?)/i;

const getRoomSortIntent = (text = '') => {
    const lower = text.toLowerCase();
    if (priceDescIntentRegex.test(lower)) return 'price_desc';
    if (priceAscIntentRegex.test(lower)) return 'price_asc';
    if (ratingIntentRegex.test(lower)) return 'rating';
    if (/(newest|latest|naya|recent)/i.test(lower)) return 'newest';
    return '';
};

const hasExplicitLimit = (text = '') => (
    /(?:show|give|list|find|display|dikhao|batao|de do|dedo)?\s*\d{1,2}\s*(?:room|rooms|pg|flats?|listings?)\b/i.test(text)
    || /\b(?:top|best)\s*\d{1,2}\b/i.test(text)
);

const wantsSingleRankedRoom = (text = '') => {
    if (hasExplicitLimit(text)) return false;
    return /(?:sabse\s+(?:sasta|saste|sasti|maha?nga|mehe?nga|mehe?ngi|best|achha|accha|badhiya|badia)|cheapest\s+(?:room|pg|flat|listing)?|costliest\s+(?:room|pg|flat|listing)?|most\s+expensive\s+(?:room|pg|flat|listing)?|highest\s+(?:price|rent)\s+(?:room|pg|flat|listing)?|lowest\s+(?:price|rent)\s+(?:room|pg|flat|listing)?|\bbest\s+room\b|\btop\s+room\b)/i.test(text);
};

const applyLocalRoomIntent = (filters = {}, text = '') => {
    const sortIntent = getRoomSortIntent(text);
    const nextFilters = { ...filters };
    if (sortIntent) nextFilters.sort = sortIntent;
    if (sortIntent && !nextFilters.limit && wantsSingleRankedRoom(text)) nextFilters.limit = 1;
    return nextFilters;
};

const extractLocalFilters = (text = '') => {
    const lower = text.toLowerCase();
    const filters = {};
    const cityBeforeHindi = text.match(/([a-zA-Z][a-zA-Z\s-]{1,40}?)\s+(?:mein|me)\b/i);
    const cityAfterEnglish = text.match(/\b(?:in|near|at|around)\s+([a-zA-Z][a-zA-Z\s-]{1,40}?)(?=\s+(?:under|below|for|boys|girls|room|pg|flat|1bhk|2bhk)|[,.!?]|$)/i);
    const city = (cityBeforeHindi?.[1] || cityAfterEnglish?.[1] || '')
        .replace(/^(mujhe|mujko|hame|hamko|find me|show me|need|ek)\s+/i, '')
        .trim();
    const priceMatch = lower.match(/(?:under|below|upto|up to|within|budget|andar|kam)\D{0,12}(\d{1,7})/i)
        || lower.match(/(\d{1,7})\s*(?:ke andar|se kam|tak|budget|under|below)/i)
        || lower.match(/(?:rs\.?|inr|₹)\s*(\d{1,7})/i)
        || lower.match(/(\d{1,7})\s*(?:rs\.?|rupees?|rupaye|₹)\b/i);
    const occupantsMatch = lower.match(/(\d{1,2})\s*(?:log|logo|people|persons|occupants|students|members)/i)
        || lower.match(/(?:for|ke liye)\s*(\d{1,2})/i);

    if (city) filters.city = city;
    if (priceMatch) filters.maxRent = priceMatch[1];
    if (occupantsMatch) filters.beds = occupantsMatch[1];
    const limitMatch = lower.match(/(?:show|give|list|find|display|dikhao|batao|de do|dedo)?\s*(\d{1,2})\s*(?:room|rooms|pg|flats?|listings?)\b/i)
        || lower.match(/\b(?:top|best)\s*(\d{1,2})\b/i);
    if (limitMatch && !/\b(?:bhk|log|logo|people|persons|occupants)\b/i.test(lower.slice(Math.max(0, limitMatch.index - 3), limitMatch.index + limitMatch[0].length + 16))) {
        filters.limit = Math.min(Math.max(Number(limitMatch[1]) || 5, 1), 12);
    }
    if (/\b1\s*bhk\b/i.test(text)) filters.roomType = '1BHK';
    else if (/\b2\s*bhk\b/i.test(text)) filters.roomType = '2BHK';
    else if (/\bpg\b/i.test(text)) filters.roomType = 'PG';
    else if (/\bflat\b/i.test(text)) filters.roomType = 'Flat';
    else if (/\bstudio\b/i.test(text)) filters.roomType = 'Studio';
    else if (/\bshared|sharing\b/i.test(text)) filters.roomType = 'Shared Room';
    else if (/\bsingle\b/i.test(text)) filters.roomType = 'Single Room';
    if (/(^|[^a-z])(girls?|female|females|women|ladki|ladkiyon|mahila)([^a-z]|$)/i.test(text)) filters.gender = 'Female';
    else if (/(^|[^a-z])(boys?|male|males|men|ladka|ladke|ladko)([^a-z]|$)/i.test(text)) filters.gender = 'Male';
    return applyLocalRoomIntent(filters, text);
};

const getUserMessageTexts = (messages = []) => messages
    .filter((message) => message.role === 'user' && message.content)
    .map((message) => String(message.content));

const getBareLocalBudget = (text = '') => {
    const match = text.trim().match(/^(?:rs\.?|inr|₹)?\s*(\d{3,7})\s*(?:rs\.?|rupees?|rupaye|₹)?$/i);
    return match ? match[1] : '';
};

const isBareLocalCity = (text = '') => {
    const normalized = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
    if (!normalized || normalized.length < 2 || normalized.length > 40 || /^\d+$/.test(normalized)) return false;
    if (/^(room|rooms|pg|flat|budget|price|yes|haan|ha|ok|okay|thik|theek|help|support|admin)$/.test(normalized)) return false;
    return /^[a-z][a-z\s-]+$/i.test(normalized);
};

const extractContextualLocalFilters = (messages = []) => {
    const filters = {};
    let roomContextSeen = false;
    let budgetContextSeen = false;

    getUserMessageTexts(messages).forEach((text) => {
        const local = extractLocalFilters(text);
        Object.assign(filters, local);

        if (/\b(room|rooms|pg|flat|hostel|stay|search|find|available|chahiye|need|want)\b/i.test(text)) roomContextSeen = true;
        if (/\b(max|maximum|budget|bugect|budegt|price|rent|kiraya|under|below|andar|kitne|kitna|kitni|cost|rs|rupees?)\b/i.test(text)) budgetContextSeen = true;

        const bareBudget = getBareLocalBudget(text);
        if (bareBudget && (budgetContextSeen || roomContextSeen)) {
            filters.maxRent = bareBudget;
            budgetContextSeen = false;
        }

        if (!local.city && roomContextSeen && isBareLocalCity(text)) {
            filters.city = text.trim();
        }
    });

    return filters;
};

const searchRoomsLocally = async (text, presetFilters) => {
    const filters = presetFilters || extractLocalFilters(text);
    const params = new URLSearchParams({ limit: String(filters.limit || 5), sort: filters.sort || 'popular' });
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
    });
    const { data } = await api.get(`/rooms?${params.toString()}`);
    let rooms = data.data || data || [];
    if (['price_asc', 'price_desc'].includes(filters.sort)) rooms = rooms.filter((room) => Number(room.rent || 0) > 0);
    if (filters.sort === 'price_asc') rooms = [...rooms].sort((a, b) => Number(a.rent || 0) - Number(b.rent || 0));
    if (filters.sort === 'price_desc') rooms = [...rooms].sort((a, b) => Number(b.rent || 0) - Number(a.rent || 0));
    return { rooms, filters };
};

const fallbackReply = (text, rooms, filters = extractLocalFilters(text)) => {
    const sortNote = filters.sort === 'price_asc'
        ? ' Price low to high rakha hai.'
        : filters.sort === 'price_desc'
            ? ' Price high to low rakha hai.'
            : filters.sort === 'rating'
                ? ' Best rated options pehle hain.'
                : '';
    if (isHinglish(text)) {
        return rooms.length
            ? `${rooms.length} matching rooms mil gaye.${sortNote}`
            : 'No exact match. City, budget ya type change karo.';
    }
    const englishSortNote = filters.sort === 'price_asc'
        ? ' Results are ordered from low price to high.'
        : filters.sort === 'price_desc'
            ? ' Results are ordered from high price to low.'
            : filters.sort === 'rating'
                ? ' Best rated options are shown first.'
                : '';
    return rooms.length
        ? `${rooms.length} matching rooms found.${englishSortNote}`
        : 'No exact match. Try another city, budget, or type.';
};

const hasLocalRoomSearchIntent = (text = '', filters = extractLocalFilters(text)) => {
    const lower = text.toLowerCase();
    if (getDirectFallbackReply(text)) return false;
    if (/\b(how|kaise|kese|karu|kru|kare|process|steps?|guide|policy|refund|cancel|support|ticket|complaint|complain|report|admin|payment|tech stack|technology|feature|features|module|modules|sentiment|irritating|wrong|galat|problem|issue)\b/i.test(lower)) {
        return false;
    }

    const hasRoomEntity = /\b(room|rooms|pg|flat|flats|bhk|studio|hostel|accommodation|stay|rental|rent|kiraya|listing|listings)\b/i.test(lower);
    const hasUsefulFilter = Boolean(filters.city || filters.maxRent || filters.roomType || filters.gender || filters.beds || filters.sort || filters.limit);
    const isShortcut = /^(best rated|top rated|recommended rooms?|best rooms?|cheapest|sabse sasta|lowest price|highest price|for \d{1,2} people|\d{1,2} logo ke liye)$/i.test(lower.trim());

    if (filters.city && (filters.maxRent || filters.roomType || filters.gender || filters.beds || filters.sort || filters.limit)) return true;
    return isShortcut || (hasRoomEntity && hasUsefulFilter) || (filters.maxRent && /\b(chahiye|need|want|under|below|andar|budget)\b/i.test(lower));
};

const getOfflineKnowledgeReply = (text = '') => {
    const lower = text.toLowerCase();
    if (/(irritating|annoying|wrong|galat|problem|issue|spam|card|cards|answer|reply|result)/i.test(lower)) {
        return 'Bilkul sahi point hai. Har question par room card bhejna irritating hota hai. Main answer-first mode follow karunga: room cards sirf clear room-search request par aayenge.';
    }
    if (/(feature|features|module|modules|roomradar|room radar|platform|app|project)/i.test(lower)) {
        return 'RoomRadar me verified room search, host listings, booking requests, real-time chat, wishlist, reviews, support tickets, trust checks, rent details aur host dashboard available hai.';
    }
    if (/(tech stack|technology|mern|react|node|express|mongodb|socket|cloudinary|jwt|api|database)/i.test(lower)) {
        return 'RoomRadar ka public help panel rental users ke liye hai. Main rooms, rent, location, booking request, host chat, wishlist, reviews, support aur verification flow me help kar sakta hoon.';
    }
    if (/(book|booking|request|confirm|kaise)/i.test(lower)) {
        return 'Room book karne ke liye room details open karo, Request this room submit karo, stay details fill karo, phir host approval ke baad confirmation complete hota hai.';
    }
    if (/(admin|complain|complaint|report|support|ticket|issue|problem)/i.test(lower)) {
        return 'Room ya landlord ke against complain karne ke liye support option open karo, issue clearly likho, room name/booking detail add karo, aur ticket submit karo. Admin us ticket ko review karega.';
    }
    if (/(landlord|host|add room|listing|publish)/i.test(lower)) {
        return 'Landlord dashboard me Add Room open karke photos, rent, location, amenities aur rules add karo, phir listing publish/manage kar sakte ho.';
    }
    if (/(support|ticket|complaint|report|issue)/i.test(lower)) {
        return 'Support ticket me issue clearly describe karo. Admin us ticket ko review karke moderation workflow se response de sakta hai.';
    }
    return isHinglish(text)
        ? 'Main answer samajh gaya. Server slow hai, isliye abhi short answer de raha hoon: RoomRadar questions, booking help, landlord flow, tech details ya real room search ke liye specific message bhejo.'
        : 'I understood the question. The server is slow, so here is the short version: I can answer RoomRadar, booking, landlord, tech, support, and room-search questions.';
};

const analyzeClientSentiment = (text = '') => {
    const lower = text.toLowerCase();
    if (/\b(irritating|annoying|wrong|galat|bad|bekar|problem|issue|bug|useless|confusing)\b/i.test(lower)) {
        return { label: 'frustrated', score: -0.7, intensity: 'high' };
    }
    if (/\b(thanks|thank you|good|nice|great|achha|accha|badhiya|sahi)\b/i.test(lower)) {
        return { label: 'positive', score: 0.55, intensity: 'medium' };
    }
    return { label: 'neutral', score: 0, intensity: 'low' };
};

const createClientAnalysis = (text = '', intentLabel = 'Answer only', rooms = []) => {
    const sentiment = analyzeClientSentiment(text);
    return {
        sentiment,
        intent: {
            key: rooms.length ? 'room_search' : 'browser_answer',
            label: rooms.length ? 'Room search' : intentLabel,
            roomCards: rooms.length > 0
        },
        analysis: {
            tone: sentiment.label,
            intent: rooms.length ? 'Room search' : intentLabel,
            roomCards: rooms.length ? 'shown' : 'not_shown',
            reason: rooms.length ? 'Local fallback found room listings.' : 'Answer-only browser fallback; room cards skipped.'
        }
    };
};

const RoomRadarChatbot = () => {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [scrollTucked, setScrollTucked] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [typing, setTyping] = useState(false);
    const endRef = useRef(null);
    const scrollRef = useRef(null);
    const wasOpenRef = useRef(false);

    useLayoutEffect(() => {
        if (!open) {
            wasOpenRef.current = false;
            return undefined;
        }

        const node = scrollRef.current;
        if (!node) return undefined;

        const behavior = wasOpenRef.current ? 'smooth' : 'auto';
        const scrollToBottom = () => {
            const top = Math.max(node.scrollHeight - node.clientHeight, 0);
            if (behavior === 'smooth') {
                node.scrollTo({ top, behavior: 'smooth' });
                return;
            }
            node.scrollTop = top;
        };

        scrollToBottom();
        const frameId = typeof window !== 'undefined' ? window.requestAnimationFrame(scrollToBottom) : null;
        wasOpenRef.current = true;

        return () => {
            if (frameId && typeof window !== 'undefined') window.cancelAnimationFrame(frameId);
        };
    }, [messages.length, typing, open]);

    const sendMessage = async (text = input) => {
        const trimmed = text.trim();
        if (!trimmed || typing) return;

        const userMessage = { role: 'user', content: trimmed, rooms: [] };
        const outgoing = [...messages, userMessage];
        setMessages(outgoing);
        setInput('');

        const directReply = getDirectFallbackReply(trimmed);
        if (directReply) {
            const directMeta = createClientAnalysis(trimmed, 'Answer only', []);
            setMessages([
                ...outgoing,
                {
                    role: 'assistant',
                    content: directReply,
                    rooms: [],
                    provider: 'browser-knowledge',
                    fallback: false,
                    sentiment: directMeta.sentiment,
                    intent: directMeta.intent,
                    analysis: directMeta.analysis
                }
            ]);
            return;
        }

        setTyping(true);

        try {
            const history = outgoing
                .filter((message) => !message.localOnly)
                .map((message) => ({ role: message.role, content: message.content }));
            const { data } = await api.post('/chatbot', { messages: history });
            setMessages((current) => [
                ...current,
                {
                    role: 'assistant',
                    content: data.message || 'I checked RoomRadar listings for you.',
                    rooms: data.rooms || [],
                    sort: data.sort || data.filters?.sort_by,
                    provider: data.provider,
                    fallback: data.fallback,
                    sentiment: data.sentiment,
                    intent: data.intent,
                    analysis: data.analysis
                }
            ]);
        } catch (error) {
            try {
                const fallbackFilters = extractContextualLocalFilters(outgoing);
                if (!hasLocalRoomSearchIntent(trimmed, fallbackFilters)) {
                    const localMeta = createClientAnalysis(trimmed, 'Answer only', []);
                    setMessages((current) => [
                        ...current,
                        {
                            role: 'assistant',
                            content: getOfflineKnowledgeReply(trimmed),
                            rooms: [],
                            provider: 'browser-answer',
                            fallback: true,
                            sentiment: localMeta.sentiment,
                            intent: localMeta.intent,
                            analysis: localMeta.analysis
                        }
                    ]);
                    return;
                }
                const { rooms, filters } = await searchRoomsLocally(trimmed, fallbackFilters);
                const localMeta = createClientAnalysis(trimmed, 'Room search', rooms);
                setMessages((current) => [
                    ...current,
                    {
                        role: 'assistant',
                        content: fallbackReply(trimmed, rooms, filters),
                        rooms,
                        sort: filters.sort,
                        provider: 'browser-fallback',
                        fallback: true,
                        sentiment: localMeta.sentiment,
                        intent: localMeta.intent,
                        analysis: localMeta.analysis
                    }
                ]);
            } catch (fallbackError) {
                const localMeta = createClientAnalysis(trimmed, 'Connection issue', []);
                setMessages((current) => [
                    ...current,
                    {
                        role: 'assistant',
                        content: error.response?.data?.error || 'Reconnecting. Try again.',
                        rooms: [],
                        sentiment: localMeta.sentiment,
                        intent: localMeta.intent,
                        analysis: localMeta.analysis
                    }
                ]);
            }
        } finally {
            setTyping(false);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        sendMessage();
    };

    const isAuthRoute = /^\/(?:login|signup|forgot-password)(?:\/|$)/.test(location.pathname);
    const isInboxRoute = /\/(?:profile|landlord)\/inbox(?:\/|$)/.test(location.pathname);
    const isListingFormRoute = /^\/landlord\/(?:add-room|edit-room\/[^/]+)\/?$/.test(location.pathname);
    const isHomeRoute = location.pathname === '/';
    const isExploreRoute = isHomeRoute || location.pathname === '/rooms';
    const isCompactLauncher = !isHomeRoute || scrollTucked;

    useEffect(() => {
        if (!isExploreRoute || open || typeof window === 'undefined') {
            setScrollTucked(false);
            return undefined;
        }

        const mobileQuery = window.matchMedia('(max-width: 767px)');
        let frameId = null;
        let lastTucked = false;

        const syncPosition = () => {
            frameId = null;
            const threshold = mobileQuery.matches
                ? (isHomeRoute ? 72 : 24)
                : (isHomeRoute ? 140 : 90);
            const nextTucked = window.scrollY > threshold;
            if (lastTucked === nextTucked) return;
            lastTucked = nextTucked;
            setScrollTucked(nextTucked);
        };

        const scheduleSync = () => {
            if (frameId) return;
            frameId = window.requestAnimationFrame(syncPosition);
        };

        scheduleSync();
        window.addEventListener('scroll', scheduleSync, { passive: true });

        if (mobileQuery.addEventListener) {
            mobileQuery.addEventListener('change', scheduleSync);
        } else {
            mobileQuery.addListener(scheduleSync);
        }

        return () => {
            window.removeEventListener('scroll', scheduleSync);
            if (mobileQuery.removeEventListener) {
                mobileQuery.removeEventListener('change', scheduleSync);
            } else {
                mobileQuery.removeListener(scheduleSync);
            }
            if (frameId) window.cancelAnimationFrame(frameId);
        };
    }, [isExploreRoute, isHomeRoute, open]);

    if (isAuthRoute || isInboxRoute || isListingFormRoute) return null;

    return (
        <>
            <motion.button
                type="button"
                onClick={() => setOpen(true)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                className={`floating-chatbot ${isHomeRoute ? 'is-home-route' : 'is-compact-route'} ${scrollTucked ? 'is-scroll-tucked' : ''} ${isCompactLauncher ? 'is-compact-launcher' : ''}`}
                aria-label="Open RoomRadar help"
            >
                <span className="floating-chatbot-halo" />
                <span className="floating-chatbot-icon" aria-hidden="true">
                    <MessageCircle />
                </span>
            </motion.button>

            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-[10002] hidden bg-slate-950/25 backdrop-blur-sm md:block"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="rr-chatbot-panel fixed inset-x-0 bottom-[calc(var(--rr-bottom-nav-height)+env(safe-area-inset-bottom,0px))] top-[var(--rr-mobile-header-offset)] z-40 flex w-full flex-col overflow-hidden border-t border-light-border bg-light-card text-light-text shadow-2xl dark:border-dark-border dark:bg-dark-sidebar dark:text-dark-text md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:z-[10003] md:h-[calc(100vh-2rem)] md:w-[390px] md:rounded-3xl md:border"
                        >
                            <header className="rr-chatbot-header">
                                <div className="rr-chatbot-titlebar">
                                    <span className="rr-chatbot-brandmark">
                                        <span>RR</span>
                                    </span>
                                    <div>
                                        <h2>Help</h2>
                                        <p className="rr-chatbot-status">
                                            <span />
                                            Ready
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rr-chatbot-close"
                                    aria-label="Close RoomRadar help"
                                >
                                    <X />
                                </button>
                            </header>

                            <div ref={scrollRef} className="rr-chatbot-scroll flex-1 overflow-y-auto px-4 py-5">
                                <div className="space-y-4">
                                    {messages.map((message, index) => (
                                        <MessageBubble key={`${message.role}-${index}`} message={message} closeDrawer={() => setOpen(false)} />
                                    ))}

                                    {messages.length === 0 && (
                                        <div className="rr-chatbot-empty">
                                            <div className="rr-chatbot-empty-card" aria-label="Room search help">
                                                <span className="rr-chatbot-empty-icon">
                                                    <Search />
                                                </span>
                                                <div>
                                                    <h3>Room help</h3>
                                                </div>
                                            </div>
                                            <div className="rr-chatbot-suggestion-grid">
                                                {suggestions.map(({ label, Icon }) => (
                                                    <button
                                                        key={label}
                                                        type="button"
                                                        onClick={() => sendMessage(label)}
                                                        className="rr-chatbot-suggestion"
                                                    >
                                                        <Icon aria-hidden="true" />
                                                        <span>{label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {typing && (
                                        <div className="rr-chatbot-typing">
                                            {[0, 1, 2].map((dot) => (
                                                <motion.span
                                                    key={dot}
                                                    animate={{ y: [0, -6, 0] }}
                                                    transition={{ duration: 0.6, delay: dot * 0.15, repeat: Infinity }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <div ref={endRef} />
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="rr-chatbot-composer-wrap">
                                <div className="rr-chatbot-composer">
                                    <input
                                        value={input}
                                        onChange={(event) => setInput(event.target.value)}
                                        placeholder="Ask about rooms..."
                                        className="min-h-[44px] flex-1 bg-transparent px-3 text-sm font-semibold outline-none placeholder:text-light-muted dark:placeholder:text-dark-muted"
                                    />
                                    <button
                                        type="submit"
                                        disabled={typing || !input.trim()}
                                        className="rr-chatbot-send"
                                        aria-label="Send message"
                                    >
                                        {typing ? <Loader2 className="animate-spin" /> : <Send />}
                                    </button>
                                </div>
                            </form>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

const MessageBubble = ({ message, closeDrawer }) => {
    const isUser = message.role === 'user';
    const hasRooms = message.rooms?.length > 0;
    const showAssistantAvatar = !isUser && !hasRooms;
    const displayContent = isUser ? message.content : sanitizeHelpCopy(message.content);
    return (
        <div className={`rr-message-row ${isUser ? 'is-user' : 'is-assistant'} ${hasRooms ? 'has-rich-content' : ''}`}>
            {showAssistantAvatar && (
                <span className="rr-message-avatar">
                    <MessageCircle />
                </span>
            )}
            <div className={`${isUser ? 'max-w-[82%] items-end' : hasRooms ? 'rr-message-rich min-w-0 flex-1' : 'min-w-0 flex-1 items-start'}`}>
                <div className={`rr-message-bubble ${isUser ? 'is-user' : 'is-assistant'}`}>
                    {displayContent}
                </div>
                {hasRooms && (
                    <div className="rr-chat-room-results mt-3 grid gap-3">
                        {message.rooms.map((room, index) => (
                            <ChatRoomCard
                                key={room._id}
                                room={room}
                                index={index}
                                sort={message.sort}
                                closeDrawer={closeDrawer}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ChatRoomCard = ({ room, index, sort, closeDrawer }) => {
    const amenities = getRoomAmenityLabels(room);
    const isTopPrice = index === 0 && sort === 'price_asc';
    const isHighestPrice = index === 0 && sort === 'price_desc';
    const isTopRated = index === 0 && sort === 'rating';
    const displayTitle = formatListingTitle(room?.title, '');
    const roomImage = getRoomImage(room);
    const roomLocation = getRoomLocation(room);
    const ratingLabel = getRoomRating(room);
    const capacityLabel = getRoomCapacityLabel(room);
    const isVerifiedRoom = Boolean(room?.verifications?.property || room?.verifications?.photos || room?.verifications?.amenities);

    if (!room?._id || !displayTitle || Number(room?.rent || 0) <= 0) return null;

    return (
        <Link
            to={`/room/${room._id}`}
            onClick={closeDrawer}
            className="rr-chat-room-card group block overflow-hidden rounded-[1.25rem] border border-light-border bg-light-card shadow-sm transition-colors hover:border-cyan-300 dark:border-dark-border dark:bg-dark-card dark:hover:border-cyan-700/60"
        >
            <div className="rr-chat-room-card-media relative aspect-[16/10] overflow-hidden bg-light-bg dark:bg-dark-input">
                {roomImage ? (
                    <>
                        <img
                            src={roomImage}
                            alt={displayTitle}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                            draggable="false"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/62 via-slate-950/8 to-transparent" />
                    </>
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-100 text-center text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400" aria-label="Photo pending">
                        <ImageOff className="h-7 w-7" />
                    </div>
                )}
                {isVerifiedRoom && (
                    <span className="absolute left-2 top-2 inline-flex max-w-[70%] items-center gap-1 rounded-full bg-white/92 px-2 py-1 text-[10px] font-black text-slate-900 shadow-sm" aria-label="Verified">
                        <ShieldCheck className="h-3.5 w-3.5 text-cyan-600" />
                    </span>
                )}
                {room?.location?.city && (
                    <span className="absolute bottom-2 left-2 inline-flex max-w-[75%] items-center gap-1 rounded-full bg-slate-950/68 px-2.5 py-1 text-[10px] font-black uppercase text-white">
                        <MapPin className="h-3 w-3 text-cyan-200" />
                        <span className="truncate">{room.location.city}</span>
                    </span>
                )}
                {ratingLabel && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/92 px-2 py-1 text-[10px] font-black text-slate-900 shadow-sm">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {ratingLabel}
                    </span>
                )}
            </div>

            <div className="rr-chat-room-card-body p-3">
                {(isTopPrice || isHighestPrice || isTopRated) && (
                    <span className="mb-2 inline-flex rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] font-black text-cyan-700 dark:text-cyan-300">
                        {isTopPrice ? 'Lowest price first' : isHighestPrice ? 'Highest price first' : 'Best rated first'}
                    </span>
                )}
                <h3 className="rr-line-clamp-2 min-w-0 text-sm font-black leading-tight text-light-text dark:text-dark-text">
                    {displayTitle}
                </h3>
                {roomLocation && (
                    <p className="mt-1.5 rr-line-clamp-2 text-[11px] font-semibold leading-snug text-light-muted dark:text-dark-muted">
                        {roomLocation}
                    </p>
                )}

                <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="min-w-0 text-[15px] font-black leading-none text-light-text dark:text-dark-text">
                        {money(room.rent)}
                        <span className="ml-1 text-[11px] font-semibold text-light-muted dark:text-dark-muted">/month</span>
                    </p>
                    <span className="flex-shrink-0 rounded-full bg-brand px-3 py-1.5 text-[11px] font-black text-white">
                        View details
                    </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {room.roomType && (
                        <span className="inline-flex min-w-0 items-start gap-1 rounded-full border border-light-border bg-light-bg px-2 py-1 text-[10px] font-bold leading-tight text-light-muted dark:border-dark-border dark:bg-dark-input dark:text-dark-muted">
                            <BedDouble className="mt-[1px] h-3.5 w-3.5 flex-shrink-0 text-cyan-600 dark:text-cyan-300" />
                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{room.roomType}</span>
                        </span>
                    )}
                    {capacityLabel && (
                        <span className="inline-flex min-w-0 items-start gap-1 rounded-full border border-light-border bg-light-bg px-2 py-1 text-[10px] font-bold leading-tight text-light-muted dark:border-dark-border dark:bg-dark-input dark:text-dark-muted">
                            <Users className="mt-[1px] h-3.5 w-3.5 flex-shrink-0 text-cyan-600 dark:text-cyan-300" />
                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{capacityLabel}</span>
                        </span>
                    )}
                    {amenities.map((amenity) => (
                        <span key={amenity} className="inline-flex min-w-0 items-start rounded-full border border-light-border bg-light-bg px-2 py-1 text-[10px] font-bold leading-tight text-light-muted dark:border-dark-border dark:bg-dark-input dark:text-dark-muted">
                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{amenity}</span>
                        </span>
                    ))}
                </div>
            </div>
        </Link>
    );
};

export default RoomRadarChatbot;
