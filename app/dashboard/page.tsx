'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type RSVPStatus = 'yes' | 'no' | 'pending';
type Filter = 'all' | RSVPStatus;

interface Guest {
  id: number;
  event_id: number;
  name: string;
  rsvp_status: RSVPStatus;
  responded_at: string | null;
  created_at: string;
}

interface EventData {
  id: number;
  title: string;
  event_date: string;
  rsvp_deadline: string;
  guests: Guest[];
}

const PAGE_SIZE = 20;

const serif = { fontFamily: 'var(--font-cormorant), serif' };

const FILTER_TABS: { label: string; value: Filter }[] = [
  { label: 'All',       value: 'all' },
  { label: 'Going',     value: 'yes' },
  { label: 'Not Going', value: 'no' },
  { label: 'Pending',   value: 'pending' },
];

const rsvpBadge: Record<RSVPStatus, { label: string; className: string }> = {
  yes:     { label: 'Going',     className: 'bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]' },
  no:      { label: 'Not Going', className: 'bg-[#fdf2f2] text-[#b91c1c] border border-[#fca5a5]' },
  pending: { label: 'Pending',   className: 'bg-[#fffbeb] text-[#92400e] border border-[#fcd34d]' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch('/api/events');

        if (res.status === 401) {
          router.push('/');
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to fetch');
        }

        const data: EventData = await res.json();
        setEvent(data);
      } catch {
        // Network error or unexpected — send back to login
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [router]);

  const handleSignOut = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  };

  const guests = event?.guests ?? [];

  const counts = {
    yes:     guests.filter(g => g.rsvp_status === 'yes').length,
    no:      guests.filter(g => g.rsvp_status === 'no').length,
    pending: guests.filter(g => g.rsvp_status === 'pending').length,
  };

  const filtered = filter === 'all' ? guests : guests.filter(g => g.rsvp_status === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (value: Filter) => {
    setFilter(value);
    setPage(1);
  };

  const tabCount = (value: Filter) =>
    value === 'all' ? guests.length : counts[value];

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5E6E0] flex items-center justify-center">
        <p
          className="text-sm tracking-[0.2em] uppercase text-[#8B7468]"
          style={serif}
        >
          Loading...
        </p>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5E6E0]">

      {/* Top nav */}
      <header className="bg-white/80 border-b border-[#C4A88A]/30 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span
            className="text-base tracking-[0.2em] uppercase text-[#6B4F43]"
            style={serif}
          >
            Events Dashboard
          </span>
          <button
            onClick={handleSignOut}
            className="text-xs tracking-[0.2em] uppercase text-[#8B7468] hover:text-[#6B4F43] transition-colors"
            style={serif}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Event heading */}
        <div className="mb-10">
          <p
            className="text-xs tracking-[0.3em] uppercase text-[#8B7468] mb-2"
            style={serif}
          >
            Event
          </p>
          <h1
            className="text-5xl text-[#6B4F43] italic mb-4"
            style={serif}
          >
            {event?.title}
          </h1>
          <div className="w-16 h-px bg-[#C4A88A]" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Going',     count: counts.yes,     color: 'text-[#2e7d32]' },
            { label: 'Not Going', count: counts.no,      color: 'text-[#b91c1c]' },
            { label: 'Pending',   count: counts.pending, color: 'text-[#92400e]' },
          ].map(({ label, count, color }) => (
            <div
              key={label}
              className="bg-white/70 border border-[#C4A88A]/30 p-6"
            >
              <p
                className="text-xs tracking-[0.25em] uppercase text-[#8B7468] mb-3"
                style={serif}
              >
                {label}
              </p>
              <p className={`text-4xl font-light ${color}`} style={serif}>
                {count}
              </p>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white/70 border border-[#C4A88A]/30">

          {/* Filter tabs */}
          <div className="flex border-b border-[#C4A88A]/30 px-6 pt-5 gap-1">
            {FILTER_TABS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleFilterChange(value)}
                className={`px-4 py-2 text-xs tracking-[0.2em] uppercase transition-all duration-200 ${
                  filter === value
                    ? 'bg-[#6B4F43] text-white'
                    : 'text-[#8B7468] hover:text-[#6B4F43]'
                }`}
                style={serif}
              >
                {label}
                <span className={`ml-1.5 ${filter === value ? 'text-white/60' : 'text-[#C4A88A]'}`}>
                  {tabCount(value)}
                </span>
              </button>
            ))}
          </div>

          {/* Column headers */}
          <div className="flex items-center px-6 py-3 border-b border-[#C4A88A]/20 bg-[#FAF5F0]/60">
            <span
              className="w-10 text-xs tracking-[0.2em] uppercase text-[#8B7468]"
              style={serif}
            >
              #
            </span>
            <span
              className="flex-1 text-xs tracking-[0.2em] uppercase text-[#8B7468]"
              style={serif}
            >
              Name
            </span>
            <span
              className="text-xs tracking-[0.2em] uppercase text-[#8B7468]"
              style={serif}
            >
              RSVP
            </span>
          </div>

          {/* Rows */}
          {paginated.length === 0 ? (
            <div className="py-16 text-center">
              <p
                className="text-sm tracking-[0.2em] uppercase text-[#8B7468]/60"
                style={serif}
              >
                No guests found
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#C4A88A]/15">
              {paginated.map((guest, idx) => {
                const badge = rsvpBadge[guest.rsvp_status];
                return (
                  <div
                    key={guest.id}
                    className="flex items-center px-6 py-4 hover:bg-[#FAF5F0]/60 transition-colors"
                  >
                    <span
                      className="w-10 text-sm text-[#C4A88A]"
                      style={serif}
                    >
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </span>
                    <p
                      className="flex-1 text-base text-[#3A3A3A]"
                      style={serif}
                    >
                      {guest.name}
                    </p>
                    <span
                      className={`text-xs tracking-[0.1em] uppercase px-3 py-1 ${badge.className}`}
                      style={serif}
                    >
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#C4A88A]/20">
            <p
              className="text-xs tracking-[0.1em] text-[#8B7468]"
              style={serif}
            >
              {filtered.length === 0
                ? 'No results'
                : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="px-4 py-1.5 text-xs tracking-[0.2em] uppercase border border-[#C4A88A]/50 text-[#8B7468] hover:border-[#6B4F43] hover:text-[#6B4F43] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={serif}
              >
                Previous
              </button>
              <span
                className="text-xs text-[#8B7468] tracking-[0.1em]"
                style={serif}
              >
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="px-4 py-1.5 text-xs tracking-[0.2em] uppercase border border-[#C4A88A]/50 text-[#8B7468] hover:border-[#6B4F43] hover:text-[#6B4F43] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={serif}
              >
                Next
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
