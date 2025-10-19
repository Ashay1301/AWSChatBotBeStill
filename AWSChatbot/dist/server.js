import express, {} from "express";
import cors from "cors";
import { invokeTitan } from "./bedrockClient.js";
import { createObjectCsvWriter } from 'csv-writer';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { analyzeDocument } from './bedrockClient.js'; // Make sure this is imported
// Configure multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// === EXPRESS SETUP ===
const app = express();
const port = 3000;
app.use(cors({ origin: 'https://main.djyqwqvqsc00d.amplifyapp.com' }));
app.use(express.json());
// === DYNAMODB & SECURITY SETUP ===
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const HISTORY_TABLE = "ChatBotBeStill";
const CREDENTIALS_TABLE = "ChatbotCredentials";
const PROFILES_TABLE = "UserProfiles";
const JOURNAL_TABLE = "JournalEntries";
const JWT_SECRET = "your_super_secret_key_change_this"; // IMPORTANT: Change this to a long, random string
// === DATA ENTRY LOGIC (Unchanged) ===
let isDataEntryMode = false;
let currentQuestionIndex = 0;
let newEntryData = {};
const csvFilePath = './DV_Journal_Events_Enriched (1).xlsx - Sheet1.csv';
const entryQuestions = [
    { id: 'date', title: 'Date', question: "First, what is the date of the event?" },
    { id: 'location', title: 'Location', question: "Where did the event take place?" },
    { id: 'parties_involved', title: 'Parties Involved', question: "Who was involved in this event?" },
    { id: 'description', title: 'Description', question: "Please provide a factual description of the event." },
    { id: 'evidence_notes', title: 'Evidence Notes', question: "Are there any notes on evidence (e.g., photos, messages)? If not, say 'N/A'." }
];
// (Helper functions appendToCsv and resetDataEntry remain the same as before)
async function appendToCsv(data) {
    const csvWriter = createObjectCsvWriter({
        path: csvFilePath,
        header: entryQuestions.map(q => ({ id: q.id, title: q.title })),
        append: true,
    });
    console.log("Saving new entry to CSV:", data);
    await csvWriter.writeRecords([data]);
}
function resetDataEntry() {
    isDataEntryMode = false;
    currentQuestionIndex = 0;
    newEntryData = {};
    console.log("Data entry mode has been reset.");
}
// === NEW: AUTHENTICATION API ENDPOINTS ===
// 1. User Registration
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
    }
    try {
        // Check if user already exists (remains the same)
        const getCommand = new GetCommand({ TableName: CREDENTIALS_TABLE, Key: { username } });
        const { Item } = await docClient.send(getCommand);
        if (Item) {
            return res.status(409).json({ message: "Username already exists." });
        }
        // Hash password and save credentials (remains the same)
        const hashedPassword = await bcrypt.hash(password, 10);
        const putCredentialsCommand = new PutCommand({
            TableName: CREDENTIALS_TABLE,
            Item: { username: username, password: hashedPassword },
        });
        await docClient.send(putCredentialsCommand);
        // --- START: Replace the existing putProfileCommand block with this ---
        // After creating credentials, create a corresponding user profile
        console.log(`Creating profile for user: ${username}`);
        const putProfileCommand = new PutCommand({
            TableName: PROFILES_TABLE,
            Item: {
                username: username,
                createdAt: new Date().toISOString(),
                // --- NEW: DV-Specific Profile Fields ---
                // Basic demographic info (optional for the user to fill)
                age: null, // e.g., 27
                gender: "", // e.g., "Female"
                relationshipStatus: "", // e.g., "Married", "Dating"
                children: {
                    hasChildren: false,
                    count: 0,
                    details: "" // e.g., "Two children, ages 4 and 6"
                },
                // Key safety and support information
                supportSystem: "", // User can describe their support network (e.g., "Parents, close friend")
                emergencyContact: {
                    name: "",
                    phone: "",
                    relationship: ""
                },
                // A place for the user to develop and store their safety plan
                safetyPlan: {
                    safePlace: "", // A safe location to go to in an emergency
                    codedMessage: "", // A code word/phrase to alert friends/family
                    importantDocuments: [], // List of documents to secure (e.g., "Passport", "Birth Certificate")
                    notes: "" // General safety planning notes
                },
                riskFactors: {
                    abuserAccessToWeapons: false, // Default to false
                    // You can add other risk factors here in the future
                }
            },
        });
        await docClient.send(putProfileCommand);
        // --- END: Replacement block ---
        res.status(201).json({ message: "User and profile registered successfully." });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
// 2. User Login
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
    }
    try {
        const getCommand = new GetCommand({ TableName: CREDENTIALS_TABLE, Key: { username } });
        const { Item } = await docClient.send(getCommand);
        if (!Item || !(await bcrypt.compare(password, Item.password))) {
            return res.status(401).json({ message: "Invalid username or password." });
        }
        // User is valid, create a JWT token
        const token = jwt.sign({ username: Item.username }, JWT_SECRET, { expiresIn: '8h' });
        res.status(200).json({ message: "Login successful.", token: token });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
// === NEW: AUTHENTICATION MIDDLEWARE ===
// This function checks for a valid token before allowing access to protected routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Forbidden (token is no longer valid)
        }
        req.user = user; // Add the user payload to the request object
        next();
    });
};
// 3. Get User's Chat History
app.get("/api/history", authenticateToken, async (req, res) => {
    const userId = req.user.username;
    try {
        const getCommand = new GetCommand({
            TableName: HISTORY_TABLE,
            Key: { userId: userId },
        });
        const { Item } = await docClient.send(getCommand);
        // Return the history array, or an empty array if no history exists yet
        const conversationHistory = Item?.history || [];
        res.status(200).json({ history: conversationHistory });
    }
    catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
// === NEW: JOURNALING ENDPOINTS ===
/// CREATE a new journal entry
app.post("/api/journal", authenticateToken, async (req, res) => {
    const username = req.user.username;
    // Expect a more detailed object from the frontend
    const { title, content, eventDate, incidentDetails } = req.body;
    if (!title || !content || !eventDate || !incidentDetails) {
        return res.status(400).json({ message: "All journal fields are required." });
    }
    try {
        const newEntry = {
            username: username,
            entryTimestamp: new Date().toISOString(),
            title: title,
            content: content,
            eventDate: eventDate,
            // --- NEW: Storing the detailed incident object ---
            details: {
                typeOfAbuse: incidentDetails.typeOfAbuse || [],
                childrenPresent: incidentDetails.childrenPresent || false,
                weaponInvolved: incidentDetails.weaponInvolved || false,
                injuryOccurred: incidentDetails.injuryOccurred || false,
                injuryDescription: incidentDetails.injuryDescription || "",
                evidenceAvailable: incidentDetails.evidenceAvailable || [],
                policeReportNumber: incidentDetails.policeReportNumber || "",
            }
        };
        const putCommand = new PutCommand({
            TableName: JOURNAL_TABLE,
            Item: newEntry,
        });
        await docClient.send(putCommand);
        res.status(201).json({ message: "Journal entry saved successfully.", entry: newEntry });
    }
    catch (error) {
        console.error("Error saving journal entry:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
// GET all journal entries for the logged-in user
app.get("/api/journal", authenticateToken, async (req, res) => {
    const username = req.user.username;
    try {
        const queryCommand = new QueryCommand({
            TableName: JOURNAL_TABLE,
            KeyConditionExpression: "username = :username",
            ExpressionAttributeValues: { ":username": username },
            // Optional: sort the results with the newest entries first
            ScanIndexForward: false,
        });
        const { Items } = await docClient.send(queryCommand);
        res.status(200).json({ journalEntries: Items || [] });
    }
    catch (error) {
        console.error("Error fetching journal entries:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
// === NEW: USER PROFILE ENDPOINTS ===
// GET User's Profile
app.get("/api/profile", authenticateToken, async (req, res) => {
    const username = req.user.username;
    try {
        const getCommand = new GetCommand({
            TableName: PROFILES_TABLE,
            Key: { username },
        });
        const { Item } = await docClient.send(getCommand);
        if (!Item) {
            return res.status(404).json({ message: "Profile not found." });
        }
        res.status(200).json({ profile: Item });
    }
    catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
// UPDATE User's Profile
app.put("/api/profile", authenticateToken, async (req, res) => {
    const username = req.user.username;
    const updatedProfileData = req.body;
    try {
        // Construct the UpdateExpression and ExpressionAttributeValues dynamically
        const updateExpressionParts = [];
        const expressionAttributeValues = {};
        for (const key in updatedProfileData) {
            if (key !== 'username') { // Don't allow changing the username
                updateExpressionParts.push(`${key} = :${key}`);
                expressionAttributeValues[`:${key}`] = updatedProfileData[key];
            }
        }
        if (updateExpressionParts.length === 0) {
            return res.status(400).json({ message: "No fields to update." });
        }
        const updateCommand = new UpdateCommand({
            TableName: PROFILES_TABLE,
            Key: { username },
            UpdateExpression: `set ${updateExpressionParts.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "ALL_NEW", // Return the updated item
        });
        const { Attributes } = await docClient.send(updateCommand);
        res.status(200).json({ message: "Profile updated successfully.", profile: Attributes });
    }
    catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
// === PROTECTED CHAT API ENDPOINTS ===
// The "authenticateToken" function is now added to these routes
app.post("/api/chat", authenticateToken, async (req, res) => {
    // We now get the userId from the authenticated token, not the request body
    const userId = req.user.username;
    const { prompt } = req.body;
    // (The rest of the chat logic remains exactly the same as before)
    // ...
    try {
        // --- Data Entry Logic ---
        if (isDataEntryMode) {
            const currentQuestion = entryQuestions[currentQuestionIndex];
            newEntryData[currentQuestion.id] = prompt;
            currentQuestionIndex++;
            if (currentQuestionIndex < entryQuestions.length) {
                const nextQuestion = entryQuestions[currentQuestionIndex].question;
                res.status(200).json({ response: nextQuestion });
            }
            else {
                await appendToCsv(newEntryData);
                const confirmationMessage = "Thank you. I have saved the new entry. How else can I help?";
                const getCommand = new GetCommand({ TableName: HISTORY_TABLE, Key: { userId } });
                const { Item } = await docClient.send(getCommand);
                let conversationHistory = Item?.history || [];
                conversationHistory.push({ role: "user", content: prompt });
                conversationHistory.push({ role: "assistant", content: confirmationMessage });
                const updateCommand = new UpdateCommand({
                    TableName: HISTORY_TABLE, Key: { userId },
                    UpdateExpression: "set history = :h", ExpressionAttributeValues: { ":h": conversationHistory },
                });
                await docClient.send(updateCommand);
                resetDataEntry();
                res.status(200).json({ response: confirmationMessage });
            }
            return;
        }
        if (prompt.toLowerCase().trim() === 'new entry') {
            isDataEntryMode = true;
            const firstQuestion = entryQuestions[0].question;
            res.status(200).json({ response: firstQuestion });
            return;
        }
        const getCommand = new GetCommand({ TableName: HISTORY_TABLE, Key: { userId } });
        const { Item } = await docClient.send(getCommand);
        let conversationHistory = Item?.history || [];
        conversationHistory.push({ role: "user", content: prompt });
        const modelResponse = await invokeTitan(conversationHistory);
        conversationHistory.push({ role: "assistant", content: modelResponse });
        const updateCommand = new UpdateCommand({
            TableName: HISTORY_TABLE, Key: { userId },
            UpdateExpression: "set history = :h", ExpressionAttributeValues: { ":h": conversationHistory },
        });
        await docClient.send(updateCommand);
        res.status(200).json({ response: modelResponse });
    }
    catch (error) {
        console.error("An error occurred in the /chat endpoint:", error);
        res.status(500).json({ error: "Failed to process the chat request." });
    }
});
// === NEW: FILE ANALYSIS ENDPOINT ===
app.post("/api/analyze", authenticateToken, upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
    }
    try {
        // Convert the file buffer to a string
        const fileContent = req.file.buffer.toString('utf-8');
        // Get the analysis from our Bedrock client
        const analysisResult = await analyzeDocument(fileContent);
        // Also add this exchange to the user's chat history for context
        const userId = req.user.username;
        const getCommand = new GetCommand({ TableName: HISTORY_TABLE, Key: { userId } });
        const { Item } = await docClient.send(getCommand);
        let conversationHistory = Item?.history || [];
        conversationHistory.push({ role: "user", content: `(Analyzed document: ${req.file.originalname})` });
        conversationHistory.push({ role: "assistant", content: analysisResult });
        const updateCommand = new UpdateCommand({
            TableName: HISTORY_TABLE,
            Key: { userId },
            UpdateExpression: "set history = :h",
            ExpressionAttributeValues: { ":h": conversationHistory },
        });
        await docClient.send(updateCommand);
        res.status(200).json({ analysis: analysisResult });
    }
    catch (error) {
        console.error("Analysis endpoint error:", error);
        res.status(500).json({ message: "Failed to analyze the file." });
    }
});
app.post("/api/clear", authenticateToken, async (req, res) => {
    const userId = req.user.username;
    const updateCommand = new UpdateCommand({
        TableName: HISTORY_TABLE, Key: { userId },
        UpdateExpression: "set history = :h", ExpressionAttributeValues: { ":h": [] },
    });
    await docClient.send(updateCommand);
    resetDataEntry();
    res.status(200).json({ message: `History cleared for ${userId}.` });
});
app.listen(port, () => {
    console.log(`✅ Server is running and ready for requests at http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map