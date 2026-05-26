import axios from 'axios';
import toast from 'react-hot-toast';
import { API_URL } from './config/env';

const API_ROOT = API_URL;
const BASE_URL = API_ROOT.endsWith('/api') ? API_ROOT : `${API_ROOT}/api`;
const SLOW_API_TOAST_ID = 'roomradar-slow-api';
const SLOW_API_NOTICE_MS = Math.max(Number(import.meta.env.VITE_SLOW_API_NOTICE_MS || 12000), 3000);

const shouldShowSlowApiNotice = (config = {}) => {
  const url = String(config.url || '');
  return !config.skipSlowApiNotice
    && !url.includes('/upload')
    && !url.includes('/usage')
    && !url.includes('/search/autocomplete');
};

const clearSlowApiNotice = (config, { failed = false } = {}) => {
  const metadata = config?.metadata;
  if (!metadata?.slowApiTimer) return;

  if (typeof window !== 'undefined') window.clearTimeout(metadata.slowApiTimer);
  else clearTimeout(metadata.slowApiTimer);
  metadata.slowApiTimer = null;

  if (metadata.slowApiToastShown) {
    if (failed) {
      toast.error('Could not reach RoomRadar server. Please retry once.', { id: SLOW_API_TOAST_ID, duration: 5000 });
    } else {
      toast.success('Connected.', { id: SLOW_API_TOAST_ID, duration: 1400 });
    }
  }
};

const api = axios.create({
  baseURL: BASE_URL, 
});

// --- Interceptor ---
// Automatically attaches the JWT token to every request if the user is logged in.
api.interceptors.request.use(
  (config) => {
    const userInfoString = localStorage.getItem('userInfo');

    if (userInfoString) {
      try {
        const userInfo = JSON.parse(userInfoString);
        
        if (userInfo && userInfo.token) {
          config.headers.Authorization = `Bearer ${userInfo.token}`;
        }
      } catch (e) {
        localStorage.removeItem('userInfo');
      }
    }

    if (typeof window !== 'undefined' && shouldShowSlowApiNotice(config)) {
      config.metadata = {
        ...(config.metadata || {}),
        slowApiToastShown: false,
      };
      config.metadata.slowApiTimer = window.setTimeout(() => {
        config.metadata.slowApiToastShown = true;
        toast.loading('RoomRadar server is waking up. First request can take a few seconds.', {
          id: SLOW_API_TOAST_ID,
          duration: 30000,
        });
      }, SLOW_API_NOTICE_MS);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    clearSlowApiNotice(response.config);
    return response;
  },
  (error) => {
    clearSlowApiNotice(error.config, { failed: !error.response });
    return Promise.reject(error);
  }
);

// --- API Calls: Applications ---

export const createApplication = (applicationData) =>
  api.post('/applications', applicationData);

export const getStudentApplications = () => api.get('/applications/student');

export const getLandlordApplications = () => api.get('/applications/landlord');

export const approveApplication = (applicationId) =>
  api.patch(`/applications/${applicationId}/approve`);

export const rejectApplication = (applicationId) =>
  api.patch(`/applications/${applicationId}/reject`);

export const confirmPayment = (applicationId, payload = {}) =>
  api.patch(`/applications/${applicationId}/confirm-payment`, payload);

export const cancelApplication = (applicationId) =>
  api.patch(`/applications/${applicationId}/cancel`);

export const requestStayChange = (applicationId, payload) =>
  api.post(`/applications/${applicationId}/stay-change`, payload);

export const respondStayChange = (applicationId, payload) =>
  api.patch(`/applications/${applicationId}/stay-change/respond`, payload);


// --- API Calls: Dashboard ---

export const getStudentDashboardSummary = () => api.get('/users/dashboard-summary/student');

export const getLandlordDashboardSummary = () => api.get('/users/dashboard-summary/landlord');


// --- API Calls: Reviews ---

export const createReview = (roomId, reviewData) => 
  api.post(`/reviews/${roomId}`, reviewData);

export const createGuestReview = (applicationId, reviewData) =>
  api.post(`/reviews/guest/${applicationId}`, reviewData);

export const getReviewsForRoom = (roomId) => 
  api.get(`/reviews/${roomId}`);


export default api;
