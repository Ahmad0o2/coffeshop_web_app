let accessToken = "";
let sessionUser = null;

export const getStoredUser = () => sessionUser;

export const getAccessToken = () => accessToken;

export const storeAuthSession = ({ user, token }) => {
  sessionUser = user || null;
  accessToken = token || "";
};

export const clearAuthSession = () => {
  sessionUser = null;
  accessToken = "";
};
