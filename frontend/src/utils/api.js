import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common error cases
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/';
    } else if (error.response?.status === 429) {
      // Rate limited
      console.warn('Rate limit exceeded');
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      console.error('Request timeout');
    }

    return Promise.reject(error);
  }
);

// API methods
export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
};

export const dashboard = {
  getSessions: () => api.get('/dashboard/sessions'),
  getSession: (id) => api.get(`/dashboard/sessions/${id}`),
  getStats: () => api.get('/dashboard/stats'),
  deleteSession: (id) => api.delete(`/dashboard/sessions/${id}`),
  regenerateSession: (id, options) => api.post(`/dashboard/sessions/${id}/regenerate`, options),
};

export const files = {
  download: (url) => {
    // Handle file downloads
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  getDownloadUrl: (sessionId, fileType) => {
    return `${api.defaults.baseURL.replace('/api', '')}/downloads/${sessionId}/${fileType}`;
  }
};

export { api };
export default api;
