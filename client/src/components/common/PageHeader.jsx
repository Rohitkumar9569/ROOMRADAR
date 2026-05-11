// client/src/components/PageHeader.jsx
import React from 'react';

const PageHeader = ({ title, subtitle, actions }) => {
    return (
        <div className="mb-6 rounded-2xl border border-light-border bg-light-card p-4 shadow-sm dark:border-dark-border dark:bg-dark-card sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-light-text dark:text-dark-text sm:text-2xl">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-light-muted dark:text-dark-muted">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {actions}
                </div>
            </div>
        </div>
    );
};
export default PageHeader;
