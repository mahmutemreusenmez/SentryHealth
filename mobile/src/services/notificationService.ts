import type { HealthTask, ScheduledNotification } from "../data/types";

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

class ReminderService {
  private listeners = new Set<NotificationListener>();
  private scheduled: ScheduledNotification[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private expo: typeof import("expo-notifications") | null = null;

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
        title: "Sağlık Hatırlatıcısı",
        body: `${task.time} — ${task.title}${
          task.detail ? ` (${task.detail})` : ""
        } zamanı yaklaşıyor.`,
        fireAt: nextFireTime(task.time, REMINDER_LEAD_MINUTES),
        fired: false,
      }));

    void this.scheduleWithExpo();
    this.ensureRunning();
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

  private async scheduleWithExpo(): Promise<void> {
    if (!this.expo) return;
    try {
      const { status } = await this.expo.getPermissionsAsync();
      if (status !== "granted") {
        await this.expo.requestPermissionsAsync();
      }
      await this.expo.cancelAllScheduledNotificationsAsync();
      for (const notif of this.scheduled) {
        const seconds = Math.max(
          1,
          Math.round((notif.fireAt - Date.now()) / 1000),
        );
        await this.expo.scheduleNotificationAsync({
          content: { title: notif.title, body: notif.body },
          trigger: { seconds },
        });
      }
    } catch {
      // Native katman kullanılamıyorsa simülasyon devam eder.
      this.expo = null;
    }
  }
}

export const reminderService = new ReminderService();
