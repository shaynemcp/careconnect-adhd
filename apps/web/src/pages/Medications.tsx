import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, Circle, Pill, AlertCircle, Search } from 'lucide-react';
import { getMedications } from '../data/medsStore';
import { appendActivityEvent } from '../data/caregiverStore';
import type { Medication } from '../types';

const TODAY = new Date().toISOString().split('T')[0];

const LS_MEDS_KEY = 'careconnect_meds_taken';

function loadTakenFromStorage(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LS_MEDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTakenToStorage(takenMap: Record<string, boolean>) {
  localStorage.setItem(LS_MEDS_KEY, JSON.stringify(takenMap));
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export default function Medications() {
  const [meds, setMeds] = useState<Medication[]>(() => {
    const stored = loadTakenFromStorage();
    return getMedications().map((m) => ({
      ...m,
      taken: {
        ...m.taken,
        ...(stored[m.id] !== undefined ? { [TODAY]: stored[m.id] } : {}),
      },
    }));
  });
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // Edit > Find (Ctrl+F) on the desktop app lands here with focusSearch set when the
  // user was on another page; on this page DesktopIntegration focuses the field directly.
  useEffect(() => {
    if ((location.state as { focusSearch?: boolean } | null)?.focusSearch) {
      searchRef.current?.focus();
    }
  }, [location.state]);

  useEffect(() => {
    if (selectedMedId) {
      sessionStorage.setItem(
        'careconnect_desktop_selected_medication',
        selectedMedId,
      );
    } else {
      sessionStorage.removeItem('careconnect_desktop_selected_medication');
    }

    return () => {
      sessionStorage.removeItem('careconnect_desktop_selected_medication');
    };
  }, [selectedMedId]);

  useEffect(() => {
    window.careconnectDesktop?.setMedicationSelected(selectedMedId !== null);

    return () => {
      window.careconnectDesktop?.setMedicationSelected(false);
    };
  }, [selectedMedId]);
useEffect(() => {
  function handleMedicationsUpdated() {
    const stored = loadTakenFromStorage();

    setMeds(
      getMedications().map((medication) => ({
        ...medication,
        taken: {
          ...medication.taken,
          ...(stored[medication.id] !== undefined
            ? { [TODAY]: stored[medication.id] }
            : {}),
        },
      })),
    );

    setSelectedMedId(null);
  }

  window.addEventListener(
    'careconnect:medications-updated',
    handleMedicationsUpdated,
  );

  return () => {
    window.removeEventListener(
      'careconnect:medications-updated',
      handleMedicationsUpdated,
    );
  };
}, []);
  useEffect(() => {
    const takenMap: Record<string, boolean> = {};
    meds.forEach((m) => {
      if (m.taken[TODAY] !== undefined) takenMap[m.id] = m.taken[TODAY];
    });
    saveTakenToStorage(takenMap);
  }, [meds]);

  function toggleTaken(id: string) {
    setMeds((prev) => {
      const updated = prev.map((m) =>
        m.id === id
          ? { ...m, taken: { ...m.taken, [TODAY]: !m.taken[TODAY] } }
          : m
      );
      const med = updated.find((m) => m.id === id);
      if (med) {
        appendActivityEvent({
          kind: med.taken[TODAY] ? 'med_taken' : 'med_skipped',
          label: med.taken[TODAY]
            ? `Marked ${med.name} as taken`
            : `Unmarked ${med.name} (not taken)`,
          timestamp: new Date().toISOString(),
        });
      }
      return updated;
    });
  }

  const takenCount = meds.filter((m) => m.taken[TODAY]).length;
  const pendingCount = meds.length - takenCount;

  const needle = query.trim().toLowerCase();
  const shownMeds = needle
    ? meds.filter((m) =>
        [m.name, m.dosage, m.instructions ?? ''].some((text) =>
          text.toLowerCase().includes(needle),
        ),
      )
    : meds;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">Medicines</h1>
        <p className="text-neutral-500 mt-1">Today's medication tracker</p>
      </div>

      {/* ── Status summary ───────────────────────────────────────────────── */}
      {pendingCount > 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="card border-warm-300 bg-warm-50 flex items-center gap-3 p-4"
        >
          <AlertCircle className="w-6 h-6 text-warm-600 flex-shrink-0" aria-hidden="true" />
          <p className="text-warm-800 font-medium">
            {pendingCount} medicine{pendingCount > 1 ? 's' : ''} still to take today.
          </p>
        </div>
      ) : (
        <div
          role="status"
          aria-live="polite"
          className="card border-success-200 bg-success-50 flex items-center gap-3 p-4"
        >
          <CheckCircle2 className="w-6 h-6 text-success-600 flex-shrink-0" aria-hidden="true" />
          <p className="text-success-800 font-medium">
            All medicines taken for today. Well done!
          </p>
        </div>
      )}

      {/* ── Search (Edit > Find, Ctrl+F on desktop) ──────────────────────── */}
      <div role="search">
        <label htmlFor="medication-search" className="block text-sm font-medium text-neutral-700 mb-1">
          Search medicines
        </label>
        <div className="relative">
          <Search
            className="w-5 h-5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="medication-search"
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setQuery('');
            }}
            placeholder="Name, dose or instructions"
            className="w-full min-h-[44px] rounded-lg border border-neutral-500 bg-white pl-10 pr-3 text-base text-neutral-800 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-calm-600"
            aria-describedby="medication-search-count"
          />
        </div>
        <p id="medication-search-count" role="status" aria-live="polite" className="text-sm text-neutral-600 mt-1">
          {needle
            ? shownMeds.length === 0
              ? `No medicines match "${query.trim()}".`
              : `Showing ${shownMeds.length} of ${meds.length} medicines.`
            : ''}
        </p>
      </div>

      {/* ── Medication cards ─────────────────────────────────────────────── */}
      <section aria-label="Medication list">
        <h2 className="sr-only">Medication list</h2>
        <ul className="space-y-4 list-none p-0 m-0" role="list">
          {shownMeds.map((med) => {
            const taken = med.taken[TODAY] ?? false;
            return (
              <li
                key={med.id}
                onClick={() => setSelectedMedId(med.id)}
                aria-current={selectedMedId === med.id ? 'true' : undefined}
                className={
                  selectedMedId === med.id
                    ? 'ring-2 ring-calm-600 rounded-xl'
                    : ''
                }
              >
                <article
                  id={`medication-${med.id}`}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      setSelectedMedId(med.id);
                    }
                  }}
                  className={`card card-hover flex items-start gap-4 p-5 transition-opacity duration-200 ${taken ? 'opacity-60' : ''}`}
                  aria-label={`${med.name} ${med.dosage}${taken ? ' — taken' : ' — not yet taken'}`}
                >
                  {/* Pill colour swatch */}
                  <div
                    className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center ${med.colour}`}
                    aria-hidden="true"
                  >
                    <Pill className="w-6 h-6 text-neutral-600" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-lg leading-tight ${taken ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                      {med.name}
                    </p>
                    <p className="text-neutral-600 text-sm mt-0.5">{med.dosage}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {med.times.map((t) => (
                        <span key={t} className="badge badge-calm text-xs">
                          {formatTime(t)}
                        </span>
                      ))}
                    </div>
                    {med.instructions && (
                      <p className="text-sm text-neutral-500 mt-2 italic">
                        {med.instructions}
                      </p>
                    )}
                  </div>

                  {/* Toggle */}
                  <button
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleTaken(med.id);
                      }}
                      className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-colors duration-200 hover:bg-neutral-100"
                      aria-label={taken ? `Mark ${med.name} as not taken` : `Mark ${med.name} as taken`}
                      aria-pressed={taken}
                  >
                    {taken ? (
                      <CheckCircle2 className="w-7 h-7 text-success-600" aria-hidden="true" />
                    ) : (
                      <Circle className="w-7 h-7 text-neutral-300" aria-hidden="true" />
                    )}
                  </button>
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-sm text-neutral-400 text-center">
        Always take medicines as prescribed by your doctor. If unsure, ask your carer.
      </p>
    </div>
  );
}
