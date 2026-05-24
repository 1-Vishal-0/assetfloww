import axios from "axios";

// ── Base Axios Instance ─────────────────────────────────────────────────────
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 15000,
});

// ── Request interceptor: attach JWT token ───────────────────────────────────
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("eis_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: unwrap .data, handle 401 ─────────────────────────
API.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("eis_token");
      localStorage.removeItem("eis_user");
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    const message = error.response?.data?.message || error.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

// ── Auth API ────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => API.post("/auth/login", data),
  getMe: () => API.get("/auth/me"),
  updateProfile: (data) => API.put("/auth/profile", data),
};

// ── Dashboard API ───────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => API.get("/dashboard"),
};

// ── Assets API ──────────────────────────────────────────────────────────────
export const assetAPI = {
  getAll:   (params) => API.get("/assets", { params }),
  getById:  (id) => API.get(`/assets/${id}`),
  create:   (data) => API.post("/assets", data),
  update:   (id, data) => API.put(`/assets/${id}`, data),
  delete:   (id) => API.delete(`/assets/${id}`),
};

// ── Categories API ──────────────────────────────────────────────────────────
export const categoryAPI = {
  getAll: () => API.get("/categories"),
};

// ── Employees API ───────────────────────────────────────────────────────────
export const employeeAPI = {
  getAll:   (params) => API.get("/employees", { params }),
  getById:  (id) => API.get(`/employees/${id}`),
  create:   (data) => API.post("/employees", data),
  update:   (id, data) => API.put(`/employees/${id}`, data),
  delete:   (id) => API.delete(`/employees/${id}`),
};

// ── Allocations API ─────────────────────────────────────────────────────────
export const allocationAPI = {
  getActive:  (params) => API.get("/allocations", { params }),
  create:     (data) => API.post("/allocations", data),
  delete:     (id) => API.delete(`/allocations/${id}`),
};

// ── Returns API ─────────────────────────────────────────────────────────────
export const returnAPI = {
  getAll: (params) => API.get("/returns", { params }),
  create: (data) => API.post("/returns", data),
};

// ── Damage Reports API ──────────────────────────────────────────────────────
export const damageAPI = {
  getAll:   (params) => API.get("/damages", { params }),
  getById:  (id) => API.get(`/damages/${id}`),
  create:   (data) => API.post("/damages", data, { headers: { "Content-Type": "multipart/form-data" } }),
  resolve:  (id) => API.put(`/damages/${id}/resolve`),
  delete:   (id) => API.delete(`/damages/${id}`),
};

// ── History API ─────────────────────────────────────────────────────────────
export const historyAPI = {
  getAll:         (params) => API.get("/history", { params }),
  getByAsset:     (assetId) => API.get(`/history/assets/${assetId}`),
  getByEmployee:  (employeeId) => API.get(`/history/employees/${employeeId}`),
};

// ── Notifications API ───────────────────────────────────────────────────────
export const notificationAPI = {
  getAll:     () => API.get("/notifications"),
  markRead:   (id) => API.put(`/notifications/${id}/read`),
  markAllRead: () => API.put("/notifications/read-all"),
};

export default API;