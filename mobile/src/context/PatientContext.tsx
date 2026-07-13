import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  INITIAL_APPOINTMENTS,
  INITIAL_MEDICATIONS,
  INITIAL_PROFILE,
} from "../data/mockData";
import type {
  Appointment,
  Medication,
  PatientProfile,
  ScreeningRecommendation,
} from "../data/types";
import { generateScreeningRecommendations } from "../services/screeningAlgorithm";
import { reminderService } from "../services/notificationService";

interface PatientContextValue {
  profile: PatientProfile;
  medications: Medication[];
  appointments: Appointment[];
  recommendations: ScreeningRecommendation[];
  updateProfile: (patch: Partial<PatientProfile>) => void;
  toggleMedicationTaken: (id: string) => void;
}

const PatientContext = createContext<PatientContextValue | undefined>(
  undefined,
);

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PatientProfile>(INITIAL_PROFILE);
  const [medications, setMedications] =
    useState<Medication[]>(INITIAL_MEDICATIONS);
  const [appointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);

  const recommendations = useMemo(
    () => generateScreeningRecommendations(profile),
    [profile],
  );

  // İlaç listesi değiştikçe arka plan hatırlatıcı servisini güncelle.
  useEffect(() => {
    reminderService.schedule(medications);
  }, [medications]);

  const updateProfile = useCallback((patch: Partial<PatientProfile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleMedicationTaken = useCallback((id: string) => {
    setMedications((prev) =>
      prev.map((med) =>
        med.id === id ? { ...med, taken: !med.taken } : med,
      ),
    );
  }, []);

  const value = useMemo<PatientContextValue>(
    () => ({
      profile,
      medications,
      appointments,
      recommendations,
      updateProfile,
      toggleMedicationTaken,
    }),
    [
      profile,
      medications,
      appointments,
      recommendations,
      updateProfile,
      toggleMedicationTaken,
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
