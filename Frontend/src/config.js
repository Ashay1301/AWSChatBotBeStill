const isProduction = process.env.NODE_ENV === 'production';

// Deployed backend URL
const developmentApiUrl = 'http://localhost:3000';
const productionApiUrl = 'https://bestill-prod-env.eba-vvcdpu3q.us-west-1.elasticbeanstalk.com';

// Export the correct URL based on the environment
export const API_URL = isProduction ? productionApiUrl : developmentApiUrl; 