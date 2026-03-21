import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth-context";
import api, {
  setAuthFailureHandler,
  setAuthSessionHandler,
} from "../services/api";
import { connectSocket } from "../services/socketClient";
import {
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  storeAuthSession,
} from "../services/authStorage";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getAccessToken());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const saveAuth = useCallback((nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken);
    storeAuthSession({
      user: nextUser,
      token: nextToken,
    });
  }, []);

  const mergeUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const nextUser = { ...prev, ...patch };
      storeAuthSession({
        user: nextUser,
        token: getAccessToken(),
      });
      return nextUser;
    });
  }, []);

  const login = useCallback(async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    saveAuth(data.user, data.token);
    return data;
  }, [saveAuth]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    saveAuth(data.user, data.token);
    return data;
  }, [saveAuth]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Best effort only; local sign-out still proceeds.
    }

    clearAuthSession();
    setUser(null);
    setToken("");
    if (typeof window !== "undefined") {
      window.location.assign("/");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) return null;
    try {
      const { data } = await api.get("/auth/profile");
      if (data?.user) {
        saveAuth(data.user, getAccessToken());
      }
      return data?.user || null;
    } catch {
      return null;
    }
  }, [saveAuth]);

  useEffect(() => {
    setAuthFailureHandler(() => {
      clearAuthSession();
      setUser(null);
      setToken("");
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.assign("/");
      }
    });

    setAuthSessionHandler((session) => {
      setUser(session?.user || null);
      setToken(session?.token || "");
    });

    return () => {
      setAuthFailureHandler(null);
      setAuthSessionHandler(null);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const { data } = await api.post("/auth/refresh");
        if (!cancelled && data?.token) {
          saveAuth(data.user || null, data.token);
        }
      } catch {
        if (!cancelled) {
          clearAuthSession();
          setUser(null);
          setToken("");
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [saveAuth]);

  useEffect(() => {
    const socket = connectSocket(socketUrl, {
      auth: token && user?.id
        ? { userId: String(user.id), role: user.role }
        : {},
    });

    if (!token || !user?.id) return undefined;

    const handleStaffChange = (payload) => {
      if (String(payload?.subjectId) === String(user.id)) {
        refreshProfile();
      }
    };

    const handleOrderStatus = (payload) => {
      if (String(payload?.userId) !== String(user.id)) return;

      if (
        payload?.status === "Completed" &&
        typeof payload?.loyaltyPoints === "number"
      ) {
        mergeUser({ loyaltyPoints: payload.loyaltyPoints });
        return;
      }

      if (payload?.status === "Completed") {
        refreshProfile();
      }
    };

    socket.on("staff:changed", handleStaffChange);
    socket.on("order:status", handleOrderStatus);

    return () => {
      socket.off("staff:changed", handleStaffChange);
      socket.off("order:status", handleOrderStatus);
    };
  }, [token, user, refreshProfile, mergeUser]);

  const value = useMemo(
    () => ({
      user,
      token,
      isBootstrapping,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      refreshProfile,
    }),
    [user, token, isBootstrapping, login, register, logout, refreshProfile],
  );

  if (isBootstrapping) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
