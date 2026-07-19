import { Platform } from "react-native";

import type {
  HealthTask,
  ScheduledNotification,
  SimNotification,
} from "../data/types";

/** Yaklaşan aşı bildirimi için gereken en az bilgi (BabyContext'ten gelir). */
export interface VaccineReminderInput {
  id: string;
  name: string;
  dose: string;
  /** Planlanan tarih (ISO, YYYY-MM-DD). */
  dueDate: string;
}

/**
 * Simüle edilmiş arka plan bildirim servisi.
 *
 * Gerçek bir cihazda `expo-notifications` ile yerel bildirim planlanır; native
 * modül mevcut değilse (Expo Go / web / test) servis tamamen bellek içinde
 * simülasyon moduna düşer ve abonelerine geri çağrım (callback) ile haber verir.
 */

export type NotificationListener = (
  notification: ScheduledNotification,
) => void;

/** Jüri için canlı push simülatörü bildirimlerini dinleyen geri çağrım. */
export type SimNotificationListener = (notification: SimNotification) => void;

/** Görev saatinden kaç dakika önce hatırlatılacağı */
const REMINDER_LEAD_MINUTES = 15;
/** Simülasyon döngüsünün kontrol aralığı (ms) */
const TICK_INTERVAL_MS = 1000;

function nextFireTime(time: string, leadMinutes: number): number {
  const [h, m] = time.split(":").map(Number);
  const fire = new Date();
  fire.setHours(h, m, 0, 0);
  fire.setMinutes(fire.getMinutes() - leadMinutes);
  if (fire.getTime() <= Date.now()) {
    // Saat geçtiyse ertesi güne planla
    fire.setDate(fire.getDate() + 1);
  }
  return fire.getTime();
}

/** İlaç görevi için özel, hastanın anlayacağı bildirim gövdesi üretir. */
function taskBody(task: HealthTask): string {
  if (task.category === "medication") {
    return `İlaç Vakti: Lütfen ${task.title} almayı unutmayın.`;
  }
  return `${task.time} — ${task.title}${
    task.detail ? ` (${task.detail})` : ""
  } zamanı yaklaşıyor.`;
}

class ReminderService {
  private listeners = new Set<NotificationListener>();
  private simListeners = new Set<SimNotificationListener>();
  private scheduled: ScheduledNotification[] = [];
  private vaccineScheduled: ScheduledNotification[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private expo: typeof import("expo-notifications") | null = null;
  private channelReady = false;

  constructor() {
    // Native modül varsa yükle; yoksa sessizce simülasyon moduna geç.
    try {
      this.expo = require("expo-notifications");
    } catch {
      this.expo = null;
    }
  }

  get isSimulated(): boolean {
    return this.expo === null;
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Canlı push simülatörü bildirimlerine abone olur (Dashboard test butonu). */
  subscribeSim(listener: SimNotificationListener): () => void {
    this.simListeners.add(listener);
    return () => this.simListeners.delete(listener);
  }

  /** Verilen bildirimi anında tüm sim abonelerine iletir. */
  pushSim(notification: SimNotification): void {
    this.simListeners.forEach((listener) => listener(notification));
  }

  getScheduled(): ScheduledNotification[] {
    return [...this.scheduled].sort((a, b) => a.fireAt - b.fireAt);
  }

  /** Bekleyen sağlık görevlerine göre hatırlatıcıları (yeniden) planlar. */
  schedule(tasks: HealthTask[]): void {
    this.scheduled = tasks
      .filter((task) => task.status === "pending")
      .map((task) => ({
        id: `notif-${task.id}`,
        taskId: task.id,
        title:
          task.category === "medication"
            ? "İlaç Hatırlatıcısı"
            : "Sağlık Hatırlatıcısı",
        body: taskBody(task),
        fireAt: nextFireTime(task.time, REMINDER_LEAD_MINUTES),
        fired: false,
      }));

    void this.scheduleWithExpo();
    this.ensureRunning();
  }

  /**
   * Yaklaşan aşı günleri için otonom yerel bildirim planlar (SentryBaby).
   * Aşı gününün sabahı (09:00) tetiklenir; geçmiş günler bir sonraki güne alınır.
   */
  scheduleVaccines(vaccines: VaccineReminderInput[]): void {
    const now = Date.now();
    this.vaccineScheduled = vaccines.map((v) => {
      const fire = new Date(`${v.dueDate}T09:00:00`);
      const fireAt =
        fire.getTime() <= now ? now + 5 * 60 * 1000 : fire.getTime();
      return {
        id: `vaccine-${v.id}`,
        taskId: v.id,
        title: "Aşı Zamanı Yaklaşıyor",
        body: `SentryBaby: ${v.name} (${v.dose}) aşısının günü yaklaştı. Aile sağlığı merkezinden randevu alın.`,
        fireAt,
        fired: false,
      };
    });
    void this.scheduleWithExpo();
  }

  /**
   * Simülasyon/test için: bir sonraki hatırlatıcıyı hemen tetikler.
   * Gerçek zamanı beklemeden bildirim mekanizmasını doğrulamayı sağlar.
   */
  triggerNext(): void {
    const pending = this.getScheduled().find((n) => !n.fired);
    if (pending) {
      pending.fireAt = Date.now();
    }
  }

  start(): void {
    this.ensureRunning();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private ensureRunning(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  private tick(): void {
    const now = Date.now();
    for (const notif of this.scheduled) {
      if (!notif.fired && notif.fireAt <= now) {
        notif.fired = true;
        this.emit(notif);
      }
    }
  }

  private emit(notif: ScheduledNotification): void {
    this.listeners.forEach((listener) => listener(notif));
  }

  /** Android bildirim kanalını (yalnızca bir kez) hazırlar. */
  private async ensureAndroidChannel(): Promise<void> {
    if (!this.expo || this.channelReady || Platform.OS !== "android") return;
    await this.expo.setNotificationChannelAsync("sentry-reminders", {
      name: "SentryCompanion Hatırlatıcılar",
      importance: this.expo.AndroidImportance.HIGH,
      lightColor: "#E11D48",
    });
    this.channelReady = true;
  }

  private async scheduleWithExpo(): Promise<void> {
    if (!this.expo) return;
    try {
      const { status } = await this.expo.getPermissionsAsync();
      if (status !== "granted") {
        const req = await this.expo.requestPermissionsAsync();
        if (!req.granted && req.status !== "granted") return;
      }
      await this.ensureAndroidChannel();
      await this.expo.cancelAllScheduledNotificationsAsync();
      const all = [...this.scheduled, ...this.vaccineScheduled];
      for (const notif of all) {
        const seconds = Math.max(
          1,
          Math.round((notif.fireAt - Date.now()) / 1000),
        );
        await this.expo.scheduleNotificationAsync({
          content: { title: notif.title, body: notif.body },
          trigger:
            Platform.OS === "android"
              ? { seconds, channelId: "sentry-reminders" }
              : { seconds },
        });
      }
    } catch {
      // Native katman kullanılamıyorsa simülasyon devam eder.
      this.expo = null;
    }
  }
}

export const reminderService = new ReminderService();
