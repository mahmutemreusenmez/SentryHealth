import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  INITIAL_BABY,
  INITIAL_BABY_VITALS,
  INITIAL_GROWTH,
  VACCINE_SCHEDULE,
} from "../data/babyData";
import type {
  BabyProfile,
  BabyVitals,
  GrowthMeasurement,
  VaccineEntry,
} from "../data/types";
import { STORAGE_KEYS, loadJSON, saveJSON } from "../services/storageService";

/** Aşı takvimindeki bir kaydın hesaplanmış (tarih + durum) görünümü. */
export interface VaccineStatus extends VaccineEntry {
  /** Planlanan tarih (ISO). */
  dueDate: string;
  /** Yapıldı olarak işaretlendi mi. */
  done: boolean;
  /** Bugüne göre kalan gün (negatif = geçmiş). */
  daysUntilDue: number;
  /** Yaklaşan (14 gün içinde) ve henüz yapılmamış mı. */
  upcoming: boolean;
  /** Süresi geçmiş ve henüz yapılmamış mı. */
  overdue: boolean;
}

interface BabyContextValue {
  /** Profilde yeni doğan bebek tanımlı mı (sekmeyi/özellikleri açar). */
  hasNewborn: boolean;
  baby: BabyProfile;
  growth: GrowthMeasurement[];
  vaccines: VaccineStatus[];
  vitals: BabyVitals;
  /** Bebeğin bugünkü yaşı (ay, tam sayı). */
  ageMonths: number;
  /** Yaklaşan (14 gün içinde) veya süresi geçmiş yapılmamış aşılar. */
  dueVaccines: VaccineStatus[];
  setHasNewborn: (value: boolean) => void;
  updateBaby: (patch: Partial<BabyProfile>) => void;
  addGrowthMeasurement: (entry: GrowthMeasurement) => void;
  toggleVaccine: (id: string) => void;
  updateVitals: (patch: Partial<BabyVitals>) => void;
}

interface PersistedBaby {
  hasNewborn: boolean;
  baby: BabyProfile;
  growth: GrowthMeasurement[];
  doneVaccineIds: string[];
  vitals: BabyVitals;
}

const BabyContext = createContext<BabyContextValue | undefined>(undefined);

const DAY_MS = 24 * 60 * 60 * 1000;

function monthsBetween(fromISO: string, to: Date): number {
  const from = new Date(fromISO);
  const days = Math.floor((to.getTime() - from.getTime()) / DAY_MS);
  return Math.max(0, Math.floor(days / 30));
}

function addDaysISO(fromISO: string, days: number): string {
  const d = new Date(fromISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function BabyProvider({ children }: { children: React.ReactNode }) {
  const [hasNewborn, setHasNewbornState] = useState(true);
  const [baby, setBaby] = useState<BabyProfile>(INITIAL_BABY);
  const [growth, setGrowth] = useState<GrowthMeasurement[]>(INITIAL_GROWTH);
  const [doneVaccineIds, setDoneVaccineIds] = useState<string[]>([]);
  const [vitals, setVitals] = useState<BabyVitals>(INITIAL_BABY_VITALS);
  const [hydrated, setHydrated] = useState(false);

  // Açılışta bebek verisini güvenli hafızadan geri yükle.
  useEffect(() => {
    let cancelled = false;
    void loadJSON<PersistedBaby>(STORAGE_KEYS.baby).then((stored) => {
      if (cancelled || !stored) {
        if (!cancelled) setHydrated(true);
        return;
      }
      setHasNewbornState(stored.hasNewborn);
      if (stored.baby) setBaby(stored.baby);
      if (stored.growth?.length) setGrowth(stored.growth);
      if (stored.doneVaccineIds) setDoneVaccineIds(stored.doneVaccineIds);
      if (stored.vitals) setVitals(stored.vitals);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Değişiklikleri güvenli (şifreli) hafızaya yaz.
  useEffect(() => {
    if (!hydrated) return;
    void saveJSON<PersistedBaby>(STORAGE_KEYS.baby, {
      hasNewborn,
      baby,
      growth,
      doneVaccineIds,
      vitals,
    });
  }, [hydrated, hasNewborn, baby, growth, doneVaccineIds, vitals]);

  const ageMonths = useMemo(
    () => monthsBetween(baby.birthDate, new Date()),
    [baby.birthDate],
  );

  const vaccines = useMemo<VaccineStatus[]>(() => {
    const now = Date.now();
    return VACCINE_SCHEDULE.map((entry) => {
      const dueDate = addDaysISO(baby.birthDate, entry.dueDayOffset);
      const daysUntilDue = Math.round(
        (new Date(dueDate).getTime() - now) / DAY_MS,
      );
      const done = doneVaccineIds.includes(entry.id);
      return {
        ...entry,
        dueDate,
        done,
        daysUntilDue,
        upcoming: !done && daysUntilDue >= 0 && daysUntilDue <= 14,
        overdue: !done && daysUntilDue < 0,
      };
    });
  }, [baby.birthDate, doneVaccineIds]);

  const dueVaccines = useMemo(
    () => vaccines.filter((v) => v.upcoming || v.overdue),
    [vaccines],
  );

  const setHasNewborn = useCallback((value: boolean) => {
    setHasNewbornState(value);
  }, []);

  const updateBaby = useCallback((patch: Partial<BabyProfile>) => {
    setBaby((prev) => ({ ...prev, ...patch }));
  }, []);

  const addGrowthMeasurement = useCallback((entry: GrowthMeasurement) => {
    setGrowth((prev) =>
      [...prev.filter((m) => m.ageMonths !== entry.ageMonths), entry].sort(
        (a, b) => a.ageMonths - b.ageMonths,
      ),
    );
  }, []);

  const toggleVaccine = useCallback((id: string) => {
    setDoneVaccineIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }, []);

  const updateVitals = useCallback((patch: Partial<BabyVitals>) => {
    setVitals((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo<BabyContextValue>(
    () => ({
      hasNewborn,
      baby,
      growth,
      vaccines,
      vitals,
      ageMonths,
      dueVaccines,
      setHasNewborn,
      updateBaby,
      addGrowthMeasurement,
      toggleVaccine,
      updateVitals,
    }),
    [
      hasNewborn,
      baby,
      growth,
      vaccines,
      vitals,
      ageMonths,
      dueVaccines,
      setHasNewborn,
      updateBaby,
      addGrowthMeasurement,
      toggleVaccine,
      updateVitals,
    ],
  );

  return <BabyContext.Provider value={value}>{children}</BabyContext.Provider>;
}

export function useBaby(): BabyContextValue {
  const ctx = useContext(BabyContext);
  if (!ctx) {
    throw new Error("useBaby, BabyProvider içinde kullanılmalıdır.");
  }
  return ctx;
}
