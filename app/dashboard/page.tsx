'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Add Guest Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [parsedNames, setParsedNames] = useState<string[]>([]);
  const [addingLoading, setAddingLoading] = useState(false);

  // Edit / Delete mode
  const [editMode, setEditMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Guest | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const parseNames = (input: string): string[] => {
    return input
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .filter((s, i, arr) => arr.indexOf(s) === i); // dedupe
  };

  const handleRawInputChange = (value: string) => {
    setRawInput(value);
    setParsedNames(parseNames(value));
  };

  const removeName = (index: number) => {
    const updated = parsedNames.filter((_, i) => i !== index);
    setParsedNames(updated);
    setRawInput(updated.join('\n'));
  };

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      if (res.status === 401) { router.push('/'); return; }
      if (!res.ok) throw new Error('Failed to fetch');
      const data: EventData = await res.json();
      setEvent(data);
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  // Close modal on Escape
  useEffect(() => {
    if (!modalOpen && !deleteTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, deleteTarget]);

  const openModal = () => {
    setRawInput('');
    setParsedNames([]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setRawInput('');
    setParsedNames([]);
  };

  const handleAddGuest = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (parsedNames.length === 0) return;

    setAddingLoading(true);

    try {
      const res = await fetch('/api/events/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: parsedNames }),
      });

      if (!res.ok) throw new Error('Failed to add guests');

      const count = parsedNames.length;
      closeModal();
      await fetchEvent();
      showToast(count === 1
        ? `${parsedNames[0]} has been added to the guest list.`
        : `${count} guests have been added to the guest list.`
      );
    } catch {
      showToast('Could not add guests. Please try again.', 'error');
    } finally {
      setAddingLoading(false);
    }
  };

  const handleDeleteGuest = async () => {
    if (!deleteTarget) return;
    setDeletingLoading(true);
    try {
      const res = await fetch(
        `/api/events/${deleteTarget.event_id}/guests/${deleteTarget.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to delete');
      const name = deleteTarget.name;
      setDeleteTarget(null);
      await fetchEvent();
      showToast(`${name} has been removed from the guest list.`);
    } catch {
      setDeleteTarget(null);
      showToast('Could not delete guest. Please try again.', 'error');
    } finally {
      setDeletingLoading(false);
    }
  };

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

  const searchFiltered = search.trim()
    ? guests.filter(g => g.name.toLowerCase().includes(search.trim().toLowerCase()))
    : guests;
  const filtered = filter === 'all' ? searchFiltered : searchFiltered.filter(g => g.rsvp_status === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (value: Filter) => { setFilter(value); setPage(1); };
  const handleSearchChange = (value: string) => { setSearch(value); setPage(1); };

  const tabCount = (value: Filter) => {
    if (value === 'all') return searchFiltered.length;
    return searchFiltered.filter(g => g.rsvp_status === value).length;
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5E6E0] flex items-center justify-center">
        <p className="text-sm tracking-[0.2em] uppercase text-[#8B7468]" style={serif}>
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="text-sm sm:text-base tracking-[0.2em] uppercase text-[#4A2E24]" style={serif}>
            Events Dashboard
          </span>
          <button
            onClick={handleSignOut}
            className="text-xs tracking-[0.2em] uppercase text-[#6B4F43] hover:text-[#4A2E24] transition-colors"
            style={serif}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Event heading */}
        <div className="mb-8 sm:mb-10">
          <p className="text-xs tracking-[0.3em] uppercase text-[#6B4F43] mb-2" style={serif}>
            Event
          </p>
          <h1 className="text-4xl sm:text-5xl text-[#4A2E24] italic mb-4" style={serif}>
            {event?.title}
          </h1>
          <div className="w-16 h-px bg-[#C4A88A]" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
          {[
            { label: 'Going',     count: counts.yes,     color: 'text-[#2e7d32]' },
            { label: 'Not Going', count: counts.no,      color: 'text-[#b91c1c]' },
            { label: 'Pending',   count: counts.pending, color: 'text-[#92400e]' },
          ].map(({ label, count, color }) => (
            <div key={label} className="bg-white/70 border border-[#C4A88A]/30 p-4 sm:p-6">
              <p className="text-[11px] sm:text-xs tracking-[0.2em] uppercase text-[#6B4F43] mb-2 sm:mb-3" style={serif}>
                {label}
              </p>
              <p className={`text-3xl sm:text-4xl font-light ${color}`} style={serif}>
                {count}
              </p>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white/70 border border-[#C4A88A]/30">

          {/* Filter tabs + Add Guest */}
          <div className="flex flex-wrap items-end gap-1 border-b border-[#C4A88A]/30 px-4 sm:px-6 pt-4 sm:pt-5">
            <div className="flex flex-wrap gap-1 flex-1">
              {FILTER_TABS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => handleFilterChange(value)}
                  className={`px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase transition-all duration-200 ${
                    filter === value
                      ? 'bg-[#6B4F43] text-white'
                      : 'text-[#6B4F43] hover:text-[#4A2E24]'
                  }`}
                  style={serif}
                >
                  {label}
                  <span className={`ml-1.5 tabular-nums ${filter === value ? 'text-white/60' : 'text-[#C4A88A]'}`}>
                    {tabCount(value)}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditMode(m => !m)}
                className={`px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase transition-colors ${
                  editMode
                    ? 'text-[#b91c1c] hover:text-[#7f1d1d]'
                    : 'text-[#6B4F43] hover:text-[#4A2E24]'
                }`}
                style={serif}
              >
                {editMode ? 'Done' : 'Edit Guests'}
              </button>
              <button
                onClick={openModal}
                className="px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase text-[#6B4F43] hover:text-[#4A2E24] transition-colors"
                style={serif}
              >
                + Add Guest
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 sm:px-6 py-4 border-b border-[#C4A88A]/20">
            <input
              type="text"
              placeholder="Search by name…"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full bg-transparent border border-[#C4A88A]/50 px-4 py-2 text-sm text-[#3A3A3A] placeholder-[#C4A88A] focus:outline-none focus:border-[#6B4F43] transition-colors"
              style={serif}
            />
          </div>

          {/* Column headers */}
          <div className={`grid ${editMode ? 'grid-cols-[2rem_2rem_1fr_auto] sm:grid-cols-[2.5rem_2rem_1fr_auto]' : 'grid-cols-[2rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_auto]'} items-center px-4 sm:px-6 py-3 border-b border-[#C4A88A]/20 bg-[#FAF5F0]/60`}>
            <span className="text-xs tracking-[0.2em] uppercase text-[#6B4F43]" style={serif}>#</span>
            {editMode && <span />}
            <span className="text-xs tracking-[0.2em] uppercase text-[#6B4F43]" style={serif}>Name</span>
            <span className="text-xs tracking-[0.2em] uppercase text-[#6B4F43]" style={serif}>RSVP</span>
          </div>

          {/* Rows */}
          {paginated.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm tracking-[0.2em] uppercase text-[#8B7468]/60" style={serif}>
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
                    className={`grid ${editMode ? 'grid-cols-[2rem_2rem_1fr_auto] sm:grid-cols-[2.5rem_2rem_1fr_auto]' : 'grid-cols-[2rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_auto]'} items-center px-4 sm:px-6 py-3.5 sm:py-4 hover:bg-[#FAF5F0]/60 transition-colors`}
                  >
                    <span className="text-sm text-[#C4A88A] tabular-nums" style={serif}>
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </span>
                    {editMode && (
                      <button
                        onClick={() => setDeleteTarget(guest)}
                        className="w-5 h-5 flex items-center justify-center rounded-full border border-[#fca5a5] text-[#b91c1c] hover:bg-[#fdf2f2] transition-colors text-sm leading-none"
                        aria-label={`Delete ${guest.name}`}
                        title={`Delete ${guest.name}`}
                      >
                        −
                      </button>
                    )}
                    <p className="text-base text-[#1A1A1A] pr-4" style={serif}>
                      {guest.name}
                    </p>
                    <span
                      className={`text-xs tracking-[0.05em] uppercase px-2.5 sm:px-3 py-1 whitespace-nowrap ${badge.className}`}
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
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-[#C4A88A]/20">
            <p className="text-xs tracking-[0.1em] text-[#6B4F43] tabular-nums" style={serif}>
              {filtered.length === 0
                ? 'No results'
                : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="px-3 sm:px-4 py-1.5 text-xs tracking-[0.15em] uppercase border border-[#C4A88A]/50 text-[#6B4F43] hover:border-[#4A2E24] hover:text-[#4A2E24] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={serif}
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">←</span>
              </button>
              <span className="text-xs text-[#6B4F43] tracking-[0.1em] tabular-nums" style={serif}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="px-3 sm:px-4 py-1.5 text-xs tracking-[0.15em] uppercase border border-[#C4A88A]/50 text-[#6B4F43] hover:border-[#4A2E24] hover:text-[#4A2E24] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={serif}
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">→</span>
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* ── Add Guest Modal ───────────────────────────────────────────────── */}
      {modalOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#2A1810]/50 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md bg-[#FAF5F0] border border-[#C4A88A]/50 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#C4A88A]/30">
              <div>
                <p className="text-xs tracking-[0.3em] uppercase text-[#6B4F43] mb-1" style={serif}>
                  Guest List
                </p>
                <h2 className="text-2xl text-[#4A2E24] italic" style={serif}>
                  Add a Guest
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="text-[#C4A88A] hover:text-[#4A2E24] transition-colors text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddGuest} className="px-6 py-6">
              <label
                htmlFor="guest-names"
                className="block text-xs tracking-[0.2em] uppercase text-[#6B4F43] mb-1"
                style={serif}
              >
                Names
              </label>
              <p className="text-xs text-[#8B7468] mb-2" style={serif}>
                Separate multiple names with a comma or new line.
              </p>
              <textarea
                id="guest-names"
                autoFocus
                rows={4}
                placeholder={"Jane Smith\nJohn Doe, Emily Clarke"}
                value={rawInput}
                onChange={e => handleRawInputChange(e.target.value)}
                className="w-full bg-white border border-[#C4A88A]/50 px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#C4A88A] focus:outline-none focus:border-[#6B4F43] transition-colors resize-none"
                style={serif}
              />

              {/* Parsed name chips */}
              {parsedNames.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {parsedNames.map((name, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 bg-[#EDE0D8] border border-[#C4A88A]/50 px-3 py-1 text-sm text-[#4A2E24]"
                      style={serif}
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeName(i)}
                        className="text-[#C4A88A] hover:text-[#4A2E24] transition-colors leading-none"
                        aria-label={`Remove ${name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 justify-end mt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs tracking-[0.15em] uppercase text-[#8B7468] hover:text-[#4A2E24] transition-colors"
                  style={serif}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingLoading || parsedNames.length === 0}
                  className="px-6 py-2 text-xs tracking-[0.15em] uppercase bg-[#6B4F43] text-white hover:bg-[#4A2E24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={serif}
                >
                  {addingLoading
                    ? 'Adding…'
                    : parsedNames.length > 1
                      ? `Add ${parsedNames.length} Guests`
                      : 'Add Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      {deleteTarget && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-[#2A1810]/50 backdrop-blur-sm"
            onClick={() => !deletingLoading && setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-sm bg-[#FAF5F0] border border-[#C4A88A]/50 shadow-xl">
            <div className="px-6 py-5 border-b border-[#C4A88A]/30">
              <p className="text-xs tracking-[0.3em] uppercase text-[#6B4F43] mb-1" style={serif}>
                Remove Guest
              </p>
              <h2 className="text-2xl text-[#4A2E24] italic" style={serif}>
                Are you sure?
              </h2>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm text-[#3A3A3A] mb-6" style={serif}>
                Are you sure you want to delete{' '}
                <span className="font-semibold text-[#4A2E24]">{deleteTarget.name}</span>{' '}
                as a guest?
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deletingLoading}
                  className="px-4 py-2 text-xs tracking-[0.15em] uppercase text-[#8B7468] hover:text-[#4A2E24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={serif}
                >
                  No, Keep
                </button>
                <button
                  type="button"
                  onClick={handleDeleteGuest}
                  disabled={deletingLoading}
                  className="px-6 py-2 text-xs tracking-[0.15em] uppercase bg-[#b91c1c] text-white hover:bg-[#7f1d1d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={serif}
                >
                  {deletingLoading ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && createPortal(
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 text-white text-sm shadow-lg flex items-center gap-3 animate-fade-in-up ${toast.type === 'error' ? 'bg-[#7f1d1d]' : 'bg-[#4A2E24]'}`}>
          <span className={toast.type === 'error' ? 'text-[#fca5a5]' : 'text-[#C4A88A]'}>
            {toast.type === 'error' ? '✕' : '✓'}
          </span>
          <span style={serif}>{toast.message}</span>
        </div>,
        document.body
      )}

    </div>
  );
}
