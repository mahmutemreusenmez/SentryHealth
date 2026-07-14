import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import type { AuthenticationState } from "../data/types";

const INITIAL_AUTH: AuthenticationState = {
  isAuthenticated: false,
  isLoading: false,
  nationalId: null,
  error: null,
};

interface AuthContextValue {
  auth: AuthenticationState;
  /** e-Devlet Kapısı ile sahte giriş: doğrula → yükleniyor → Giriş Başarılı. */
  login: (nationalId: string, password: string) => void;
  logout: () => void;
}

function isValidNationalId(id: string): boolean {
  return /^\d{11}$/.test(id) && id[0] !== "0";
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthenticationState>(INITIAL_AUTH);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const login = useCallback((nationalId: string, password: string) => {
    if (!isValidNationalId(nationalId)) {
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
    }, 1600);
  }, []);

  const logout = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAuth(INITIAL_AUTH);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ auth, login, logout }),
    [auth, login, logout],
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
