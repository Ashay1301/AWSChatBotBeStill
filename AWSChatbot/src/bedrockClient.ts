import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

// Define a type for our chat messages for better code quality
export type { ChatMessage }; 
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const client = new BedrockRuntimeClient(
    { region: "us-west-2" } // Update to your desired region
);
const modelId = "amazon.titan-text-express-v1";

const LEGAL_PREFACE = `You are an expert legal advisor AI. Your role is to provide safe, helpful, and accurate legal information.

Analyze the user's question carefully and provide a neutral, informative response based on the provided context.`;

/**
 * Formats the conversation history into a single string for the model.
 * @param history - An array of chat messages.
 * @returns A formatted string representing the conversation.
 */
function formatConversation(history: ChatMessage[]): string {
  return history
    .map((message) => {
      // Use "User" and "Legal Advice" to match the preface
      const prefix = message.role === "user" ? "User Question" : "Legal Advice";
      return `${prefix}: ${message.content}`;
    })
    .join("\n\n"); // Separate each turn with a double newline
}

/**
 * Invokes the Amazon Titan model with conversation history.
 * @param history - The entire conversation history.
 * @returns The model's generated text response.
 */
export async function invokeTitan(history: ChatMessage[]): Promise<string> {
  const formattedHistory = formatConversation(history);
  console.log(`Invoking Titan model with formatted history...`);

  // Combine the preface with the formatted conversation
  const fullPrompt = `${LEGAL_PREFACE}\n\n${formattedHistory}\n\nLegal Advice:`;

  const payload = {
    inputText: fullPrompt,
    textGenerationConfig: {
      maxTokenCount: 100,
      stopSequences: [],
      temperature: 0.5,
      topP: 0.9,
    },
  };

  const command = new InvokeModelCommand({
    body: JSON.stringify(payload),
    modelId,
    contentType: "application/json",
    accept: "application/json",
  });

  try {
    const apiResponse = await client.send(command);
    const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
    const responseBody = JSON.parse(decodedResponseBody);
    const generatedText = responseBody.results[0].outputText;
    
    return generatedText.trim();

  } catch (error) {
    console.error("ERROR: Failed to invoke model.", error);
    throw new Error("Failed to invoke model.");
  }

  // Add this new function to src/bedrockClient.ts

/**
 * Invokes the Titan model to analyze the content of a document.
 * @param documentContent - The text content of the uploaded file.
 * @returns The model's analysis of the document.
 */

}

export async function analyzeDocument(documentContent: string): Promise<string> {
  console.log("Invoking Titan model for document analysis...");

  // A specific prompt that instructs the AI on how to behave
  const analysisPrompt = `You are an expert legal analyst. Please provide a concise, neutral summary of the following document. Focus on key events, involved parties, and any stated evidence or outcomes. Do not provide opinions or advice, only summarize the facts presented in the text.\n\n---\n\nDOCUMENT CONTENT:\n\n${documentContent}\n\n---\n\nANALYSIS:`;

  const payload = {
    inputText: analysisPrompt,
    textGenerationConfig: {
      maxTokenCount: 2048,
      stopSequences: [],
      temperature: 0.2, // Very low temperature for factual, non-creative summaries
      topP: 0.9,
    },
  };

  const command = new InvokeModelCommand({
    body: JSON.stringify(payload),
    modelId, // Reuses the existing modelId
    contentType: "application/json",
    accept: "application/json",
  });

  try {
    const apiResponse = await client.send(command);
    const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
    const responseBody = JSON.parse(decodedResponseBody);
    return responseBody.results[0].outputText.trim();
  } catch (error) {
    console.error("ERROR: Failed to analyze document.", error);
    throw new Error("Failed to analyze document.");
  }
}