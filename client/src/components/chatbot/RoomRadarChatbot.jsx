import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    BedDouble,
    Bot,
    CheckCircle2,
    Code2,
    GraduationCap,
    Lightbulb,
    Loader2,
    MapPin,
    MessageCircle,
    Send,
    ShieldCheck,
    Sparkles,
    Star,
    Target,
    Users,
    X
} from 'lucide-react';
import api from '../../api';
import fallbackRoomImage from '../../assets/background_img.jpg';
import { formatListingTitle } from '../../utils/listingDisplay';

const suggestions = [
    'Show rooms in Haridwar',
    'PG under 5000',
    'Flat for 2 people',
    'Show best rated rooms'
];

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const getRoomImage = (room) => room?.images?.[0]?.url || room?.images?.[0] || room?.imageUrl || fallbackRoomImage;

const getRoomLocation = (room) => {
    const raw = room?.location?.fullAddress || [room?.location?.city, room?.location?.state].filter(Boolean).join(', ') || 'Location available on details page';
    if (raw && room?.title && raw.trim().toLowerCase() === room.title.trim().toLowerCase()) {
        return [room?.location?.city, room?.location?.state].filter(Boolean).join(', ') || 'Location available on details page';
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
    return room?.roomType || 'Room';
};

const getRoomRating = (room) => {
    const rating = Number(room?.averageRating || 0);
    const reviews = Number(room?.numReviews || 0);
    if (rating > 0) return `${rating.toFixed(1)}${reviews ? ` (${reviews})` : ''}`;
    return 'New';
};

const detectLanguage = (text = '') => {
    if (/[\u0900-\u097F]/.test(text)) return 'hindi';
    const hinglishWords = ['kya', 'hai', 'h', 'nahi', 'mujhe', 'chahiye', 'batao', 'kaun', 'sasta', 'andar', 'liye', 'mein', 'bhai', 'yaar'];
    const lowerText = text.toLowerCase();
    const tokens = new Set(lowerText.match(/[a-z0-9]+/g) || []);
    return hinglishWords.some((word) => (word.includes(' ') ? lowerText.includes(word) : tokens.has(word))) ? 'hinglish' : 'english';
};

const isHinglish = (text = '') => detectLanguage(text) === 'hinglish';

const developerCredit = 'Rohit Kumar, Shubhanshu, Kamal Kumar, and Samrat Prajapati';

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
    rohit: `Rohit Kumar is the lead developer and creator behind RoomRadar. He is a final-year B.Tech CSE student at Gurukul Kangri Vishwavidyalaya, Haridwar, and is GATE qualified in both CSE and DA, including DA AIR 7275.`,
    shubhanshu: `Shubhanshu is a software engineer on the RoomRadar team. He qualified TCS NQT, cleared the interview, was selected for the TCS Digital role, and currently works at TCS. He practices DSA, enjoys LinkedIn brain games, and likes real-world coding problems.`,
    kamal: `Kamal Kumar is a software engineer on the RoomRadar team. He is multi-talented, loves coding, has strong interest in DSA, and is also an excellent cook. He follows new AI/ML inventions.`,
    samrat: `Samrat Prajapati is a teacher plus software engineer connected with the same college. He teaches students, works on software engineering in his free time, enjoys cricket, and practices DSA.`
};

const teamProfilesHindi = {
    rohit: 'रोहित कुमार RoomRadar के lead developer और creator हैं। वे Gurukul Kangri Vishwavidyalaya, Haridwar में B.Tech CSE final-year student हैं और GATE CSE तथा GATE DA qualified हैं।',
    shubhanshu: 'शुभांशु RoomRadar team के software engineer हैं। उन्होंने TCS NQT qualify किया, interview clear किया, TCS Digital role के लिए select हुए, और currently TCS में काम करते हैं।',
    kamal: 'कमल कुमार RoomRadar team के software engineer हैं। वे multi-talented हैं, coding पसंद करते हैं, DSA में strong interest रखते हैं, और cooking में भी अच्छे हैं।',
    samrat: 'सम्राट प्रजापति teacher plus software engineer profile वाले RoomRadar team member हैं। वे students को teach करते हैं और free time में software engineering पर काम करते हैं।'
};

