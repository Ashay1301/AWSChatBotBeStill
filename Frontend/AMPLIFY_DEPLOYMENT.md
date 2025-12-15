# Frontend Deployment to AWS Amplify

## Option 1: Deploy from Build Folder (Recommended for Quick Setup)

1. **Zip the build folder:**
   ```bash
   cd /Volumes/Ashay_SSD3/BeStill-Work/AWSChatBotBeStill/Frontend
   cd build
   zip -r ../bestill-frontend.zip .
   ```

2. **Go to AWS Amplify Console:**
   - Open https://console.aws.amazon.com/amplify/
   - Click "Get Started" under "Host your web app"
   - Choose "Deploy without Git provider"
   - Drag and drop the `bestill-frontend.zip` file
   - Click "Save and deploy"

3. **After deployment:**
   - Amplify will provide a URL like: `https://xxxx.amplifyapp.com`
   - Copy this URL

4. **Update Backend CORS:**
   ```bash
   cd /Volumes/Ashay_SSD3/BeStill-Work/AWSChatBotBeStill/AWSChatbot
   eb setenv FRONTEND_URL=https://your-app.amplifyapp.com
   ```

## Option 2: Connect to Git Repository

1. **Push code to GitHub/GitLab/BitBucket**

2. **Go to AWS Amplify Console:**
   - Open https://console.aws.amazon.com/amplify/
   - Click "Get Started" under "Host your web app"
   - Choose your Git provider
   - Select your repository and branch
   - Configure build settings (should auto-detect React)
   - Click "Save and deploy"

3. **After deployment:**
   - Follow step 3-4 from Option 1

## Testing After Deployment

1. Open the Amplify URL in your browser
2. Test registration: Create a new account
3. Test login: Log in with the created account
4. Test chatbot: Send a message to the AI
5. Test journal: Create a journal entry
6. Test profile: Update profile information

## Important Notes

- The frontend is currently configured to use HTTP for the backend
- You may see a warning about mixed content (HTTPS frontend → HTTP backend)
- To fix this, we need to configure proper HTTPS with a custom domain or ACM certificate
