import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
// Import both the function and the new ChatMessage type
import { invokeTitan } from "./bedrockClient.js";
import type { ChatMessage } from "./bedrockClient.js";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 1. Create an in-memory array to store the conversation history
let conversationHistory: ChatMessage[] = [];

app.post("/chat", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required and must be a string." });
    }

    // 2. Add the new user message to the history
    conversationHistory.push({ role: "user", content: prompt });

    // 3. Pass the entire history to the Bedrock client
    const modelResponse = await invokeTitan(conversationHistory);

    // 4. Add the model's response to the history
    conversationHistory.push({ role: "assistant", content: modelResponse });
    
    // Log the current conversation length
    console.log(`Conversation history now contains ${conversationHistory.length} messages.`);

    res.status(200).json({ response: modelResponse });

  } catch (error) {
    console.error("An error occurred in the /chat endpoint:", error);
    res.status(500).json({ error: "Failed to process the chat request." });
  }
});

// (Optional) Add an endpoint to clear the history
app.post("/clear", (req: Request, res: Response) => {
  console.log("Clearing conversation history.");
  conversationHistory = [];
  res.status(200).json({ message: "Conversation history cleared." });
});

app.listen(port, () => {
  console.log(`✅ Server is running and ready for requests at http://localhost:${port}`);
});