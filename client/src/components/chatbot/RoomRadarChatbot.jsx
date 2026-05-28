import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    BedDouble,
    Bot,
    CheckCircle2,
    Code2,
    GraduationCap,
    ImageOff,
    Lightbulb,
    Loader2,
    MapPin,
    Send,
    ShieldCheck,
    Sparkles,
    Star,
    Target,
    Users,
    X
} from 'lucide-react';
import api from '../../api';
import { formatListingTitle } from '../../utils/listingDisplay';

const suggestions = [
    { label: 'Rooms in Haridwar', Icon: MapPin },
    { label: 'Booking steps', Icon: CheckCircle2 },
    { label: 'RoomRadar tools', Icon: Sparkles },
    { label: 'Top rated rooms', Icon: Star }
];

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

const teamProfiles = {
    rohit: `ROOMRADAR INSIGHT (The Direct Answer)
Rohit Kumar RoomRadar ke lead creator hain. Woh Gurukul Kangri Vishwavidyalaya, Haridwar me B.Tech CSE final-year student hain.

The Core Idea
Rohit ka focus technology aur education ko connect karna hai, taaki complex topics simple, clear aur motivating tareeke se samjhaye ja sakein.

Detailed Profile
Rohit Kumar 2022-2026 batch ke B.Tech CSE student hain. Woh GATE CSE aur GATE DA qualified hain, including DA AIR 7275. Unka focus MERN Stack, TypeScript, Data Science, Cybersecurity, Cloud Computing, Python, C++, React Three Fiber aur AI/ML par hai.

Major projects: RoomRadar, MockPanel, Study Hub, aur 3D Interactive Portfolio. Long-term goal: government job ki direction me grow karna. Rohit daily AI/ML discoveries explore karna pasand karte hain.

Key Takeaways
- Rohit Kumar RoomRadar ke lead developer aur creator hain.
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

const researchedTeamProfiles = {
    hinglish: {
        rohit: `Research Snapshot: Rohit Kumar

Direct answer: Rohit Kumar RoomRadar ke lead creator aur AI assistant ke core builder hain. Woh Gurukul Kangri Vishwavidyalaya, Haridwar me B.Tech CSE final-year student hain.

Profile research: Rohit GATE CSE aur GATE DA qualified hain, including DA AIR 7275. Unka engineering focus MERN Stack, TypeScript, Data Science, Cybersecurity, Cloud Computing, Python, C++, React Three Fiber aur AI/ML par hai.

RoomRadar contribution: Rohit product vision, architecture, AI assistant behavior, room discovery flow, aur premium user experience ko drive karte hain.

Key takeaways:
- Lead developer aur creator of RoomRadar.
- GATE CSE + GATE DA qualified.
- AI/ML, MERN, TypeScript, Data Science aur Cybersecurity me strong interest.
- Vision: learning aur technology ko simple, useful aur accessible banana.`,
        shubhanshu: `Research Snapshot: Shubhanshu

Direct answer: Shubhanshu RoomRadar team ke software engineer hain. Unhone TCS NQT qualify kiya, interview clear kiya, TCS Digital role ke liye select hue, aur currently TCS me kaam karte hain.

Professional signal: TCS NQT se TCS Digital tak ka journey unki preparation, interview clarity, aur industry-ready engineering mindset ko show karta hai.

Engineering personality: Shubhanshu DSA practice karte hain, LinkedIn brain games enjoy karte hain, aur real-world coding problems solve karna pasand karte hain. Unka style practical problem solving, logic building, aur clean thinking par based hai.

RoomRadar contribution: RoomRadar me Shubhanshu platform ko practical, reliable aur premium engineering direction dene me important role play karte hain.

Key takeaways:
- Software engineer on the RoomRadar team.
- TCS NQT qualified and selected for TCS Digital.
- Currently works at TCS.
- DSA, LinkedIn brain games, and real-world coding problems me strong interest.`,
        kamal: `Research Snapshot: Kamal Kumar

Direct answer: Kamal Kumar RoomRadar team ke software engineer hain. Woh multi-talented hain, coding unki favorite skill hai, DSA me strong interest rakhte hain, aur cooking me bhi achhe hain.

Engineering personality: Kamal ka profile balanced builder wala hai: problem solving, implementation energy, learning curiosity, aur creative discipline.

Interests: Woh books/novels padhna pasand karte hain aur naye AI/ML inventions explore karte rehte hain.

RoomRadar contribution: Kamal product quality, feature implementation, debugging mindset, aur practical coding energy add karte hain.

Key takeaways:
- Software engineer on the RoomRadar team.
- Coding aur DSA me strong interest.
- Multi-talented: engineering plus cooking.
- AI/ML discoveries aur books/novels me curiosity.`,
        samrat: `Research Snapshot: Samrat Prajapati

Direct answer: Samrat Prajapati RoomRadar team ke teacher plus software engineer profile wale member hain. Woh same college se connected hain, students ko teach karte hain, aur free time me software engineering/coding par kaam karte hain.

Professional personality: Samrat teaching mindset aur engineering discipline ka mix le kar aate hain. Isliye unka thinking style explanation, patience, aur structured problem solving par focused hai.

Interests: Samrat cricket dekhna pasand karte hain, DSA practice karte hain, books/novels padhte hain, aur AI/ML ke naye ideas follow karte hain.

RoomRadar contribution: RoomRadar me Samrat learning-oriented perspective, clarity, and disciplined engineering thinking add karte hain.

Key takeaways:
- Teacher plus software engineer profile.
- Students ko teach karte hain.
- DSA, cricket, reading, and AI/ML ideas me interest.
- Team me teaching mindset aur engineering discipline add karte hain.`
    },
    english: {
        rohit: `Research Snapshot: Rohit Kumar

Direct answer: Rohit Kumar is the lead creator of RoomRadar and the core builder behind its AI assistant. He is a final-year B.Tech CSE student at Gurukul Kangri Vishwavidyalaya, Haridwar.

Profile research: Rohit is GATE qualified in CSE and DA, including DA AIR 7275. His technical focus includes MERN Stack, TypeScript, Data Science, Cybersecurity, Cloud Computing, Python, C++, React Three Fiber, and AI/ML.

RoomRadar contribution: Rohit drives product vision, architecture, AI assistant behavior, room discovery flow, and the premium user experience.

Key takeaways:
- Lead developer and creator of RoomRadar.
- GATE CSE and GATE DA qualified.
- Strong interest in AI/ML, MERN, TypeScript, Data Science, and Cybersecurity.
- Vision: make technology and learning simple, useful, and accessible.`,
        shubhanshu: `Research Snapshot: Shubhanshu

Direct answer: Shubhanshu is a software engineer on the RoomRadar team. He qualified TCS NQT, cleared the interview, was selected for the TCS Digital role, and currently works at TCS.

Professional signal: His path from TCS NQT to TCS Digital shows preparation, interview clarity, and an industry-ready engineering mindset.

Engineering personality: Shubhanshu practices DSA, enjoys LinkedIn brain games, and likes real-world coding problems. His style is practical, logic-driven, and focused on clean problem solving.

RoomRadar contribution: At RoomRadar, Shubhanshu adds practical engineering direction, reliability, and premium problem-solving energy.

Key takeaways:
- Software engineer on the RoomRadar team.
- TCS NQT qualified and selected for TCS Digital.
- Currently works at TCS.
- Strong interest in DSA, LinkedIn brain games, and real-world coding problems.`,
        kamal: `Research Snapshot: Kamal Kumar

Direct answer: Kamal Kumar is a software engineer on the RoomRadar team. He is multi-talented, loves coding, has strong interest in DSA, and is also an excellent cook.

Engineering personality: Kamal brings a balanced builder mindset: problem solving, implementation energy, learning curiosity, and creative discipline.

Interests: He reads books and novels and keeps exploring new AI/ML inventions.

RoomRadar contribution: Kamal adds product quality, feature implementation, debugging mindset, and practical coding energy.

Key takeaways:
- Software engineer on the RoomRadar team.
- Strong interest in coding and DSA.
- Multi-talented: engineering plus cooking.
- Curious about AI/ML discoveries and books/novels.`,
        samrat: `Research Snapshot: Samrat Prajapati

Direct answer: Samrat Prajapati is a teacher plus software engineer profile on the RoomRadar team. He is connected with the same college, teaches students, and works on software engineering/coding in his free time.

Professional personality: Samrat brings a mix of teaching mindset and engineering discipline, so his thinking style is focused on explanation, patience, and structured problem solving.

Interests: He enjoys cricket, practices DSA, reads books and novels, and follows new AI/ML ideas.

RoomRadar contribution: Samrat adds a learning-oriented perspective, clarity, and disciplined engineering thinking to RoomRadar.

Key takeaways:
- Teacher plus software engineer profile.
- Teaches students.
- Interested in DSA, cricket, reading, and AI/ML ideas.
- Adds teaching mindset and engineering discipline to the team.`
    }
};

const wantsDetailedTeamProfile = (text = '') => (
    /(detail|details|detailed|research|researched|deep|full|bio|profile|about|journey|background|complete|premium|proper|pura|poora|baare\s+me|bare\s+me|jankari|jaankari|kisi bhi team member)/i.test(text)
);

const isKamalCookingQuestion = (profileKey, text = '') => (
    profileKey === 'kamal'
    && /(food|cook|cooking|khana|khaana|banata|banate|banati|banane|chef|recipe|dish)/i.test(text)
);

const createKamalCookingReply = (text = '') => (
    detectLanguage(text) === 'english'
        ? `Yes. Kamal Kumar is known on the RoomRadar team as a multi-talented software engineer who is also excellent at cooking.

Premium profile note: coding is his favorite skill, he has strong interest in DSA, reads books and novels, and keeps exploring new AI/ML inventions. That mix of engineering focus plus creative cooking energy makes his RoomRadar contribution feel practical, curious, and quality-driven.`
        : `Haan, Kamal Kumar food/cooking me kaafi achhe hain. RoomRadar team me unka profile sirf software engineer tak limited nahi hai; woh multi-talented builder hain.

Premium profile note: coding unki favorite skill hai, DSA me strong interest rakhte hain, books/novels padhna pasand karte hain, aur naye AI/ML inventions explore karte rehte hain. Team me woh product quality, problem solving aur implementation energy add karte hain.`
);

const getTeamProfileReply = (profileKey, text = '') => {
    const language = detectLanguage(text);
    if (isKamalCookingQuestion(profileKey, text)) return createKamalCookingReply(text);
    const researchedProfiles = language === 'english' ? researchedTeamProfiles.english : researchedTeamProfiles.hinglish;
    if (researchedProfiles[profileKey]) return researchedProfiles[profileKey];
    if (language === 'english') return teamProfilesEnglish[profileKey] || teamProfilesEnglish.rohit;
    if (language === 'hindi') return teamProfilesHindi[profileKey] || teamProfilesHindi.rohit;
    return teamProfiles[profileKey] || teamProfiles.rohit;
};

const teamProfileVisuals = {
    rohit: {
        eyebrow: 'ROOMRADAR INSIGHT',
        title: 'Rohit Kumar',
        subtitle: 'Lead creator of RoomRadar',
        directAnswer: 'Rohit Kumar RoomRadar ke lead creator hain. Woh Gurukul Kangri Vishwavidyalaya, Haridwar me B.Tech CSE final-year student hain.',
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
                body: 'Government job ki direction me grow karna aur learning ko more accessible banana.'
            }
        ],
        takeaways: [
            'RoomRadar ke lead developer aur creator.',
            'GATE CSE aur GATE DA qualified, including DA AIR 7275.',
            'AI/ML, MERN, TypeScript, Data Science aur Cybersecurity me strong interest.',
            'Vision: learning ko simple, accessible aur motivating banana.'
        ]
    },
    shubhanshu: {
        eyebrow: 'TEAM RESEARCH BRIEF',
        title: 'Shubhanshu',
        subtitle: 'Software engineer at RoomRadar',
        directAnswer: 'Shubhanshu RoomRadar team ke software engineer hain. Unhone TCS NQT qualify kiya, interview clear kiya, TCS Digital role ke liye select hue, aur currently TCS me kaam karte hain.',
        chips: ['TCS Digital', 'NQT qualified', 'DSA practice', 'Brain games'],
        sections: [
            {
                icon: 'graduation',
                title: 'Career signal',
                body: 'TCS NQT qualify karna, interview clear karna, aur TCS Digital role ke liye select hona unki preparation aur industry readiness show karta hai.'
            },
            {
                icon: 'code',
                title: 'Engineering style',
                body: 'DSA practice, LinkedIn brain games, logic building, aur real-world coding problems par strong focus.'
            },
            {
                icon: 'sparkles',
                title: 'RoomRadar role',
                body: 'Platform ko practical, reliable aur premium engineering direction dene me important contribution.'
            }
        ],
        takeaways: [
            'RoomRadar team ke software engineer.',
            'TCS NQT qualified and selected for TCS Digital.',
            'Currently TCS me kaam karte hain.',
            'DSA, LinkedIn brain games aur real-world coding problems pasand hain.'
        ]
    },
    kamal: {
        eyebrow: 'TEAM RESEARCH BRIEF',
        title: 'Kamal Kumar',
        subtitle: 'Software engineer at RoomRadar',
        directAnswer: 'Kamal Kumar RoomRadar team ke software engineer hain. Woh multi-talented builder hain: coding unki favorite skill hai, DSA me strong interest rakhte hain, aur food/cooking me bhi kaafi achhe hain.',
        chips: ['Coding lover', 'DSA focused', 'Cooking skill', 'AI/ML curious'],
        sections: [
            {
                icon: 'code',
                title: 'Engineering style',
                body: 'Problem solving, feature implementation, debugging mindset, aur practical coding energy.'
            },
            {
                icon: 'lightbulb',
                title: 'Creative side',
                body: 'Cooking me achhe hain, books/novels padhna pasand karte hain, aur naye AI/ML inventions explore karte rehte hain.'
            },
            {
                icon: 'sparkles',
                title: 'RoomRadar role',
                body: 'Product quality aur implementation energy add karte hain.'
            }
        ],
        takeaways: [
            'RoomRadar team ke software engineer.',
            'Coding aur DSA me strong interest.',
            'AI/ML discoveries aur books/novels me curiosity.',
            'Engineering ke saath cooking me bhi strong creative side.'
        ]
    },
    samrat: {
        eyebrow: 'TEAM RESEARCH BRIEF',
        title: 'Samrat Prajapati',
        subtitle: 'Teacher plus software engineer profile',
        directAnswer: 'Samrat Prajapati RoomRadar team ke teacher plus software engineer profile wale member hain. Woh students ko teach karte hain aur free time me software engineering/coding par kaam karte hain.',
        chips: ['Teacher mindset', 'Software engineering', 'DSA practice', 'Cricket lover'],
        sections: [
            {
                icon: 'graduation',
                title: 'Teaching side',
                body: 'Students ko teach karte hain, isliye explanation, patience aur structured thinking unki strength hai.'
            },
            {
                icon: 'code',
                title: 'Engineering side',
                body: 'Free time me software engineering, coding aur DSA practice par kaam karte hain.'
            },
            {
                icon: 'sparkles',
                title: 'RoomRadar role',
                body: 'Team me teaching clarity, disciplined thinking aur learning-oriented perspective add karte hain.'
            }
        ],
        takeaways: [
            'Teacher plus software engineer profile.',
            'Students ko teach karte hain.',
            'DSA, cricket, reading aur AI/ML ideas me interest.',
            'RoomRadar me teaching mindset aur engineering discipline add karte hain.'
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
    if (/\brohit\b|\brk\b/i.test(text)) return 'rohit';
    if (/shubhanshu|subhanshu/i.test(text)) return 'shubhanshu';
    if (/\bkamal\b/i.test(text)) return 'kamal';
    if (/samrat|prajapati/i.test(text)) return 'samrat';
    return null;
};

const isTeamOverviewQuestion = (text = '') => {
    const lower = text.toLowerCase();
    return /(team|team member|team members|developer team|developers|founders|creators|sabhi member|sare member|roomradar team)/i.test(lower)
        && /(kaun|who|about|baare|bare|detail|details|research|profile|bio|batao|bataye|members?)/i.test(lower);
};

const createTeamOverviewReply = (text = '') => {
    const detailed = wantsDetailedTeamProfile(text);
    if (detectLanguage(text) === 'english') {
        return detailed
            ? `RoomRadar team research brief:

1. Rohit Kumar - Lead creator of RoomRadar. GATE CSE and GATE DA qualified, with strong focus on MERN Stack, TypeScript, Data Science, Cybersecurity, Cloud, Python, C++, React Three Fiber, and AI/ML.
2. Shubhanshu - Software engineer on the RoomRadar team. TCS NQT qualified, cleared the interview, selected for TCS Digital, and currently works at TCS. He practices DSA, enjoys LinkedIn brain games, and likes real-world coding problems.
3. Kamal Kumar - Software engineer, multi-talented builder, coding lover, DSA-focused, curious about AI/ML inventions, and also excellent at cooking.
4. Samrat Prajapati - Teacher plus software engineer profile. He teaches students, practices DSA, enjoys cricket, reads books/novels, and follows AI/ML ideas.

Together, they bring product vision, industry engineering, implementation energy, teaching clarity, and AI curiosity to RoomRadar.`
            : 'RoomRadar was built by Rohit Kumar, Shubhanshu, Kamal Kumar, and Samrat Prajapati. Ask any name for a detailed profile.';
    }

    return detailed
        ? `RoomRadar team ka research-style brief:

1. Rohit Kumar - RoomRadar ke lead creator. GATE CSE aur GATE DA qualified, MERN, TypeScript, Data Science, Cybersecurity, Cloud, Python, C++, React Three Fiber aur AI/ML me strong focus.
2. Shubhanshu - RoomRadar team ke software engineer. TCS NQT qualify kiya, interview clear kiya, TCS Digital role ke liye select hue, aur currently TCS me kaam karte hain. DSA, LinkedIn brain games aur real-world coding problems pasand hain.
3. Kamal Kumar - Software engineer, multi-talented builder, coding lover, DSA focused, AI/ML inventions explore karte hain, aur cooking me bhi achhe hain.
4. Samrat Prajapati - Teacher plus software engineer profile. Students ko teach karte hain, DSA practice karte hain, cricket pasand karte hain, books/novels padhte hain, aur AI/ML ideas follow karte hain.

Together, team RoomRadar me product vision, industry engineering, implementation energy, teaching clarity aur AI curiosity add karti hai.`
        : 'RoomRadar team me Rohit Kumar, Shubhanshu, Kamal Kumar aur Samrat Prajapati hain. Kisi bhi naam ke saath "details me batao" likho, main premium profile brief de dunga.';
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
    if (isTeamOverviewQuestion(text)) {
        return createTeamOverviewReply(text);
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
            ? `AI provider response slow tha, isliye maine RoomRadar ke real database se ${rooms.length} matching room dhoondh diye.${sortNote} View Details se direct booking flow open hoga.`
            : 'AI provider slow tha aur exact room match nahi mila. City, budget ya room type thoda change karke bhejo, main real listings me dobara search karunga.';
    }
    const englishSortNote = filters.sort === 'price_asc'
        ? ' Results are ordered from low price to high.'
        : filters.sort === 'price_desc'
            ? ' Results are ordered from high price to low.'
            : filters.sort === 'rating'
                ? ' Best rated options are shown first.'
                : '';
    return rooms.length
        ? `The AI provider was slow, so I searched the real RoomRadar database and found ${rooms.length} matching rooms.${englishSortNote}`
        : 'The AI provider was slow and no exact room match was found. Try another city, budget, or room type.';
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
        return 'RoomRadar me room search, booking requests, landlord listings, real-time chat, wishlist, reviews, notifications, support tickets, verification, admin moderation, insights aur AI assistance available hai.';
    }
    if (/(tech stack|technology|mern|react|node|express|mongodb|socket|cloudinary|jwt|api|database)/i.test(lower)) {
        return 'RoomRadar MERN stack par based hai: React + Vite frontend, Node/Express backend, MongoDB/Mongoose database, JWT auth, Socket.IO chat, aur Multer/Cloudinary uploads.';
    }
    if (/(book|booking|request|confirm|kaise)/i.test(lower)) {
        return 'Room book karne ke liye room details open karo, Request to Book submit karo, stay details fill karo, phir landlord approval ke baad confirmation complete hota hai.';
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

        const directProfileKey = getTeamProfileKey(trimmed);
        const directReply = getDirectFallbackReply(trimmed);
        if (directReply) {
            const directMeta = createClientAnalysis(trimmed, directProfileKey ? 'Team profile' : 'Answer only', []);
            setMessages([
                ...outgoing,
                {
                    role: 'assistant',
                    content: directReply,
                    profileVisual: getTeamProfileVisual(directProfileKey),
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
                        content: error.response?.data?.error || 'RoomRadar AI is reconnecting. Please try once more after refreshing the server.',
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
                aria-label="Open RoomRadar AI Assistant"
            >
                <span className="floating-chatbot-halo" />
                <span className="floating-chatbot-icon" aria-hidden="true">
                    <Bot />
                </span>
                <span className="floating-chatbot-copy">
                    <span>Smart help</span>
                    <strong>Ask</strong>
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
                                        <h2>RoomRadar AI</h2>
                                        <p className="rr-chatbot-status">
                                            <span />
                                            Intent aware
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

                                    {messages.length === 0 && (
                                        <div className="rr-chatbot-empty">
                                            <div className="rr-chatbot-empty-card" aria-label="Room search assistant">
                                                <span className="rr-chatbot-empty-icon">
                                                    <Sparkles />
                                                </span>
                                                <div>
                                                    <h3>Ask smarter</h3>
                                                    <span>Rooms, booking, project, support.</span>
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
                                        placeholder="Ask about rooms or RoomRadar..."
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
    const hasProfileVisual = Boolean(message.profileVisual);
    const showAssistantAvatar = !isUser && !hasRooms && !hasProfileVisual;
    const showAnalysisMeta = !isUser && (message.sentiment?.label || message.intent?.label);

    return (
        <div className={`rr-message-row ${isUser ? 'is-user' : 'is-assistant'} ${hasRooms || hasProfileVisual ? 'has-rich-content' : ''}`}>
            {showAssistantAvatar && (
                <span className="rr-message-avatar">
                    <Bot />
                </span>
            )}
            <div className={`${isUser ? 'max-w-[82%] items-end' : hasRooms || hasProfileVisual ? 'rr-message-rich min-w-0 flex-1' : 'min-w-0 flex-1 items-start'}`}>
                {message.profileVisual ? (
                    <ProfileInsightCard visual={message.profileVisual} />
                ) : (
                    <div className={`rr-message-bubble ${isUser ? 'is-user' : 'is-assistant'}`}>
                        {message.content}
                    </div>
                )}
                {showAnalysisMeta && (
                    <MessageAnalysisMeta sentiment={message.sentiment} intent={message.intent} analysis={message.analysis} />
                )}
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

const MessageAnalysisMeta = ({ sentiment, intent, analysis }) => (
    <div className="rr-message-analysis-meta" title={analysis?.reason || ''}>
        <span>
            <Sparkles />
            Tone: {sentiment?.label || analysis?.tone || 'neutral'}
        </span>
        <span>
            <Target />
            {intent?.label || analysis?.intent || 'Answer'}
        </span>
        {analysis?.roomCards === 'not_shown' && (
            <span className="is-muted">No cards</span>
        )}
    </div>
);

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
                    <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-100 text-center text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                        <ImageOff className="h-7 w-7" />
                        <span className="mt-2 px-3 text-[10px] font-black uppercase tracking-wide">Photo pending</span>
                    </div>
                )}
                {isVerifiedRoom && (
                    <span className="absolute left-2 top-2 inline-flex max-w-[70%] items-center gap-1 rounded-full bg-white/92 px-2 py-1 text-[10px] font-black text-slate-900 shadow-sm">
                        <ShieldCheck className="h-3.5 w-3.5 text-cyan-600" />
                        Verified
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
