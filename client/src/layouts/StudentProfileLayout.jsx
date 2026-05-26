import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUI } from '../context/UIContext';
import ProfileSidebar from '../components/layout/student/ProfileSidebar';
import RouteTransition from '../components/common/RouteTransition';

const FilterTabs = ({ tabs, counts, activeFilter, onFilterChange }) => (
    <div className="rr-filter-tabs sticky top-14 z-30 border-b border-light-border bg-light-bg/95 backdrop-blur-xl dark:border-dark-border dark:bg-dark-bg/90 md:top-0">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
            {tabs.map((tab) => ((counts[tab] > 0 || tab === 'all') && (
                <button
                    key={tab}
                    onClick={() => onFilterChange(tab)}
                    className={`rr-filter-chip flex-shrink-0 rounded-full px-4 py-2 text-sm font-extrabold capitalize transition ${
                        activeFilter === tab
                            ? 'is-active bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                            : 'bg-light-card text-light-muted ring-1 ring-light-border hover:text-light-text dark:bg-dark-card dark:text-dark-muted dark:ring-dark-border'
                    }`}
                >
                    {tab}
                    <span className="rr-filter-chip-count ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">{counts[tab]}</span>
                </button>
            )))}
        </div>
    </div>
);

const StudentProfileLayout = () => {
    const mainContentRef = useRef(null);
    const location = useLocation();
    const {
        isSidebarOpen,
        headerSearchTerm,
        setHeaderSearchTerm,
        setActiveChatMeta,
        setChatProfileOpen,
        inboxListScrolled,
        setInboxListScrolled,
    } = useUI();
    const [applicationSearchTerm, setApplicationSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [applicationCounts, setApplicationCounts] = useState({ all: 0 });
    const TABS = ['all', 'pending', 'approved', 'confirmed', 'rejected', 'cancelled'];

    useEffect(() => {
        setHeaderSearchTerm('');
        setInboxListScrolled(false);
        setChatProfileOpen(false);
        setApplicationSearchTerm('');
        setActiveChatMeta((prev) => (prev ? null : prev));
    }, [location.pathname, setActiveChatMeta, setChatProfileOpen, setHeaderSearchTerm, setInboxListScrolled]);

    let pageType = 'default';
    if (location.pathname.includes('/inbox')) pageType = 'inbox';
    if (location.pathname.includes('/my-applications')) pageType = 'applications';

    const setActiveChatName = useCallback((name) => {
        setActiveChatMeta((prev) => {
            const next = name ? { ...(prev || {}), name } : null;
            if (!next && !prev) return prev;
            if (next && prev?.name === next.name) return prev;
            return next;
        });
    }, [setActiveChatMeta]);

    const outletContext = useMemo(() => ({
        searchTerm: headerSearchTerm,
        setSearchTerm: setHeaderSearchTerm,
        setActiveChatMeta,
        setActiveChatName,
        applicationSearchTerm,
        setApplicationSearchTerm,
        activeFilter,
        setApplicationCounts,
        inboxSearchInNav: inboxListScrolled,
        setInboxListScrolled,
    }), [
        headerSearchTerm,
        setHeaderSearchTerm,
        setActiveChatMeta,
        setActiveChatName,
        applicationSearchTerm,
        activeFilter,
        inboxListScrolled,
        setInboxListScrolled,
    ]);
    const mainContentMargin = isSidebarOpen ? 'md:ml-72' : 'md:ml-24';
    const mainTopPadding = pageType === 'applications' ? '' : pageType === 'inbox' ? 'mobile-inbox-main' : 'pt-16 md:pt-0';

    return (
        <div className="min-h-screen bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
            <ProfileSidebar />
            {pageType === 'applications' && (
                <div className={`pt-16 transition-all duration-300 md:pt-0 ${mainContentMargin}`}>
                    <FilterTabs
                        tabs={TABS}
                        counts={applicationCounts}
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                    />
                </div>
            )}

            <main ref={mainContentRef} className={`rr-flat-mobile-pages min-h-screen transition-all duration-300 md:pb-0 ${mainTopPadding} ${pageType === 'inbox' ? 'pb-0' : 'pb-24'} ${mainContentMargin}`}>
                <div className={
                    pageType === 'inbox'
                        ? 'mobile-inbox-page-shell md:pt-0'
                        : pageType === 'applications'
                            ? ''
                            : 'md:pt-0'
                }>
                    <RouteTransition context={outletContext} />
                </div>
            </main>
        </div>
    );
};

export default StudentProfileLayout;
