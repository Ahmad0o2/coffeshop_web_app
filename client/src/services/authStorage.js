let accessToken = "";
let sessionUser = null;
const REFRESH_TOKEN_STORAGE_KEY = "cortina_refresh_token";

const readStoredRefreshToken = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || "";
};

let refreshToken = readStoredRefreshToken();

const persistRefreshToken = (token) => {
  refreshToken = token || "";

  if (typeof window === "undefined") return;

  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    return;
  }

  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
};

export const getStoredUser = () => sessionUser;

export const getAccessToken = () => accessToken;

export const getRefreshToken = () => refreshToken;

export const storeAuthSession = ({ user, token, refreshToken: nextRefreshToken } = {}) => {
  sessionUser = user || null;
  accessToken = token || "";

  if (nextRefreshToken !== undefined) {
    persistRefreshToken(nextRefreshToken);
  }
};

export const clearAuthSession = () => {
  sessionUser = null;
  accessToken = "";
  persistRefreshToken("");
};
