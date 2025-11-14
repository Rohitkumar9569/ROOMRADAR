import React, { createContext, useState, useContext } from 'react';

const HeaderContext = createContext();

export const useHeader = () => useContext(HeaderContext);

export const HeaderProvider = ({ children }) => {
  const [inboxControls, setInboxControls] = useState(null); 
  const [activeChatName, setActiveChatName] = useState(null); 

  const value = {
    inboxControls,
    setInboxControls,
    activeChatName,
    setActiveChatName,
  };

  return (
    <HeaderContext.Provider value={value}>
      {children}
    </HeaderContext.Provider>
  );
};