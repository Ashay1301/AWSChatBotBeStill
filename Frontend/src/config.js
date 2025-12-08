const isProduction = process.env.NODE_ENV === 'production';

// Define your URLs
const developmentApiUrl = 'http://localhost:3000';
const productionApiUrl = 'https://Chatbot-env.eba-wzwnk7xj.us-west-2.elasticbeanstalk.com'; // Your actual Elastic Beanstalk backend URL with HTTPS

// Export the correct URL based on the environment
export const API_URL = isProduction ? productionApiUrl : developmentApiUrl;

// export const API_URL = developmentApiUrl; 