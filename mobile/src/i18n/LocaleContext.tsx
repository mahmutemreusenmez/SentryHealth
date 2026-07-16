import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LOCALE_DIRECTION,
  LOCALES,
  type Locale,
  translate,
} from "./translations";
import { STORAGE_KEYS, loadJSON, saveJSON } from "../services/storageService";

/**
 * Uygulama genelinde aktif dili yöneten yerelleştirme (i18n) context'i.
 *
 * Seçilen dil güvenli depolamada saklanır ve açılışta geri yüklenir. `t`
 * yardımcı fonksiyonu düz metin döndürür; `dir` ile Arapça için RTL yön bilgisi
 * sağlanır. Yeni bir dile geçince tüm ekranlar (onay metinleri, MEWS uyarıları,
 * triyaj adımları) anında güncellenir.
 */
interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** Çeviri anahtarını aktif dile göre metne çevirir. */
  t: (key: string) => string;
  /** Aktif dilin yazım yönü. */
  dir: "ltr" | "rtl";
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("tr");

  useEffect(() => {
    let cancelled = false;
    void loadJSON<{ locale: Locale }>(STORAGE_KEYS.locale).then((stored) => {
      if (cancelled) return;
      if (stored && isLocale(stored.locale)) setLocaleState(stored.locale);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void saveJSON(STORAGE_KEYS.locale, { locale: next });
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: string) => translate(locale, key),
      dir: LOCALE_DIRECTION[locale],
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale, LocaleProvider içinde kullanılmalıdır.");
  }
  return ctx;
}
