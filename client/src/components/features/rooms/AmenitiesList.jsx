// src/components/AmenitiesList.jsx

import React, { useState } from 'react';
import { 
    WifiIcon, 
    BoltIcon, 
    WrenchScrewdriverIcon, // <-- Corrected Icon for Water Utility
    FireIcon, 
    BuildingLibraryIcon,
    SparklesIcon, 
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
    fullyFurnished: { icon: SparklesIcon, name: 'Fully Furnished' },
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
        return <p className="text-gray-600">No specific amenities listed.</p>;
    }

    return (
        <div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {previewAmenities.map(key => {
                    const AmenityIcon = amenitiesMap[key].icon;
                    return (
                        <div key={key} className="flex items-center space-x-3">
                            <AmenityIcon className="h-6 w-6 text-gray-800" />
                            <span className="text-gray-700">{amenitiesMap[key].name}</span>
                        </div>
                    );
                })}
            </div>

            {availableAmenities.length > 6 && (
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="mt-6 border border-gray-800 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition"
                >
                    Show all {availableAmenities.length} amenities
                </button>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
                              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-gray-200">
                                <XMarkIcon className="h-6 w-6"/>
                            </button>
                            <h2 className="text-lg font-semibold">What this place offers</h2>
                            <div></div>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4">
                                {availableAmenities.map(key => {
                                    const AmenityIcon = amenitiesMap[key].icon;
                                    return (
                                        <div key={key} className="flex items-center space-x-4">
                                            <AmenityIcon className="h-7 w-7 text-gray-800" />
                                            <span className="text-gray-700 text-lg">{amenitiesMap[key].name}</span>
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