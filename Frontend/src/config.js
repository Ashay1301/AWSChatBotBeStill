const isProduction = process.env.NODE_ENV === 'production';

// Define your URLs
const developmentApiUrl = 'http://localhost:3000';
const productionApiUrl = 'http://your-elastic-beanstalk-url.com'; // <-- IMPORTANT: Replace with your actual backend URL

// Export the correct URL based on the environment
export const API_URL = isProduction ? productionApiUrl : developmentApiUrl;