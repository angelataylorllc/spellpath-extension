import { parseModelJson } from '../parseModelJson.js';
import { recordLLMUsage } from '../usageMeter.js';
import { callAnthropicAdapter } from './adapters/anthropic.js';
import { callGeminiAdapter } from './adapters/gemini.js';
import { callOpenAIAdapter } from './adapters/openai.js';
import { resolveLLMForRequest } from './resolveProvider.js';

const JSON_INSTRUCTION =
  '\n\nRespond with valid JSON only. No markdown fences or prose outside the JSON object.';

/**
 * @param {import('express').Request} req
 * @param {string} route
 * @param {{ systemPrompt: string, userPayload: object, maxTokens: number, temperature: number }} opts
 */
export async function callLLM(req, route, { systemPrompt, userPayload, maxTokens, temperature }) {
  const resolved = resolveLLMForRequest(req);
  if (!resolved.apiKey || !resolved.billingSource) {
    throw Object.assign(new Error(resolved.error || 'No LLM API key configured.'), { status: 500 });
  }

  const userContent = JSON.stringify(userPayload);
  const fullSystemPrompt = systemPrompt + JSON_INSTRUCTION;

  const invoke = () => {
    const base = {
      apiKey: resolved.apiKey,
      model: resolved.model,
      systemPrompt: fullSystemPrompt,
      userContent,
      maxTokens,
      temperature,
    };

    switch (resolved.provider) {
      case 'anthropic':
        return callAnthropicAdapter({ ...base, models: resolved.models });
      case 'gemini':
        return callGeminiAdapter(base);
      case 'openai':
      default:
        return callOpenAIAdapter(base);
    }
  };

  let lastParseError;
  let lastProviderError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let result;
    try {
      result = await invoke();
    } catch (err) {
      const msg = err?.message || String(err);
      lastProviderError = Object.assign(
        new Error(`${resolved.provider} API error: ${msg}`),
        { status: err?.status || 502 },
      );
      throw lastProviderError;
    }

    recordLLMUsage({
      route,
      provider: resolved.provider,
      model: result.model,
      billingSource: resolved.billingSource,
      promptTokens: result.usage?.promptTokens,
      completionTokens: result.usage?.completionTokens,
      totalTokens: result.usage?.totalTokens,
    });

    try {
      return parseModelJson(result.text, { route, finishReason: result.finishReason });
    } catch (err) {
      lastParseError = err;
      if (result.finishReason === 'length' || result.finishReason === 'max_tokens') {
        console.warn(`[spellpath] ${route} response truncated (attempt ${attempt + 1}); retrying…`);
      } else if (attempt === 0) {
        console.warn(`[spellpath] ${route} JSON parse failed (attempt 1); retrying…`);
      }
    }
  }

  throw lastParseError || new Error('Failed to parse model response');
}
