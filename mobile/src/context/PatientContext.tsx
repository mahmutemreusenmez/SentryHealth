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
  INITIAL_MEDICATION_STOCK,
  INITIAL_PROFILE,
  INITIAL_TASKS,
} from "../data/mockData";
import type {
  FeaturedAppointment,
  Guardian,
  GuardianAlert,
  HealthTask,
  MedicationStock,
  PatientProfile,
  ScreeningRecommendation,
  VitalEntry,
} from "../data/types";
import {
  buildCriticalAlert,
  buildMissedDoseAlert,
  buildPulseAlert,
  buildPulseSimNotification,
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
import {
  clearSyncQueue,
  enqueueSyncItem,
  fetchConnectivity,
  loadSyncQueue,
  subscribeConnectivity,
} from "../services/syncService";
import type { VoiceCommand } from "../services/voiceService";

interface PatientContextValue {
  profile: PatientProfile;
  tasks: HealthTask[];
  appointment: FeaturedAppointment;
  recommendations: ScreeningRecommendation[];
  guardian: Guardian;
  guardianAlerts: GuardianAlert[];
  /** Güvenli hafızada şifreli saklanan en güncel vital ölçümü. */
  vitals: VitalEntry | null;
  updateProfile: (patch: Partial<PatientProfile>) => void;
  saveVitals: (entry: VitalEntry) => void;
  completeTask: (id: string) => void;
  /** Jüri sunumu: duruma göre canlı bir push bildirimi tetikler. */
  sendTestNotification: () => void;
  /** Refakatçiye kritik triyaj (kırmızı kod) SMS taslağı üretir. */
  raiseCriticalAlert: () => void;
  /** Cihaz internete bağlı mı? (offline-first bar için) */
  online: boolean;
  /** Çevrimdışı alınıp henüz senkronize edilmemiş onay sayısı. */
  pendingSyncCount: number;
  /** SentryPharmacy: ilaç stok sayaçları. */
  medicationStock: MedicationStock[];
  /** SentryPharmacy: bitmesine 3 gün ve altı kalan ilaçlar. */
  lowStockMedications: MedicationStock[];
  /** Sesli komutla ilgili görevi onaylar; onaylanan görevi döndürür. */
  confirmByVoice: (command: VoiceCommand) => HealthTask | null;
  /** SentryPulse: kritik nabız bildirimi + refakatçi SMS taslağı üretir. */
  notifyCriticalPulse: (bpm: number) => void;
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
  const [vitals, setVitals] = useState<VitalEntry | null>(null);
  const [medicationStock, setMedicationStock] = useState<MedicationStock[]>(
    INITIAL_MEDICATION_STOCK,
  );
  const [hydrated, setHydrated] = useState(false);
  const [online, setOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const onlineRef = useRef(true);
  const simIndexRef = useRef(0);
  const tasksRef = useRef(tasks);

  // completeTask/confirmByVoice içinde güncel görev durumuna erişmek için ref.
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

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
      loadJSON<VitalEntry>(STORAGE_KEYS.vitals),
      loadJSON<MedicationStock[]>(STORAGE_KEYS.medicationStock),
    ]).then(([storedProfile, storedTasks, storedVitals, storedStock]) => {
      if (cancelled) return;
      if (storedProfile) setProfile(storedProfile);
      if (storedVitals) setVitals(storedVitals);
      if (storedStock && storedStock.length > 0) setMedicationStock(storedStock);
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

  // Bağlantı durumunu dinle; çevrimiçi olununca bekleyen kuyruğu boşalt.
  useEffect(() => {
    let cancelled = false;

    const flushQueue = async () => {
      const queue = await loadSyncQueue();
      if (queue.length === 0) return;
      // Gerçek dünyada burada backend'e POST edilir; simülasyonda güvenli
      // yerel kuyruğu boşaltıp senkronize edildi sayıyoruz.
      await clearSyncQueue();
      if (!cancelled) setPendingSyncCount(0);
    };

    void fetchConnectivity().then((connected) => {
      if (cancelled) return;
      onlineRef.current = connected;
      setOnline(connected);
      if (connected) void flushQueue();
    });
    void loadSyncQueue().then((queue) => {
      if (!cancelled) setPendingSyncCount(queue.length);
    });

    const unsubscribe = subscribeConnectivity((connected) => {
      if (cancelled) return;
      const wasOffline = !onlineRef.current;
      onlineRef.current = connected;
      setOnline(connected);
      if (connected && wasOffline) void flushQueue();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Profil değiştikçe kalıcı olarak sakla.
  useEffect(() => {
    if (!hydrated) return;
    void saveJSON(STORAGE_KEYS.profile, profile);
  }, [profile, hydrated]);

  // İlaç stok sayaçları değiştikçe güvenli hafızaya yaz.
  useEffect(() => {
    if (!hydrated) return;
    void saveJSON<MedicationStock[]>(STORAGE_KEYS.medicationStock, medicationStock);
  }, [medicationStock, hydrated]);

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

  // Vital ölçümü güvenli (şifreli) hafızaya yazar ve state'i günceller.
  const saveVitals = useCallback((entry: VitalEntry) => {
    setVitals(entry);
    void saveJSON<VitalEntry>(STORAGE_KEYS.vitals, entry);
  }, []);

  const completeTask = useCallback((id: string) => {
    // Güncel durumu önce ref'ten türet (deferred updater içinde okuma yapmadan).
    const target = tasksRef.current.find((task) => task.id === id);
    if (!target) return;
    const nextStatus: HealthTask["status"] =
      target.status === "done" ? "pending" : "done";

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, status: nextStatus } : task,
      ),
    );

    // SentryPharmacy: ilaç onaylandığında stoktan günlük dozu düş.
    if (target.category === "medication" && nextStatus === "done") {
      setMedicationStock((stock) =>
        stock.map((m) =>
          m.taskId === id
            ? { ...m, remaining: Math.max(0, m.remaining - m.dailyDose) }
            : m,
        ),
      );
    }

    // Çevrimdışıyken onayı güvenli kuyruğa al; bağlantı gelince senkronize edilir.
    if (!onlineRef.current) {
      void enqueueSyncItem({
        id: `${id}-${Date.now()}`,
        taskId: id,
        status: nextStatus,
        queuedAt: Date.now(),
      }).then((queue) => setPendingSyncCount(queue.length));
    }
  }, []);

  // Sesli komutu (ilaç/ölçüm) ilgili bekleyen göreve eşleyip onaylar.
  const confirmByVoice = useCallback(
    (command: VoiceCommand): HealthTask | null => {
      if (command === "unknown") return null;
      const category = command === "measurement" ? "measurement" : "medication";
      const target = tasksRef.current.find(
        (t) => t.category === category && t.status !== "done",
      );
      if (!target) return null;
      completeTask(target.id);
      return target;
    },
    [completeTask],
  );

  // SentryPulse: kritik nabızda push bildirimi + refakatçi SMS taslağı.
  const notifyCriticalPulse = useCallback(
    (bpm: number) => {
      reminderService.pushSim(buildPulseSimNotification(bpm));
      setGuardianAlerts((prev) => [buildPulseAlert(profile, bpm), ...prev]);
    },
    [profile],
  );

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

  // SentryPharmacy: bitmesine 3 gün ve altı kalan ilaçlar.
  const lowStockMedications = useMemo(
    () =>
      medicationStock.filter(
        (m) => m.dailyDose > 0 && m.remaining / m.dailyDose <= 3,
      ),
    [medicationStock],
  );

  const value = useMemo<PatientContextValue>(
    () => ({
      profile,
      tasks,
      appointment,
      recommendations,
      guardian,
      guardianAlerts: displayedAlerts,
      vitals,
      updateProfile,
      saveVitals,
      completeTask,
      sendTestNotification,
      raiseCriticalAlert,
      online,
      pendingSyncCount,
      medicationStock,
      lowStockMedications,
      confirmByVoice,
      notifyCriticalPulse,
    }),
    [
      profile,
      tasks,
      appointment,
      recommendations,
      guardian,
      displayedAlerts,
      vitals,
      updateProfile,
      saveVitals,
      completeTask,
      sendTestNotification,
      raiseCriticalAlert,
      online,
      pendingSyncCount,
      medicationStock,
      lowStockMedications,
      confirmByVoice,
      notifyCriticalPulse,
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
