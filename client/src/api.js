import axios from 'axios';
import { API_URL } from './config/env';

const API_ROOT = API_URL;
const BASE_URL = API_ROOT.endsWith('/api') ? API_ROOT : `${API_ROOT}/api`;

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
    return config;
  },
  (error) => {
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
