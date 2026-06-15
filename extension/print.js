/* global chrome */
const status = document.getElementById('status');

chrome.storage.session.get('spellpath_print_html', (result) => {
  const html = result?.spellpath_print_html;

  if (!html || typeof html !== 'string') {
    status.textContent = 'No story found to print. Return to SpellPath and try again.';
    return;
  }

  chrome.storage.session.remove('spellpath_print_html');
  document.open();
  document.write(html);
  document.close();

  window.addEventListener('load', () => {
    setTimeout(() => window.print(), 500);
  });

  if (document.readyState === 'complete') {
    setTimeout(() => window.print(), 500);
  }
});
