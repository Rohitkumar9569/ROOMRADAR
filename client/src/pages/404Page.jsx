import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Radar, Search } from 'lucide-react';

const NotFoundPage = () => (
    <main className="flex min-h-screen items-center justify-center bg-light-bg px-4 py-16 text-light-text dark:bg-dark-bg dark:text-dark-text">
        <section className="w-full max-w-2xl rounded-3xl border border-light-border bg-light-card p-8 text-center shadow-sm dark:border-dark-border dark:bg-dark-card">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-white">
                <Radar className="h-8 w-8" />
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-brand">404</p>
            <h1 className="mt-3 text-3xl font-semibold md:text-5xl">Page not found</h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-light-muted dark:text-dark-muted">
                This RoomRadar page is not available, but your search can continue from the home screen.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/" className="btn-primary inline-flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Go Home
                </Link>
                <Link to="/rooms" className="btn-outline inline-flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search Rooms
                </Link>
            </div>
        </section>
    </main>
);

export default NotFoundPage;
