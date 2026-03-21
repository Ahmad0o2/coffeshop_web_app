import axios from "axios";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  storeAuthSession,
} from "./authStorage";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export const resolveImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  if (url.startsWith("http")) return url;
  if (url.startsWith("blob:")) return url;
  const base =
    import.meta.env.VITE_API_URL?.replace("/api/v1", "") ||
    "http://localhost:5000";
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

const api = axios.create({
  baseURL,
});

const refreshClient = axios.create({
  baseURL,
});

let authFailureHandler = null;
let authSessionHandler = null;
let refreshPromise = null;

export const setAuthFailureHandler = (handler) => {
  authFailureHandler = handler;
};

export const setAuthSessionHandler = (handler) => {
  authSessionHandler = handler;
};

const shouldSkipRefresh = (url = "") =>
  [
    "/auth/login",
    "/auth/register",
    "/auth/otp/request",
    "/auth/password-reset",
    "/auth/refresh",
    "/auth/logout",
  ].some((path) => url.includes(path));

const injectRefreshToken = (config = {}) => {
  const url = config.url || "";
  if (!["/auth/refresh", "/auth/logout"].some((path) => url.includes(path))) {
    return config;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return config;
  }

  const data =
    config.data && typeof config.data === "string"
      ? JSON.parse(config.data)
      : config.data || {};

  if (!data.refreshToken) {
    config.data = { ...data, refreshToken };
  }

  return config;
};

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("Missing refresh token");

  const { data } = await refreshClient.post("/auth/refresh", { refreshToken });

  storeAuthSession({
    user: data?.user || null,
    token: data?.token || "",
    refreshToken: data?.refreshToken || "",
  });

  if (typeof authSessionHandler === "function") {
    authSessionHandler({
      user: data?.user || null,
      token: data?.token || "",
    });
  }

  return data?.token || "";
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return injectRefreshToken(config);
});

refreshClient.interceptors.request.use((config) => injectRefreshToken(config));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (
      !originalRequest ||
      originalRequest._retry ||
      status !== 401 ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });

      const nextAccessToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearAuthSession();
      if (typeof authSessionHandler === "function") {
        authSessionHandler({
          user: null,
          token: "",
        });
      }
      if (typeof authFailureHandler === "function") {
        authFailureHandler();
      }
      return Promise.reject(refreshError);
    }
  },
);

export default api;
