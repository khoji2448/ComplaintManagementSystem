'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowUpRight, Inbox, Plus } from 'lucide-react';
import CountUp from '@/components/ui/CountUp';
import StatCard from '@/components/ui/StatCard';
import Sparkline from '@/components/ui/Sparkline';
import DonutChart, { DonutSlice } from '@/components/ui/DonutChart';
import ActivityChart from '@/components/ui/ActivityChart';
import Skeleton from '@/components/ui/Skeleton';
import Panel from '@/components/ui/Panel';
import StatusPill, { statusColor } from '@/components/ui/StatusPill';

// Types aligned with our /api/reports and /api/dashboard responses
interface Complaint {
  id: number;
  date: string;
  building: string;
  floor: string;
  area_id: number | null;
  area_name?: string;
  complaint_type_id: number | null;
  complaint_type_name?: string;
  details: string;
  status: string;
  action?: string | null;
  seen?: boolean;
  seen_date?: string | null;
  resolution_date?: string | null;
}

interface DashboardCounts {
  total: number;
  open: number;
  createdThisMonth: number;
  inProgress: number;
  unseen: number;
  resolvedThisMonth: number;
}

interface SeriesItem { key: string; value: number }

interface DashboardData {
  counts: DashboardCounts;
  avgResolutionDays: number;
  series: {
    byStatus: SeriesItem[];
    byType: SeriesItem[];
    byDate: SeriesItem[]; // YYYY-MM-DD
  }
  recent: Complaint[];
}

