import React from 'react';
import { Link } from 'react-router-dom';
import { FaExternalLinkAlt, FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';

const developers = [
  {
    initials: 'RK',
    name: 'Rohit Kumar',
    role: 'Lead Developer',
    color: 'from-brand to-red-600',
    detail: 'GATE DA & CSE Qualifier (AIR 7275) - MERN Stack - Final Year B.Tech CSE',
    href: 'https://rohitkumar-portfolio.vercel.app',
    linkLabel: 'View portfolio',
  },
  {
    initials: 'S',
    name: 'Shubhanshu',
    role: 'Software Engineer',
    color: 'from-cyan-500 to-cyan-700',
    detail: 'TCS Digital - NQT Qualified - TCS Engineer - LinkedIn Brain Games - DSA',
  },
  {
    initials: 'KK',
    name: 'Kamal Kumar',
    role: 'Software Engineer',
    color: 'from-purple-500 to-purple-700',
    detail: 'Multi-talented - Chef & Coder - DSA Enthusiast - AI/ML Explorer',
  },
  {
    initials: 'SP',
    name: 'Samrat Prajapati',
    role: 'Teacher & Engineer',
    color: 'from-green-500 to-green-700',
    detail: 'College Teacher - Software Engineer - Cricket Lover - DSA Practitioner',
  },
];

const footerLinks = [
  { label: 'Explore Rooms', to: '/rooms' },
  { label: 'List Your Room', to: '/list-your-room' },
  { label: 'Applications', to: '/profile/my-applications' },
  { label: 'Inbox', to: '/profile/inbox' },
];

const cityLinks = ['Haridwar', 'Delhi', 'Dehradun', 'Noida'];

function Footer({ className = '' }) {
  return (
    <footer className={['border-t border-light-border bg-white text-light-muted dark:border-dark-border dark:bg-[#080b10] dark:text-gray-400', className].filter(Boolean).join(' ')}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-7 sm:gap-10 md:grid-cols-[1.3fr_0.8fr_0.8fr_1fr]">
          <div>
            <Link to="/" className="text-xl font-black sm:text-2xl">
              <span className="text-brand">Room</span>
              <span className="text-cyan-500 dark:text-cyan-400">Radar</span>
            </Link>
            <p className="mt-3 max-w-sm text-xs font-semibold leading-5 text-light-muted dark:text-gray-400 sm:mt-4 sm:text-sm sm:leading-6">
              Premium room discovery, booking requests, and host confirmation for verified stays.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-light-text dark:text-white">Links</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:block sm:space-y-3">
              {footerLinks.map((link) => (
                <Link key={link.label} to={link.to} className="block rounded-full bg-light-bg px-3 py-2 text-xs font-bold transition hover:text-cyan-600 dark:bg-white/5 dark:hover:text-white sm:bg-transparent sm:p-0 sm:text-sm dark:sm:bg-transparent">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-light-text dark:text-white">Cities</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold sm:mt-4 sm:block sm:space-y-3 sm:text-sm sm:font-semibold">
              {cityLinks.map((city) => (
                <Link key={city} to={`/rooms?city=${encodeURIComponent(city)}`} className="block rounded-full bg-light-bg px-3 py-2 transition hover:text-cyan-600 dark:bg-white/5 dark:hover:text-white sm:bg-transparent sm:p-0 dark:sm:bg-transparent">
                  {city}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-light-text dark:text-white">Social</h3>
            <div className="mt-3 flex gap-2 sm:mt-4 sm:gap-3">
              {[
                { Icon: FaFacebook, label: 'Facebook' },
                { Icon: FaTwitter, label: 'Twitter' },
                { Icon: FaInstagram, label: 'Instagram' },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-light-bg text-light-muted ring-1 ring-light-border transition hover:bg-cyan-500 hover:text-white hover:ring-cyan-500 dark:bg-white/5 dark:text-gray-300 dark:ring-transparent sm:h-10 sm:w-10"
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-light-border pt-6 dark:border-white/10 sm:mt-10 sm:pt-8">
          <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-cyan-500 dark:text-cyan-400">Developed by</p>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
            {developers.map((developer) => {
              const content = (
                <span className={`group flex min-h-0 items-center gap-3 rounded-2xl border border-light-border bg-light-bg p-3 text-left transition-all hover:-translate-y-1 hover:border-cyan-400/50 hover:bg-white hover:shadow-xl hover:shadow-cyan-500/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 sm:min-h-44 sm:flex-col sm:items-center sm:p-4 sm:text-center ${developer.href ? 'cursor-pointer ring-1 ring-transparent hover:ring-cyan-300/50' : 'cursor-default'}`}>
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${developer.color} text-sm font-black text-white shadow-lg transition-transform group-hover:scale-110 sm:mb-3 sm:h-12 sm:w-12 sm:text-lg`}>
                    {developer.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-light-text dark:text-white">{developer.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] font-black text-cyan-500 dark:text-cyan-400 sm:mt-1 sm:text-xs">{developer.role}</span>
                    <span className="mt-3 hidden text-xs leading-relaxed text-light-muted transition-colors group-hover:text-light-text dark:text-gray-500 dark:group-hover:text-gray-300 sm:block">
                      {developer.detail}
                    </span>
                    {developer.href && (
                      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cyan-500 px-3 py-1.5 text-[11px] font-black text-white shadow-sm shadow-cyan-500/20 transition group-hover:bg-cyan-600">
                        {developer.linkLabel || 'Open link'}
                        <FaExternalLinkAlt className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </span>
                </span>
              );

              return developer.href ? (
                <a key={developer.name} href={developer.href} target="_blank" rel="noopener noreferrer" aria-label={`${developer.name} portfolio`}>
                  {content}
                </a>
              ) : (
                <span key={developer.name}>{content}</span>
              );
            })}
          </div>
          <p className="mx-auto mt-4 max-w-xs text-center text-[11px] font-semibold leading-5 text-light-muted dark:text-gray-600 sm:mt-6 sm:max-w-none sm:text-xs">
            Gurukul Kangri Vishwavidyalaya, Haridwar - AI/ML, DSA, and real-world tech.
          </p>
          <p className="mt-4 text-center text-[11px] text-light-muted dark:text-gray-500 sm:mt-6 sm:text-xs">&copy; 2026 RoomRadar. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
