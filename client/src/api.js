import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', 
});


api.interceptors.request.use(
  (config) => {
    const userInfoString = localStorage.getItem('userInfo');

    if (userInfoString) {
      const userInfo = JSON.parse(userInfoString);
      
      if (userInfo && userInfo.token) {
        config.headers.Authorization = `Bearer ${userInfo.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

//  Application API Calls 

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
