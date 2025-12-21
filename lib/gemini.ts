
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeImage = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: "Provide a very short, one-sentence caption for this image to be used as a meta description."
          }
        ]
      },
    });

    return response.text || "No description available.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Analysis failed.";
  }
};
