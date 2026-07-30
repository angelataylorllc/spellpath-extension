import OpenAI from 'openai';

/**
 * @param {{ apiKey: string, model: string, systemPrompt: string, userContent: string, maxTokens: number, temperature: number }} opts
 */
export async function callOpenAIAdapter({ apiKey, model, systemPrompt, userContent, maxTokens, temperature }) {
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  });

  const choice = completion.choices[0] || {};
  const usage = completion.usage || {};

  return {
    text: choice.message?.content || '',
    model: completion.model || model,
    finishReason: choice.finish_reason || null,
    usage: {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    },
  };
}
