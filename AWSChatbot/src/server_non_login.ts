import express, { type Request, type Response } from "express";
import cors from "cors";
import { invokeTitan, type ChatMessage } from "./bedrockClient.js";
import { createObjectCsvWriter } from 'csv-writer';

// Import DynamoDB client and commands
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

// === DYNAMODB SETUP ===
const client = new DynamoDBClient({}); // Reads region from your AWS config
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "ChatBotBeStill";

// === STATE MANAGEMENT FOR DATA ENTRY (remains in-memory per session) ===
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

// === MAIN CHAT ENDPOINT WITH DYNAMODB LOGIC ===
app.post("/chat", async (req: Request, res: Response) => {
    // 1. Get userId and prompt from the request
    const { userId, prompt } = req.body;
    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: "userId is required and must be a string." });
    }
    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: "prompt is required and must be a string." });
    }

    // Data entry logic remains unchanged
    if (isDataEntryMode) {
        // ... (data entry code is the same as before) ...
        const currentQuestion = entryQuestions[currentQuestionIndex];
        newEntryData[currentQuestion.id] = prompt;
        currentQuestionIndex++;
        if (currentQuestionIndex < entryQuestions.length) {
            const nextQuestion = entryQuestions[currentQuestionIndex].question;
            res.status(200).json({ response: nextQuestion });
        } else {
            await appendToCsv(newEntryData);
            resetDataEntry();
            res.status(200).json({ response: "Thank you. I have saved the new entry. How else can I help?" });
        }
        return;
    }

    if (prompt.toLowerCase().trim() === 'new entry') {
        isDataEntryMode = true;
        const firstQuestion = entryQuestions[0].question;
        console.log("Starting data entry mode...");
        res.status(200).json({ response: firstQuestion });
        return;
    }

    // --- Standard Chatbot Logic with DynamoDB ---
    try {
        // 2. Fetch the user's conversation history from DynamoDB
        const getCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: { userId: userId },
        });
        const { Item } = await docClient.send(getCommand);
        let conversationHistory: ChatMessage[] = Item?.history || [];

        // 3. Add new message and get AI response
        conversationHistory.push({ role: "user", content: prompt });
        const modelResponse = await invokeTitan(conversationHistory);
        conversationHistory.push({ role: "assistant", content: modelResponse });

        // 4. Save the updated history back to DynamoDB
        const updateCommand = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { userId: userId },
            UpdateExpression: "set history = :h",
            ExpressionAttributeValues: { ":h": conversationHistory },
        });
        await docClient.send(updateCommand);
        
        console.log(`Saved history for ${userId}. Length: ${conversationHistory.length}`);
        res.status(200).json({ response: modelResponse });

    } catch (error) {
        console.error("An error occurred in the /chat endpoint:", error);
        res.status(500).json({ error: "Failed to process the chat request." });
    }
});

app.post("/clear", async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: "userId is required and must be a string." });
    }
    // Command to clear the history for a specific user in DynamoDB
    const updateCommand = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId: userId },
        UpdateExpression: "set history = :h",
        ExpressionAttributeValues: { ":h": [] },
    });
    await docClient.send(updateCommand);
    resetDataEntry();
    console.log(`Cleared conversation history for ${userId}.`);
    res.status(200).json({ message: `History cleared for ${userId}.` });
});

app.listen(port, () => {
    console.log(`✅ Server is running and ready for requests at http://localhost:${port}`);
});