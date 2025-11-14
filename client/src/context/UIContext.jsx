// client/src/context/UIContext.jsx

import React, { createContext, useState, useContext } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default state is open

    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    const value = {
        isSidebarOpen,
        toggleSidebar,
    };

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    return useContext(UIContext);
};