import axios from 'axios';

const envUrl = import.meta.env.VITE_API_URL;
console.log("========================================");
console.log("🚀 DEBUG: VITE_API_URL found:", envUrl);
console.log("🚀 DEBUG: Final Base URL:", envUrl || 'http://localhost:5000/api');
console.log("========================================");

const api = axios.create({
  baseURL: envUrl || 'http://localhost:5000/api', 
});

// Interceptor to attach JWT token to every request configuration.
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
        console.error("Error parsing user info from local storage.", e);
        localStorage.removeItem('userInfo');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Application API Calls ---

export const createApplication = (applicationData) =>
  api.post('/applications', applicationData);

export const getStudentApplications = () => api.get('/applications/student');

export const getLandlordApplications = () => api.get('/applications/landlord');

export const approveApplication = (applicationId) =>
  api.patch(`/applications/${applicationId}/approve`);

export const rejectApplication = (applicationId) =>
  api.patch(`/applications/${applicationId}/reject`);

export const confirmPayment = (applicationId) =>
  api.patch(`/applications/${applicationId}/confirm-payment`);

export const cancelApplication = (applicationId) =>
  api.patch(`/applications/${applicationId}/cancel`);


// --- Dashboard API Calls ---

export const getStudentDashboardSummary = () => api.get('/users/dashboard-summary/student');

export const getLandlordDashboardSummary = () => api.get('/users/dashboard-summary/landlord');


// --- Review API Calls ---

export const createReview = (roomId, reviewData) => 
  api.post(`/reviews/${roomId}`, reviewData);

export const getReviewsForRoom = (roomId) => 
  api.get(`/reviews/${roomId}`);


export default api;