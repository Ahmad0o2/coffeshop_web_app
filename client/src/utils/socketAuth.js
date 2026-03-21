export const buildSocketConnectionOptions = (user) => {
  if (!user?.id || !user?.role) {
    return {};
  }

  return {
    auth: {
      userId: String(user.id),
      role: user.role,
    },
  };
};
