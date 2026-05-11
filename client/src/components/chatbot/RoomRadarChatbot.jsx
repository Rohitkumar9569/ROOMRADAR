import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, ChevronRight, Loader2, MessageCircle, Send, X } from 'lucide-react';
import api from '../../api';
import fallbackRoomImage from '../../assets/background_img.jpg';

const suggestions = [
    'Haridwar mein room chahiye',
    '5000 ke andar PG batao',
    '2 logo ke liye flat',
    'Sabse sasta room'
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

const detectLanguage = (text = '') => {
    if (/[\u0900-\u097F]/.test(text)) return 'hindi';
    const hinglishWords = ['kya', 'hai', 'h', 'nahi', 'mujhe', 'chahiye', 'batao', 'kaun', 'sasta', 'andar', 'liye', 'mein', 'bhai', 'yaar'];
    const lowerText = text.toLowerCase();
    return hinglishWords.some((word) => lowerText.includes(word)) ? 'hinglish' : 'english';
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
    const priceMatch = lower.match(/(?:under|below|upto|up to|within|budget|andar|kam)\D{0,12}(\d{3,7})/i)
        || lower.match(/(\d{3,7})\s*(?:ke andar|se kam|tak|budget|under|below)/i);
    const occupantsMatch = lower.match(/(\d{1,2})\s*(?:log|logo|people|persons|occupants|students|members)/i)
        || lower.match(/(?:for|ke liye)\s*(\d{1,2})/i);

    if (city) filters.city = city;
    if (priceMatch) filters.maxRent = priceMatch[1];
    if (occupantsMatch) filters.beds = occupantsMatch[1];
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

    return filters;
};

const searchRoomsLocally = async (text) => {
    const filters = extractLocalFilters(text);
    const params = new URLSearchParams({ limit: '5', sort: filters.sort || 'popular' });
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

    useEffect(() => {
        if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing, open]);

    const sendMessage = async (text = input) => {
        const trimmed = text.trim();
        if (!trimmed || typing) return;

        const userMessage = { role: 'user', content: trimmed, rooms: [] };
        const outgoing = [...messages, userMessage];
        setMessages(outgoing);
        setInput('');

        const directReply = getDirectFallbackReply(trimmed);
        if (directReply) {
            setMessages([
                ...outgoing,
                {
                    role: 'assistant',
                    content: directReply,
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
            const nextTucked = mobileQuery.matches && window.scrollY > (isHomeRoute ? 72 : 24);
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
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className={`floating-chatbot ${isHomeRoute ? 'is-home-route' : ''} ${scrollTucked ? 'is-scroll-tucked' : ''}`}
                aria-label="Open RoomRadar AI Assistant"
            >
                <span className="floating-chatbot-halo" />
                <MessageCircle className="relative" />
            </motion.button>

            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-[10002] bg-slate-950/25 backdrop-blur-sm"
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
                            className="fixed inset-y-0 right-0 z-[10003] flex w-full flex-col overflow-hidden border-l border-light-border bg-light-card text-light-text shadow-2xl dark:border-dark-border dark:bg-dark-sidebar dark:text-dark-text md:right-4 md:top-4 md:h-[calc(100vh-2rem)] md:w-[380px] md:rounded-3xl md:border"
                        >
                            <header className="flex min-h-[76px] items-center justify-between bg-gradient-to-r from-cyan-500 to-cyan-700 px-5 text-white">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white">
                                        <Bot className="h-6 w-6" />
                                    </span>
                                    <div>
                                        <h2 className="text-base font-semibold">RoomRadar AI</h2>
                                        <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-50">
                                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                            Online
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
                                    aria-label="Close assistant"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto px-4 py-5">
                                <div className="space-y-4">
                                    {messages.map((message, index) => (
                                        <MessageBubble key={`${message.role}-${index}`} message={message} closeDrawer={() => setOpen(false)} />
                                    ))}

                                    {messages.length === 1 && (
                                        <div className="space-y-2">
                                            {suggestions.map((suggestion) => (
                                                <button
                                                    key={suggestion}
                                                    type="button"
                                                    onClick={() => sendMessage(suggestion)}
                                                    className="block w-full rounded-2xl border border-light-border bg-light-bg px-4 py-3 text-left text-sm font-semibold transition hover:border-cyan-400 hover:text-cyan-700 dark:border-dark-border dark:bg-dark-input dark:hover:text-cyan-300"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {typing && (
                                        <div className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-sm bg-light-bg px-4 py-3 shadow-sm dark:bg-dark-input">
                                            {[0, 1, 2].map((dot) => (
                                                <motion.span
                                                    key={dot}
                                                    className="h-2 w-2 rounded-full bg-cyan-500"
                                                    animate={{ y: [0, -6, 0] }}
                                                    transition={{ duration: 0.6, delay: dot * 0.15, repeat: Infinity }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <div ref={endRef} />
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="border-t border-light-border p-4 dark:border-dark-border">
                                <div className="flex items-center gap-2 rounded-2xl border border-light-border bg-light-bg p-2 dark:border-dark-border dark:bg-dark-input">
                                    <input
                                        value={input}
                                        onChange={(event) => setInput(event.target.value)}
                                        placeholder="Type city, budget, or requirement..."
                                        className="min-h-[44px] flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-light-muted dark:placeholder:text-dark-muted"
                                    />
                                    <button
                                        type="submit"
                                        disabled={typing || !input.trim()}
                                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500 text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                                        aria-label="Send message"
                                    >
                                        {typing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
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
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`whitespace-pre-wrap break-words rounded-3xl px-4 py-3 text-sm leading-6 [overflow-wrap:anywhere] [word-break:break-word] ${isUser ? 'bg-cyan-600 text-white' : 'bg-light-bg text-light-text dark:bg-dark-input dark:text-dark-text'}`}>
                    {message.content}
                </div>
                {message.rooms?.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {message.rooms.map((room, index) => (
                            <Link
                                key={room._id}
                                to={`/room/${room._id}`}
                                onClick={closeDrawer}
                                className="block overflow-hidden rounded-xl border border-light-border bg-light-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-dark-border dark:bg-dark-card"
                            >
                                <div className="flex gap-3 p-3">
                                    <div className="h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-light-bg dark:bg-dark-input">
                                        <img src={getRoomImage(room)} alt={room.title} className="h-full w-full object-cover" loading="lazy" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        {index === 0 && message.sort === 'price_asc' && (
                                            <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                Sabse Sasta
                                            </span>
                                        )}
                                        <h3 className="mt-1 truncate text-sm font-black text-light-text dark:text-dark-text">{room.title}</h3>
                                        <p className="mt-0.5 truncate text-xs font-medium text-light-muted dark:text-dark-muted">{getRoomLocation(room)}</p>
                                        <p className="mt-1 text-sm font-black text-cyan-600 dark:text-cyan-300">
                                            {money(room.rent)}
                                            <span className="text-xs font-medium text-light-muted dark:text-dark-muted"> /mo</span>
                                        </p>
                                    </div>

                                    <ChevronRight className="h-4 w-4 flex-shrink-0 self-center text-light-muted dark:text-dark-muted" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomRadarChatbot;
