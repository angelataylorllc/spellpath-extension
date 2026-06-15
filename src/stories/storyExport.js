import { parseNarrativeBlocks } from './parseNarrativeBlocks';

const LOG_KEY = 'spellpath_session_logs';
const MAX_LOGS = 50;

export function buildSessionArchive({
  subject,
  genre,
  mode,
  level,
  scaffold,
  completedBeats,
  learnerProfile,
  intakeAnswers,
}) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    subject: subject || scaffold?.subject || '',
    genre: genre || scaffold?.theme?.genre || '',
    mode: mode || scaffold?.theme?.mode || '',
    level: level || learnerProfile?.level || 'beginner',
    theme: scaffold?.theme || null,
    learnerProfile: learnerProfile || null,
    intakeAnswers: intakeAnswers || [],
    beats: (completedBeats || []).map(beat => ({
      beatId: beat.beatId,
      beatTitle: beat.beatTitle,
      concept: beat.concept,
      summary: beat.summary,
      narrative: beat.narrative,
      narrativeBlocks: beat.narrativeBlocks || parseNarrativeBlocks(beat.narrative),
      checkpoint: beat.checkpointRecord || null,
      correct: beat.correct,
    })),
  };
}

export function downloadStoryJson(archive) {
  const slug = slugify(archive.subject || 'story');
  const date = archive.exportedAt.slice(0, 10);
  const filename = `spellpath-${slug}-${date}.json`;
  const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
  triggerDownload(blob, filename);
}

export async function openStoryPdf(archive) {
  const html = renderStoryPrintHtml(archive);
  const chromeApi = globalThis.chrome;

  if (chromeApi?.storage?.session && chromeApi?.tabs?.create && chromeApi?.runtime?.getURL) {
    try {
      await chromeApi.storage.session.set({ spellpath_print_html: html });
      await chromeApi.tabs.create({
        url: chromeApi.runtime.getURL('print.html'),
        active: true,
      });
      return;
    } catch {
      // fall through to blob URL
    }
  }

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  if (chromeApi?.tabs?.create) {
    chromeApi.tabs.create({ url, active: true });
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
    return;
  }

  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    alert('Please allow pop-ups to save your story as PDF.');
    return;
  }

  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

export async function persistSessionLog(archive) {
  try {
    const storage = globalThis.chrome?.storage?.local;
    if (storage) {
      const result = await storage.get(LOG_KEY);
      const logs = Array.isArray(result[LOG_KEY]) ? result[LOG_KEY] : [];
      logs.unshift(archive);
      await storage.set({ [LOG_KEY]: logs.slice(0, MAX_LOGS) });
      return;
    }
  } catch {
    // fall through to localStorage
  }

  try {
    const raw = localStorage.getItem(LOG_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(logs)) return;
    logs.unshift(archive);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
  } catch {
    // non-fatal
  }
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'story';
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBlocksHtml(blocks) {
  return (blocks || [])
    .map(block => {
      const text = escapeHtml(block.text);
      if (block.type === 'dialogue') {
        return `<p class="dialogue">${text}</p>`;
      }
      return `<p class="prose">${text}</p>`;
    })
    .join('\n');
}

function renderStoryPrintHtml(archive) {
  const title = escapeHtml(archive.subject || 'SpellPath Story');
  const genre = escapeHtml(archive.genre || '');
  const mode = escapeHtml(archive.mode || '');

  const beatsHtml = (archive.beats || [])
    .map((beat, i) => {
      const blocks =
        beat.narrativeBlocks?.length > 0
          ? beat.narrativeBlocks
          : parseNarrativeBlocks(beat.narrative);

      const checkpointHtml = beat.checkpoint
        ? `<div class="checkpoint">
            <p class="checkpoint-label">Checkpoint</p>
            <p class="checkpoint-question">${escapeHtml(beat.checkpoint.question)}</p>
            <ul>${(beat.checkpoint.options || [])
              .map((opt, j) => {
                const chosen = j === beat.checkpoint.selectedIndex;
                const marker = chosen ? (beat.correct ? ' ✓' : ' ✗') : '';
                const label = opt.label ?? opt.text ?? 'Option';
                return `<li${chosen ? ' class="chosen"' : ''}>${escapeHtml(label)}${marker}</li>`;
              })
              .join('')}</ul>
          </div>`
        : '';

      return `<section class="beat">
        <h2>Beat ${i + 1}${beat.beatTitle ? `: ${escapeHtml(beat.beatTitle)}` : ''}</h2>
        ${renderBlocksHtml(blocks)}
        ${checkpointHtml}
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title} — SpellPath</title>
  <style>
    @page { margin: 0.85in; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      color: #1a1a1a;
      line-height: 1.65;
      max-width: 7in;
      margin: 0 auto;
      padding: 0.25in 0 0.5in;
    }
    h1 { font-size: 1.75rem; margin: 0 0 0.25rem; }
    .meta { color: #555; font-size: 0.95rem; margin-bottom: 1.25rem; }
    .beat { margin-bottom: 2rem; }
    .checkpoint { page-break-inside: avoid; }
    h2 { font-size: 1.1rem; margin: 0 0 1rem; color: #333; }
    .prose { margin: 0 0 0.85rem; font-size: 1.05rem; }
    .dialogue {
      margin: 0 0 0.85rem 1.25rem;
      font-style: italic;
      color: #5a3e1b;
      font-size: 1.05rem;
    }
    .checkpoint {
      margin-top: 1.25rem;
      padding: 0.85rem 1rem;
      border-left: 3px solid #8b6914;
      background: #faf6ee;
    }
    .checkpoint-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #8b6914;
      margin: 0 0 0.35rem;
    }
    .checkpoint-question { margin: 0 0 0.5rem; font-weight: 600; }
    .checkpoint ul { margin: 0; padding-left: 1.25rem; }
    .checkpoint li.chosen { font-weight: 600; }
    footer {
      margin-top: 2rem;
      font-size: 0.8rem;
      color: #888;
      border-top: 1px solid #ddd;
      padding-top: 0.75rem;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">${[genre, mode].filter(Boolean).join(' · ')} · ${archive.beats?.length || 0} beats</p>
  ${beatsHtml}
  <footer>Exported from SpellPath · ${escapeHtml(archive.exportedAt)}</footer>
</body>
</html>`;
}
