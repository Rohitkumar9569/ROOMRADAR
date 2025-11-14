// src/components/CategoryBar.jsx

import React, { useState } from 'react';
import { 
    AcademicCapIcon, 
    BuildingOffice2Icon, 
    UserIcon, 
    BuildingOfficeIcon, 
    UserGroupIcon, 
    CurrencyRupeeIcon,
    SparklesIcon,
    AdjustmentsHorizontalIcon // Filter icon
} from '@heroicons/react/24/outline';

const categories = [
    { name: 'Near College', icon: AcademicCapIcon, key: 'college' },
    { name: 'Near IT Park', icon: BuildingOffice2Icon, key: 'it_park' },
    { name: 'Single Rooms', icon: UserIcon, key: 'single_room' },
    { name: 'Full Flats', icon: BuildingOfficeIcon, key: 'full_flat' },
    { name: 'Shared Rooms', icon: UserGroupIcon, key: 'shared_room' },
    { name: 'Budget-friendly', icon: CurrencyRupeeIcon, key: 'budget' },
    { name: 'New Listings', icon: SparklesIcon, key: 'new' },
];

// FiltersButton component, now with an icon
const FiltersButton = ({ onClick }) => (
    <button 
        onClick={onClick}
        className="hidden md:flex items-center gap-2 border border-neutral-300 rounded-xl px-4 py-3 text-sm font-semibold hover:border-black transition"
    >
        <AdjustmentsHorizontalIcon className="h-5 w-5" />
        <span>Filters</span>
    </button>
);

const CategoryBar = ({ onSelectCategory }) => {
    const [selectedCategory, setSelectedCategory] = useState(null);

    const handleCategoryClick = (categoryKey) => {
        const newCategory = selectedCategory === categoryKey ? null : categoryKey;
        setSelectedCategory(newCategory);
        if (onSelectCategory) {
            onSelectCategory(newCategory);
        }
    };

    // The main container no longer needs to be sticky on its own.
    // The parent <header> in HomePage will handle the sticky behavior.
    return (
        <div className="border-b border-t">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-8">
                    {/* Scrollable categories container */}
                    <div className="flex-grow flex items-center gap-8 overflow-x-auto py-1 scrollbar-hide">
                        {categories.map((category) => (
                            <button 
                                key={category.key}
                                onClick={() => handleCategoryClick(category.key)}
                                // Restyled for a cleaner, Airbnb-like feel
                                className={`flex flex-col items-center gap-2 pt-4 pb-3 flex-shrink-0 text-neutral-600 hover:text-black transition-colors duration-200 whitespace-nowrap
                                  border-b-2
                                  ${selectedCategory === category.key 
                                    ? 'text-black font-medium border-black' 
                                    : 'border-transparent hover:border-neutral-300'
                                  }`}
                            >
                                <category.icon className="h-6 w-6" />
                                <span className="text-xs font-semibold">{category.name}</span>
                            </button>
                        ))}
                    </div>
                    
                    {/* Filters button on the right */}
                    <div className="flex-shrink-0">
                        <FiltersButton onClick={() => console.log("Filters button clicked!")} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryBar;