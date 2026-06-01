// src/components/ImageGallery.jsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

const photoSlideVariants = {
    enter: (direction) => ({
        opacity: 0,
        x: direction > 0 ? 28 : -28,
        scale: 0.992,
        filter: 'blur(6px)',
    }),
    center: {
        opacity: 1,
        x: 0,
        scale: 1,
        filter: 'blur(0px)',
    },
    exit: (direction) => ({
        opacity: 0,
        x: direction > 0 ? -22 : 22,
        scale: 0.992,
        filter: 'blur(5px)',
    }),
};

// --- Full-Screen Modal Component ---
const ImageModal = ({ images, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [direction, setDirection] = useState(1);
    const touchStart = useRef(null);
    const thumbnailRefs = useRef([]);

    const showPhoto = useCallback((nextIndex, nextDirection) => {
        setDirection(nextDirection);
        setCurrentIndex((nextIndex + images.length) % images.length);
    }, [images.length]);

    const handleNext = useCallback(() => {
        showPhoto(currentIndex + 1, 1);
    }, [currentIndex, showPhoto]);

    const handlePrev = useCallback(() => {
        showPhoto(currentIndex - 1, -1);
    }, [currentIndex, showPhoto]);

    const handleTouchEnd = (event) => {
        if (!touchStart.current || images.length < 2) return;

        const deltaX = touchStart.current.x - event.changedTouches[0].clientX;
        const deltaY = touchStart.current.y - event.changedTouches[0].clientY;
        if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
            if (deltaX > 0) handleNext();
            else handlePrev();
        }
        touchStart.current = null;
    };

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'ArrowRight' && images.length > 1) handleNext();
            if (event.key === 'ArrowLeft' && images.length > 1) handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleNext, handlePrev, images.length, onClose]);

    useEffect(() => {
        thumbnailRefs.current[currentIndex]?.scrollIntoView?.({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
        });
    }, [currentIndex]);

    const currentImage = images[currentIndex] || images[0];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rr-gallery-modal fixed inset-0 z-[10050] flex flex-col bg-light-bg text-light-text dark:bg-[#050505] dark:text-white"
            role="dialog"
            aria-modal="true"
            aria-label="Room photo gallery"
        >
            <div className="flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-light-border bg-white/96 px-3 shadow-sm dark:border-white/10 dark:bg-[#050505] dark:shadow-none sm:h-20 sm:px-6">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-light-muted dark:text-white/55">RoomRadar gallery</p>
                    <p className="mt-1 text-sm font-black text-light-text dark:text-white sm:text-base">
                        Photo {currentIndex + 1} of {images.length}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-slate-900/5 text-slate-900 shadow-sm transition hover:bg-slate-900/10 active:scale-95 dark:bg-white/10 dark:text-white dark:shadow-none dark:hover:bg-white/20"
                    aria-label="Close photo gallery"
                >
                    <XMarkIcon className="h-6 w-6" />
                </button>
            </div>

            {images.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={handlePrev}
                        className="absolute left-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-2xl ring-1 ring-slate-200 transition hover:bg-white active:scale-95 dark:bg-white/12 dark:text-white dark:ring-white/10 dark:hover:bg-white/22 sm:left-6 md:inline-flex"
                        aria-label="Previous photo"
                    >
                        <ChevronLeftIcon className="h-7 w-7" />
                    </button>
                    <button
                        type="button"
                        onClick={handleNext}
                        className="absolute right-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-2xl ring-1 ring-slate-200 transition hover:bg-white active:scale-95 dark:bg-white/12 dark:text-white dark:ring-white/10 dark:hover:bg-white/22 sm:right-6 md:inline-flex"
                        aria-label="Next photo"
                    >
                        <ChevronRightIcon className="h-7 w-7" />
                    </button>
                </>
            )}

            <div
                className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-100/75 px-0 py-3 dark:bg-[#050505] sm:px-6 sm:py-5"
                onTouchStart={(event) => {
                    touchStart.current = {
                        x: event.touches[0].clientX,
                        y: event.touches[0].clientY,
                    };
                }}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={() => { touchStart.current = null; }}
            >
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.img
                        key={`${currentImage}-${currentIndex}`}
                        custom={direction}
                        src={currentImage}
                        alt={`Room view ${currentIndex + 1}`}
                        variants={photoSlideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full max-h-full w-full max-w-[min(100vw,118rem)] object-contain select-none"
                        decoding="async"
                        draggable="false"
                    />
                </AnimatePresence>

                {images.length > 1 && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-between px-3 md:hidden">
                        <button
                        type="button"
                        onClick={handlePrev}
                            className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-slate-950 shadow-xl ring-1 ring-slate-200 active:scale-95 dark:bg-black/55 dark:text-white dark:ring-white/10"
                            aria-label="Previous photo"
                        >
                            <ChevronLeftIcon className="h-6 w-6" />
                        </button>
                        <button
                        type="button"
                        onClick={handleNext}
                            className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-slate-950 shadow-xl ring-1 ring-slate-200 active:scale-95 dark:bg-black/55 dark:text-white dark:ring-white/10"
                            aria-label="Next photo"
                        >
                            <ChevronRightIcon className="h-6 w-6" />
                        </button>
                    </div>
                )}
            </div>

            {images.length > 1 && (
                <div className="flex flex-shrink-0 items-center gap-2 border-t border-light-border bg-white/96 px-3 py-3 shadow-[0_-12px_30px_-26px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-black/45 dark:shadow-none sm:px-6">
                    <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {images.map((image, index) => (
                            <button
                                key={`${image}-${index}`}
                                ref={(element) => { thumbnailRefs.current[index] = element; }}
                                type="button"
                                onClick={() => setCurrentIndex(index)}
                                className={`relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-xl border transition sm:h-20 sm:w-28 ${
                                    index === currentIndex
                                        ? 'border-slate-950 ring-2 ring-slate-950/20 dark:border-white dark:ring-white/55'
                                        : 'border-slate-200 opacity-70 hover:opacity-100 dark:border-white/12 dark:opacity-60'
                                }`}
                                aria-label={`Open photo ${index + 1}`}
                            >
                                <img
                                    src={image}
                                    alt={`Room thumbnail ${index + 1}`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                />
                            </button>
                        ))}
                    </div>
                    <div className="hidden flex-shrink-0 rounded-full bg-slate-900/5 px-3 py-1.5 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-white/80 sm:block">
                        Use arrows or swipe
                    </div>
                </div>
            )}
        </motion.div>
    );
};


