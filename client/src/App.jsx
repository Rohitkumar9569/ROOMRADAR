// client/src/App.jsx
import React, { useState, useEffect } from 'react';
// 1. Import useLocation to get the current URL path
import { Outlet, useLocation } from 'react-router-dom'; 
import api from './api'; // Use the centralized api instance
import Footer from './components/layout/Footer'; 
import SplashScreen from './components/common/SplashScreen'; 
import { AnimatePresence } from 'framer-motion';

function App() {
  // 2. Initialize the location hook
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(() => {
    // Check if the splash screen animation has already played in this session
    return sessionStorage.getItem('hasAnimationPlayed') !== 'true';
  });

  const [listingsData, setListingsData] = useState([]);

  // 3. Define a list of routes where the Footer should be HIDDEN
  const hideFooterRoutes = ['/login', '/signup', '/forgot-password'];

  // 4. Check if the current path is in the list of routes to hide
  // returns true if footer should be shown, false if it should be hidden
  const shouldShowFooter = !hideFooterRoutes.includes(location.pathname);

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

          {/* 5. Conditionally render the Footer based on the 'shouldShowFooter' flag */}
          {shouldShowFooter && <Footer className="hidden md:block" />}
          
        </div>
      )}
    </AnimatePresence>
  );
}

export default App;