const getTeamProfileReply = (profileKey, text = '') => {
    const language = detectLanguage(text);
    if (language === 'english') return teamProfilesEnglish[profileKey] || teamProfilesEnglish.rohit;
    if (language === 'hindi') return teamProfilesHindi[profileKey] || teamProfilesHindi.rohit;
    return teamProfiles[profileKey] || teamProfiles.rohit;
};

const teamProfileVisuals = {
    rohit: {
        eyebrow: "SARATHI'S INSIGHT",
        title: 'Rohit Kumar Sarathi',
        subtitle: 'Lead creator of RoomRadar',
        directAnswer: 'Rohit Kumar Sarathi RoomRadar ke lead creator hain. Woh Gurukul Kangri Vishwavidyalaya, Haridwar me B.Tech CSE final-year student hain.',
        chips: ['RoomRadar creator', 'GATE CSE qualified', 'GATE DA qualified', 'AIR 7275'],
        sections: [
            {
                icon: 'lightbulb',
                title: 'Core idea',
                body: 'Technology aur education ko connect karke complex topics ko simple, clear aur motivating banana.'
            },
            {
                icon: 'graduation',
                title: 'Education',
                body: 'B.Tech CSE final-year student, 2022-2026 batch, Gurukul Kangri Vishwavidyalaya, Haridwar.'
            },
            {
                icon: 'code',
                title: 'Tech focus',
                body: 'MERN Stack, TypeScript, Data Science, Cybersecurity, Cloud Computing, Python, C++, React Three Fiber aur AI/ML.'
            },
            {
                icon: 'sparkles',
                title: 'Major projects',
                body: 'RoomRadar, MockPanel, Study Hub, aur 3D Interactive Portfolio.'
            },
            {
                icon: 'target',
                title: 'Long-term goal',
                body: 'UPSC/UPPSC ke through SDM banna aur learning ko more accessible banana.'
            }
        ],
        takeaways: [
            'RoomRadar ke lead developer aur Sarathi ke creator.',
            'GATE CSE aur GATE DA qualified, including DA AIR 7275.',
            'AI/ML, MERN, TypeScript, Data Science aur Cybersecurity me strong interest.',
            'Vision: learning ko simple, accessible aur motivating banana.'
        ]
    }
};

const getTeamProfileVisual = (profileKey) => teamProfileVisuals[profileKey] || null;

const createDeveloperCreditReply = (text = '') => (
    detectLanguage(text) === 'hindi'
        ? `RoomRadar और इस AI assistant को ${developerCredit} ने बनाया है।`
        : isHinglish(text)
            ? `RoomRadar aur is AI assistant ko ${developerCredit} ne banaya hai. Rohit, Shubhanshu, Kamal aur Samrat is project ke developer team members hain.`
            : `RoomRadar and this AI assistant were built by ${developerCredit}. Rohit, Shubhanshu, Kamal, and Samrat are the developer team behind this project.`
);

const getTeamProfileKey = (text = '') => {
    if (/\brohit\b|\brk\b|sarathi|sārathi/i.test(text)) return 'rohit';
    if (/shubhanshu|subhanshu/i.test(text)) return 'shubhanshu';
    if (/\bkamal\b/i.test(text)) return 'kamal';
    if (/samrat|prajapati/i.test(text)) return 'samrat';
    return null;
};

