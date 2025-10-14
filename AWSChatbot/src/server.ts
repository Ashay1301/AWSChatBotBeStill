import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { invokeTitan, type ChatMessage } from "./bedrockClient.js";
import { createObjectCsvWriter } from 'csv-writer';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

// === DYNAMODB & SECURITY SETUP ===
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const HISTORY_TABLE = "ChatBotBeStill";
const CREDENTIALS_TABLE = "ChatbotCredentials";
const JWT_SECRET = "your_super_secret_key_change_this"; // IMPORTANT: Change this to a long, random string

// === DATA ENTRY LOGIC (Unchanged) ===
let isDataEntryMode = false;
let currentQuestionIndex = 0;
let newEntryData: { [key: string]: any } = {};
const csvFilePath = './DV_Journal_Events_Enriched (1).xlsx - Sheet1.csv';
const entryQuestions = [
    { id: 'date', title: 'Date', question: "First, what is the date of the event?" },
    { id: 'location', title: 'Location', question: "Where did the event take place?" },
    { id: 'parties_involved', title: 'Parties Involved', question: "Who was involved in this event?" },
    { id: 'description', title: 'Description', question: "Please provide a factual description of the event." },
    { id: 'evidence_notes', title: 'Evidence Notes', question: "Are there any notes on evidence (e.g., photos, messages)? If not, say 'N/A'." }
];
// (Helper functions appendToCsv and resetDataEntry remain the same as before)
async function appendToCsv(data: typeof newEntryData) {
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
        // Check if user already exists
        const getCommand = new GetCommand({ TableName: CREDENTIALS_TABLE, Key: { username } });
        const { Item } = await docClient.send(getCommand);
        if (Item) {
            return res.status(409).json({ message: "Username already exists." });
        }

        // Hash the password and save the new user
        const hashedPassword = await bcrypt.hash(password, 10); // Hash with a salt round of 10
        const putCommand = new PutCommand({
            TableName: CREDENTIALS_TABLE,
            Item: { username: username, password: hashedPassword },
        });
        await docClient.send(putCommand);

        res.status(201).json({ message: "User registered successfully." });
    } catch (error) {
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
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});







// === NEW: AUTHENTICATION MIDDLEWARE ===
// This function checks for a valid token before allowing access to protected routes
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            return res.sendStatus(403); // Forbidden (token is no longer valid)
        }
        (req as any).user = user; // Add the user payload to the request object
        next();
    });
};

// 3. Get User's Chat History
app.get("/api/history", authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.username;

    try {
        const getCommand = new GetCommand({
            TableName: HISTORY_TABLE,
            Key: { userId: userId },
        });
        const { Item } = await docClient.send(getCommand);
        // Return the history array, or an empty array if no history exists yet
        const conversationHistory: ChatMessage[] = Item?.history || [];
        res.status(200).json({ history: conversationHistory });
    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

// === PROTECTED CHAT API ENDPOINTS ===

// The "authenticateToken" function is now added to these routes
app.post("/api/chat", authenticateToken, async (req: Request, res: Response) => {
    // We now get the userId from the authenticated token, not the request body
    const userId = (req as any).user.username;
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
            } else {
                await appendToCsv(newEntryData);
                const confirmationMessage = "Thank you. I have saved the new entry. How else can I help?";
                
                const getCommand = new GetCommand({ TableName: HISTORY_TABLE, Key: { userId } });
                const { Item } = await docClient.send(getCommand);
                let conversationHistory: ChatMessage[] = Item?.history || [];
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
        let conversationHistory: ChatMessage[] = Item?.history || [];
        conversationHistory.push({ role: "user", content: prompt });
        const modelResponse = await invokeTitan(conversationHistory);
        conversationHistory.push({ role: "assistant", content: modelResponse });

        const updateCommand = new UpdateCommand({
            TableName: HISTORY_TABLE, Key: { userId },
            UpdateExpression: "set history = :h", ExpressionAttributeValues: { ":h": conversationHistory },
        });
        await docClient.send(updateCommand);
        res.status(200).json({ response: modelResponse });

    } catch (error) {
        console.error("An error occurred in the /chat endpoint:", error);
        res.status(500).json({ error: "Failed to process the chat request." });
    }
});

app.post("/api/clear", authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.username;

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