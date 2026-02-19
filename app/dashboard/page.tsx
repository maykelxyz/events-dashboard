'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type RSVPStatus = 'YES' | 'NO' | 'PENDING';
type Filter = 'ALL' | RSVPStatus;

interface Attendee {
  id: number;
  name: string;
  email: string;
  rsvp: RSVPStatus;
}

const ATTENDEES: Attendee[] = [
  { id: 1,   name: 'Emma Smith',         email: 'emma.smith@gmail.com',         rsvp: 'YES' },
  { id: 2,   name: 'James Johnson',      email: 'james.johnson@yahoo.com',      rsvp: 'NO' },
  { id: 3,   name: 'Olivia Williams',    email: 'olivia.williams@outlook.com',  rsvp: 'PENDING' },
  { id: 4,   name: 'Liam Brown',         email: 'liam.brown@gmail.com',         rsvp: 'YES' },
  { id: 5,   name: 'Ava Jones',          email: 'ava.jones@hotmail.com',        rsvp: 'NO' },
  { id: 6,   name: 'Noah Garcia',        email: 'noah.garcia@gmail.com',        rsvp: 'PENDING' },
  { id: 7,   name: 'Sophia Miller',      email: 'sophia.miller@yahoo.com',      rsvp: 'YES' },
  { id: 8,   name: 'William Davis',      email: 'william.davis@gmail.com',      rsvp: 'YES' },
  { id: 9,   name: 'Isabella Rodriguez', email: 'isabella.r@outlook.com',       rsvp: 'PENDING' },
  { id: 10,  name: 'Benjamin Martinez',  email: 'ben.martinez@gmail.com',       rsvp: 'NO' },
  { id: 11,  name: 'Mia Hernandez',      email: 'mia.hernandez@yahoo.com',      rsvp: 'YES' },
  { id: 12,  name: 'Elijah Lopez',       email: 'elijah.lopez@gmail.com',       rsvp: 'YES' },
  { id: 13,  name: 'Charlotte Gonzalez', email: 'charlotte.g@hotmail.com',      rsvp: 'PENDING' },
  { id: 14,  name: 'Oliver Wilson',      email: 'oliver.wilson@outlook.com',    rsvp: 'NO' },
  { id: 15,  name: 'Amelia Anderson',    email: 'amelia.anderson@gmail.com',    rsvp: 'YES' },
  { id: 16,  name: 'Lucas Thomas',       email: 'lucas.thomas@yahoo.com',       rsvp: 'NO' },
  { id: 17,  name: 'Harper Taylor',      email: 'harper.taylor@gmail.com',      rsvp: 'PENDING' },
  { id: 18,  name: 'Mason Moore',        email: 'mason.moore@outlook.com',      rsvp: 'YES' },
  { id: 19,  name: 'Evelyn Jackson',     email: 'evelyn.jackson@gmail.com',     rsvp: 'YES' },
  { id: 20,  name: 'Ethan Martin',       email: 'ethan.martin@hotmail.com',     rsvp: 'NO' },
  { id: 21,  name: 'Abigail Lee',        email: 'abigail.lee@gmail.com',        rsvp: 'PENDING' },
  { id: 22,  name: 'Daniel Perez',       email: 'daniel.perez@yahoo.com',       rsvp: 'YES' },
  { id: 23,  name: 'Emily Thompson',     email: 'emily.thompson@gmail.com',     rsvp: 'YES' },
  { id: 24,  name: 'Jacob White',        email: 'jacob.white@outlook.com',      rsvp: 'NO' },
  { id: 25,  name: 'Ella Harris',        email: 'ella.harris@gmail.com',        rsvp: 'PENDING' },
  { id: 26,  name: 'Logan Sanchez',      email: 'logan.sanchez@hotmail.com',    rsvp: 'YES' },
  { id: 27,  name: 'Elizabeth Clark',    email: 'elizabeth.clark@gmail.com',    rsvp: 'NO' },
  { id: 28,  name: 'Jackson Ramirez',    email: 'jackson.r@yahoo.com',          rsvp: 'YES' },
  { id: 29,  name: 'Camila Lewis',       email: 'camila.lewis@gmail.com',       rsvp: 'PENDING' },
  { id: 30,  name: 'Sebastian Robinson', email: 'seb.robinson@outlook.com',     rsvp: 'YES' },
  { id: 31,  name: 'Luna Walker',        email: 'luna.walker@gmail.com',        rsvp: 'NO' },
  { id: 32,  name: 'Jack Young',         email: 'jack.young@yahoo.com',         rsvp: 'YES' },
  { id: 33,  name: 'Sofia Allen',        email: 'sofia.allen@gmail.com',        rsvp: 'PENDING' },
  { id: 34,  name: 'Aiden King',         email: 'aiden.king@hotmail.com',       rsvp: 'YES' },
  { id: 35,  name: 'Victoria Wright',    email: 'victoria.wright@gmail.com',    rsvp: 'NO' },
  { id: 36,  name: 'Owen Scott',         email: 'owen.scott@outlook.com',       rsvp: 'PENDING' },
  { id: 37,  name: 'Madison Torres',     email: 'madison.torres@gmail.com',     rsvp: 'YES' },
  { id: 38,  name: 'Samuel Nguyen',      email: 'samuel.nguyen@yahoo.com',      rsvp: 'YES' },
  { id: 39,  name: 'Riley Hill',         email: 'riley.hill@gmail.com',         rsvp: 'NO' },
  { id: 40,  name: 'Ryan Flores',        email: 'ryan.flores@hotmail.com',      rsvp: 'PENDING' },
  { id: 41,  name: 'Zoey Green',         email: 'zoey.green@gmail.com',         rsvp: 'YES' },
  { id: 42,  name: 'Nathan Adams',       email: 'nathan.adams@yahoo.com',       rsvp: 'NO' },
  { id: 43,  name: 'Nora Nelson',        email: 'nora.nelson@gmail.com',        rsvp: 'YES' },
  { id: 44,  name: 'Caleb Baker',        email: 'caleb.baker@outlook.com',      rsvp: 'PENDING' },
  { id: 45,  name: 'Lily Hall',          email: 'lily.hall@gmail.com',          rsvp: 'YES' },
  { id: 46,  name: 'Zachary Rivera',     email: 'zach.rivera@hotmail.com',      rsvp: 'NO' },
  { id: 47,  name: 'Eleanor Campbell',   email: 'eleanor.c@gmail.com',          rsvp: 'PENDING' },
  { id: 48,  name: 'Dylan Mitchell',     email: 'dylan.mitchell@yahoo.com',     rsvp: 'YES' },
  { id: 49,  name: 'Hannah Carter',      email: 'hannah.carter@gmail.com',      rsvp: 'YES' },
  { id: 50,  name: 'Tyler Roberts',      email: 'tyler.roberts@outlook.com',    rsvp: 'NO' },
  { id: 51,  name: 'Lillian Smith',      email: 'lillian.smith@gmail.com',      rsvp: 'PENDING' },
  { id: 52,  name: 'Brandon Johnson',    email: 'brandon.j@hotmail.com',        rsvp: 'YES' },
  { id: 53,  name: 'Addison Williams',   email: 'addison.w@gmail.com',          rsvp: 'NO' },
  { id: 54,  name: 'Austin Brown',       email: 'austin.brown@yahoo.com',       rsvp: 'YES' },
  { id: 55,  name: 'Aubrey Jones',       email: 'aubrey.jones@gmail.com',       rsvp: 'PENDING' },
  { id: 56,  name: 'Evan Garcia',        email: 'evan.garcia@outlook.com',      rsvp: 'YES' },
  { id: 57,  name: 'Ellie Miller',       email: 'ellie.miller@gmail.com',       rsvp: 'NO' },
  { id: 58,  name: 'Adrian Davis',       email: 'adrian.davis@hotmail.com',     rsvp: 'PENDING' },
  { id: 59,  name: 'Stella Rodriguez',   email: 'stella.r@gmail.com',           rsvp: 'YES' },
  { id: 60,  name: 'Ian Martinez',       email: 'ian.martinez@yahoo.com',       rsvp: 'YES' },
  { id: 61,  name: 'Natalie Hernandez',  email: 'natalie.h@gmail.com',          rsvp: 'NO' },
  { id: 62,  name: 'Marcus Lopez',       email: 'marcus.lopez@outlook.com',     rsvp: 'PENDING' },
  { id: 63,  name: 'Zoe Gonzalez',       email: 'zoe.gonzalez@gmail.com',       rsvp: 'YES' },
  { id: 64,  name: 'Victor Wilson',      email: 'victor.wilson@hotmail.com',    rsvp: 'NO' },
  { id: 65,  name: 'Leah Anderson',      email: 'leah.anderson@gmail.com',      rsvp: 'YES' },
  { id: 66,  name: 'Kevin Thomas',       email: 'kevin.thomas@yahoo.com',       rsvp: 'PENDING' },
  { id: 67,  name: 'Hazel Taylor',       email: 'hazel.taylor@gmail.com',       rsvp: 'YES' },
  { id: 68,  name: 'Patrick Moore',      email: 'patrick.moore@outlook.com',    rsvp: 'NO' },
  { id: 69,  name: 'Violet Jackson',     email: 'violet.jackson@gmail.com',     rsvp: 'PENDING' },
  { id: 70,  name: 'Eric Martin',        email: 'eric.martin@hotmail.com',      rsvp: 'YES' },
  { id: 71,  name: 'Aurora Lee',         email: 'aurora.lee@gmail.com',         rsvp: 'YES' },
  { id: 72,  name: 'Justin Perez',       email: 'justin.perez@yahoo.com',       rsvp: 'NO' },
  { id: 73,  name: 'Savannah Thompson',  email: 'savannah.t@gmail.com',         rsvp: 'PENDING' },
  { id: 74,  name: 'Kyle White',         email: 'kyle.white@outlook.com',       rsvp: 'YES' },
  { id: 75,  name: 'Audrey Harris',      email: 'audrey.harris@gmail.com',      rsvp: 'NO' },
  { id: 76,  name: 'Scott Sanchez',      email: 'scott.sanchez@hotmail.com',    rsvp: 'YES' },
  { id: 77,  name: 'Brooklyn Clark',     email: 'brooklyn.clark@gmail.com',     rsvp: 'PENDING' },
  { id: 78,  name: 'Andre Ramirez',      email: 'andre.ramirez@yahoo.com',      rsvp: 'YES' },
  { id: 79,  name: 'Bella Lewis',        email: 'bella.lewis@gmail.com',        rsvp: 'YES' },
  { id: 80,  name: 'Carlos Robinson',    email: 'carlos.robinson@outlook.com',  rsvp: 'NO' },
  { id: 81,  name: 'Claire Walker',      email: 'claire.walker@gmail.com',      rsvp: 'PENDING' },
  { id: 82,  name: 'Miguel Young',       email: 'miguel.young@hotmail.com',     rsvp: 'YES' },
  { id: 83,  name: 'Skyler Allen',       email: 'skyler.allen@gmail.com',       rsvp: 'NO' },
  { id: 84,  name: 'Diego King',         email: 'diego.king@yahoo.com',         rsvp: 'YES' },
  { id: 85,  name: 'Lucy Wright',        email: 'lucy.wright@gmail.com',        rsvp: 'PENDING' },
  { id: 86,  name: 'Luis Scott',         email: 'luis.scott@outlook.com',       rsvp: 'YES' },
  { id: 87,  name: 'Paisley Torres',     email: 'paisley.torres@gmail.com',     rsvp: 'NO' },
  { id: 88,  name: 'Juan Nguyen',        email: 'juan.nguyen@hotmail.com',      rsvp: 'YES' },
  { id: 89,  name: 'Gabriel Hill',       email: 'gabriel.hill@gmail.com',       rsvp: 'PENDING' },
  { id: 90,  name: 'Roberto Flores',     email: 'roberto.flores@yahoo.com',     rsvp: 'YES' },
  { id: 91,  name: 'Rafael Green',       email: 'rafael.green@gmail.com',       rsvp: 'NO' },
  { id: 92,  name: 'Mateo Adams',        email: 'mateo.adams@outlook.com',      rsvp: 'YES' },
  { id: 93,  name: 'Grace Nelson',       email: 'grace.nelson@gmail.com',       rsvp: 'PENDING' },
  { id: 94,  name: 'Chloe Baker',        email: 'chloe.baker@hotmail.com',      rsvp: 'YES' },
  { id: 95,  name: 'Penelope Hall',      email: 'penelope.hall@gmail.com',      rsvp: 'NO' },
  { id: 96,  name: 'Layla Rivera',       email: 'layla.rivera@yahoo.com',       rsvp: 'YES' },
  { id: 97,  name: 'Camille Campbell',   email: 'camille.campbell@gmail.com',   rsvp: 'PENDING' },
  { id: 98,  name: 'Sofia Mitchell',     email: 'sofia.mitchell@outlook.com',   rsvp: 'YES' },
  { id: 99,  name: 'Anna Carter',        email: 'anna.carter@gmail.com',        rsvp: 'NO' },
  { id: 100, name: 'Marcus Roberts',     email: 'marcus.roberts@hotmail.com',   rsvp: 'YES' },
];

