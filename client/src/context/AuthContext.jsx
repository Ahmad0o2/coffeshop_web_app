import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { io } from "socket.io-client";
import { AuthContext } from "./auth-context";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const saveAuth = (nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken);
    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
    } else {
      localStorage.removeItem("user");
    }
    if (nextToken) {
      localStorage.setItem("token", nextToken);
    } else {
      localStorage.removeItem("token");
    }
  };

  const mergeUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const nextUser = { ...prev, ...patch };
      localStorage.setItem("user", JSON.stringify(nextUser));
      return nextUser;
    });
  }, []);

  const login = useCallback(async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    saveAuth(data.user, data.token);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    saveAuth(data.user, data.token);
    return data;
  }, []);

  const logout = useCallback(() => {
    saveAuth(null, null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return null;
    try {
      const { data } = await api.get("/auth/profile");
      if (data?.user) {
        saveAuth(data.user, token);
      }
      return data?.user || null;
    } catch {
      return null;
    }
  }, [token]);

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
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      refreshProfile,
    }),
    [user, token, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
