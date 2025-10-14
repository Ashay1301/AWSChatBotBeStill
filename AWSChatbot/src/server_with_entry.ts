import express, { type Request, type Response } from "express";
import cors from "cors";
import { invokeTitan, type ChatMessage } from "./bedrockClient.js";
import { createObjectCsvWriter } from 'csv-writer';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// === CONVERSATION MEMORY FOR THE LEGAL ADVISOR ===
let conversationHistory: ChatMessage[] = [];

// === STATE MANAGEMENT FOR DATA ENTRY ===
let isDataEntryMode = false;
let currentQuestionIndex = 0;
let newEntryData: { [key: string]: any } = {};
const csvFilePath = './DV_Journal_Events_Enriched (1).xlsx - Sheet1.csv';

// === DEFINE THE QUESTIONS FOR DATA ENTRY ===
// IMPORTANT: The 'id' must EXACTLY match your CSV column headers.
const entryQuestions = [
    { id: 'date', title: 'Date', question: "First, what is the date of the event?" },
    { id: 'location', title: 'Location', question: "Where did the event take place?" },
    { id: 'parties_involved', title: 'Parties Involved', question: "Who was involved in this event?" },
    { id: 'description', title: 'Description', question: "Please provide a factual description of the event." },
    { id: 'evidence_notes', title: 'Evidence Notes', question: "Are there any notes on evidence (e.g., photos, messages)? If not, say 'N/A'." }
];

// Helper function to write the new entry to the CSV file
async function appendToCsv(data: typeof newEntryData) {
    const csvWriter = createObjectCsvWriter({
        path: csvFilePath,
        header: entryQuestions.map(q => ({ id: q.id, title: q.title })),
        append: true, // This is crucial to add new rows instead of overwriting
    });

    console.log("Saving new entry to CSV:", data);
    await csvWriter.writeRecords([data]);
}

// Function to reset the data entry state
function resetDataEntry() {
    isDataEntryMode = false;
    currentQuestionIndex = 0;
    newEntryData = {};
    console.log("Data entry mode has been reset.");
}

// === MAIN CHAT ENDPOINT WITH NEW LOGIC ===
app.post("/chat", async (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required and must be a string." });
    }

    // --- Data Entry Logic ---
    if (isDataEntryMode) {
        // Save the answer from the user
        const currentQuestion = entryQuestions[currentQuestionIndex];
        newEntryData[currentQuestion.id] = prompt;
        currentQuestionIndex++;

        // If there are more questions, ask the next one
        if (currentQuestionIndex < entryQuestions.length) {
            const nextQuestion = entryQuestions[currentQuestionIndex].question;
            res.status(200).json({ response: nextQuestion });
        } else {
            // All questions answered, save the data
            await appendToCsv(newEntryData);
            resetDataEntry(); // Reset for the next time
            res.status(200).json({ response: "Thank you. I have saved the new entry. How else can I help?" });
        }
        return; // Stop further processing
    }

    // --- Standard Chatbot Logic ---
    // Check for the trigger phrase to start data entry
    if (prompt.toLowerCase().trim() === 'new entry') {
        isDataEntryMode = true;
        const firstQuestion = entryQuestions[0].question;
        console.log("Starting data entry mode...");
        res.status(200).json({ response: firstQuestion });
        return;
    }

    // If not in data entry mode, proceed with the legal advisor AI
    try {
        conversationHistory.push({ role: "user", content: prompt });
        const modelResponse = await invokeTitan(conversationHistory);
        conversationHistory.push({ role: "assistant", content: modelResponse });
        console.log(`Conversation history now contains ${conversationHistory.length} messages.`);
        res.status(200).json({ response: modelResponse });
    } catch (error) {
        console.error("An error occurred in the /chat endpoint:", error);
        res.status(500).json({ error: "Failed to process the chat request." });
    }
});

app.post("/clear", (req: Request, res: Response) => {
    console.log("Clearing conversation history.");
    conversationHistory = [];
    resetDataEntry(); // Also reset data entry if cleared
    res.status(200).json({ message: "Conversation history and data entry have been cleared." });
});

app.listen(port, () => {
    console.log(`✅ Server is running and ready for requests at http://localhost:${port}`);
});