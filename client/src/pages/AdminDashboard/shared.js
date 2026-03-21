export const socketUrl =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const statusOptions = [
  "Received",
  "InProgress",
  "Ready",
  "Completed",
  "Cancelled",
];

export const sizeOptions = ["Small", "Regular", "Large"];

export const orderDateFilterOptions = [
  "All Dates",
  "Today",
  "Yesterday",
  "Last 7 Days",
  "This Month",
  "This Year",
];

export const orderFeedbackFilterOptions = [
  "All Ratings",
  "Has Feedback",
  "No Feedback",
  "5 Stars",
  "4 Stars",
  "3 Stars",
  "2 Stars",
  "1 Star",
];

export const inventoryStatusFilterOptions = [
  "All Items",
  "Tracked",
  "Open Inventory",
  "Low Stock",
  "Out of Stock",
  "Unavailable",
];

export const staffPermissionOptions = [
  { value: "manageOrders", label: "Orders" },
  { value: "manageProducts", label: "Products & Categories" },
  { value: "manageEvents", label: "Events" },
  { value: "manageRewards", label: "Rewards" },
  { value: "manageBrand", label: "Brand & Home Media" },
];

export const fetchOrders = async (api) => {
  const { data } = await api.get("/orders?page=1&limit=200");
  return data.data || data.orders || [];
};

export const fetchProducts = async (api) => {
  const { data } = await api.get("/products?page=1&limit=100");
  return data.data || data.products || [];
};

export const fetchCategories = async (api) => {
  const { data } = await api.get("/categories?page=1&limit=100");
  return data.data || data.categories || [];
};

export const fetchAdminEvents = async (api) => {
  const { data } = await api.get("/admin/events?page=1&limit=100");
  return data.data || data.events || [];
};

export const fetchAdminRewards = async (api) => {
  const { data } = await api.get("/admin/rewards?page=1&limit=100");
  return data.data || data.rewards || [];
};

export const fetchStaff = async (api) => {
  const { data } = await api.get("/admin/staff");
  return data.staff || [];
};

export const matchesOrderDateFilter = (value, filter) => {
  if (!filter || filter === "All Dates") return true;
  if (!value) return true;

  const orderDate = new Date(value);
  if (Number.isNaN(orderDate.getTime())) return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfLast7Days = new Date(startOfToday);
  startOfLast7Days.setDate(startOfLast7Days.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

  if (filter === "Today") {
    return orderDate >= startOfToday && orderDate < startOfTomorrow;
  }

  if (filter === "Yesterday") {
    return orderDate >= startOfYesterday && orderDate < startOfToday;
  }

  if (filter === "Last 7 Days") {
    return orderDate >= startOfLast7Days && orderDate < startOfTomorrow;
  }

  if (filter === "This Month") {
    return orderDate >= startOfMonth && orderDate < startOfNextMonth;
  }

  if (filter === "This Year") {
    return orderDate >= startOfYear && orderDate < startOfNextYear;
  }

  return true;
};

export const formatOrderDateTime = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getLocalDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString("en-CA");
};

export const formatOrderDayLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown Day";

  const today = new Date();
  const todayKey = getLocalDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);
  const currentKey = getLocalDateKey(date);

  if (currentKey === todayKey) return "Today";
  if (currentKey === yesterdayKey) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const groupOrdersByDay = (orders) => {
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const grouped = new Map();

  sortedOrders.forEach((order) => {
    const dateKey = getLocalDateKey(order.createdAt);

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, {
        dateKey,
        labelSource: order.createdAt,
        entries: [],
        totalAmount: 0,
      });
    }

    const group = grouped.get(dateKey);
    group.entries.push(order);
    group.totalAmount += Number(order.totalAmount || 0);
  });

  return Array.from(grouped.values());
};

export const matchesInventoryStatusFilter = (product, filter, helpers) => {
  const { isProductLowStock, isProductOutOfStock } = helpers;

  if (!filter || filter === "All Items") return true;
  if (filter === "Tracked") {
    return (
      product.inventoryQuantity !== null &&
      product.inventoryQuantity !== undefined
    );
  }
  if (filter === "Open Inventory") {
    return (
      product.inventoryQuantity === null ||
      product.inventoryQuantity === undefined
    );
  }
  if (filter === "Low Stock") return isProductLowStock(product);
  if (filter === "Out of Stock") return isProductOutOfStock(product);
  if (filter === "Unavailable") return product.isAvailable === false;
  return true;
};

export const buildInventoryDraft = (product) => ({
  trackInventory:
    product?.inventoryQuantity !== null &&
    product?.inventoryQuantity !== undefined,
  inventoryQuantity:
    product?.inventoryQuantity === null ||
    product?.inventoryQuantity === undefined
      ? ""
      : String(product.inventoryQuantity),
  lowStockThreshold: String(product?.lowStockThreshold ?? 5),
  isAvailable: product?.isAvailable !== false,
});

export const normalizeInventoryDraft = (draft) => {
  const inventoryQuantity = draft.trackInventory
    ? draft.inventoryQuantity === ""
      ? null
      : Number(draft.inventoryQuantity)
    : null;
  const lowStockThreshold =
    draft.lowStockThreshold === "" ? 5 : Number(draft.lowStockThreshold);

  return {
    inventoryQuantity:
      Number.isInteger(inventoryQuantity) && inventoryQuantity >= 0
        ? inventoryQuantity
        : null,
    lowStockThreshold:
      Number.isInteger(lowStockThreshold) && lowStockThreshold >= 0
        ? lowStockThreshold
        : 5,
  };
};

export const getInventoryDraftStatusLabel = (draft) => {
  const normalized = normalizeInventoryDraft(draft);

  if (!draft.isAvailable) return "Unavailable";
  if (!draft.trackInventory) return "Open inventory";
  if (draft.inventoryQuantity === "") return "Stock count required";
  if (normalized.inventoryQuantity === null) return "Invalid stock count";
  if (normalized.inventoryQuantity <= 0) return "Out of stock";
  if (normalized.inventoryQuantity <= normalized.lowStockThreshold) {
    return "Low stock";
  }
  return "Tracked";
};

export const hasInventoryDraftChanges = (product, draft) => {
  const current = buildInventoryDraft(product);
  return (
    current.trackInventory !== draft.trackInventory ||
    current.inventoryQuantity !== draft.inventoryQuantity ||
    current.lowStockThreshold !== draft.lowStockThreshold ||
    current.isAvailable !== draft.isAvailable
  );
};
