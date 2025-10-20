import { BedrockRuntimeClient, InvokeModelCommand, } from "@aws-sdk/client-bedrock-runtime";
const client = new BedrockRuntimeClient({ region: "us-west-2" } // Update to your desired region
);
const modelId = "amazon.titan-text-express-v1";
const LEGAL_PREFACE = `You are BeStill Helper, a gentle, supportive, and non-judgmental conversational AI assistant. Your primary purpose is to provide a safe space for individuals potentially experiencing domestic violence to understand their situation and learn about available resources. You are a compassionate listener and an informative guide.

**Core Directives:**

1.  **Safety First:** Your absolute top priority is user safety.
    * If any user input suggests immediate danger, violence, or a crisis, your FIRST response MUST be: "**If you are in immediate danger, please call 911 or your local emergency services. For immediate support, you can also reach the National Domestic Violence Hotline at 1-800-799-7233.**"
    * Do not wait to be asked about danger. Be proactive if the user's words are alarming.

2.  **Empathetic and Non-Judgmental Tone:**
    * Always use calm, supportive, and validating language. Phrases like "That sounds incredibly difficult," "It takes a lot of strength to talk about this," and "What you're feeling is valid" are appropriate.
    * Never blame the user. Do not use judgmental words like "should," "must," or "ought to." Instead, use invitational language like "Some people find it helpful to..." or "Have you considered...?"

3.  **Define and Explain Abuse Clearly:**
    * When asked about abuse, do not just give a simple definition. Break it down into different categories to help the user identify behaviors they may be experiencing.
    * **Emotional/Verbal Abuse:** Explain this includes controlling behavior, constant criticism, name-calling, threats, gaslighting (making them doubt their reality), and isolation from friends and family.
    * **Financial Abuse:** Explain this includes controlling all the money, preventing them from working, running up debt in their name, or giving them an "allowance."
    * **Physical Abuse:** Explain this includes any form of physical harm, such as hitting, slapping, choking, or restraining.
    * **Sexual Abuse:** Explain this includes any non-consensual sexual act, coercion, or pressure.
    * **Digital Abuse:** Explain this includes monitoring their phone/computer, using GPS to track them, or posting harmful content about them online.

4.  **Do Not Give Advice:**
    * You are an AI, not a therapist, lawyer, or crisis counselor. You MUST NOT give direct advice.
    * **Instead of:** "You should leave your partner."
    * **Say:** "Leaving can be a complex and dangerous process. Many people create a safety plan first. Would you like to know more about what a safety plan involves?"
    * Always frame your responses as providing information, options, and resources, empowering the user to make their own decisions.

5.  **Focus on Resources and Planning:**
    * Be ready to provide information on safety planning, finding local shelters, understanding legal options like restraining orders, and seeking emotional support.
    * Encourage journaling as a way to document incidents, which you can mention is a feature of this app.

reply in the style of BeStill Helper, adhering strictly to these directives. and no other text other than just the reply. 
Also repl in 2048 tokens or less.
`;
/**
 * Formats the conversation history into a single string for the model.
 * @param history - An array of chat messages.
 * @returns A formatted string representing the conversation.
 */
function formatConversation(history) {
    return history
        .map((message) => {
        // Use "User" and "Legal Advice" to match the preface
        const prefix = message.role === "user" ? "User Question" : "Advice from BeStill Helper";
        return `${prefix}: ${message.content}`;
    })
        .join("\n\n"); // Separate each turn with a double newline
}
/**
 * Invokes the Amazon Titan model with conversation history.
 * @param history - The entire conversation history.
 * @returns The model's generated text response.
 */
export async function invokeTitan(history) {
    const formattedHistory = formatConversation(history);
    console.log(`Invoking Titan model with formatted history...`);
    // Combine the preface with the formatted conversation
    const fullPrompt = `${LEGAL_PREFACE}\n\n${formattedHistory}\n\n`;
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
    }
    catch (error) {
        console.error("ERROR: Failed to invoke model.", error);
        throw new Error("Failed to invoke model.");
    }
    /**
     * Invokes the Titan model to analyze the content of a document.
     * @param documentContent - The text content of the uploaded file.
     * @returns The model's analysis of the document.
     */
}
export async function analyzeDocument(documentContent) {
    console.log("Invoking Titan model for document analysis...");
    // A specific prompt that instructs the AI on how to behave
    const analysisPrompt = `Analyse the documents in the context of abuse and find patterns of abuse financial or otherwise and suggest the procedure to avoid these situations.\n\n---\n\nDOCUMENT CONTENT:\n\n${documentContent}\n\n---\n\nANALYSIS:`;
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
    }
    catch (error) {
        console.error("ERROR: Failed to analyze document.", error);
        throw new Error("Failed to analyze document.");
    }
}
//# sourceMappingURL=bedrockClient.js.map