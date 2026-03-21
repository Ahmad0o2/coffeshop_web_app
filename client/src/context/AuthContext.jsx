import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./auth-context";
import api, {
  setAuthFailureHandler,
  setAuthSessionHandler,
} from "../services/api";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  storeAuthSession,
} from "../services/authStorage";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getAccessToken());

  const saveAuth = useCallback((nextUser, nextToken, nextRefreshToken = null) => {
    setUser(nextUser);
    setToken(nextToken);
    storeAuthSession({
      user: nextUser,
      token: nextToken,
      refreshToken:
        nextRefreshToken !== null ? nextRefreshToken : getRefreshToken(),
    });
  }, []);

  const mergeUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const nextUser = { ...prev, ...patch };
      storeAuthSession({
        user: nextUser,
        token: getAccessToken(),
        refreshToken: getRefreshToken(),
      });
      return nextUser;
    });
  }, []);

  const login = useCallback(async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    saveAuth(data.user, data.token, data.refreshToken || "");
    return data;
  }, [saveAuth]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    saveAuth(data.user, data.token, data.refreshToken || "");
    return data;
  }, [saveAuth]);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();

    try {
      await api.post("/auth/logout", refreshToken ? { refreshToken } : {});
    } catch {
      // Best effort only; local sign-out still proceeds.
    }

    clearAuthSession();
    setUser(null);
    setToken(null);
    if (typeof window !== "undefined") {
      window.location.assign("/");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) return null;
    try {
      const { data } = await api.get("/auth/profile");
      if (data?.user) {
        saveAuth(data.user, getAccessToken(), getRefreshToken());
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
      setToken(null);
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.assign("/");
      }
    });

    setAuthSessionHandler((session) => {
      setUser(session?.user || null);
      setToken(session?.token || null);
    });

    return () => {
      setAuthFailureHandler(null);
      setAuthSessionHandler(null);
    };
  }, []);

  useEffect(() => {
    if (!token || !user?.id) return;
    const socket = io(socketUrl);

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
      socket.disconnect();
    };
  }, [token, user?.id, refreshProfile, mergeUser]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      refreshProfile,
    }),
    [user, token, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
