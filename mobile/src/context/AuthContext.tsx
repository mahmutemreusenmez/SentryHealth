import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { AuthenticationState } from "../data/types";
import {
  STORAGE_KEYS,
  loadJSON,
  removeKey,
  saveJSON,
} from "../services/storageService";
import { findTestAccount, isValidTcKimlik } from "../utils/validation";

const INITIAL_AUTH: AuthenticationState = {
  isAuthenticated: false,
  isLoading: false,
  nationalId: null,
  error: null,
};

/** Cihaz hafızasında saklanan kalıcı oturum verisi. */
interface PersistedAuth {
  isAuthenticated: boolean;
  nationalId: string | null;
}

interface AuthContextValue {
  auth: AuthenticationState;
  /** Kalıcı oturum cihaz hafızasından okunurken true (açılış splash'ı için). */
  isHydrating: boolean;
  /** e-Devlet Kapısı ile sahte giriş: doğrula → yükleniyor → Giriş Başarılı. */
  login: (nationalId: string, password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthenticationState>(INITIAL_AUTH);
  const [isHydrating, setIsHydrating] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Açılışta kalıcı oturumu geri yükle: giriş yapıldıysa doğrudan Dashboard.
  useEffect(() => {
    let cancelled = false;
    void loadJSON<PersistedAuth>(STORAGE_KEYS.auth).then((stored) => {
      if (cancelled) return;
      if (stored?.isAuthenticated) {
        setAuth({
          isAuthenticated: true,
          isLoading: false,
          nationalId: stored.nationalId,
          error: null,
        });
      }
      setIsHydrating(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((nationalId: string, password: string) => {
    // Önceden tanımlı test hesapları: checksum'dan muaf, ancak şifre birebir
    // eşleşmelidir. Diğer tüm kimlikler resmî T.C. algoritmasıyla doğrulanır.
    const testAccount = findTestAccount(nationalId);
    if (testAccount) {
      if (password !== testAccount.password) {
        setAuth((prev) => ({
          ...prev,
          error: "e-Devlet şifresi hatalı. Lütfen tekrar deneyin.",
        }));
        return;
      }
    } else {
      if (!isValidTcKimlik(nationalId)) {
        setAuth((prev) => ({
          ...prev,
          error: "Geçerli bir T.C. Kimlik Numarası girin (11 hane).",
        }));
        return;
      }
      if (password.trim().length < 4) {
        setAuth((prev) => ({
          ...prev,
          error: "e-Devlet şifreniz en az 4 karakter olmalıdır.",
        }));
        return;
      }
    }

    // Sahte e-Devlet doğrulaması: yükleniyor animasyonu sonra Giriş Başarılı.
    setAuth({
      isAuthenticated: false,
      isLoading: true,
      nationalId,
      error: null,
    });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setAuth({
        isAuthenticated: true,
        isLoading: false,
        nationalId,
        error: null,
      });
      void saveJSON<PersistedAuth>(STORAGE_KEYS.auth, {
        isAuthenticated: true,
        nationalId,
      });
    }, 1500);
  }, []);

  const logout = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAuth(INITIAL_AUTH);
    void removeKey(STORAGE_KEYS.auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ auth, isHydrating, login, logout }),
    [auth, isHydrating, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth, AuthProvider içinde kullanılmalıdır.");
  }
  return ctx;
}
