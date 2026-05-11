import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    Home,
    Lock,
    LogIn,
    Mail,
    MessageCircle,
    Moon,
    ShieldCheck,
    Sun,
    User,
    UserPlus,
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import loginImage from '../../assets/login_back.jpg';
import signupImage from '../../assets/signup_back.jpg';

const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12.25V14.51H18.08C17.77 15.93 17.01 17.15 15.91 17.91V20.48H19.5C21.43 18.73 22.56 15.79 22.56 12.25Z" fill="#4285F4" />
        <path d="M12.25 23C15.45 23 18.14 21.93 19.98 20.03L16.3 17.47C15.22 18.21 13.86 18.66 12.25 18.66C9.31 18.66 6.79 16.7 5.74 14.1H2.03V16.68C3.76 20.27 7.69 23 12.25 23Z" fill="#34A853" />
        <path d="M5.74 14.1C5.53 13.52 5.42 12.88 5.42 12.25C5.42 11.62 5.53 10.98 5.74 10.4L2.03 7.82C1.04 9.77 0.5 12.06 0.5 14.5C0.5 16.94 1.04 19.23 2.03 21.18L5.74 18.6C5.17 17.31 4.9 15.77 4.9 14.1" fill="#FBBC05" />
        <path d="M12.25 5.84C13.97 5.84 15.3 6.43 16.39 7.42L20.07 3.75C18.14 1.88 15.45 0.5 12.25 0.5C7.69 0.5 3.76 3.73 2.03 7.32L5.74 9.9C6.79 7.3 9.31 5.84 12.25 5.84Z" fill="#EA4335" />
    </svg>
);

const TextField = ({ icon: Icon, label, type = 'text', value, onChange, name, placeholder, autoComplete, rightSlot, required = true }) => (
    <label className="block">
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-light-muted dark:text-dark-muted">{label}</span>
        <span className="group flex h-12 items-center gap-3 rounded-xl border border-light-border bg-white px-4 shadow-sm transition focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-500/10 dark:border-dark-border dark:bg-dark-input">
            <Icon className="h-4 w-4 flex-shrink-0 text-cyan-600 dark:text-cyan-400" />
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoComplete={autoComplete}
                required={required}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-light-text outline-none placeholder:text-light-muted dark:text-dark-text dark:placeholder:text-dark-muted"
            />
            {rightSlot}
        </span>
    </label>
);

const TrustItem = ({ icon: Icon, title, text }) => (
    <div className="min-w-0 rounded-[1rem] border border-white/24 bg-slate-950/28 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.22)]">
        <Icon className="mb-2 h-4 w-4 text-cyan-200 drop-shadow-[0_0_14px_rgba(103,232,249,0.55)]" />
        <p className="text-[12.5px] font-black leading-tight text-white drop-shadow-[0_1px_8px_rgba(15,23,42,0.6)]">{title}</p>
        <p className="mt-1 text-[10.5px] font-bold leading-4 text-white/90 drop-shadow-[0_1px_8px_rgba(15,23,42,0.6)]">{text}</p>
    </div>
);

const ADMIN_ROLES = ['Admin', 'Super_Admin', 'Moderator', 'Support'];

