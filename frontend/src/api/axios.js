import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${api.defaults.baseURL}auth/token/refresh/`,
            { refresh: refreshToken }
          );

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - logout user
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  login: (email, password) => api.post('/auth/login/', { email, password }),
  register: (data) => api.post('/auth/register/', data),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.put('/auth/profile/', data),
  getLawyers: () => api.get('/auth/lawyers/'),
  getUsers: () => api.get('/auth/users/'),
};

export const casesAPI = {
  list: (status) => api.get('/cases/', { params: { status } }),
  get: (id) => api.get(`/cases/${id}/`),
  create: (data) => api.post('/cases/', data),
  update: (id, data) => api.put(`/cases/${id}/`, data),
  delete: (id) => api.delete(`/cases/${id}/`),
  addNote: (id, content, isInternal) =>
    api.post(`/cases/${id}/notes/`, { content, is_internal: isInternal }),
  updateStatus: (id, status) => api.post(`/cases/${id}/status/`, { status }),
  getStats: () => api.get('/cases/stats/'),
};

export const messagesAPI = {
  send: (caseId, receiverId, content) =>
    api.post('/messages/send/', { case_id: caseId, receiver_id: receiverId, content }),
  getConversation: (caseId) => api.get(`/messages/conversation/${caseId}/`),
  getInbox: () => api.get('/messages/inbox/'),
  getUnreadCount: () => api.get('/messages/unread-count/'),
};

export const documentsAPI = {
  upload: (formData) => api.post('/documents/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  listByCase: (caseId) => api.get(`/documents/case/${caseId}/`),
  download: (id) => api.get(`/documents/download/${id}/`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/documents/${id}/`),
};

export const appointmentsAPI = {
  list: () => api.get('/appointments/'),
  get: (id) => api.get(`/appointments/${id}/`),
  create: (data) => api.post('/appointments/', data),
  update: (id, data) => api.put(`/appointments/${id}/`, data),
  delete: (id) => api.delete(`/appointments/${id}/`),
  updateStatus: (id, status) => api.post(`/appointments/${id}/status/`, { status }),
  getUpcoming: () => api.get('/appointments/upcoming/'),
};

export const billingAPI = {
  getTimeEntries: (caseId) => api.get('/billing/time-entries/', { params: { case_id: caseId } }),
  createTimeEntry: (data) => api.post('/billing/time-entries/', data),
  getInvoices: () => api.get('/billing/invoices/'),
  getInvoice: (id) => api.get(`/billing/invoices/${id}/`),
  generateInvoice: (data) => api.post('/billing/invoices/generate/', data),
  updateInvoice: (id, data) => api.put(`/billing/invoices/${id}/`, data),
  getSummary: () => api.get('/billing/summary/'),
};

export const consultationsAPI = {
  // Slots
  getSlots: (lawyerId) => api.get('/consultations/slots/', { params: lawyerId ? { lawyer: lawyerId } : {} }),
  createSlot: (data) => api.post('/consultations/slots/', data),
  deleteSlot: (id) => api.delete(`/consultations/slots/${id}/`),
  // Consultations
  list: (statusFilter) => api.get('/consultations/', { params: statusFilter ? { status: statusFilter } : {} }),
  book: (data) => api.post('/consultations/book/', data),
  get: (id) => api.get(`/consultations/${id}/`),
  updateStatus: (id, newStatus) => api.post(`/consultations/${id}/status/`, { status: newStatus }),
  getHistory: () => api.get('/consultations/history/'),
  // Meeting
  joinMeeting: (meetingId, token) => api.get(`/consultations/join/${meetingId}/`, { params: { token } }),
  leaveMeeting: (meetingId) => api.post(`/consultations/leave/${meetingId}/`),
};

export const aiAPI = {
  getSessions: () => api.get('/ai/sessions/'),
  createSession: (title) => api.post('/ai/sessions/', { title }),
  getSession: (sessionId) => api.get(`/ai/sessions/${sessionId}/`),
  deleteSession: (sessionId) => api.delete(`/ai/sessions/${sessionId}/`),
  sendMessage: (sessionId, message, inputType = 'text') =>
    api.post(`/ai/sessions/${sessionId}/send/`, { message, input_type: inputType }),
};

export default api;
