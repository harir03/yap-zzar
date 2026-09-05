import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

let ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!ai) {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  }
  return ai;
}

export async function generateText(prompt: string): Promise<string> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
  });
  return response.text ?? '';
}

// Generate a personalized win-back message for a lapsed customer
export async function generateOfferMessage(
  customerName: string,
  productName: string,
  discountRupees: number,
  daysSinceLastOrder: number,
): Promise<string> {
  const prompt = `You are a friendly WhatsApp shopping assistant for an Indian merchant. Write a SHORT win-back message (max 3 lines, casual Hindi-English mix, use emojis) for a customer who hasn't shopped in ${daysSinceLastOrder} days. Offer them ₹${discountRupees} off on "${productName}". Include the customer name "${customerName}". Do NOT include any links or buttons — those will be added separately. Do NOT use markdown formatting.`;

  return generateText(prompt);
}
