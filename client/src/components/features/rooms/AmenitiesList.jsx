// src/components/AmenitiesList.jsx

import React, { useState } from 'react';
import { 
    WifiIcon, 
    BoltIcon, 
    WrenchScrewdriverIcon, // <-- Corrected Icon for Water Utility
    FireIcon, 
    BuildingLibraryIcon,
    HomeModernIcon,
    SunIcon, 
    KeyIcon, 
    TruckIcon,
    BuildingOfficeIcon, 
    ShieldCheckIcon, 
    ComputerDesktopIcon 
} from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';

const amenitiesMap = {
    wifi: { icon: WifiIcon, name: 'Wi-Fi' },
    powerBackup: { icon: BoltIcon, name: 'Power Backup' },
    waterSupply: { icon: WrenchScrewdriverIcon, name: '24/7 Water' }, // <-- Corrected
    geyser: { icon: FireIcon, name: 'Geyser' },
    attachedWashroom: { icon: BuildingLibraryIcon, name: 'Attached Washroom' },
    ac: { icon: SunIcon, name: 'Air Conditioner' },
    fullyFurnished: { icon: HomeModernIcon, name: 'Fully Furnished' },
    parking: { icon: TruckIcon, name: 'Parking' },
    lift: { icon: BuildingOfficeIcon, name: 'Lift' },
    security: { icon: ShieldCheckIcon, name: '24/7 Security' },
    laundry: { icon: KeyIcon, name: 'Laundry Service' },
    kitchen: { icon: ComputerDesktopIcon, name: 'Kitchen Area' },
};

const AmenitiesList = ({ facilities = {} }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const availableAmenities = Object.keys(amenitiesMap)
        .filter(key => facilities[key] === true);

    const previewAmenities = availableAmenities.slice(0, 6);

    if (availableAmenities.length === 0) {
        return <p className="text-sm font-semibold text-slate-500 dark:text-secondary-300">No specific amenities listed.</p>;
    }

    return (
        <div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {previewAmenities.map(key => {
                    const AmenityIcon = amenitiesMap[key].icon;
                    return (
                        <div key={key} className="flex min-h-[74px] items-center gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-secondary-900 sm:gap-3 sm:p-4">
                            <AmenityIcon className="h-5 w-5 flex-shrink-0 text-cyan-600 dark:text-cyan-300 sm:h-6 sm:w-6" />
                            <span className="min-w-0 text-xs font-black leading-snug text-slate-800 dark:text-secondary-100 sm:text-sm">{amenitiesMap[key].name}</span>
                        </div>
                    );
                })}
            </div>

            {availableAmenities.length > 6 && (
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:border-cyan-200 hover:text-cyan-700 dark:border-secondary-700 dark:bg-secondary-800 dark:text-secondary-100"
                >
                    Show all {availableAmenities.length} amenities
                </button>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
                    <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-secondary-800">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
                              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-secondary-700">
                                <XMarkIcon className="h-6 w-6"/>
                            </button>
                            <h2 className="text-lg font-black text-slate-950 dark:text-white">What this place offers</h2>
                            <div></div>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto p-5">
                            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                {availableAmenities.map(key => {
                                    const AmenityIcon = amenitiesMap[key].icon;
                                    return (
                                        <div key={key} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-secondary-900">
                                            <AmenityIcon className="h-7 w-7 text-cyan-600 dark:text-cyan-300" />
                                            <span className="text-base font-black text-slate-800 dark:text-secondary-100">{amenitiesMap[key].name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AmenitiesList;
