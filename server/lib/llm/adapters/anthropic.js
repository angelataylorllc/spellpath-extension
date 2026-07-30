import Anthropic from '@anthropic-ai/sdk';

function isModelNotFound(err) {
  const status = err?.status ?? err?.statusCode;
  const msg = String(err?.message || err?.error?.message || '');
  return status === 404 || /not_found_error|"type":"not_found"/i.test(msg);
}

async function callOnce(client, model, { systemPrompt, userContent, maxTokens, temperature }) {
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  return {
    text,
    model: message.model || model,
    finishReason: message.stop_reason || null,
    usage: {
      promptTokens: message.usage?.input_tokens,
      completionTokens: message.usage?.output_tokens,
      totalTokens: (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0),
    },
  };
}

/**
 * @param {{ apiKey: string, model: string, models?: string[], systemPrompt: string, userContent: string, maxTokens: number, temperature: number }} opts
 */
export async function callAnthropicAdapter({
  apiKey,
  model,
  models,
  systemPrompt,
  userContent,
  maxTokens,
  temperature,
}) {
  const client = new Anthropic({ apiKey });
  const candidates = Array.isArray(models) && models.length ? models : [model];
  /** @type {unknown} */
  let lastError;

  for (const candidate of candidates) {
    try {
      return await callOnce(client, candidate, {
        systemPrompt,
        userContent,
        maxTokens,
        temperature,
      });
    } catch (err) {
      lastError = err;
      if (isModelNotFound(err) && candidate !== candidates[candidates.length - 1]) {
        console.warn(`[spellpath] Anthropic model "${candidate}" not found; trying next alias…`);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Anthropic request failed');
}
