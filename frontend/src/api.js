import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000', // Remove environment variable for now
  timeout: 10000, // Your current timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// ✅ ADD THIS: List of endpoints that don't require authentication
const publicEndpoints = [
  '/api/auth/login',
  '/api/auth/register', 
  '/api/auth/forgot-password',
  '/api/auth/verify-reset'
];

// ✅ MODIFY THIS: Your existing request interceptor with auth-skipping logic
api.interceptors.request.use(
  (config) => {
    console.log('🔍 Making request to:', config.baseURL + config.url);
    console.log('🔍 Request data:', config.data);
    
    // ✅ NEW: Check if this is a public endpoint
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      config.url?.includes(endpoint)
    );
    
    // ✅ MODIFIED: Only add auth token for non-public endpoints
    if (!isPublicEndpoint) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
        console.log('🔐 Added auth token to request');
      }
    } else {
      console.log('🌐 Public endpoint - skipping auth token');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request setup error:', error);
    return Promise.reject(error);
  }
);

// ✅ UNCHANGED: Your existing response interceptor stays the same
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response received:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
