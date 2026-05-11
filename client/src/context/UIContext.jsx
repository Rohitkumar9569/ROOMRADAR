// client/src/context/UIContext.jsx

import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default state is open
    const [headerSearchTerm, setHeaderSearchTerm] = useState('');
    const [activeChatMeta, setActiveChatMeta] = useState(null);
    const [inboxListScrolled, setInboxListScrolled] = useState(false);
    const [chatProfileOpen, setChatProfileOpen] = useState(false);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    const value = useMemo(() => ({
        isSidebarOpen,
        toggleSidebar,
        headerSearchTerm,
        setHeaderSearchTerm,
        activeChatMeta,
        setActiveChatMeta,
        inboxListScrolled,
        setInboxListScrolled,
        chatProfileOpen,
        setChatProfileOpen,
    }), [
        isSidebarOpen,
        toggleSidebar,
        headerSearchTerm,
        activeChatMeta,
        inboxListScrolled,
        chatProfileOpen,
    ]);

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    return useContext(UIContext);
};
