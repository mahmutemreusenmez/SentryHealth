import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FEATURED_APPOINTMENT,
  INITIAL_GUARDIAN,
  INITIAL_PROFILE,
  INITIAL_TASKS,
} from "../data/mockData";
import type {
  FeaturedAppointment,
  Guardian,
  GuardianAlert,
  HealthTask,
  PatientProfile,
  ScreeningRecommendation,
} from "../data/types";
import {
  buildCriticalAlert,
  buildMissedDoseAlert,
  buildSimNotification,
} from "../services/guardianService";
import { reminderService } from "../services/notificationService";
import { generateScreeningRecommendations } from "../services/screeningAlgorithm";
import {
  STORAGE_KEYS,
  loadJSON,
  saveJSON,
  todayKey,
} from "../services/storageService";

interface PatientContextValue {
  profile: PatientProfile;
  tasks: HealthTask[];
  appointment: FeaturedAppointment;
  recommendations: ScreeningRecommendation[];
  guardian: Guardian;
  guardianAlerts: GuardianAlert[];
  updateProfile: (patch: Partial<PatientProfile>) => void;
  completeTask: (id: string) => void;
  /** Jüri sunumu: duruma göre canlı bir push bildirimi tetikler. */
  sendTestNotification: () => void;
  /** Refakatçiye kritik triyaj (kırmızı kod) SMS taslağı üretir. */
  raiseCriticalAlert: () => void;
}

/** Görev onaylarının o güne ait kalıcı hali. */
interface PersistedTasks {
  day: string;
  statusById: Record<string, HealthTask["status"]>;
}

const PatientContext = createContext<PatientContextValue | undefined>(
  undefined,
);

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PatientProfile>(INITIAL_PROFILE);
  const [tasks, setTasks] = useState<HealthTask[]>(INITIAL_TASKS);
  const [appointment] = useState<FeaturedAppointment>(FEATURED_APPOINTMENT);
  const [guardian] = useState<Guardian>(INITIAL_GUARDIAN);
  const [guardianAlerts, setGuardianAlerts] = useState<GuardianAlert[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const simIndexRef = useRef(0);

  const recommendations = useMemo(
    () => generateScreeningRecommendations(profile),
    [profile],
  );

  // Açılışta profil ve görev onaylarını cihaz hafızasından geri yükle.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadJSON<PatientProfile>(STORAGE_KEYS.profile),
      loadJSON<PersistedTasks>(STORAGE_KEYS.tasks),
    ]).then(([storedProfile, storedTasks]) => {
      if (cancelled) return;
      if (storedProfile) setProfile(storedProfile);
      if (storedTasks && storedTasks.day === todayKey()) {
        setTasks((prev) =>
          prev.map((task) => {
            const status = storedTasks.statusById[task.id];
            return status ? { ...task, status } : task;
          }),
        );
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Profil değiştikçe kalıcı olarak sakla.
  useEffect(() => {
    if (!hydrated) return;
    void saveJSON(STORAGE_KEYS.profile, profile);
  }, [profile, hydrated]);

  // Görev onay durumları değiştikçe (o güne ait) kalıcı olarak sakla.
  useEffect(() => {
    if (!hydrated) return;
    const statusById: Record<string, HealthTask["status"]> = {};
    tasks.forEach((task) => {
      statusById[task.id] = task.status;
    });
    void saveJSON<PersistedTasks>(STORAGE_KEYS.tasks, {
      day: todayKey(),
      statusById,
    });
  }, [tasks, hydrated]);

  // Görev listesi değiştikçe arka plan hatırlatıcı servisini güncelle.
  useEffect(() => {
    reminderService.schedule(tasks);
  }, [tasks]);

  const updateProfile = useCallback((patch: Partial<PatientProfile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const completeTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, status: task.status === "done" ? "pending" : "done" }
          : task,
      ),
    );
  }, []);

  const sendTestNotification = useCallback(() => {
    const index = simIndexRef.current;
    simIndexRef.current += 1;
    const notif = buildSimNotification(profile, tasks, index);
    reminderService.pushSim(notif);
    // Kritik bildirimde otomatik olarak refakatçiye de SMS taslağı üret.
    if (notif.kind === "critical") {
      setGuardianAlerts((prev) => [buildCriticalAlert(profile), ...prev]);
    }
  }, [profile, tasks]);

  const raiseCriticalAlert = useCallback(() => {
    setGuardianAlerts((prev) => [buildCriticalAlert(profile), ...prev]);
  }, [profile]);

  // Bekleyen ilaç dozu varsa refakatçi paneline canlı bir "kaçırılan doz"
  // SMS taslağı düşür (üst üste onaylanmayan doz senaryosu).
  const pendingMedId = useMemo(
    () =>
      tasks.find((t) => t.category === "medication" && t.status === "pending")
        ?.id ?? null,
    [tasks],
  );

  const displayedAlerts = useMemo<GuardianAlert[]>(() => {
    if (!pendingMedId) return guardianAlerts;
    return [buildMissedDoseAlert(profile), ...guardianAlerts];
    // profil adı değişebileceği için profile bağımlı; pendingMedId tetikler.
  }, [pendingMedId, guardianAlerts, profile]);

  const value = useMemo<PatientContextValue>(
    () => ({
      profile,
      tasks,
      appointment,
      recommendations,
      guardian,
      guardianAlerts: displayedAlerts,
      updateProfile,
      completeTask,
      sendTestNotification,
      raiseCriticalAlert,
    }),
    [
      profile,
      tasks,
      appointment,
      recommendations,
      guardian,
      displayedAlerts,
      updateProfile,
      completeTask,
      sendTestNotification,
      raiseCriticalAlert,
    ],
  );

  return (
    <PatientContext.Provider value={value}>{children}</PatientContext.Provider>
  );
}

export function usePatient(): PatientContextValue {
  const ctx = useContext(PatientContext);
  if (!ctx) {
    throw new Error("usePatient, PatientProvider içinde kullanılmalıdır.");
  }
  return ctx;
}
