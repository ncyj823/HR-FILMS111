
import { GoogleGenAI } from "@google/genai";

const FALLBACK_INSIGHTS = [
  "Experience breathtaking visuals",
  "A masterpiece of modern cinema",
  "Unforgettable emotional journey",
];

export async function getMovieInsights(movieTitle: string) {
  try {
    const apiKey = (process.env.API_KEY || process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      console.warn("Gemini API key missing; using fallback insights.");
      return FALLBACK_INSIGHTS;
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide 3 fascinating, short, one-sentence facts or 'why you should watch' tips for the movie "${movieTitle}". Format as a JSON array of strings.`,
      config: { responseMimeType: "application/json" },
    });

    const text = response.text;
    if (text) return JSON.parse(text);
    return FALLBACK_INSIGHTS;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return FALLBACK_INSIGHTS;
  }
}
