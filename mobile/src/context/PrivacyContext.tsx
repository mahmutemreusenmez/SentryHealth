import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { STORAGE_KEYS, loadJSON, saveJSON } from "../services/storageService";

/**
 * KVKK/GDPR "Güvenlik ve İzin Bilgilendirme" (Privacy Shield) onayını yönetir.
 *
 * İlk açılışta kullanıcıya uçtan uca şifreleme (E2EE) ve veri koruma
 * protokollerini anlatan onay ekranı gösterilir; onay güvenli (şifreli)
 * hafızada kalıcılaştırılır ve tekrar sorulmaz.
 */

interface PersistedConsent {
  accepted: boolean;
  acceptedAt: number;
}

interface PrivacyContextValue {
  accepted: boolean;
  /** Onay durumu cihaz hafızasından okunurken true. */
  isHydrating: boolean;
  accept: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadJSON<PersistedConsent>(STORAGE_KEYS.privacyConsent).then(
      (stored) => {
        if (cancelled) return;
        if (stored?.accepted) setAccepted(true);
        setIsHydrating(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const accept = useCallback(() => {
    setAccepted(true);
    void saveJSON<PersistedConsent>(STORAGE_KEYS.privacyConsent, {
      accepted: true,
      acceptedAt: Date.now(),
    });
  }, []);

  const value = useMemo<PrivacyContextValue>(
    () => ({ accepted, isHydrating, accept }),
    [accepted, isHydrating, accept],
  );

  return (
    <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
  );
}

export function usePrivacy(): PrivacyContextValue {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    throw new Error("usePrivacy, PrivacyProvider içinde kullanılmalıdır.");
  }
  return ctx;
}
