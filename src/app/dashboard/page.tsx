'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';   

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

function KPICard({ label, value, accent = 'indigo' }: { label: string; value: number | string; accent?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky' }) {
  const accentClasses = {
    indigo: 'from-indigo-50 to-white text-indigo-700 border-indigo-100',
    emerald: 'from-emerald-50 to-white text-emerald-700 border-emerald-100',
    rose: 'from-rose-50 to-white text-rose-700 border-rose-100',
    amber: 'from-amber-50 to-white text-amber-700 border-amber-100',
    sky: 'from-sky-50 to-white text-sky-700 border-sky-100',
  } as const;
  return (
    <div className={`rounded-lg border ${accentClasses[accent]} bg-gradient-to-br p-4 md:p-5 shadow-sm`}> 
      <div className="text-xs md:text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-xl md:text-3xl font-bold">{value}</div>
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

  if (loading) {
    return <div className="p-4 md:p-6">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-4 md:p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <div className="text-sm text-gray-500">Overview</div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPICard label="Total Complaints" value={metrics?.counts.total ?? 0} accent="indigo" />
        <KPICard label="Complaints (This Month)" value={metrics?.counts.createdThisMonth ?? 0} accent="amber" />
        <KPICard label="In-Progress" value={metrics?.counts.inProgress ?? 0} accent="sky" />
        <KPICard label="Resolved (This Month)" value={metrics?.counts.resolvedThisMonth ?? 0} accent="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-4 md:mt-6">
        {/* Breakdown by status */}
        <div className="rounded-lg border bg-white p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">By Status</h2>
            <span className="text-xs text-gray-500">Count</span>
          </div>
          <ul className="mt-3 space-y-2">
            {statusList.map((s) => (
              <li key={s.key} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{s.key}</span>
                <span className="font-semibold">{s.value}</span>
              </li>
            ))}
            {statusList.length === 0 && (
              <li className="text-sm text-gray-500">No data</li>
            )}
          </ul>
        </div>

        {/* Breakdown by type */}
        <div className="rounded-lg border bg-white p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">By Type</h2>
            <span className="text-xs text-gray-500">Count</span>
          </div>
          <ul className="mt-3 space-y-2">
            {typeList.map((t) => (
              <li key={t.key} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{t.key}</span>
                <span className="font-semibold">{t.value}</span>
              </li>
            ))}
            {typeList.length === 0 && (
              <li className="text-sm text-gray-500">No data</li>
            )}
          </ul>
        </div>

        {/* Meta */}
        <div className="rounded-lg border bg-white p-4 md:p-5 shadow-sm">
          <h2 className="font-semibold text-lg">Summary</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Unseen complaints</span>
              <span className="font-semibold">{metrics?.counts.unseen ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Avg. resolution (days)</span>
              <span className="font-semibold">{metrics?.avgResolutionDays ?? 0}</span>
            </div>
            {session?.user?.permissions?.includes("reports:view") ? (
            <Link href="/reports" className="inline-flex text-indigo-600 hover:underline mt-2">View detailed reports →</Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Recent complaints */}
      <div className="rounded-lg border bg-white p-4 md:p-5 shadow-sm mt-4 md:mt-6">
        <div className="mb-3 md:mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Recent Complaints</h2>
          {session?.user?.permissions?.includes("complaints:action") ? (
            <Link href="/complaintsaction" className="text-sm text-indigo-600 hover:underline">Manage →</Link>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 md:p-3 text-left text-xs md:text-sm">Date</th>
                <th className="border p-2 md:p-3 text-left text-xs md:text-sm">Building</th>
                <th className="border p-2 md:p-3 text-left text-xs md:text-sm">Floor</th>
                <th className="border p-2 md:p-3 text-left text-xs md:text-sm">Area</th>
                <th className="border p-2 md:p-3 text-left text-xs md:text-sm">Type</th>
                <th className="border p-2 md:p-3 text-left text-xs md:text-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id} className="border">
                  <td className="border p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{new Date(c.date).toDateString()}</td>
                  <td className="border p-2 md:p-3 text-xs md:text-sm">{c.building}</td>
                  <td className="border p-2 md:p-3 text-xs md:text-sm">{c.floor}</td>
                  <td className="border p-2 md:p-3 text-xs md:text-sm">{c.area_id ? c.area_name : 'Deleted Area'}</td>
                  <td className="border p-2 md:p-3 text-xs md:text-sm">{c.complaint_type_id ? c.complaint_type_name : 'Deleted Type'}</td>
                  <td className={`border p-2 md:p-3 text-xs md:text-sm ${c.status === 'Resolved' ? 'text-green-700' : c.status === 'In-Progress' ? 'text-amber-700' : 'text-gray-700'}`}>{c.status}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-sm text-gray-500">No recent complaints</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}