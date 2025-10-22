# Be Still Helper - AI-Powered Support Chatbot

## Project Description

Be Still Helper is a full-stack web application designed to provide a secure and supportive space for domestic violence victims. It features an AI-powered chatbot for guidance, a private journaling tool for documenting incidents, and a user profile section for managing personal safety information. The application integrates with AWS services for AI, database storage, and optional analytics.

---

## Features ✨

* **Secure User Authentication**: Separate registration and login system with password hashing (bcrypt) and session management (JWT).
* **AI Chatbot**: Provides guidance and support using AWS Bedrock (Amazon Titan Text G1 - Express).
* **Private Journaling**: Allows users to securely document incidents with specific details (date, type of abuse, evidence, etc.). Entries are stored per user.
* **User Profile Management**: Dedicated section for users to store and update important personal and safety information (emergency contacts, safety plan details, risk factors).
* **Document Analysis**: Users can upload text-based documents for the AI to summarize and analyze within the chat context.
* **Persistent History**: Chat conversations are saved per user.
* **Analytics Integration (Optional)**: Connects DynamoDB data to Amazon Athena and Tableau Cloud for visualization and analysis.

---

## Tech Stack 🛠️

* **Frontend**: React, React Router, CSS
* **Backend**: Node.js, Express, TypeScript
* **Database**: Amazon DynamoDB (NoSQL)
* **AI Service**: AWS Bedrock (Amazon Titan Text G1 - Express)
* **Authentication**: bcryptjs, jsonwebtoken
* **File Uploads**: Multer
* **Analytics Pipeline**: Amazon Athena, AWS Lambda (Connector), AWS S3, AWS Lake Formation
* **Visualization**: Tableau Cloud

---

## Architecture Overview 🏗️

The application consists of:
1.  A **React single-page application** (SPA) frontend.
2.  A **Node.js/Express backend API** handling business logic, authentication, and communication with AWS services.
3.  **Amazon DynamoDB** tables for storing user credentials, profiles, chat history, and journal entries (primarily in `us-west-1`).
4.  **AWS Bedrock** for AI model inference (using `us-west-2`).
5.  An optional **analytics pipeline** using Athena to query DynamoDB data for visualization in Tableau Cloud.

*(See architecture diagrams for more detail)*

---

## Prerequisites 📋

* An **AWS Account** with appropriate permissions.
* **Node.js** (v18 or later recommended) and **npm**.
* **AWS CLI** installed and configured (`aws configure`) with credentials for an IAM user.

---

## AWS Setup ☁️

The following AWS resources need to be created and configured:

1.  **IAM User**: Create an IAM user (e.g., `bedrock-chatbot-user`) with programmatic access (Access Key ID & Secret Access Key). Attach necessary policies (e.g., `AmazonDynamoDBFullAccess`, `AmazonBedrockFullAccess`, `AmazonAthenaFullAccess`, `AWSLambda_FullAccess`, `AmazonS3FullAccess`, `AWSLakeFormationDataAdmin`, and the inline `lambda:ListFunctions` policy).
2.  **Bedrock Model Access**: Verify that the `amazon.titan-text-express-v1` model is available in your chosen Bedrock region (e.g., `us-west-2`). Access should be automatically enabled.
3.  **DynamoDB Tables** (in your chosen database region, e.g., `us-west-1`):
    * `ChatbotCredentials` (Partition key: `username` (String))
    * `UserProfiles` (Partition key: `username` (String))
    * `JournalEntries` (Partition key: `username` (String), Sort key: `entryTimestamp` (String))
    * `ChatbotUsers` (Partition key: `userId` (String) - *Note: This is now effectively `username`*)
4.  **S3 Bucket**: Create an S3 bucket for Athena query results in the same region as Athena/DynamoDB (e.g., `us-west-1`).
5.  **Athena DynamoDB Connector**: Deploy the `AthenaDynamoDBConnector` Lambda function from the Serverless Application Repository, configuring the S3 spill bucket and a catalog name (e.g., `chatbot_dynamo_db`).
6.  **Athena Data Source**: Create a data source in Athena, linking it to the deployed Lambda function using the catalog name. Set the query result location in Athena settings.
7.  **Lake Formation Permissions**:
    * Add your IAM user as a Data Lake Administrator.
    * Grant `Describe` permissions on the `chatbot_dynamo_db` database to your IAM user.

---

## Backend Setup (AWSChatbot folder) 🚀

1.  Navigate to the backend directory: `cd AWSChatbot`
2.  Install dependencies: `npm install`
3.  **Configuration**:
    * Update the AWS region settings in `src/bedrockClient.ts` and `src/server.ts` to match your deployment (e.g., `us-west-2` for Bedrock, `us-west-1` for DynamoDB).
    * **IMPORTANT**: Change the `JWT_SECRET` constant in `src/server.ts` to a strong, unique secret key.
4.  Start the server: `npm start`
    * The backend API will run on `http://localhost:3000` by default.

---

## Frontend Setup (frontend_dv folder) 🖥️

1.  Navigate to the frontend directory: `cd ../frontend_dv` (assuming it's the parent folder)
2.  Install dependencies: `npm install`
3.  Start the development server: `npm start`
    * The frontend application will open in your browser, likely on `http://localhost:3001` (if the backend is using 3000).

---

## Usage 🖱️

1.  **Register**: Create a new account via the `/register` page.
2.  **Login**: Log in using your credentials on the `/login` page.
3.  **Chat**: Interact with the AI chatbot on the `/chat` page.
4.  **Journal**:
    * Access your private journal via the "My Journal" button.
    * Create new entries detailing incidents.
    * Alternatively, type `new entry` in the chat window to navigate to the journal page.
5.  **Profile**: Access and update your personal and safety information via the "Profile" button. Saved changes redirect back to the chat.
6.  **File Upload**: Click the paperclip icon (📎) in the chat input to upload a document for AI analysis.

---

This `README.md` provides a comprehensive overview for setting up and running your application. You can add more sections like "Deployment," "Contributing," or "License" as needed.