// --- Main ImageGallery Component ---
const ImageGallery = ({ images }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const touchStart = useRef(null);
    const didSwipe = useRef(false);

    const openModal = (index) => {
        setSelectedImageIndex(index);
        setIsModalOpen(true);
    };

    const showImage = useCallback((nextIndex, nextDirection) => {
        setDirection(nextDirection);
        setCurrentImageIndex((nextIndex + images.length) % images.length);
    }, [images.length]);

    const showNextImage = useCallback(() => {
        showImage(currentImageIndex + 1, 1);
    }, [currentImageIndex, showImage]);

    const showPrevImage = useCallback(() => {
        showImage(currentImageIndex - 1, -1);
    }, [currentImageIndex, showImage]);

    const handleTouchEnd = (event) => {
        if (!touchStart.current || images.length < 2) return;

        const deltaX = touchStart.current.x - event.changedTouches[0].clientX;
        const deltaY = touchStart.current.y - event.changedTouches[0].clientY;
        if (Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
            didSwipe.current = true;
            if (deltaX > 0) showNextImage();
            else showPrevImage();
            window.setTimeout(() => {
                didSwipe.current = false;
            }, 120);
        }

        touchStart.current = null;
    };

    if (!images || images.length === 0) {
        return <div className="flex h-96 items-center justify-center rounded-3xl bg-slate-200 dark:bg-secondary-700"><p className="font-bold text-slate-500 dark:text-secondary-300">No Images Available</p></div>;
    }

    const mainImage = images[currentImageIndex] || images[0];
    const sideImages = images.slice(1, 5);

    return (
        <div className="rr-image-gallery relative">
            <div className="rr-image-gallery-main grid h-[260px] grid-cols-1 gap-2 sm:h-[340px] md:h-[450px] md:grid-cols-4 md:grid-rows-2">
                {/* Main Image */}
                <div
                    className="rr-gallery-main-frame md:col-span-2 md:row-span-2 h-full cursor-pointer touch-pan-y overflow-hidden rounded-2xl md:rounded-l-2xl md:rounded-r-none"
                    onClick={() => {
                        if (!didSwipe.current) openModal(currentImageIndex);
                    }}
                    onTouchStart={(event) => {
                        touchStart.current = {
                            x: event.touches[0].clientX,
                            y: event.touches[0].clientY,
                        };
                    }}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={() => { touchStart.current = null; }}
                >
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.img
                            key={`${mainImage}-${currentImageIndex}`}
                            custom={direction}
                            src={mainImage}
                            alt={`Room view ${currentImageIndex + 1}`}
                            variants={photoSlideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                            className="rr-gallery-main-img h-full w-full object-cover transition hover:opacity-95"
                            loading="eager"
                            decoding="async"
                            fetchPriority="high"
                            draggable="false"
                        />
                    </AnimatePresence>
                </div>
                
                {/* Side Images */}
                {sideImages.map((img, index) => {
                    let roundedClass = '';
                    if (index === 1) roundedClass = 'rounded-tr-2xl'; // Top-right
                    if (index === 3) roundedClass = 'rounded-br-2xl'; // Bottom-right
                    
                    return (
                        <div key={index} className="rr-gallery-side-frame hidden md:block h-full cursor-pointer overflow-hidden" onClick={() => openModal(index + 1)}>
                            <img src={img} alt={`Room view ${index + 2}`} className={`w-full h-full object-cover hover:opacity-90 transition ${roundedClass}`} loading="lazy" decoding="async" />
                        </div>
                    );
                })}
            </div>

            {/* Show all photos button */}
            <button 
                type="button"
                onClick={() => openModal(currentImageIndex)}
                className="rr-gallery-action-btn absolute bottom-3 right-3 rounded-2xl border border-light-border bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-lg transition hover:bg-slate-100 dark:border-dark-border dark:bg-dark-card dark:text-dark-text dark:hover:bg-dark-input sm:bottom-4 sm:right-4 sm:px-4 sm:text-sm"
            >
                Show all photos
            </button>

            {images.length > 1 && (
                <div className="rr-gallery-counter absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-slate-950/70 px-2.5 py-1.5 text-[11px] font-black text-white shadow-lg md:hidden">
                    {images.slice(0, Math.min(images.length, 6)).map((_, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => showImage(index, index >= currentImageIndex ? 1 : -1)}
                            className={`h-1.5 rounded-full transition-all ${index === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/45'}`}
                            aria-label={`Show photo ${index + 1}`}
                        />
                    ))}
                    <span className="ml-1">{currentImageIndex + 1}/{images.length}</span>
                </div>
            )}

            {/* Modal Logic */}
            <AnimatePresence>
                {isModalOpen && <ImageModal images={images} initialIndex={selectedImageIndex} onClose={() => setIsModalOpen(false)} />}
            </AnimatePresence>
        </div>
    );
};

export default ImageGallery;
