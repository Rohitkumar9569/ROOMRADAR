import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';

const ScrollToTop = () => {
    const location = useLocation();
    const [visible, setVisible] = useState(false);
    const isListingFormRoute = /^\/landlord\/(?:add-room|edit-room\/[^/]+)\/?$/.test(location.pathname);

    useEffect(() => {
        const desktopQuery = window.matchMedia('(min-width: 768px)');
        let lastVisible = false;

        const onScroll = () => {
            const nextVisible = desktopQuery.matches && window.scrollY > 400;
            if (lastVisible !== nextVisible) {
                lastVisible = nextVisible;
                setVisible(nextVisible);
            }
        };

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        if (desktopQuery.addEventListener) {
            desktopQuery.addEventListener('change', onScroll);
        } else {
            desktopQuery.addListener(onScroll);
        }

        return () => {
            window.removeEventListener('scroll', onScroll);
            if (desktopQuery.removeEventListener) {
                desktopQuery.removeEventListener('change', onScroll);
            } else {
                desktopQuery.removeListener(onScroll);
            }
        };
    }, []);

    if (isListingFormRoute) return null;

    return (
        visible && (
            <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="fixed bottom-24 right-5 z-40 hidden h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand/25 transition hover:bg-red-600 md:flex"
                aria-label="Scroll to top"
            >
                <ArrowUp className="h-5 w-5" />
            </button>
        )
    );
};

export default ScrollToTop;
