export type { ChatMessage };
interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}
/**
 * Invokes the Amazon Titan model with conversation history.
 * @param history - The entire conversation history.
 * @returns The model's generated text response.
 */
export declare function invokeTitan(history: ChatMessage[]): Promise<string>;
export declare function analyzeDocument(documentContent: string): Promise<string>;
//# sourceMappingURL=bedrockClient.d.ts.map