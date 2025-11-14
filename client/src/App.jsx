// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import api from './api'; // Use the centralized api instance
import Footer from './components/layout/Footer'; 
import SplashScreen from './components/common/SplashScreen'; 
import { AnimatePresence } from 'framer-motion';

function App() {
  const [isLoading, setIsLoading] = useState(() => {
    // Check if the splash screen animation has already played in this session
    return sessionStorage.getItem('hasAnimationPlayed') !== 'true';
  });

  const [listingsData, setListingsData] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Use the 'api' instance which has the baseURL configured
        const { data } = await api.get('/rooms');
        setListingsData(data);
      } catch (error) {
        console.error("Failed to fetch initial listings:", error);
      }
    };

    if (isLoading) {
      // Show splash screen for a minimum time while fetching data
      const minimumLoadingTime = new Promise(resolve => setTimeout(resolve, 2500));
      
      Promise.all([fetchInitialData(), minimumLoadingTime]).then(() => {
        sessionStorage.setItem('hasAnimationPlayed', 'true');
        setIsLoading(false);
      });
    } else {
      // If animation already played, just fetch data
      fetchInitialData();
    }
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading ? (
        <SplashScreen key="splash" />
      ) : (
        <div
          key="main"
          className="flex flex-col min-h-screen"
        >
         
          
          <main className="flex-grow">
            <Outlet context={{ listings: listingsData, setListings: setListingsData }} />
          </main>

          <Footer className="hidden md:block" />
        </div>
      )}
    </AnimatePresence>
  );
}

export default App;