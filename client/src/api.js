import axios from 'axios';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// select URL 
const BASE_URL = isLocalhost 
  ? 'http://localhost:5000/api'                 
  : 'https://roomradar-6nfw.onrender.com/api';  



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

// --- API Calls: Applications ---

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


// --- API Calls: Dashboard ---

export const getStudentDashboardSummary = () => api.get('/users/dashboard-summary/student');

export const getLandlordDashboardSummary = () => api.get('/users/dashboard-summary/landlord');


// --- API Calls: Reviews ---

export const createReview = (roomId, reviewData) => 
  api.post(`/reviews/${roomId}`, reviewData);

export const getReviewsForRoom = (roomId) => 
  api.get(`/reviews/${roomId}`);


export default api;