function AuthPage() {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { login, switchRole } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const { settings } = useSettings();

    useEffect(() => {
        setIsLogin(location.pathname === '/login');
        setShowPassword(false);
    }, [location.pathname]);

    const handleChange = (event) => {
        setFormData({ ...formData, [event.target.name]: event.target.value });
    };

    const redirectAfterLogin = (data) => {
        const from = location.state?.from?.pathname;
        const userRoles = Array.isArray(data.roles) ? data.roles : [data.role].filter(Boolean);
        const isAdminUser = userRoles.some(role => ADMIN_ROLES.includes(role));

        if (data.status === 'Banned') {
            navigate('/profile/overview', { replace: true });
            return;
        }

        if (isAdminUser) {
            switchRole('admin');
            navigate('/admin/dashboard', { replace: true });
            return;
        }

        if (from === '/list-your-room' && userRoles.includes('Landlord')) {
            switchRole('landlord');
            navigate('/landlord/overview', { replace: true });
            return;
        }

        if (from) {
            navigate(from, { replace: true });
            return;
        }

        if (userRoles.includes('Landlord')) {
            switchRole('landlord');
            navigate('/landlord/overview', { replace: true });
        } else {
            switchRole('student');
            navigate('/', { replace: true });
        }
    };

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            const toastId = toast.loading('Connecting with Google...');
            try {
                const { data } = await api.post('/auth/google', { token: tokenResponse.access_token });
                login(data);
                toast.success('Welcome to RoomRadar.', { id: toastId });
                redirectAfterLogin(data);
            } catch (error) {
                toast.error('Google login failed.', { id: toastId });
            }
        },
        onError: () => toast.error('Google login failed.'),
    });

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!isLogin && formData.password.trim().length < 6) {
            toast.error('Password must be at least 6 characters.');
            return;
        }

        if (!isLogin && settings?.allowNewSignups === false) {
            toast.error('New signups are temporarily paused by RoomRadar admin.');
            return;
        }

        const toastId = toast.loading(isLogin ? 'Signing you in...' : 'Creating your account...');
        setIsSubmitting(true);

        try {
            if (isLogin) {
                const { data } = await api.post('/auth/login', {
                    email: formData.email.trim(),
                    password: formData.password,
                });

                login(data);
                toast.success('Login successful.', { id: toastId });
                redirectAfterLogin(data);
            } else {
                await api.post('/auth/register', {
                    name: formData.name.trim(),
                    email: formData.email.trim(),
                    password: formData.password,
                });
                toast.success('Account created. Please log in.', { id: toastId });
                navigate('/login');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || (isLogin ? 'Login failed.' : 'Registration failed.'), { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const modeCopy = isLogin
        ? {
            eyebrow: 'Account access',
            title: 'Welcome back',
            subtitle: 'Sign in to manage saved rooms, booking requests, host messages, and profile details.',
            imageTitle: 'Rooms, requests, and host conversations in one place.',
            imageSubtitle: 'Search verified listings, send requests, talk to hosts, and track every step clearly.',
            image: loginImage,
            button: 'Log in',
            switchText: "Don't have an account?",
            switchAction: 'Create account',
            switchTo: '/signup',
        }
        : {
            eyebrow: 'New account',
            title: 'Create your account',
            subtitle: 'Use one account for room discovery, request tracking, and host communication.',
            imageTitle: 'Start with verified rooms and clear booking flow.',
            imageSubtitle: 'Create one RoomRadar account for travelling, saved rooms, requests, and direct host messages.',
            image: signupImage,
            button: 'Create account',
            switchText: 'Already have an account?',
            switchAction: 'Log in',
            switchTo: '/login',
        };

    return (
        <main className="relative min-h-dvh overflow-hidden bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text lg:h-dvh">
            <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent dark:from-cyan-400/10" />
            <div className="pointer-events-none absolute left-1/2 top-0 hidden h-[26rem] w-[42rem] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-300/10 lg:block" />

            <header className="relative z-10 mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-[4.25rem] lg:px-8">
                <Link to="/" className="text-[clamp(20px,5.5vw,28px)] font-black tracking-tight">
                    <span className="text-brand">Room</span>
                    <span className="text-cyan-500 dark:text-cyan-400">Radar</span>
                </Link>
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-light-border bg-white/80 text-light-muted shadow-sm backdrop-blur-xl transition hover:border-cyan-400 hover:text-cyan-500 dark:border-dark-border dark:bg-dark-sidebar/80 dark:text-dark-muted dark:hover:text-cyan-300"
                    aria-label="Toggle theme"
                >
                    {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
            </header>

            <section className="relative z-10 mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl items-center gap-5 px-4 pb-6 sm:px-6 lg:h-[calc(100dvh-4.25rem)] lg:min-h-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(430px,0.82fr)] lg:gap-8 lg:px-8 lg:pb-6">
                <motion.aside
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="relative hidden h-full min-h-0 overflow-hidden rounded-[1.85rem] border border-white/10 shadow-2xl shadow-slate-950/15 lg:block"
                >
                    <img src={modeCopy.image} alt="RoomRadar verified room interior" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/18 via-slate-950/18 to-slate-950/56" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_85%_18%,rgba(255,56,92,0.18),transparent_30%)]" />
                    <div className="relative flex h-full flex-col justify-between p-6 text-white xl:p-8">
                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/28 bg-white/18 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_12px_32px_rgba(15,23,42,0.18)]">
                            <ShieldCheck className="h-4 w-4 text-cyan-200" />
                            Verified stays
                        </div>

                        <div className="mx-auto max-w-[30rem] text-center">
                            <h1 className="mx-auto max-w-[18ch] bg-gradient-to-r from-white via-cyan-100 to-rose-100 bg-clip-text text-[clamp(1.45rem,2.15vw,2.15rem)] font-black leading-[1.08] tracking-[-0.025em] text-transparent drop-shadow-[0_3px_22px_rgba(15,23,42,0.72)]">
                                {modeCopy.imageTitle}
                            </h1>
                            <p className="mx-auto mt-3 max-w-[26rem] text-[13px] font-bold leading-5 text-cyan-50 drop-shadow-[0_2px_16px_rgba(15,23,42,0.7)]">
                                {modeCopy.imageSubtitle}
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                            <TrustItem icon={Home} title="Real listings" text="Rooms come from published inventory." />
                            <TrustItem icon={MessageCircle} title="Host chat" text="Keep room questions inside the platform." />
                            <TrustItem icon={CheckCircle2} title="Clear status" text="Track pending, approved, and confirmed requests." />
                        </div>
                    </div>
                </motion.aside>

                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
                    className="no-scrollbar mx-auto w-full max-w-[29rem] rounded-[1.6rem] border border-light-border bg-white/98 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.15)] ring-1 ring-cyan-500/10 backdrop-blur-xl dark:border-dark-border dark:bg-dark-sidebar/98 dark:shadow-black/35 dark:ring-cyan-300/10 sm:p-7 lg:max-h-full lg:overflow-y-auto lg:p-7 xl:p-8"
                >
                    <div className="mb-5 sm:mb-6">
                        <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {modeCopy.eyebrow}
                        </span>
                        <h2 className="mt-4 text-[clamp(28px,8vw,46px)] font-black leading-tight tracking-[-0.035em] text-light-text dark:text-dark-text lg:text-[clamp(34px,3.8vw,50px)]">
                            {modeCopy.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-light-muted dark:text-dark-muted">{modeCopy.subtitle}</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleGoogleLogin()}
                        disabled={isSubmitting}
                        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-light-border bg-white text-sm font-semibold text-light-text shadow-sm transition hover:border-cyan-400 hover:bg-cyan-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-border dark:bg-dark-card dark:text-dark-text dark:hover:bg-dark-input"
                    >
                        <GoogleIcon />
                        Continue with Google
                    </button>

                    <div className="my-6 flex items-center gap-3">
                        <div className="h-px flex-1 bg-light-border dark:bg-dark-border" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-light-muted dark:text-dark-muted">or email</span>
                        <div className="h-px flex-1 bg-light-border dark:bg-dark-border" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence initial={false}>
                            {!isLogin && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, y: -8 }}
                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                    exit={{ opacity: 0, height: 0, y: -8 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <TextField
                                        icon={User}
                                        label="Full name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Full name"
                                        autoComplete="name"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <TextField
                            icon={Mail}
                            label="Email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            autoComplete="email"
                        />

                        <TextField
                            icon={Lock}
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                            rightSlot={(
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((current) => !current)}
                                    className="rounded-full p-1 text-light-muted transition hover:bg-light-bg hover:text-cyan-500 dark:text-dark-muted dark:hover:bg-dark-card dark:hover:text-cyan-300"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            )}
                        />

                        {!isLogin && (
                            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-3 text-xs font-semibold leading-5 text-cyan-800 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200">
                                {settings?.allowNewSignups === false
                                    ? 'New signups are temporarily paused. Existing users and admins can still log in.'
                                    : 'Use at least 6 characters. Hosting and travelling profile details can be managed separately later.'}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || (!isLogin && settings?.allowNewSignups === false)}
                            className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isSubmitting ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            ) : isLogin ? (
                                <LogIn className="h-4 w-4" />
                            ) : (
                                <UserPlus className="h-4 w-4" />
                            )}
                            {isSubmitting ? 'Please wait...' : modeCopy.button}
                            {!isSubmitting && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
                        </button>
                    </form>

                    <div className="mt-6 rounded-xl bg-light-bg p-4 text-center text-sm font-medium text-light-muted dark:bg-dark-card dark:text-dark-muted">
                        {modeCopy.switchText}
                        <Link to={modeCopy.switchTo} className="ml-1 font-black text-cyan-600 transition hover:text-cyan-500 dark:text-cyan-300">
                            {modeCopy.switchAction}
                        </Link>
                    </div>
                </motion.div>
            </section>
        </main>
    );
}

export default AuthPage;
