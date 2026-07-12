import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAdminSession, setAdminSession, clearAdminSession } from "../lib/session";
import { adminApiRequest, ApiError } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getAdminSession());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function validateSession() {
      if (!session?.token) {
        if (!ignore) {
          setIsBootstrapping(false);
        }
        return;
      }

      try {
        await adminApiRequest("/admin/pandits", {
          token: session.token,
        });
        if (!ignore) {
          setIsBootstrapping(false);
        }
      } catch (error) {
        if (!ignore) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            clearAdminSession();
            setSession(null);
          }
          setIsBootstrapping(false);
        }
      }
    }

    validateSession();

    return () => {
      ignore = true;
    };
  }, [session?.token]);

  const login = ({ token, admin }) => {
    const nextSession = { token, admin };
    setAdminSession(nextSession);
    setSession(nextSession);
  };

  const logout = () => {
    clearAdminSession();
    setSession(null);
  };

  const value = useMemo(
    () => ({
      session,
      admin: session?.admin ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      isBootstrapping,
      login,
      logout,
    }),
    [isBootstrapping, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