const PAGE_SIZE = 20;

const serif = { fontFamily: 'var(--font-cormorant), serif' };

const FILTER_TABS: { label: string; value: Filter }[] = [
  { label: 'All',       value: 'ALL' },
  { label: 'Going',     value: 'YES' },
  { label: 'Not Going', value: 'NO' },
  { label: 'Pending',   value: 'PENDING' },
];

const rsvpBadge: Record<RSVPStatus, { label: string; className: string }> = {
  YES:     { label: 'Going',     className: 'bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]' },
  NO:      { label: 'Not Going', className: 'bg-[#fdf2f2] text-[#b91c1c] border border-[#fca5a5]' },
  PENDING: { label: 'Pending',   className: 'bg-[#fffbeb] text-[#92400e] border border-[#fcd34d]' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);

  const counts = {
    YES:     ATTENDEES.filter(a => a.rsvp === 'YES').length,
    NO:      ATTENDEES.filter(a => a.rsvp === 'NO').length,
    PENDING: ATTENDEES.filter(a => a.rsvp === 'PENDING').length,
  };

  const filtered = filter === 'ALL' ? ATTENDEES : ATTENDEES.filter(a => a.rsvp === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (value: Filter) => {
    setFilter(value);
    setPage(1);
  };

  const tabCount = (value: Filter) =>
    value === 'ALL' ? ATTENDEES.length : counts[value];

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
            onClick={() => router.push('/')}
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
            Summer Gala 2026
          </h1>
          <div className="w-16 h-px bg-[#C4A88A]" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Going',     count: counts.YES,     color: 'text-[#2e7d32]' },
            { label: 'Not Going', count: counts.NO,      color: 'text-[#b91c1c]' },
            { label: 'Pending',   count: counts.PENDING, color: 'text-[#92400e]' },
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
          <div className="divide-y divide-[#C4A88A]/15">
            {paginated.map((attendee, idx) => {
              const badge = rsvpBadge[attendee.rsvp];
              return (
                <div
                  key={attendee.id}
                  className="flex items-center px-6 py-4 hover:bg-[#FAF5F0]/60 transition-colors"
                >
                  <span
                    className="w-10 text-sm text-[#C4A88A]"
                    style={serif}
                  >
                    {(page - 1) * PAGE_SIZE + idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-base text-[#3A3A3A]"
                      style={serif}
                    >
                      {attendee.name}
                    </p>
                    <p className="text-xs text-[#8B7468] mt-0.5 font-sans">
                      {attendee.email}
                    </p>
                  </div>
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
