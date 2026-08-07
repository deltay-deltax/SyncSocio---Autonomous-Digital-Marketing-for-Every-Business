import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extracts a generalized Q&A pair from a chat history and human reply.
 * @param {Array} conversationHistory - Array of previous chat messages
 * @param {String} humanReply - The response provided by the human brand owner
 * @returns {Promise<{question: string, answer: string} | null>}
 */
export const extractKnowledgeFromReply = async (conversationHistory, humanReply) => {
  try {
    if (!humanReply) return null;

    // Get the last 3-4 messages to give context to what the human is replying to
    const recentHistory = conversationHistory.slice(-4).map(msg => `${msg.role.toUpperCase()}: ${msg.text}`).join('\n');

    const prompt = `
You are an AI assistant tasked with extracting a generalized Frequently Asked Question (FAQ) and its Answer from a customer service interaction.

Here is the recent conversation history:
---
${recentHistory}
---

And here is the Human Brand Owner's final reply to resolve the escalation:
---
HUMAN_REPLY: ${humanReply}
---

Your task:
Analyze what the customer was asking and how the human replied. 
Generate a clear, generalized Question and a concise Answer that can be added to an AI Knowledge Base.
Ensure the Answer does not contain time-specific or user-specific information (like names or specific order numbers), but keeps the core business policy or fact.
If the human's reply is just small talk, a specific order update, or something that should NOT be in a general FAQ, return exactly: {"isValidFaq": false}

Otherwise, return a JSON object exactly like this:
{
  "isValidFaq": true,
  "question": "The generalized question?",
  "answer": "The generalized answer based on the human reply."
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You output strictly JSON. No markdown." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    if (result.isValidFaq && result.question && result.answer) {
      return {
        question: result.question,
        answer: result.answer
      };
    }

    return null;
  } catch (error) {
    console.error('[NexaKnowledgeService] Failed to extract knowledge:', error.message);
    return null;
  }
};
