"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, X, Check } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Skeleton from "@/components/ui/Skeleton";
import { TextInput } from "@/components/ui/Field";
import { notify } from "@/lib/toast";

interface Item {
  id: number;
  name: string;
}

interface NameCrudProps {
  endpoint: string; // e.g. /api/areas
  eyebrow: string; // e.g. "Manage areas"
  title: string; // e.g. "Areas"
  noun: string; // singular, e.g. "area"
  // pull the display name off whatever shape the API returns
  nameKey: string; // e.g. "area_name" | "type_name"
}

export default function NameCrud({ endpoint, eyebrow, title, noun, nameKey }: NameCrudProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.areas || data.types || [];
        setItems(arr.map((it: Record<string, unknown>) => ({ id: it.id as number, name: it[nameKey] as string })));
      } catch (err) {
        notify.error(`Couldn’t load ${noun}s: ` + err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [endpoint, nameKey, noun]);

  const reset = () => {
    setValue("");
    setEditing(null);
  };

  const submit = async () => {
    if (!value.trim() || busy) return;
    setBusy(true);
    try {
      if (editing) {
        const res = await fetch(`${endpoint}/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: value }),
        });
        if (!res.ok) throw new Error("update failed");
        setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, name: value } : it)));
        notify.success(`${cap(noun)} updated`);
      } else {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: value }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error("create failed");
        setItems((prev) => [...prev, { id: data.id, name: value }]);
        notify.success(`${cap(noun)} added`);
      }
      reset();
    } catch (err) {
      notify.error(`Couldn’t save ${noun}: ` + err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm(`Delete this ${noun}? This can’t be undone.`)) return;
    try {
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setItems((prev) => prev.filter((it) => it.id !== id));
      if (editing?.id === id) reset();
      notify.success(`${cap(noun)} deleted`);
    } catch (err) {
      notify.error(`Couldn’t delete ${noun}: ` + err);
    }
  };

  const filtered = useMemo(
    () => items.filter((it) => it.name.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[var(--mute)]">{eyebrow}</div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] md:text-3xl">{title}</h1>
      </div>

      {/* add / edit */}
      <Panel title={editing ? `Edit ${noun}` : `Add ${noun}`}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <TextInput
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={`${cap(noun)} name`}
            disabled={busy}
            className="flex-1"
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy || !value.trim()}
              className="inline-flex items-center gap-1.5 bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white transition-transform duration-300 hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
              style={{ transitionTimingFunction: "var(--ease)" }}
            >
              {editing ? <Check size={15} /> : <Plus size={15} />}
              {editing ? "Update" : "Add"}
            </button>
            {editing && (
              <button
                onClick={reset}
                className="border border-[var(--hairline)] px-4 py-2 text-sm text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </Panel>

      {/* list */}
      <Panel
        title={title}
        action={
          !loading ? (
            <span className="font-mono-num text-xs text-[var(--slate)]">{items.length}</span>
          ) : undefined
        }
      >
        {/* search */}
        <div className="relative mb-4">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mute)]" />
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${noun}s…`}
            className="!pl-9"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <X size={32} strokeWidth={1.25} className="text-[var(--mute)]" />
            <p className="mt-3 text-sm text-[var(--slate)]">
              {search ? `No ${noun}s match “${search}”.` : `No ${noun}s yet.`}
            </p>
          </div>
        ) : (
          <ul className="max-h-[28rem] space-y-1 overflow-y-auto pr-1">
            {filtered.map((it, i) => (
              <li
                key={it.id}
                className="animate-rise flex items-center justify-between gap-3 border border-[var(--hairline)] px-3 py-2.5 transition-colors hover:bg-[var(--paper)]"
                style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}
              >
                <span className="break-words text-sm font-medium text-[var(--ink)]">{it.name}</span>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => {
                      setEditing(it);
                      setValue(it.name);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    aria-label="Edit"
                    className="p-1.5 text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => remove(it.id)}
                    aria-label="Delete"
                    className="p-1.5 text-[var(--slate)] transition-colors hover:text-[var(--signal)]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
