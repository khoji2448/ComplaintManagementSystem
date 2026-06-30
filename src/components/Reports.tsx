'use client';
import { Complaint, Area, ComplaintType, User } from '@/types/types';
import { Floor, Status, Building } from '@/utils/constants';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import React from 'react';
import { FileText, Sheet, FileSearch, RotateCcw, Search, X, SlidersHorizontal } from 'lucide-react';
import Panel from '@/components/ui/Panel';
import StatusPill from '@/components/ui/StatusPill';
import Skeleton from '@/components/ui/Skeleton';
import { Field, SelectInput, TextInput, fieldClass } from '@/components/ui/Field';
import { notify } from '@/lib/toast';

// ── date helpers (local, avoid TZ off-by-one) ──
const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const firstOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return toYMD(d);
};
const todayYMD = () => toYMD(new Date());
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

interface Filters {
  q: string;
  user_id: string;
  building: string;
  floor: string;
  area_id: string;
  complaint_type_id: string;
  statuses: string[];
  from_date: string;
  to_date: string;
}

const defaultFilters = (): Filters => ({
  q: '',
  user_id: '',
  building: '',
  floor: '',
  area_id: '',
  complaint_type_id: '',
  statuses: [],
  from_date: firstOfMonth(),
  to_date: todayYMD(),
});

const buildParams = (f: Filters) => {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.user_id) p.set('user_id', f.user_id);
  if (f.building) p.set('building', f.building);
  if (f.floor) p.set('floor', f.floor);
  if (f.area_id) p.set('area_id', f.area_id);
  if (f.complaint_type_id) p.set('complaint_type_id', f.complaint_type_id);
  if (f.from_date) p.set('from_date', f.from_date);
  if (f.to_date) p.set('to_date', f.to_date);
  f.statuses.forEach((s) => p.append('status', s));
  return p;
};

