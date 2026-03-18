export const getApiErrorMessage = (
  error,
  fallback = "Something went wrong.",
) => {
  const data = error?.response?.data;
  if (data?.details && Array.isArray(data.details) && data.details.length) {
    return data.details
      .map((issue) => {
        const path =
          Array.isArray(issue.path) && issue.path.length
            ? issue.path[0]
            : "field";
        return `${path}: ${issue.message}`;
      })
      .join(" | ");
  }
  return data?.message || fallback;
};
