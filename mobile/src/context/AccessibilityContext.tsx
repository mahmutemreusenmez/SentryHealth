import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  HIGH_CONTRAST_SURFACE,
  LIGHT_SURFACE,
  type SurfaceTheme,
} from "../theme/colors";
import { STORAGE_KEYS, loadJSON, saveJSON } from "../services/storageService";

/**
 * WCAG 2.1 erişilebilirlik modu.
 *
 * Kronik hastaların yaş ortalaması yüksek olduğundan tek dokunuşla aktif olan
 * "Yüksek Kontrast + Büyük Yazı" modu sunar. Ayar güvenli (şifreli) hafızada
 * kalıcılaştırılır; tüm ekranlar aktif yüzey temasını ve yazı ölçeğini bu
 * bağlamdan okur.
 */

interface AccessibilitySettings {
  largeText: boolean;
  highContrast: boolean;
}

interface AccessibilityContextValue {
  largeText: boolean;
  highContrast: boolean;
  /** Büyük yazı için font ölçek katsayısı (1 veya 1.2). */
  fontScale: number;
  /** Aktif yüzey teması (açık veya yüksek kontrast). */
  surface: SurfaceTheme;
  /** Her ikisini birden tek dokunuşla açar/kapatır (Erişilebilirlik Modu). */
  toggleAccessibilityMode: () => void;
  toggleLargeText: () => void;
  toggleHighContrast: () => void;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  largeText: false,
  highContrast: false,
};

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(
  undefined,
);

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<AccessibilitySettings>(
    DEFAULT_SETTINGS,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadJSON<AccessibilitySettings>(STORAGE_KEYS.accessibility).then(
      (stored) => {
        if (cancelled) return;
        if (stored) setSettings(stored);
        setHydrated(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveJSON<AccessibilitySettings>(STORAGE_KEYS.accessibility, settings);
  }, [settings, hydrated]);

  const toggleAccessibilityMode = useCallback(() => {
    setSettings((prev) => {
      const next = !(prev.largeText && prev.highContrast);
      return { largeText: next, highContrast: next };
    });
  }, []);

  const toggleLargeText = useCallback(() => {
    setSettings((prev) => ({ ...prev, largeText: !prev.largeText }));
  }, []);

  const toggleHighContrast = useCallback(() => {
    setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      largeText: settings.largeText,
      highContrast: settings.highContrast,
      fontScale: settings.largeText ? 1.2 : 1,
      surface: settings.highContrast ? HIGH_CONTRAST_SURFACE : LIGHT_SURFACE,
      toggleAccessibilityMode,
      toggleLargeText,
      toggleHighContrast,
    }),
    [settings, toggleAccessibilityMode, toggleLargeText, toggleHighContrast],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error(
      "useAccessibility, AccessibilityProvider içinde kullanılmalıdır.",
    );
  }
  return ctx;
}
