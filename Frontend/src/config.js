const isProduction = process.env.NODE_ENV === 'production';

// Define your URLs
const developmentApiUrl = 'http://localhost:3000';
const productionApiUrl = 'https://BeStill-App-env.eba-3ddwxm9b.us-west-2.elasticbeanstalk.com'; // <-- IMPORTANT: Replace with your actual backend URL

// Export the correct URL based on the environment
export const API_URL = isProduction ? productionApiUrl : developmentApiUrl;

// export const API_URL = developmentApiUrl; 