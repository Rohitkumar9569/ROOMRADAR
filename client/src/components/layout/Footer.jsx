import React from 'react';
import { FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';

function Footer() {
  // Enhanced style applied uniformly to ALL developers with a light cyan background
  const nameStyle = "inline-block px-4 py-2 m-1 bg-gray-200 text-gray-900 border border-gray-300 rounded-full text-sm font-medium transition duration-300 ease-in-out shadow-sm hover:shadow-md hover:bg-gray-300";
  
  // Style for the clickable link (adds cursor and hover focus)
  const linkStyle = " hover:border-indigo-200 hover:text-indigo-600 cursor-pointer";

  return (
    <footer className="bg-gray-100 text-black py-12">
      <div className="container mx-auto px-4 text-center">
        <h3 className="text-3xl font-extrabold mb-4 text-gray-900">RoomRadar</h3>
        <p className="max-w-lg mx-auto mb-8 text-gray-600 text-lg">
          Your one-stop solution for finding the best student accommodations.
        </p>
        <div className="flex justify-center space-x-6 mb-10">
          <a href="#" className="text-gray-600 hover:text-indigo-600 transition duration-300"><FaFacebook size={30} /></a>
          <a href="#" className="text-gray-600 hover:text-indigo-600 transition duration-300"><FaTwitter size={30} /></a>
          <a href="#" className="text-gray-600 hover:text-indigo-600 transition duration-300"><FaInstagram size={30} /></a>
        </div>

        {/* --- Developers Section with Light Cyan Button-Style Names --- */}
        <div className="mb-8 pt-8 border-t border-gray-300">
          <p className="text-xl font-bold mb-4 text-gray-900">Developed with ❤️ by:</p>
          <div className="flex flex-wrap justify-center gap-3">
            
            {/* Rohit Kumar - Same visual button, functional link, bold text */}
            <a 
              href="https://rohitkumar-portfolio.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              // Combined base style with link interaction style
              className={`${nameStyle} ${linkStyle}`}
            >
              Rohit Kumar <strong className="font-extrabold text-indigo-600">(Portfolio)</strong>
            </a>
            
            {/* Other Developers - Same visual button, non-clickable span */}
            <span className={nameStyle}>Shubhanshu</span>
            <span className={nameStyle}>Kamal Kumar</span>
            <span className={nameStyle}>Samrat Prajapati</span>
          </div>
        </div>
        {/* ----------------------------------------------------------- */}

        <p className="text-gray-500 text-sm mt-10 border-t pt-4 border-gray-200">&copy; 2025 RoomRadar. All Rights Reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;