/**
 * Optional BYOK (bring your own key) for the extension.
 * Keys are stored in chrome.storage.local — not in repo, not sent unless set.
 *
 * Wire a SpellPath Options page later to call setUserOpenAIKey / clearUserOpenAIKey.
 *
 * @see docs/ai-billing-and-byok.md
 */

const STORAGE_KEY = 'spellpath_user_openai_key';

function getChromeStorageLocal() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return chrome.storage.local;
  }
  return null;
}

/**
 * @returns {Promise<string|undefined>}
 */
export async function getOptionalUserOpenAIKey() {
  const storage = getChromeStorageLocal();
  if (!storage) return undefined;

  return new Promise((resolve, reject) => {
    storage.get([STORAGE_KEY], result => {
      const err = chrome.runtime?.lastError;
      if (err) {
        reject(err);
        return;
      }
      const v = result[STORAGE_KEY];
      resolve(typeof v === 'string' && v.trim() ? v.trim() : undefined);
    });
  });
}

/**
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function setUserOpenAIKey(key) {
  const storage = getChromeStorageLocal();
  if (!storage) {
    throw new Error('chrome.storage.local is not available');
  }
  const trimmed = typeof key === 'string' ? key.trim() : '';
  return new Promise((resolve, reject) => {
    storage.set({ [STORAGE_KEY]: trimmed }, () => {
      const err = chrome.runtime?.lastError;
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * @returns {Promise<void>}
 */
export async function clearUserOpenAIKey() {
  const storage = getChromeStorageLocal();
  if (!storage) return;
  return new Promise((resolve, reject) => {
    storage.remove([STORAGE_KEY], () => {
      const err = chrome.runtime?.lastError;
      if (err) reject(err);
      else resolve();
    });
  });
}