const Reports = () => {
  const { data: session } = useSession();
  const [reports, setReports] = useState<Complaint[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [types, setTypes] = useState<ComplaintType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [ready, setReady] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const isAdmin = session?.user?.role === 'admin';

  // lookups + read filters from the URL once on mount
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.toString()) {
      const d = defaultFilters();
      setFilters({
        q: sp.get('q') ?? '',
        user_id: sp.get('user_id') ?? '',
        building: sp.get('building') ?? '',
        floor: sp.get('floor') ?? '',
        area_id: sp.get('area_id') ?? '',
        complaint_type_id: sp.get('complaint_type_id') ?? '',
        statuses: sp.getAll('status'),
        from_date: sp.get('from_date') ?? d.from_date,
        to_date: sp.get('to_date') ?? d.to_date,
      });
    }
    Promise.all([fetch('/api/areas'), fetch('/api/complaint-types'), fetch('/api/users')])
      .then(async ([a, t, u]) => {
        setAreas(await a.json());
        setTypes(await t.json());
        setUsers(await u.json());
      })
      .catch((e) => notify.error('Couldn’t load filter options: ' + e))
      .finally(() => setReady(true));
  }, []);

  // fetch reports whenever filters change (debounced), keep URL in sync
  useEffect(() => {
    if (!ready) return;
    const params = buildParams(filters);
    window.history.replaceState(null, '', params.toString() ? `?${params}` : window.location.pathname);

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports?${params}`);
        if (!res.ok) throw new Error(res.statusText);
        setReports(await res.json());
      } catch (e) {
        notify.error('Couldn’t load reports: ' + e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [filters, ready]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const toggleStatus = (name: string) =>
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(name)
        ? prev.statuses.filter((s) => s !== name)
        : [...prev.statuses, name],
    }));

  type PresetKey = 'month' | '30' | 'quarter' | 'year' | 'all';
  const presetRange = (preset: PresetKey): { from: string; to: string } => {
    const now = new Date();
    if (preset === 'all') return { from: '', to: '' };
    let from = new Date();
    if (preset === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
    if (preset === '30') from = new Date(now.getTime() - 29 * 86400000);
    if (preset === 'quarter') from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    if (preset === 'year') from = new Date(now.getFullYear(), 0, 1);
    return { from: toYMD(from), to: todayYMD() };
  };
  const applyPreset = (preset: PresetKey) => {
    const { from, to } = presetRange(preset);
    setFilters((p) => ({ ...p, from_date: from, to_date: to }));
  };
  const activePreset = (['month', '30', 'quarter', 'year', 'all'] as PresetKey[]).find((k) => {
    const r = presetRange(k);
    return r.from === filters.from_date && r.to === filters.to_date;
  });

  // ── active filter chips ──
  const chips = useMemo(() => {
    const out: { label: string; clear: () => void }[] = [];
    const d = defaultFilters();
    if (filters.q) out.push({ label: `Search: “${filters.q}”`, clear: () => set('q', '') });
    if (filters.building) out.push({ label: `Building: ${filters.building}`, clear: () => set('building', '') });
    if (filters.user_id) {
      const name = users.find((u) => String(u.id) === filters.user_id)?.name ?? filters.user_id;
      out.push({ label: `By: ${name}`, clear: () => set('user_id', '') });
    }
    if (filters.floor) out.push({ label: `Floor: ${filters.floor}`, clear: () => set('floor', '') });
    if (filters.area_id) {
      const name = areas.find((a) => String(a.id) === filters.area_id)?.area_name ?? filters.area_id;
      out.push({ label: `Area: ${name}`, clear: () => set('area_id', '') });
    }
    if (filters.complaint_type_id) {
      const name = types.find((t) => String(t.id) === filters.complaint_type_id)?.type_name ?? filters.complaint_type_id;
      out.push({ label: `Type: ${name}`, clear: () => set('complaint_type_id', '') });
    }
    filters.statuses.forEach((s) =>
      out.push({ label: `Status: ${s}`, clear: () => toggleStatus(s) })
    );
    if (filters.from_date !== d.from_date || filters.to_date !== d.to_date) {
      out.push({
        label: `Date: ${filters.from_date || '—'} → ${filters.to_date || '—'}`,
        clear: () => setFilters((p) => ({ ...p, from_date: d.from_date, to_date: d.to_date })),
      });
    }
    return out;
  }, [filters, users, areas, types]);

  const dateInvalid = filters.from_date && filters.to_date && filters.from_date > filters.to_date;

  // ── exports (operate on whatever is currently loaded) ──
  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const autoTable = (await import('jspdf-autotable')).default as any;
      const head = [['Date', 'Submitted By', 'Building', 'Floor', 'Area', 'Type', 'Details', 'Status', 'Seen Date', 'Action', 'Resolution Date']];
      const body = reports.map((report) => [
        new Date(report.date).toDateString(),
        report.user_name,
        report.building,
        report.floor,
        report.area_name,
        report.complaint_type_name,
        report.details,
        report.status,
        report.seen ? new Date(report.seen_date as string).toDateString() : 'Not Seen',
        report.action ? report.action : 'No Action Taken',
        report.resolution_date ? new Date(report.resolution_date as string).toDateString() : 'Not Resolved',
      ]);
      autoTable(doc, {
        head,
        body,
        margin: 10,
        styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
        columnStyles: { 5: { cellWidth: 150 }, 9: { cellWidth: 100 }, 10: { cellWidth: 100 } },
      });
      doc.save('complaints-report.pdf');
    } catch {
      notify.error('Couldn’t generate the PDF.');
    }
  };

  const exportToXLSX = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(
      reports.map((report) => ({
        Date: new Date(report.date).toDateString(),
        SubmittedBy: report.user_name,
        Building: report.building,
        Floor: report.floor,
        Area: report.area_name,
        Type: report.complaint_type_name,
        Details: report.details,
        Status: report.status,
        Seen: report.seen ? new Date(report.seen_date as string).toDateString() : 'Not Seen',
        Action: report.action ? report.action : 'No Action Taken',
        ResolutionDate: report.resolution_date ? new Date(report.resolution_date as string).toDateString() : 'Not Resolved',
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Complaints Report');
    XLSX.writeFile(wb, 'complaints-report.xlsx');
  };

  const filterPanel = (
    <div className={showFilters ? 'block' : 'hidden'}>
      {/* presets */}
      <div className="mb-4 flex flex-wrap gap-2">
        {([
          ['month', 'This month'],
          ['30', 'Last 30 days'],
          ['quarter', 'This quarter'],
          ['year', 'This year'],
          ['all', 'All time'],
        ] as const).map(([key, label]) => {
          const active = activePreset === key;
          return (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`border px-3 py-1.5 text-xs transition-colors ${
                active
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
                  : 'border-[var(--hairline)] text-[var(--slate)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* search */}
      <div className="relative mb-4">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mute)]" />
        <TextInput value={filters.q} onChange={(e) => set('q', e.target.value)} placeholder="Search details, building, area…" className="!pl-9" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="From date" htmlFor="from_date">
          <input
            id="from_date"
            type="date"
            className={`${fieldClass} ${dateInvalid ? '!border-[var(--signal)]' : ''}`}
            value={filters.from_date}
            onChange={(e) => set('from_date', e.target.value)}
          />
        </Field>
        <Field label="To date" htmlFor="to_date">
          <input
            id="to_date"
            type="date"
            className={`${fieldClass} ${dateInvalid ? '!border-[var(--signal)]' : ''}`}
            value={filters.to_date}
            onChange={(e) => set('to_date', e.target.value)}
          />
        </Field>
        <Field label="Building" htmlFor="building">
          <SelectInput id="building" value={filters.building} onChange={(e) => set('building', e.target.value)}>
            <option value="">All buildings</option>
            {Building.map((b) => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Submitted by" htmlFor="user_id">
          <SelectInput id="user_id" value={filters.user_id} onChange={(e) => set('user_id', e.target.value)}>
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Floor" htmlFor="floor">
          <SelectInput id="floor" value={filters.floor} onChange={(e) => set('floor', e.target.value)}>
            <option value="">All floors</option>
            {Floor.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Area" htmlFor="area_id">
          <SelectInput id="area_id" value={filters.area_id} onChange={(e) => set('area_id', e.target.value)}>
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.area_name}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Complaint type" htmlFor="complaint_type_id">
          <SelectInput id="complaint_type_id" value={filters.complaint_type_id} onChange={(e) => set('complaint_type_id', e.target.value)}>
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.type_name}</option>
            ))}
          </SelectInput>
        </Field>
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--slate)]">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {Status.map((s) => {
              const active = filters.statuses.includes(s.name);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStatus(s.name)}
                  className={`border px-2.5 py-1.5 text-xs transition-colors ${
                    active ? 'border-[var(--ink)] bg-[var(--ink)] text-white' : 'border-[var(--hairline)] text-[var(--slate)] hover:border-[var(--slate)]'
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {dateInvalid ? (
        <p className="mt-3 text-xs text-[var(--signal)]">“From” date is after “To” date.</p>
      ) : null}

      {/* active chips */}
      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--hairline)] pt-4">
          {chips.map((chip, i) => (
            <button
              key={i}
              onClick={chip.clear}
              className="group inline-flex items-center gap-1.5 bg-[var(--paper)] px-2.5 py-1 text-xs text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
            >
              {chip.label}
              <X size={12} className="text-[var(--mute)] group-hover:text-[var(--signal)]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[var(--mute)]">Reports</div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em] md:text-3xl">All complaints</h1>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={exportToPDF} className="inline-flex items-center gap-1.5 border border-[var(--hairline)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--slate)] transition-colors hover:text-[var(--ink)]">
              <FileText size={15} /> PDF
            </button>
            <button onClick={exportToXLSX} className="inline-flex items-center gap-1.5 border border-[var(--hairline)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--slate)] transition-colors hover:text-[var(--ink)]">
              <Sheet size={15} /> XLSX
            </button>
          </div>
        )}
      </div>

      {/* filters */}
      <Panel
        title={`Filters${chips.length ? ` · ${chips.length}` : ''}`}
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
            >
              <SlidersHorizontal size={13} /> {showFilters ? 'Hide' : 'Show'}
            </button>
            {chips.length > 0 && (
              <button
                onClick={() => setFilters(defaultFilters())}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}
          </div>
        }
      >
        {filterPanel}
      </Panel>

      {/* results */}
      <Panel
        title="Results"
        action={!loading ? <span className="font-mono-num text-xs text-[var(--slate)]">{reports.length} {reports.length === 1 ? 'record' : 'records'}</span> : undefined}
      >
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileSearch size={40} strokeWidth={1.25} className="text-[var(--mute)]" />
            <p className="mt-4 font-display text-lg font-semibold">No matches.</p>
            <p className="mt-1 text-sm text-[var(--slate)]">Try widening the date range or clearing filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--hairline)]">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--hairline)] bg-[var(--paper)]">
                  {['Issue date', 'Submitted by', 'Location', 'Type', 'Details', 'Status', 'Seen', 'Action', 'Resolved'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink)] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hairline)]">
                {reports.map((c, i) => (
                  <tr
                    key={`${c.id}-${i}`}
                    className="animate-rise align-top transition-colors duration-150 hover:bg-[var(--paper)]"
                    style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                  >
                    <td className="px-4 py-3 font-mono-num text-xs whitespace-nowrap text-[var(--slate)]">{fmtDate(c.date)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{c.user_id ? c.user_name : <span className="text-[var(--mute)]">Deleted user</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm">{c.area_id ? c.area_name : <span className="text-[var(--mute)]">Deleted area</span>}</div>
                      <div className="font-mono-num text-[11px] text-[var(--ink)]">{c.building} · {c.floor}</div>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{c.complaint_type_id ? c.complaint_type_name : <span className="text-[var(--mute)]">Deleted type</span>}</td>
                    <td className="px-4 py-3 text-sm text-[var(--slate)]">
                      <span className="line-clamp-3 max-w-[18rem]" title={c.details}>{c.details}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusPill status={c.status} /></td>
                    <td className="px-4 py-3 font-mono-num text-xs whitespace-nowrap text-[var(--slate)]">{c.seen_date ? fmtDate(c.seen_date) : <span className="text-[var(--mute)]">—</span>}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="line-clamp-2 max-w-[14rem]" title={c.action ?? ''}>{c.action ? c.action : <span className="text-[var(--mute)]">—</span>}</span>
                    </td>
                    <td className="px-4 py-3 font-mono-num text-xs whitespace-nowrap text-[var(--slate)]">{c.resolution_date ? fmtDate(c.resolution_date) : <span className="text-[var(--mute)]">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};

export default Reports;
