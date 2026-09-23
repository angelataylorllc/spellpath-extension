import { isTruncatedFinish, parseModelJson } from '../parseModelJson.js';
import { recordLLMUsage } from '../usageMeter.js';
import { callAnthropicAdapter } from './adapters/anthropic.js';
import { callGeminiAdapter } from './adapters/gemini.js';
import { callOpenAIAdapter } from './adapters/openai.js';
import { resolveLLMForRequest } from './resolveProvider.js';

const JSON_INSTRUCTION =
  '\n\nRespond with valid JSON only. No markdown fences or prose outside the JSON object.';

const MAX_RETRY_TOKENS = 8192;

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

  let tokenBudget = maxTokens;
  let lastParseError;
  let lastParsed = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const invoke = () => {
      const base = {
        apiKey: resolved.apiKey,
        model: resolved.model,
        systemPrompt: fullSystemPrompt,
        userContent,
        maxTokens: tokenBudget,
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

    let result;
    try {
      result = await invoke();
    } catch (err) {
      const msg = err?.message || String(err);
      throw Object.assign(
        new Error(`${resolved.provider} API error: ${msg}`),
        { status: err?.status || 502 },
      );
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

    /** Actual sizes, so token ceilings can be set from data instead of guesses. */
    const out = result.usage?.completionTokens;
    const headroom = Number.isFinite(out) ? `${Math.round((out / tokenBudget) * 100)}% of cap` : 'unknown';
    console.log(
      `[spellpath] tokens ${route}: in=${result.usage?.promptTokens ?? '?'} out=${out ?? '?'} `
      + `cap=${tokenBudget} (${headroom}) finish=${result.finishReason || '?'}`,
    );

    try {
      lastParsed = parseModelJson(result.text, { route, finishReason: result.finishReason });
    } catch (err) {
      lastParseError = err;
      lastParsed = null;
    }

    const truncated = isTruncatedFinish(result.finishReason);
    if (lastParsed && (!truncated || attempt === 1)) {
      return lastParsed;
    }

    if (truncated) {
      console.warn(
        `[spellpath] ${route} response truncated (attempt ${attempt + 1}, maxTokens=${tokenBudget}); retrying…`,
      );
      tokenBudget = Math.min(Math.max(tokenBudget * 2, tokenBudget + 1500), MAX_RETRY_TOKENS);
    } else if (!lastParsed && attempt === 0) {
      console.warn(`[spellpath] ${route} JSON parse failed (attempt 1); retrying…`);
    }
  }

  if (lastParsed) return lastParsed;
  throw lastParseError || new Error('Failed to parse model response');
}
