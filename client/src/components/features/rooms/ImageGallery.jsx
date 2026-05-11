// src/components/ImageGallery.jsx

import React, { useState } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

// --- Full-Screen Modal Component ---
const ImageModal = ({ images, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const handleNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex items-center justify-center"
            onClick={onClose}
        >
            <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full">
                <XMarkIcon className="h-8 w-8" />
            </button>

            {images.length > 1 && (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 bg-black/50 rounded-full"
                    >
                        <ChevronLeftIcon className="h-8 w-8" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleNext(); }} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 bg-black/50 rounded-full"
                    >
                        <ChevronRightIcon className="h-8 w-8" />
                    </button>
                </>
            )}

            <div className="max-w-4xl max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                <img src={images[currentIndex]} alt={`Room view ${currentIndex + 1}`} className="max-h-[80vh] w-auto object-contain" />
            </div>
        </motion.div>
    );
};


// --- Main ImageGallery Component ---
const ImageGallery = ({ images }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const openModal = (index) => {
        setSelectedImageIndex(index);
        setIsModalOpen(true);
    };

    if (!images || images.length === 0) {
        return <div className="flex h-96 items-center justify-center rounded-3xl bg-slate-200 dark:bg-secondary-700"><p className="font-bold text-slate-500 dark:text-secondary-300">No Images Available</p></div>;
    }

    const mainImage = images[0];
    const sideImages = images.slice(1, 5);

    return (
        <div className="relative">
            <div className="grid h-[320px] grid-cols-1 gap-2 md:h-[450px] md:grid-cols-4 md:grid-rows-2">
                {/* Main Image */}
                <div className="md:col-span-2 md:row-span-2 h-full cursor-pointer" onClick={() => openModal(0)}>
                    <img src={mainImage} alt="Main room view" className="h-full w-full rounded-2xl object-cover transition hover:opacity-90 md:rounded-l-2xl md:rounded-r-none" />
                </div>
                
                {/* Side Images */}
                {sideImages.map((img, index) => {
                    let roundedClass = '';
                    if (index === 1) roundedClass = 'rounded-tr-2xl'; // Top-right
                    if (index === 3) roundedClass = 'rounded-br-2xl'; // Bottom-right
                    
                    return (
                        <div key={index} className="hidden md:block h-full cursor-pointer" onClick={() => openModal(index + 1)}>
                            <img src={img} alt={`Room view ${index + 2}`} className={`w-full h-full object-cover hover:opacity-90 transition ${roundedClass}`} />
                        </div>
                    );
                })}
            </div>

            {/* Show all photos button */}
            <button 
                onClick={() => openModal(0)}
                className="absolute bottom-4 right-4 rounded-2xl border border-light-border bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-lg transition hover:bg-slate-100 dark:border-dark-border dark:bg-dark-card dark:text-dark-text dark:hover:bg-dark-input"
            >
                Show all photos
            </button>

            {/* Modal Logic */}
            <AnimatePresence>
                {isModalOpen && <ImageModal images={images} initialIndex={selectedImageIndex} onClose={() => setIsModalOpen(false)} />}
            </AnimatePresence>
        </div>
    );
};

export default ImageGallery;
