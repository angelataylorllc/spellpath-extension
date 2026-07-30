import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * @param {{ apiKey: string, model: string, systemPrompt: string, userContent: string, maxTokens: number, temperature: number }} opts
 */
export async function callGeminiAdapter({ apiKey, model, systemPrompt, userContent, maxTokens, temperature }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  });

  const result = await geminiModel.generateContent(userContent);
  const response = result.response;
  const meta = response.usageMetadata || {};

  return {
    text: response.text(),
    model,
    finishReason: response.candidates?.[0]?.finishReason || null,
    usage: {
      promptTokens: meta.promptTokenCount,
      completionTokens: meta.candidatesTokenCount,
      totalTokens: meta.totalTokenCount,
    },
  };
}
