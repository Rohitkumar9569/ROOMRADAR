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
        let listening = false;

        const onScroll = () => {
            const nextVisible = window.scrollY > 400;
            if (lastVisible !== nextVisible) {
                lastVisible = nextVisible;
                setVisible(nextVisible);
            }
        };

        const attach = () => {
            if (listening || !desktopQuery.matches) return;
            listening = true;
            onScroll();
            window.addEventListener('scroll', onScroll, { passive: true });
        };

        const detach = (resetVisible = true) => {
            if (!listening) return;
            listening = false;
            window.removeEventListener('scroll', onScroll);
            lastVisible = false;
            if (resetVisible) setVisible(false);
        };

        const sync = () => {
            if (desktopQuery.matches) attach();
            else detach();
        };

        sync();
        if (desktopQuery.addEventListener) {
            desktopQuery.addEventListener('change', sync);
        } else {
            desktopQuery.addListener(sync);
        }

        return () => {
            detach(false);
            if (desktopQuery.removeEventListener) {
                desktopQuery.removeEventListener('change', sync);
            } else {
                desktopQuery.removeListener(sync);
            }
        };
    }, []);

    if (isListingFormRoute) return null;

    return (
        visible && (
            <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="rr-scroll-to-top hidden md:flex"
                aria-label="Scroll to top"
            >
                <ArrowUp className="h-5 w-5" />
            </button>
        )
    );
};

export default ScrollToTop;
