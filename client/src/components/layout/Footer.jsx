import React from 'react';
import { FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';

function Footer() {
  return (
    <footer className="bg-gray-200 text-black py-12">
      <div className="container mx-auto px-4 text-center">
        <h3 className="text-2xl font-bold mb-4">RoomRadar</h3>
        <p className="max-w-md mx-auto mb-6 text-gray-700">
          Your one-stop solution for finding the best student accommodations.
        </p>
        <div className="flex justify-center space-x-6 mb-8">
          <a href="#" className="hover:text-indigo-400"><FaFacebook size={24} /></a>
          <a href="#" className="hover:text-indigo-400"><FaTwitter size={24} /></a>
          <a href="#" className="hover:text-indigo-400"><FaInstagram size={24} /></a>
        </div>
        <p className="text-gray-700">&copy; 2025 RoomRadar. All Rights Reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;