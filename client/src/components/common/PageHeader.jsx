// client/src/components/PageHeader.jsx
import React from 'react';

const PageHeader = ({ title, subtitle, actions }) => {
    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {actions}
                </div>
            </div>
        </div>
    );
};
export default PageHeader;