const getDirectFallbackReply = (text = '') => {
    const lower = text.toLowerCase();
    if (/^(hi|hii|hello|hey|namaste|namaskar)\b/i.test(text.trim()) || /^\s*[\u0928][\u092e][\u0938]/.test(text)) {
        if (detectLanguage(text) === 'hindi') {
            return 'नमस्ते! मैं RoomRadar AI हूँ। City, budget या room type बताइए, मैं real listings search कर दूँगा।';
        }
        return isHinglish(text)
            ? 'Hi! Main RoomRadar AI hoon. City, budget ya room type bhejo, main real listings search kar dunga.'
            : 'Hi! I am RoomRadar AI. Tell me your city, budget, or room type and I will search real listings.';
    }
    const profileKey = getTeamProfileKey(text);
    if (profileKey) {
        return getTeamProfileReply(profileKey, text);
    }
    if (/(kisne|kisane|kaun banaya|developer|developed by|creator|founder|owner)/i.test(lower)
        && /(platform|roomradar|room radar|website|app|project|isako|isaka|iska|ye|yeh|tumko|tumhe|tujhe|aapko|assistant|chatbot|bot|ai)/i.test(lower)) {
        return createDeveloperCreditReply(text);
    }
    if (/(tum kaun|aap kaun|who are you|what are you)/i.test(lower)) {
        if (detectLanguage(text) === 'hindi') {
            return 'मैं RoomRadar AI assistant हूँ। मैं real rooms खोजने और booking flow में help करता हूँ।';
        }
        return isHinglish(text)
            ? 'Main RoomRadar AI assistant hoon. Main real rooms dhoondhne aur booking flow me help karta hoon.'
            : 'I am the RoomRadar AI assistant. I help you find real rooms and complete the booking flow.';
    }
    return '';
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
    if (/\bboys?|male|men|ladk/i.test(text)) filters.gender = 'Male';
    if (/\bgirls?|female|women|ladki/i.test(text)) filters.gender = 'Female';
    if (/(sabse sasta|sasta|cheapest|lowest|minimum|kam budget)/i.test(lower)) filters.sort = 'price_asc';
    if (/(sabse costly|sabse mehenga|mahanga|expensive|costliest|highest|premium|luxury)/i.test(lower)) filters.sort = 'price_desc';
    if (/(rating|rated|best rated|top rated|best room|best rooms|top room|top rooms|recommended|good room|good rooms|achha|accha)/i.test(lower)) filters.sort = 'rating';
    if (/(price\s*(wise|view|order)|price\s*(?:point\s*)?of\s*view|price\s*ke\s*(?:hisab|hisaab)|rent\s*wise|cost\s*wise|budget\s*wise|by price|according to price|low to high|lowest to highest|saste se|kam se)/i.test(lower)) filters.sort = 'price_asc';
    if (/(high to low|highest to lowest|price high|costly first|expensive first)/i.test(lower)) filters.sort = 'price_desc';

    return filters;
};

const searchRoomsLocally = async (text) => {
    const filters = extractLocalFilters(text);
    const params = new URLSearchParams({ limit: String(filters.limit || 5), sort: filters.sort || 'popular' });
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
    });
    const { data } = await api.get(`/rooms?${params.toString()}`);
    let rooms = data.data || data || [];
    if (filters.sort === 'price_asc') rooms = [...rooms].sort((a, b) => Number(a.rent || 0) - Number(b.rent || 0));
    if (filters.sort === 'price_desc') rooms = [...rooms].sort((a, b) => Number(b.rent || 0) - Number(a.rent || 0));
    return { rooms, filters };
};

const fallbackReply = (text, rooms) => {
    if (isHinglish(text)) {
        return rooms.length
            ? `AI provider response slow tha, isliye maine RoomRadar ke real database se ${rooms.length} matching room dhoondh diye. View Details se direct booking flow open hoga.`
            : 'AI provider slow tha aur exact room match nahi mila. City, budget ya room type thoda change karke bhejo, main real listings me dobara search karunga.';
    }
    return rooms.length
        ? `The AI provider was slow, so I searched the real RoomRadar database and found ${rooms.length} matching rooms.`
        : 'The AI provider was slow and no exact room match was found. Try another city, budget, or room type.';
};

const RoomRadarChatbot = () => {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [scrollTucked, setScrollTucked] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hi, I am RoomRadar AI. Tell me your city, budget, room type, and who will stay. I will search real listings for you.',
            rooms: [],
            localOnly: true
        }
    ]);
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

        const directProfileKey = getTeamProfileKey(trimmed);
        const directReply = getDirectFallbackReply(trimmed);
        if (directReply) {
            setMessages([
                ...outgoing,
                {
                    role: 'assistant',
                    content: directReply,
                    profileVisual: getTeamProfileVisual(directProfileKey),
                    rooms: [],
                    provider: 'browser-knowledge',
                    fallback: false
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
                    fallback: data.fallback
                }
            ]);
        } catch (error) {
            try {
                const { rooms } = await searchRoomsLocally(trimmed);
                setMessages((current) => [
                    ...current,
                    {
                        role: 'assistant',
                        content: fallbackReply(trimmed, rooms),
                        rooms,
                        sort: extractLocalFilters(trimmed).sort,
                        provider: 'browser-fallback',
                        fallback: true
                    }
                ]);
            } catch (fallbackError) {
                setMessages((current) => [
                    ...current,
                    {
                        role: 'assistant',
                        content: error.response?.data?.error || 'RoomRadar AI is reconnecting. Please try once more after refreshing the server.',
                        rooms: []
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
                aria-label="Open RoomRadar AI Assistant"
            >
                <span className="floating-chatbot-halo" />
                <span className="floating-chatbot-icon" aria-hidden="true">
                    <Bot />
                </span>
                <span className="floating-chatbot-copy">
                    <span>RoomRadar AI</span>
                    <strong>Ask AI</strong>
                </span>
                <span className="floating-chatbot-badge" aria-hidden="true">AI</span>
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
                                        <Bot />
                                    </span>
                                    <div>
                                        <p className="rr-chatbot-eyebrow">RoomRadar AI</p>
                                        <h2>AI room assistant</h2>
                                        <p className="rr-chatbot-status">
                                            <span />
                                            Real listing search
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rr-chatbot-close"
                                    aria-label="Close assistant"
                                >
                                    <X />
                                </button>
                            </header>

                            <div ref={scrollRef} className="rr-chatbot-scroll flex-1 overflow-y-auto px-4 py-5">
                                <div className="space-y-4">
                                    {messages.map((message, index) => (
                                        <MessageBubble key={`${message.role}-${index}`} message={message} closeDrawer={() => setOpen(false)} />
                                    ))}

                                    {messages.length === 1 && (
                                        <div className="rr-chatbot-empty">
                                            <div className="rr-chatbot-empty-card">
                                                <div className="rr-chatbot-empty-icon">
                                                    <MessageCircle />
                                                </div>
                                                <div>
                                                    <p>Smart room search</p>
                                                    <h3>Ask in Hindi, Hinglish, or English.</h3>
                                                    <span>City, budget, room type, gender, and people count can be understood together.</span>
                                                </div>
                                            </div>
                                            <p className="rr-chatbot-suggestion-title">Try one</p>
                                            {suggestions.map((suggestion) => (
                                                <button
                                                    key={suggestion}
                                                    type="button"
                                                    onClick={() => sendMessage(suggestion)}
                                                    className="rr-chatbot-suggestion"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
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
                                        placeholder="Type city, budget, or requirement..."
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

    return (
        <div className={`rr-message-row ${isUser ? 'is-user' : 'is-assistant'}`}>
            {!isUser && (
                <span className="rr-message-avatar">
                    <Bot />
                </span>
            )}
            <div className={`${isUser ? 'max-w-[82%] items-end' : 'min-w-0 flex-1 items-start'}`}>
                {message.profileVisual ? (
                    <ProfileInsightCard visual={message.profileVisual} />
                ) : (
                    <div className={`rr-message-bubble ${isUser ? 'is-user' : 'is-assistant'}`}>
                        {message.content}
                    </div>
                )}
                {message.rooms?.length > 0 && (
                    <div className="mt-3 grid gap-3">
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

const insightIcons = {
    lightbulb: Lightbulb,
    graduation: GraduationCap,
    code: Code2,
    sparkles: Sparkles,
    target: Target
};

const ProfileInsightCard = ({ visual }) => (
    <article className="rr-profile-insight-card">
        <div className="rr-profile-insight-hero">
            <span className="rr-profile-ai-mark">
                <Bot />
            </span>
            <div className="min-w-0">
                <p>{visual.eyebrow}</p>
                <h3>{visual.title}</h3>
                <span>{visual.subtitle}</span>
            </div>
        </div>

        <p className="rr-profile-direct-answer">{visual.directAnswer}</p>

        <div className="rr-profile-chip-grid">
            {visual.chips.map((chip) => (
                <span key={chip}>
                    <CheckCircle2 />
                    {chip}
                </span>
            ))}
        </div>

        <div className="rr-profile-section-grid">
            {visual.sections.map((section) => {
                const Icon = insightIcons[section.icon] || Sparkles;
                return (
                    <section key={section.title} className="rr-profile-section">
                        <span>
                            <Icon />
                        </span>
                        <div>
                            <h4>{section.title}</h4>
                            <p>{section.body}</p>
                        </div>
                    </section>
                );
            })}
        </div>

        <section className="rr-profile-takeaways">
            <h4>Key takeaways</h4>
            <ul>
                {visual.takeaways.map((item) => (
                    <li key={item}>
                        <CheckCircle2 />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </section>
    </article>
);

const ChatRoomCard = ({ room, index, sort, closeDrawer }) => {
    const amenities = getRoomAmenityLabels(room);
    const isTopPrice = index === 0 && sort === 'price_asc';
    const isTopRated = index === 0 && sort === 'rating';
    const displayTitle = formatListingTitle(room?.title, 'Room listing');

    return (
        <Link
            to={`/room/${room._id}`}
            onClick={closeDrawer}
            className="rr-chat-room-card group block overflow-hidden rounded-[1.1rem] border border-light-border bg-light-card shadow-sm transition-colors hover:border-cyan-300 dark:border-dark-border dark:bg-dark-card dark:hover:border-cyan-700/60"
        >
            <div className="rr-chat-room-card-media relative aspect-[4/3] overflow-hidden bg-light-bg dark:bg-dark-input">
                <img
                    src={getRoomImage(room)}
                    alt={displayTitle}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/62 via-slate-950/8 to-transparent" />
                <span className="absolute left-2 top-2 inline-flex max-w-[70%] items-center gap-1 rounded-full bg-white/92 px-2 py-1 text-[10px] font-black text-slate-900 shadow-sm">
                    <ShieldCheck className="h-3.5 w-3.5 text-cyan-600" />
                    Verified
                </span>
                <span className="absolute bottom-2 left-2 inline-flex max-w-[75%] items-center gap-1 rounded-full bg-slate-950/68 px-2.5 py-1 text-[10px] font-black uppercase text-white">
                    <MapPin className="h-3 w-3 text-cyan-200" />
                    <span className="truncate">{room?.location?.city || 'Location'}</span>
                </span>
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/92 px-2 py-1 text-[10px] font-black text-slate-900 shadow-sm">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {getRoomRating(room)}
                </span>
            </div>

            <div className="rr-chat-room-card-body p-3">
                {(isTopPrice || isTopRated) && (
                    <span className="mb-2 inline-flex rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] font-black text-cyan-700 dark:text-cyan-300">
                        {isTopPrice ? 'Lowest price first' : 'Best rated first'}
                    </span>
                )}
                <h3 className="rr-line-clamp-2 min-w-0 text-sm font-black leading-tight text-light-text dark:text-dark-text">
                    {displayTitle}
                </h3>
                <p className="mt-1.5 rr-line-clamp-2 text-[11px] font-semibold leading-snug text-light-muted dark:text-dark-muted">
                    {getRoomLocation(room)}
                </p>

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
                    <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-light-border bg-light-bg px-2 py-1 text-[10px] font-bold text-light-muted dark:border-dark-border dark:bg-dark-input dark:text-dark-muted">
                        <BedDouble className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
                        <span className="truncate">{room.roomType || 'Room'}</span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-light-border bg-light-bg px-2 py-1 text-[10px] font-bold text-light-muted dark:border-dark-border dark:bg-dark-input dark:text-dark-muted">
                        <Users className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
                        <span className="truncate">{getRoomCapacityLabel(room)}</span>
                    </span>
                    {amenities.map((amenity) => (
                        <span key={amenity} className="inline-flex min-w-0 items-center rounded-full border border-light-border bg-light-bg px-2 py-1 text-[10px] font-bold text-light-muted dark:border-dark-border dark:bg-dark-input dark:text-dark-muted">
                            <span className="truncate">{amenity}</span>
                        </span>
                    ))}
                </div>
            </div>
        </Link>
    );
};

export default RoomRadarChatbot;
