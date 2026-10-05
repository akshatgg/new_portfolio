import { GoogleGenAI } from '@google/genai';

// Pinned deliberately. `gemini-flash-lite-latest` also works and auto-upgrades,
// but a pinned id fails loudly when it is retired rather than silently changing
// behaviour — 2.5-flash-lite was withdrawn from new users exactly this way.
export const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';

let client: GoogleGenAI | null = null;

export function genai(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}
