import axios from 'axios';

// axios का एक इंस्टेंस बनाएँ
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // आपका बैकएंड URL
});

// हर रिक्वेस्ट के साथ टोकन भेजने के लिए इंटरसेप्टर
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Application API Calls ---

// 1. एक नया बुकिंग अनुरोध बनाएँ
export const createApplication = (applicationData) =>
  api.post('/applications', applicationData);

// 2. छात्र के सभी अनुरोध प्राप्त करें
export const getStudentApplications = () => api.get('/applications/student');

// 3. मकान मालिक के सभी अनुरोध प्राप्त करें
export const getLandlordApplications = () => api.get('/applications/landlord');

// 4. एक अनुरोध को स्वीकार करें (मकान मालिक द्वारा)
export const approveApplication = (applicationId) =>
  api.patch(`/applications/${applicationId}/approve`);

// 5. एक अनुरोध को अस्वीकार करें (मकान मालिक द्वारा)
export const rejectApplication = (applicationId) =>
  api.patch(`/applications/${applicationId}/reject`);

// 6. नकद भुगतान की पुष्टि करें (मकान मालिक द्वारा)
export const confirmPayment = (applicationId) =>
  api.patch(`/applications/${applicationId}/confirm-payment`);

// 7. एक आवेदन/बुकिंग को रद्द करें
export const cancelApplication = (applicationId) =>
  api.patch(`/applications/${applicationId}/cancel`);


// --- Dashboard API Calls ---

// 8. छात्र के डैशबोर्ड का सारांश डेटा प्राप्त करें
export const getStudentDashboardSummary = () => api.get('/users/dashboard-summary/student');

// 9. मकान मालिक के डैशबोर्ड का सारांश डेटा प्राप्त करें
export const getLandlordDashboardSummary = () => api.get('/users/dashboard-summary/landlord');


// --- REVIEW API CALLS (Newly Added) ---

// 10. किसी कमरे के लिए एक नई समीक्षा बनाएँ
export const createReview = (roomId, reviewData) => 
  api.post(`/reviews/${roomId}`, reviewData);

// 11. किसी कमरे के लिए सभी समीक्षाएँ प्राप्त करें
export const getReviewsForRoom = (roomId) => 
  api.get(`/reviews/${roomId}`);


export default api;