import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FEATURED_APPOINTMENT,
  INITIAL_PROFILE,
  INITIAL_TASKS,
} from "../data/mockData";
import type {
  FeaturedAppointment,
  HealthTask,
  PatientProfile,
  ScreeningRecommendation,
} from "../data/types";
import { reminderService } from "../services/notificationService";
import { generateScreeningRecommendations } from "../services/screeningAlgorithm";

interface PatientContextValue {
  profile: PatientProfile;
  tasks: HealthTask[];
  appointment: FeaturedAppointment;
  recommendations: ScreeningRecommendation[];
  updateProfile: (patch: Partial<PatientProfile>) => void;
  completeTask: (id: string) => void;
}

const PatientContext = createContext<PatientContextValue | undefined>(
  undefined,
);

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PatientProfile>(INITIAL_PROFILE);
  const [tasks, setTasks] = useState<HealthTask[]>(INITIAL_TASKS);
  const [appointment] = useState<FeaturedAppointment>(FEATURED_APPOINTMENT);

  const recommendations = useMemo(
    () => generateScreeningRecommendations(profile),
    [profile],
  );

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

  const value = useMemo<PatientContextValue>(
    () => ({
      profile,
      tasks,
      appointment,
      recommendations,
      updateProfile,
      completeTask,
    }),
    [profile, tasks, appointment, recommendations, updateProfile, completeTask],
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
