import { analyze } from '../core/analyze';
import { SAMPLES } from '../core/samples';
import { createPanel } from '../extension/panel';
const draft = document.getElementById('demo-draft') as HTMLTextAreaElement;
const toast = (text: string) => { document.getElementById('toast')!.textContent = text; };
const panel = createPanel({ doc: document, shadowMode: 'open', endpoint: () => '', onCopy: text => navigator.clipboard.writeText(text),
  onCloud: async () => { throw new Error('Jev is available in the installed extension after you connect a relay.'); },
  onSettings: () => toast('The web demo uses private local checks. Install the extension to choose your tone and connect an optional Jev relay.'),
  onPause: () => toast('This is only a playground. The installed extension lets you pause separately on Claude and ChatGPT.'),
});
document.getElementById('demo-meter')!.append(panel.host);
function render() {
  panel.update(analyze(draft.value), draft.value);
  document.getElementById('char-count')!.textContent = `${draft.value.length} CHARS`;
}
draft.addEventListener('input', () => { document.querySelectorAll('[data-sample]').forEach(b => b.setAttribute('aria-pressed', 'false')); render(); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-sample]')) button.addEventListener('click', () => {
  draft.value = SAMPLES[button.dataset.sample!];
  document.querySelectorAll('[data-sample]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); render();
});
document.getElementById('share-card')!.addEventListener('click', () => {
  // Only static copy goes into the card. Never read the draft or chat for sharing.
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
  const ctx = canvas.getContext('2d'); if (!ctx) { toast('This browser cannot create a share card.'); return; }
  ctx.fillStyle = '#f8f6ef'; ctx.fillRect(0, 0, 1200, 630);
  ctx.strokeStyle = '#dddfd2'; ctx.strokeRect(30, 30, 1140, 570);
  ctx.fillStyle = '#c85035'; ctx.font = 'bold 25px monospace'; ctx.fillText('please.exe', 78, 103);
  ctx.fillStyle = '#252821'; ctx.font = '64px Georgia'; ctx.fillText('Today I negotiated peacefully', 78, 245); ctx.fillText('with autocomplete.', 78, 325);
  ctx.fillStyle = '#72766a'; ctx.font = '22px sans-serif'; ctx.fillText('Less heat. Better prompts. A tiny tone coach for your AI chats.', 78, 415);
  for (let i = 0; i < 12; i++) { ctx.fillStyle = i < 4 ? '#44745c' : '#dddfd2'; ctx.fillRect(80 + i * 16, 510 - (i % 3) * 7, 8, 18 + (i % 3) * 7); }
  ctx.fillStyle = '#44745c'; ctx.font = '16px monospace'; ctx.fillText('FIRM. FAIR. READY TO SEND.', 310, 526);
  canvas.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'please-exe-a-tiny-brag.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Share card downloaded. It contains no draft text.'); });
});
render();
