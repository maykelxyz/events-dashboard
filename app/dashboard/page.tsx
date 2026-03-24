'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

type RSVPStatus = 'yes' | 'no' | 'pending';
type Filter = 'all' | RSVPStatus;
type Tab = 'guests' | 'seating';

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

interface GuestSeatAssignment {
  id: number;
  event_table_id: number;
  guest_id: number;
  seat_label: string;
  assigned_at: string;
  updated_at: string;
}

interface TableWithSeats {
  id: number;
  event_id: number;
  name: string;
  seats: GuestSeatAssignment[];
  created_at: string;
  updated_at: string;
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
  const [activeTab, setActiveTab] = useState<Tab>('guests');

  // Guest list state
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Add Guest Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [parsedNames, setParsedNames] = useState<string[]>([]);
  const [addingLoading, setAddingLoading] = useState(false);

  // Edit / Delete guest mode
  const [editMode, setEditMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Guest | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Seating state
  const [tables, setTables] = useState<TableWithSeats[]>([]);
  const [seatingLoading, setSeatingLoading] = useState(false);

  // Create table modal
  const [createTableOpen, setCreateTableOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [creatingTable, setCreatingTable] = useState(false);

  // Rename table modal
  const [renameTarget, setRenameTarget] = useState<TableWithSeats | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renamingTable, setRenamingTable] = useState(false);

  // Delete table modal
  const [deleteTableTarget, setDeleteTableTarget] = useState<TableWithSeats | null>(null);
  const [deletingTable, setDeletingTable] = useState(false);

  // Assign guest modal
  const [assignTarget, setAssignTarget] = useState<TableWithSeats | null>(null);
  const [assignRows, setAssignRows] = useState<{ guestId: number | ''; seatLabel: string }[]>([{ guestId: '', seatLabel: '' }]);
  const [assigningGuest, setAssigningGuest] = useState(false);

  // Unassign guest modal
  const [unassignTarget, setUnassignTarget] = useState<{ guestId: number; guestName: string; eventId: number } | null>(null);
  const [unassigningGuest, setUnassigningGuest] = useState(false);

  // Find guest modal
  const [findGuestOpen, setFindGuestOpen] = useState(false);
  const [findGuestQuery, setFindGuestQuery] = useState('');
  const [findGuestPage, setFindGuestPage] = useState(1);
  const [findGuestFilter, setFindGuestFilter] = useState<'all' | 'unassigned'>('all');

  // Quick-assign modal (from Find Guest)
  const [quickAssignGuest, setQuickAssignGuest] = useState<Guest | null>(null);
  const [quickAssignTableId, setQuickAssignTableId] = useState<number | ''>('');
  const [quickAssignSeatLabel, setQuickAssignSeatLabel] = useState('');
  const [quickAssigning, setQuickAssigning] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const parseNames = (input: string): string[] => {
    return input
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .filter((s, i, arr) => arr.indexOf(s) === i);
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

  const fetchSeating = useCallback(async (eventId: number) => {
    setSeatingLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/seating`);
      if (!res.ok) throw new Error('Failed to fetch seating');
      const data: TableWithSeats[] = await res.json();
      setTables(data);
    } catch {
      showToast('Could not load seating layout.', 'error');
    } finally {
      setSeatingLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  useEffect(() => {
    if (activeTab === 'seating' && event) {
      fetchSeating(event.id);
    }
  }, [activeTab, event, fetchSeating]);

  // Close modals on Escape
  useEffect(() => {
    const anyOpen =
      modalOpen || !!deleteTarget ||
      createTableOpen || !!renameTarget || !!deleteTableTarget ||
      !!assignTarget || !!unassignTarget || findGuestOpen || !!quickAssignGuest;
    if (!anyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        setDeleteTarget(null);
        setCreateTableOpen(false);
        setRenameTarget(null);
        setDeleteTableTarget(null);
        setAssignTarget(null);
        setAssignRows([{ guestId: '', seatLabel: '' }]);
        setUnassignTarget(null);
        setFindGuestOpen(false);
        setFindGuestQuery('');
        setFindGuestPage(1);
        setFindGuestFilter('all');
        setQuickAssignGuest(null);
        setQuickAssignTableId('');
        setQuickAssignSeatLabel('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, deleteTarget, createTableOpen, renameTarget, deleteTableTarget, assignTarget, unassignTarget]);

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

  // ── Guest handlers ──────────────────────────────────────────────────────────

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

  // ── Table handlers ──────────────────────────────────────────────────────────

  const handleCreateTable = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!event || !newTableName.trim()) return;
    setCreatingTable(true);
    try {
      const res = await fetch(`/api/events/${event.id}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTableName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create table');
      const name = newTableName.trim();
      setCreateTableOpen(false);
      setNewTableName('');
      await fetchSeating(event.id);
      showToast(`Table "${name}" has been created.`);
    } catch {
      showToast('Could not create table. Please try again.', 'error');
    } finally {
      setCreatingTable(false);
    }
  };

  const handleRenameTable = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!event || !renameTarget || !renameName.trim()) return;
    setRenamingTable(true);
    try {
      const res = await fetch(`/api/events/${event.id}/tables/${renameTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to rename table');
      const name = renameName.trim();
      setRenameTarget(null);
      await fetchSeating(event.id);
      showToast(`Table renamed to "${name}".`);
    } catch {
      showToast('Could not rename table. Please try again.', 'error');
    } finally {
      setRenamingTable(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!event || !deleteTableTarget) return;
    setDeletingTable(true);
    try {
      const res = await fetch(`/api/events/${event.id}/tables/${deleteTableTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete table');
      const name = deleteTableTarget.name;
      setDeleteTableTarget(null);
      await fetchSeating(event.id);
      showToast(`Table "${name}" has been deleted.`);
    } catch {
      setDeleteTableTarget(null);
      showToast('Could not delete table. Please try again.', 'error');
    } finally {
      setDeletingTable(false);
    }
  };

  // ── Seating handlers ────────────────────────────────────────────────────────

  const handleAssignGuest = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!event || !assignTarget) return;
    const validRows = assignRows.filter(r => r.guestId !== '' && r.seatLabel.trim());
    if (validRows.length === 0) return;
    setAssigningGuest(true);
    try {
      const res = await fetch(`/api/events/${event.id}/seating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: validRows.map(r => ({
            event_table_id: assignTarget.id,
            guest_id: r.guestId,
            seat_label: r.seatLabel.trim(),
          })),
        }),
      });
      if (!res.ok) throw new Error('Failed to assign guests');
      const tableName = assignTarget.name;
      setAssignTarget(null);
      setAssignRows([{ guestId: '', seatLabel: '' }]);
      await fetchSeating(event.id);
      showToast(
        validRows.length === 1
          ? `${event.guests.find(g => g.id === validRows[0].guestId)?.name ?? 'Guest'} seated at ${tableName}, seat ${validRows[0].seatLabel.trim()}.`
          : `${validRows.length} guests seated at ${tableName}.`
      );
    } catch {
      showToast('Could not assign guests. Please try again.', 'error');
    } finally {
      setAssigningGuest(false);
    }
  };

  const handleUnassignGuest = async () => {
    if (!unassignTarget) return;
    setUnassigningGuest(true);
    try {
      const res = await fetch(
        `/api/events/${unassignTarget.eventId}/seating/${unassignTarget.guestId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to unassign guest');
      const name = unassignTarget.guestName;
      setUnassignTarget(null);
      await fetchSeating(unassignTarget.eventId);
      showToast(`${name} has been unassigned from their seat.`);
    } catch {
      setUnassignTarget(null);
      showToast('Could not unassign guest. Please try again.', 'error');
    } finally {
      setUnassigningGuest(false);
    }
  };

  const handleQuickAssign = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!event || !quickAssignGuest || quickAssignTableId === '' || !quickAssignSeatLabel.trim()) return;
    setQuickAssigning(true);
    try {
      const res = await fetch(`/api/events/${event.id}/seating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: [{
            event_table_id: quickAssignTableId,
            guest_id: quickAssignGuest.id,
            seat_label: quickAssignSeatLabel.trim(),
          }],
        }),
      });
      if (!res.ok) throw new Error('Failed to assign');
      const tableName = tables.find(t => t.id === quickAssignTableId)?.name ?? 'table';
      const seatLabel = quickAssignSeatLabel.trim();
      const guestName = quickAssignGuest.name;
      setQuickAssignGuest(null);
      setQuickAssignTableId('');
      setQuickAssignSeatLabel('');
      await fetchSeating(event.id);
      showToast(`${guestName} seated at ${tableName}, seat ${seatLabel}.`);
    } catch {
      showToast('Could not assign guest. Please try again.', 'error');
    } finally {
      setQuickAssigning(false);
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

  // Guests not yet assigned to any seat
  const assignedGuestIds = new Set(tables.flatMap(t => t.seats.map(s => s.guest_id)));
  const unassignedGuests = guests.filter(g => !assignedGuestIds.has(g.id));

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

        {/* Tab switcher */}
        <div className="flex border-b border-[#C4A88A]/30 mb-6">
          {(['guests', 'seating'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs tracking-[0.2em] uppercase transition-all duration-200 border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-[#6B4F43] text-[#4A2E24]'
                  : 'border-transparent text-[#8B7468] hover:text-[#6B4F43]'
              }`}
              style={serif}
            >
              {tab === 'guests' ? 'Guests' : 'Seating'}
            </button>
          ))}
        </div>

        {/* ── Guests Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'guests' && (
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
        )}

        {/* ── Seating Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'seating' && (
          <div>
            {/* Seating header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs tracking-[0.2em] uppercase text-[#6B4F43]" style={serif}>
                {tables.length} {tables.length === 1 ? 'Table' : 'Tables'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setFindGuestQuery(''); setFindGuestOpen(true); }}
                  className="px-4 py-2 text-xs tracking-[0.15em] uppercase text-[#6B4F43] hover:text-[#4A2E24] border border-[#C4A88A]/50 hover:border-[#4A2E24] transition-colors"
                  style={serif}
                >
                  Find Guest
                </button>
                <button
                  onClick={() => { setNewTableName(''); setCreateTableOpen(true); }}
                  className="px-4 py-2 text-xs tracking-[0.15em] uppercase text-[#6B4F43] hover:text-[#4A2E24] border border-[#C4A88A]/50 hover:border-[#4A2E24] transition-colors"
                  style={serif}
                >
                  + New Table
                </button>
              </div>
            </div>

            {seatingLoading ? (
              <div className="py-16 text-center">
                <p className="text-sm tracking-[0.2em] uppercase text-[#8B7468]" style={serif}>
                  Loading…
                </p>
              </div>
            ) : tables.length === 0 ? (
              <div className="bg-white/70 border border-[#C4A88A]/30 py-16 text-center">
                <p className="text-sm tracking-[0.2em] uppercase text-[#8B7468]/60" style={serif}>
                  No tables yet
                </p>
                <p className="text-xs text-[#C4A88A] mt-2" style={serif}>
                  Create a table to start assigning seats
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tables.map(table => (
                  <div key={table.id} className="bg-white/70 border border-[#C4A88A]/30">
                    {/* Table card header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[#C4A88A]/20">
                      <p className="text-base text-[#4A2E24] italic" style={serif}>
                        {table.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setRenameTarget(table); setRenameName(table.name); }}
                          className="text-xs tracking-[0.15em] uppercase text-[#8B7468] hover:text-[#4A2E24] transition-colors"
                          style={serif}
                        >
                          Rename
                        </button>
                        <span className="text-[#C4A88A]/50">·</span>
                        <button
                          onClick={() => setDeleteTableTarget(table)}
                          className="text-xs tracking-[0.15em] uppercase text-[#8B7468] hover:text-[#b91c1c] transition-colors"
                          style={serif}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Seats */}
                    <div className="divide-y divide-[#C4A88A]/15">
                      {table.seats.length === 0 ? (
                        <div className="px-5 py-5 text-center">
                          <p className="text-xs text-[#C4A88A]" style={serif}>
                            No guests assigned
                          </p>
                        </div>
                      ) : (
                        table.seats.map(seat => {
                          const guest = guests.find(g => g.id === seat.guest_id);
                          return (
                            <div key={seat.id} className="flex items-center justify-between px-5 py-3">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-[#C4A88A] tabular-nums min-w-[2rem]" style={serif}>
                                  {seat.seat_label}
                                </span>
                                <span className="text-sm text-[#1A1A1A]" style={serif}>
                                  {guest?.name ?? `Guest #${seat.guest_id}`}
                                </span>
                              </div>
                              <button
                                onClick={() => setUnassignTarget({
                                  guestId: seat.guest_id,
                                  guestName: guest?.name ?? `Guest #${seat.guest_id}`,
                                  eventId: table.event_id,
                                })}
                                className="text-xs tracking-[0.1em] uppercase text-[#C4A88A] hover:text-[#b91c1c] transition-colors"
                                style={serif}
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Assign seat button */}
                    <div className="px-5 py-3 border-t border-[#C4A88A]/20">
                      <button
                        onClick={() => { setAssignTarget(table); setAssignRows([{ guestId: '', seatLabel: '' }]); }}
                        disabled={unassignedGuests.length === 0}
                        className="text-xs tracking-[0.15em] uppercase text-[#6B4F43] hover:text-[#4A2E24] disabled:text-[#C4A88A] disabled:cursor-not-allowed transition-colors"
                        style={serif}
                      >
                        + Assign Seat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ── Add Guest Modal ───────────────────────────────────────────────── */}
      {modalOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-[#2A1810]/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-[#FAF5F0] border border-[#C4A88A]/50 shadow-xl">
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

      {/* ── Delete Guest Confirmation Modal ──────────────────────────────── */}
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

      {/* ── Create Table Modal ────────────────────────────────────────────── */}
      {createTableOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-[#2A1810]/50 backdrop-blur-sm"
            onClick={() => !creatingTable && setCreateTableOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-[#FAF5F0] border border-[#C4A88A]/50 shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#C4A88A]/30">
              <div>
                <p className="text-xs tracking-[0.3em] uppercase text-[#6B4F43] mb-1" style={serif}>
                  Seating
                </p>
                <h2 className="text-2xl text-[#4A2E24] italic" style={serif}>
                  New Table
                </h2>
              </div>
              <button
                onClick={() => setCreateTableOpen(false)}
                className="text-[#C4A88A] hover:text-[#4A2E24] transition-colors text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateTable} className="px-6 py-6">
              <label
                htmlFor="table-name"
                className="block text-xs tracking-[0.2em] uppercase text-[#6B4F43] mb-2"
                style={serif}
              >
                Table Name
              </label>
              <input
                id="table-name"
                autoFocus
                type="text"
                placeholder="e.g. Table 1, Bridal Party…"
                value={newTableName}
                onChange={e => setNewTableName(e.target.value)}
                className="w-full bg-white border border-[#C4A88A]/50 px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#C4A88A] focus:outline-none focus:border-[#6B4F43] transition-colors"
                style={serif}
              />
              <div className="flex items-center gap-3 justify-end mt-5">
                <button
                  type="button"
                  onClick={() => setCreateTableOpen(false)}
                  className="px-4 py-2 text-xs tracking-[0.15em] uppercase text-[#8B7468] hover:text-[#4A2E24] transition-colors"
                  style={serif}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTable || !newTableName.trim()}
                  className="px-6 py-2 text-xs tracking-[0.15em] uppercase bg-[#6B4F43] text-white hover:bg-[#4A2E24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={serif}
                >
                  {creatingTable ? 'Creating…' : 'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Rename Table Modal ────────────────────────────────────────────── */}
      {renameTarget && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-[#2A1810]/50 backdrop-blur-sm"
            onClick={() => !renamingTable && setRenameTarget(null)}
          />
          <div className="relative w-full max-w-sm bg-[#FAF5F0] border border-[#C4A88A]/50 shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#C4A88A]/30">
              <div>
                <p className="text-xs tracking-[0.3em] uppercase text-[#6B4F43] mb-1" style={serif}>
                  Seating
                </p>
                <h2 className="text-2xl text-[#4A2E24] italic" style={serif}>
                  Rename Table
                </h2>
              </div>
              <button
                onClick={() => setRenameTarget(null)}
                className="text-[#C4A88A] hover:text-[#4A2E24] transition-colors text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleRenameTable} className="px-6 py-6">
              <label
                htmlFor="rename-table"
                className="block text-xs tracking-[0.2em] uppercase text-[#6B4F43] mb-2"
                style={serif}
              >
                New Name
              </label>
              <input
                id="rename-table"
                autoFocus
                type="text"
                value={renameName}
                onChange={e => setRenameName(e.target.value)}
                className="w-full bg-white border border-[#C4A88A]/50 px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#C4A88A] focus:outline-none focus:border-[#6B4F43] transition-colors"
                style={serif}
              />
              <div className="flex items-center gap-3 justify-end mt-5">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-4 py-2 text-xs tracking-[0.15em] uppercase text-[#8B7468] hover:text-[#4A2E24] transition-colors"
                  style={serif}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renamingTable || !renameName.trim()}
                  className="px-6 py-2 text-xs tracking-[0.15em] uppercase bg-[#6B4F43] text-white hover:bg-[#4A2E24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={serif}
                >
                  {renamingTable ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete Table Confirmation Modal ───────────────────────────────── */}
      {deleteTableTarget && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-[#2A1810]/50 backdrop-blur-sm"
            onClick={() => !deletingTable && setDeleteTableTarget(null)}
          />
          <div className="relative w-full max-w-sm bg-[#FAF5F0] border border-[#C4A88A]/50 shadow-xl">
            <div className="px-6 py-5 border-b border-[#C4A88A]/30">
              <p className="text-xs tracking-[0.3em] uppercase text-[#6B4F43] mb-1" style={serif}>
                Seating
              </p>
              <h2 className="text-2xl text-[#4A2E24] italic" style={serif}>
                Delete Table?
              </h2>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm text-[#3A3A3A] mb-6" style={serif}>
                Delete{' '}
                <span className="font-semibold text-[#4A2E24]">{deleteTableTarget.name}</span>?
                {deleteTableTarget.seats.length > 0 && (
                  <span className="block mt-1 text-[#8B7468]">
                    This will also remove {deleteTableTarget.seats.length} seat {deleteTableTarget.seats.length === 1 ? 'assignment' : 'assignments'}.
                  </span>
                )}
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteTableTarget(null)}
                  disabled={deletingTable}
                  className="px-4 py-2 text-xs tracking-[0.15em] uppercase text-[#8B7468] hover:text-[#4A2E24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={serif}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTable}
                  disabled={deletingTable}
                  className="px-6 py-2 text-xs tracking-[0.15em] uppercase bg-[#b91c1c] text-white hover:bg-[#7f1d1d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={serif}
                >
                  {deletingTable ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Assign Guest Modal ────────────────────────────────────────────── */}
      {assignTarget && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-[#2A1810]/50 backdrop-blur-sm"
            onClick={() => !assigningGuest && setAssignTarget(null)}
          />
          <div className="relative w-full max-w-md bg-[#FAF5F0] border border-[#C4A88A]/50 shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#C4A88A]/30">
              <div>
                <p className="text-xs tracking-[0.3em] uppercase text-[#6B4F43] mb-1" style={serif}>
                  {assignTarget.name}
                </p>
                <h2 className="text-2xl text-[#4A2E24] italic" style={serif}>
                  Assign Seats
                </h2>
              </div>
              <button
                onClick={() => setAssignTarget(null)}
                className="text-[#C4A88A] hover:text-[#4A2E24] transition-colors text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAssignGuest} className="px-6 py-6">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_7rem_1.5rem] gap-2 mb-2">
                <span className="text-xs tracking-[0.2em] uppercase text-[#6B4F43]" style={serif}>Guest</span>
                <span className="text-xs tracking-[0.2em] uppercase text-[#6B4F43]" style={serif}>Seat</span>
                <span />
              </div>

              {/* Rows */}
              <div className="space-y-2">
                {assignRows.map((row, i) => {
                  // Guests already picked in other rows
                  const takenIds = new Set(assignRows.filter((_, j) => j !== i).map(r => r.guestId).filter(id => id !== ''));
                  const availableGuests = unassignedGuests.filter(g => !takenIds.has(g.id));
                  return (
                    <div key={i} className="grid grid-cols-[1fr_7rem_1.5rem] gap-2 items-center">
                      <select
                        value={row.guestId}
                        onChange={e => {
                          const updated = [...assignRows];
                          updated[i] = { ...updated[i], guestId: e.target.value === '' ? '' : Number(e.target.value) };
                          setAssignRows(updated);
                        }}
                        className="bg-white border border-[#C4A88A]/50 px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#6B4F43] transition-colors appearance-none"
                        style={serif}
                      >
                        <option value="">Select…</option>
                        {availableGuests.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="e.g. A1"
                        value={row.seatLabel}
                        onChange={e => {
                          const updated = [...assignRows];
                          updated[i] = { ...updated[i], seatLabel: e.target.value };
                          setAssignRows(updated);
                        }}
                        className="bg-white border border-[#C4A88A]/50 px-3 py-2 text-sm text-[#3A3A3A] placeholder-[#C4A88A] focus:outline-none focus:border-[#6B4F43] transition-colors caret-[#4A2E24]"
                        style={serif}
                      />
                      <button
                        type="button"
                        onClick={() => setAssignRows(rows => rows.length === 1 ? rows : rows.filter((_, j) => j !== i))}
                        disabled={assignRows.length === 1}
                        className="w-5 h-5 flex items-center justify-center rounded-full border border-[#C4A88A]/50 text-[#C4A88A] hover:border-[#b91c1c] hover:text-[#b91c1c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm leading-none"
                        aria-label="Remove row"
                      >
                        −
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add row */}
              {unassignedGuests.length > assignRows.length && (
                <button
                  type="button"
                  onClick={() => setAssignRows(rows => [...rows, { guestId: '', seatLabel: '' }])}
                  className="mt-3 text-xs tracking-[0.15em] uppercase text-[#6B4F43] hover:text-[#4A2E24] transition-colors"
                  style={serif}
                >
                  + Add Another
                </button>
              )}

              <div className="flex items-center gap-3 justify-end mt-5">
                <button
                  type="button"
                  onClick={() => setAssignTarget(null)}
                  className="px-4 py-2 text-xs tracking-[0.15em] uppercase text-[#8B7468] hover:text-[#4A2E24] transition-colors"
                  style={serif}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningGuest || !assignRows.some(r => r.guestId !== '' && r.seatLabel.trim())}
                  className="px-6 py-2 text-xs tracking-[0.15em] uppercase bg-[#6B4F43] text-white hover:bg-[#4A2E24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={serif}
                >
                  {assigningGuest
                    ? 'Assigning…'
                    : (() => { const n = assignRows.filter(r => r.guestId !== '' && r.seatLabel.trim()).length; return n > 1 ? `Assign ${n} Guests` : 'Assign'; })()
                  }
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Find Guest Modal ──────────────────────────────────────────────── */}
      {findGuestOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-[#2A1810]/50 backdrop-blur-sm"
            onClick={() => { setFindGuestOpen(false); setFindGuestQuery(''); setFindGuestPage(1); setFindGuestFilter('all'); }}
          />
          <div className="relative w-full max-w-md bg-[#FAF5F0] border border-[#C4A88A]/50 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#C4A88A]/30">
              <div>
                <p className="text-xs tracking-[0.3em] uppercase text-[#6B4F43] mb-1" style={serif}>
                  Seating
                </p>
                <h2 className="text-2xl text-[#4A2E24] italic" style={serif}>
                  Find Guest
                </h2>
              </div>
              <button
                onClick={() => { setFindGuestOpen(false); setFindGuestQuery(''); setFindGuestPage(1); setFindGuestFilter('all'); }}
                className="text-[#C4A88A] hover:text-[#4A2E24] transition-colors text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* All / Unassigned tabs */}
            <div className="flex border-b border-[#C4A88A]/30">
              {(['all', 'unassigned'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setFindGuestFilter(f); setFindGuestPage(1); }}
                  className={`px-5 py-2.5 text-xs tracking-[0.2em] uppercase transition-all duration-200 border-b-2 -mb-px ${
                    findGuestFilter === f
                      ? 'border-[#6B4F43] text-[#4A2E24]'
                      : 'border-transparent text-[#8B7468] hover:text-[#6B4F43]'
                  }`}
                  style={serif}
                >
                  {f === 'all' ? `All (${guests.length})` : `Unassigned (${unassignedGuests.length})`}
                </button>
              ))}
            </div>

            <div className="px-6 py-5">
              <input
                autoFocus
                type="text"
                placeholder="Search by name…"
                value={findGuestQuery}
                onChange={e => { setFindGuestQuery(e.target.value); setFindGuestPage(1); }}
                className="w-full bg-white border border-[#C4A88A]/50 px-4 py-2.5 text-sm text-[#3A3A3A] placeholder-[#C4A88A] focus:outline-none focus:border-[#6B4F43] transition-colors caret-[#4A2E24]"
                style={serif}
              />

              {/* Results */}
              {(() => {
                const FIND_PAGE_SIZE = 8;
                const q = findGuestQuery.trim().toLowerCase();
                const pool = findGuestFilter === 'unassigned' ? unassignedGuests : guests;
                const matches = q ? pool.filter(g => g.name.toLowerCase().includes(q)) : pool;

                if (matches.length === 0) {
                  return (
                    <p className="mt-4 text-sm text-[#8B7468] text-center" style={serif}>
                      No guests found
                    </p>
                  );
                }

                const totalFindPages = Math.ceil(matches.length / FIND_PAGE_SIZE);
                const paginated = matches.slice((findGuestPage - 1) * FIND_PAGE_SIZE, findGuestPage * FIND_PAGE_SIZE);

                return (
                  <>
                    <div className="mt-3 divide-y divide-[#C4A88A]/15 border border-[#C4A88A]/30">
                      {paginated.map(guest => {
                        let seat: GuestSeatAssignment | undefined;
                        let table: TableWithSeats | undefined;
                        for (const t of tables) {
                          const s = t.seats.find(s => s.guest_id === guest.id);
                          if (s) { seat = s; table = t; break; }
                        }
                        const isUnassigned = !seat;
                        return (
                          <div key={guest.id} className="flex items-center justify-between px-4 py-3 gap-4">
                            <p className="text-sm text-[#3A3A3A] flex-1 min-w-0 truncate" style={serif}>{guest.name}</p>
                            <div className="flex items-center gap-3 shrink-0">
                              {seat && table && (
                                <div className="text-right">
                                  <p className="text-xs text-[#4A2E24]" style={serif}>{table.name}</p>
                                  <p className="text-xs text-[#8B7468]" style={serif}>Seat {seat.seat_label}</p>
                                </div>
                              )}
                              {isUnassigned && tables.length > 0 && (
                                <button
                                  onClick={() => {
                                    setFindGuestOpen(false);
                                    setQuickAssignGuest(guest);
                                    setQuickAssignTableId('');
                                    setQuickAssignSeatLabel('');
                                  }}
                                  className="text-xs tracking-[0.15em] uppercase text-[#6B4F43] hover:text-[#4A2E24] border border-[#C4A88A]/50 hover:border-[#4A2E24] px-2.5 py-1 transition-colors whitespace-nowrap"
                                  style={serif}
                                >
                                  Assign
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {totalFindPages > 1 && (
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-[#8B7468] tabular-nums" style={serif}>
                          {(findGuestPage - 1) * FIND_PAGE_SIZE + 1}–{Math.min(findGuestPage * FIND_PAGE_SIZE, matches.length)} of {matches.length}
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setFindGuestPage(p => p - 1)}
                            disabled={findGuestPage === 1}
                            className="px-3 py-1.5 text-xs tracking-[0.15em] uppercase border border-[#C4A88A]/50 text-[#6B4F43] hover:border-[#4A2E24] hover:text-[#4A2E24] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            style={serif}
                          >
                            ←
                          </button>
                          <span className="text-xs text-[#6B4F43] tabular-nums" style={serif}>
                            {findGuestPage} / {totalFindPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setFindGuestPage(p => p + 1)}
                            disabled={findGuestPage === totalFindPages}
                            className="px-3 py-1.5 text-xs tracking-[0.15em] uppercase border border-[#C4A88A]/50 text-[#6B4F43] hover:border-[#4A2E24] hover:text-[#4A2E24] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            style={serif}
                          >
                            →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Quick Assign Modal (from Find Guest) ─────────────────────────── */}
      {quickAssignGuest && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-[#2A1810]/50 backdrop-blur-sm"
            onClick={() => !quickAssigning && setQuickAssignGuest(null)}
          />
          <div className="relative w-full max-w-sm bg-[#FAF5F0] border border-[#C4A88A]/50 shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#C4A88A]/30">
              <div>
                <p className="text-xs tracking-[0.3em] uppercase text-[#6B4F43] mb-1" style={serif}>
                  {quickAssignGuest.name}
                </p>
                <h2 className="text-2xl text-[#4A2E24] italic" style={serif}>
                  Assign Seat
                </h2>
              </div>
              <button
                onClick={() => setQuickAssignGuest(null)}
                className="text-[#C4A88A] hover:text-[#4A2E24] transition-colors text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleQuickAssign} className="px-6 py-6 space-y-4">
              <div>
                <label
                  htmlFor="quick-assign-table"
                  className="block text-xs tracking-[0.2em] uppercase text-[#6B4F43] mb-2"
                  style={serif}
                >
                  Table
                </label>
                <select
                  id="quick-assign-table"
                  autoFocus
                  value={quickAssignTableId}
                  onChange={e => setQuickAssignTableId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-white border border-[#C4A88A]/50 px-4 py-2.5 text-sm text-[#3A3A3A] focus:outline-none focus:border-[#6B4F43] transition-colors appearance-none"
                  style={serif}
                >
                  <option value="">Select a table…</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="quick-assign-seat"
                  className="block text-xs tracking-[0.2em] uppercase text-[#6B4F43] mb-2"
                  style={serif}
                >
                  Seat Label
                </label>
                <input
                  id="quick-assign-seat"
                  type="text"
                  placeholder="e.g. 1, A2, Window…"
                  value={quickAssignSeatLabel}
                  onChange={e => setQuickAssignSeatLabel(e.target.value)}
                  className="w-full bg-white border border-[#C4A88A]/50 px-4 py-2.5 text-sm text-[#3A3A3A] placeholder-[#C4A88A] focus:outline-none focus:border-[#6B4F43] transition-colors caret-[#4A2E24]"
                  style={serif}
                />
              </div>
              <div className="flex items-center gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setQuickAssignGuest(null)}
                  className="px-4 py-2 text-xs tracking-[0.15em] uppercase text-[#8B7468] hover:text-[#4A2E24] transition-colors"
                  style={serif}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickAssigning || quickAssignTableId === '' || !quickAssignSeatLabel.trim()}
                  className="px-6 py-2 text-xs tracking-[0.15em] uppercase bg-[#6B4F43] text-white hover:bg-[#4A2E24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={serif}
                >
                  {quickAssigning ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Unassign Guest Confirmation Modal ─────────────────────────────── */}
      {unassignTarget && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-[#2A1810]/50 backdrop-blur-sm"
            onClick={() => !unassigningGuest && setUnassignTarget(null)}
          />
          <div className="relative w-full max-w-sm bg-[#FAF5F0] border border-[#C4A88A]/50 shadow-xl">
            <div className="px-6 py-5 border-b border-[#C4A88A]/30">
              <p className="text-xs tracking-[0.3em] uppercase text-[#6B4F43] mb-1" style={serif}>
                Seating
              </p>
              <h2 className="text-2xl text-[#4A2E24] italic" style={serif}>
                Remove from seat?
              </h2>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm text-[#3A3A3A] mb-6" style={serif}>
                Unassign{' '}
                <span className="font-semibold text-[#4A2E24]">{unassignTarget.guestName}</span>{' '}
                from their seat?
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setUnassignTarget(null)}
                  disabled={unassigningGuest}
                  className="px-4 py-2 text-xs tracking-[0.15em] uppercase text-[#8B7468] hover:text-[#4A2E24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={serif}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUnassignGuest}
                  disabled={unassigningGuest}
                  className="px-6 py-2 text-xs tracking-[0.15em] uppercase bg-[#b91c1c] text-white hover:bg-[#7f1d1d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={serif}
                >
                  {unassigningGuest ? 'Removing…' : 'Remove'}
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
