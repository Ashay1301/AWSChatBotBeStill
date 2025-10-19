const isProduction = process.env.NODE_ENV === 'production';

// Define your URLs
const developmentApiUrl = 'http://localhost:3000';
const productionApiUrl = 'http://BeStill-Chatbot-env.eba-2iusiwup.us-west-1.elasticbeanstalk.com '; // <-- IMPORTANT: Replace with your actual backend URL

// Export the correct URL based on the environment
export const API_URL = isProduction ? productionApiUrl : developmentApiUrl;

// export const API_URL = developmentApiUrl;