// Categorical palette for complaint types (warm/cool spread off the tokens).
const typePalette = ['#0fb981', '#f59e0b', '#0e1116', '#5a93f5', '#a855f7', '#ef6f6f', '#14b8c4', '#9aa3af'];

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-48" />
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-44 lg:col-span-3" />
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px]" />)}
        </div>
      </div>
      <Skeleton className="h-[320px]" />
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-64 lg:col-span-3" />
        <Skeleton className="h-64 lg:col-span-2" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardData | null>(null);
  const [recent, setRecent] = useState<Complaint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const mRes = await fetch('/api/dashboard');
        if (!mRes.ok) throw new Error('Failed to load metrics');
        const data = (await mRes.json()) as DashboardData;

        if (isMounted) {
          setMetrics(data);
          setRecent(data.recent ?? []);
        }
      } catch (e: unknown) {
        if (isMounted) setError((e as Error)?.message ?? 'Unknown error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  const statusList = useMemo(() => metrics?.series.byStatus ?? [], [metrics]);
  const typeList = useMemo(() => metrics?.series.byType ?? [], [metrics]);
  const dateSeries = useMemo(() => metrics?.series.byDate ?? [], [metrics]);
  const sparkData = useMemo(() => dateSeries.map((d) => d.value), [dateSeries]);
  const statusSlices = useMemo<DonutSlice[]>(
    () => statusList.map((s) => ({ key: s.key, value: s.value, color: statusColor(s.key) })),
    [statusList]
  );
  const typeSlices = useMemo<DonutSlice[]>(() => {
    const top = [...typeList].sort((a, b) => b.value - a.value);
    const head = top.slice(0, 6);
    const rest = top.slice(6);
    const slices = head.map((t, i) => ({ key: t.key, value: t.value, color: typePalette[i % typePalette.length] }));
    const restSum = rest.reduce((acc, t) => acc + t.value, 0);
    if (restSum > 0) slices.push({ key: 'Other', value: restSum, color: typePalette[7] });
    return slices;
  }, [typeList]);

  const today = new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="border border-[var(--signal)] bg-[var(--signal-soft)] p-5 text-sm text-[var(--ink)]">
        Couldn’t load the console. {error}
      </div>
    );
  }

  const counts = metrics?.counts;
  const hasData = (counts?.total ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* eyebrow row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em] md:text-3xl">Dashboard</h1>
        </div>
        {session?.user?.permissions?.includes('reports:view') && (
          <Link
            href="/reports"
            className="group inline-flex items-center gap-1.5 border border-[var(--hairline)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
          >
            Full reports
            <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ transitionTimingFunction: 'var(--ease)' }} />
          </Link>
        )}
      </div>

      {!hasData ? (
        // empty state
        <div className="flex flex-col items-center justify-center border border-dashed border-[var(--hairline)] bg-[var(--card)] py-20 text-center">
          <Inbox size={40} strokeWidth={1.25} className="text-[var(--mute)]" />
          <p className="mt-4 font-display text-lg font-semibold">Nothing’s broken. Yet.</p>
          <p className="mt-1 text-sm text-[var(--slate)]">No complaints on record. When one lands, it shows up here.</p>
          {session?.user?.permissions?.includes('complaints:create') && (
            <Link href="/complaintentry" className="mt-5 inline-flex items-center gap-1.5 bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white transition-transform duration-300 hover:scale-[1.02]" style={{ transitionTimingFunction: 'var(--ease)' }}>
              <Plus size={15} /> Log a complaint
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* hero + KPIs */}
          <div className="grid gap-4 lg:grid-cols-5">
            {/* hero stat */}
            <div className="animate-rise flex flex-col justify-between border border-[var(--hairline)] bg-[var(--card)] p-6 shadow-[0_1px_2px_rgba(14,17,22,0.04)] lg:col-span-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--slate)]">
                Open right now
              </div>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div className="font-mono-num font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]" style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}>
                  <CountUp value={counts?.open ?? 0} />
                </div>
                {sparkData.length > 1 && (
                  <div className="mb-2 hidden sm:block">
                    <div className="mb-1 text-right text-[10px] uppercase tracking-[0.14em] text-[var(--mute)]">30-day trend</div>
                    <Sparkline data={sparkData} width={160} height={40} />
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--slate)]">
                <span><span className="font-mono-num font-semibold text-[var(--ink)]">{counts?.total ?? 0}</span> all time</span>
                <span><span className="font-mono-num font-semibold text-[var(--signal)]">{counts?.inProgress ?? 0}</span> in progress</span>
              </div>
            </div>

            {/* secondary KPIs */}
            <div className="grid grid-cols-2 gap-4 lg:col-span-2">
              <StatCard label="This month" value={counts?.createdThisMonth ?? 0} delay={80} />
              <StatCard label="Resolved (mo.)" value={counts?.resolvedThisMonth ?? 0} tone="mint" delay={160} />
              <StatCard label="Turnaround (days)" value={metrics?.avgResolutionDays ?? 0} decimals={1} delay={240} />
              <StatCard label="Waiting on a human" value={counts?.unseen ?? 0} tone="signal" alert delay={320} />
            </div>
          </div>

          {/* activity chart — signature */}
          <Panel title="Activity · daily volume">
            <ActivityChart data={dateSeries} />
          </Panel>

          {/* breakdowns */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="By status">
              <DonutChart data={statusSlices} />
            </Panel>
            <Panel title="By type">
              <DonutChart data={typeSlices} />
            </Panel>
          </div>

          {/* recent complaints */}
          <Panel
            title="Recent complaints"
            action={session?.user?.permissions?.includes('complaints:action') ? (
              <Link href="/complaintsaction" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--slate)] transition-colors hover:text-[var(--ink)]">
                Manage <ArrowUpRight size={13} />
              </Link>
            ) : undefined}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--hairline)] text-left">
                    {['Date', 'Building', 'Floor', 'Area', 'Type', 'Status'].map((h) => (
                      <th key={h} className="pb-2.5 pr-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c, i) => (
                    <tr
                      key={c.id}
                      className="animate-rise border-b border-[var(--hairline)] transition-colors duration-150 hover:bg-[var(--paper)]"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <td className="py-3 pr-4 font-mono-num text-xs whitespace-nowrap text-[var(--slate)]">{new Date(c.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="py-3 pr-4 text-sm">{c.building}</td>
                      <td className="py-3 pr-4 text-sm">{c.floor}</td>
                      <td className="py-3 pr-4 text-sm">{c.area_id ? c.area_name : <span className="text-[var(--mute)]">Deleted area</span>}</td>
                      <td className="py-3 pr-4 text-sm">{c.complaint_type_id ? c.complaint_type_name : <span className="text-[var(--mute)]">Deleted type</span>}</td>
                      <td className="py-3 pr-4"><StatusPill status={c.status} /></td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-[var(--mute)]">No recent complaints</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
