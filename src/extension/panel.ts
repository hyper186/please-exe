import type { Analysis } from '../core/analyze';
import { CLOUD_LIMIT, JEV_REASONS, type JevVerdict } from '../core/protocol';
interface PanelOptions {
  doc: Document;
  shadowMode?: ShadowRootMode;
  reviewInExtension?: boolean;
  onCopy: (text: string) => Promise<void>;
  onCloud: (text: string, endpoint: string) => Promise<JevVerdict | null>;
  onSettings: () => void;
  onPause: () => void;
  endpoint: () => string;
}
const css = `
:host{display:block!important;position:relative!important;width:100%!important;margin:9px 0 3px!important;box-sizing:border-box!important;color-scheme:light dark;--bg:#fcfaf6;--ink:#292a27;--muted:#75756d;--line:#e5e1d8;--soft:#f1eee6;--green:#408469;--yellow:#a5701c;--red:#bf533f;--accent:#e16d52;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;color:var(--ink)!important}
*{box-sizing:border-box}button{font:inherit;cursor:pointer;color:inherit}button:focus-visible,a:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:3px}button:disabled{opacity:.55;cursor:wait}.bar{display:flex;gap:10px;align-items:center;width:100%;border:1px solid var(--line);border-radius:11px;background:var(--bg);padding:9px 12px;text-align:left}.brand{font:700 18px/1 Georgia,serif;color:var(--accent)}.label{flex:1;font-size:12px;font-weight:600}.ticks{display:flex;align-items:flex-end;gap:3px;height:17px}.tick{width:4px;border-radius:2px;background:var(--line);height:8px}.tick:nth-child(3n+2){height:12px}.tick:nth-child(3n){height:16px}.tick.on{background:var(--tone,var(--muted))}.chevron{color:var(--muted);font-size:10px}.panel{border:1px solid var(--line);border-radius:14px;padding:17px;margin-top:6px;background:var(--bg);max-height:450px;overflow:auto;box-shadow:0 8px 22px #00000009}.panel[hidden]{display:none}.eyebrow{text-transform:uppercase;font-size:9px;letter-spacing:1.7px;font-weight:700;color:var(--muted)}h3{font-size:17px;line-height:1.35;margin:7px 0 8px;font-weight:650;letter-spacing:-.35px}p{margin:7px 0}.muted,.fine{color:var(--muted)}.fine{font-size:11px}.finding{border-left:2px solid var(--tone);padding-left:11px;margin:14px 0}.quote{font-weight:600;white-space:pre-wrap;overflow-wrap:anywhere}.suggestion{background:var(--soft);border-radius:10px;padding:12px;margin:12px 0}.draft{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0;max-height:140px;overflow:auto}.actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.action{border:1px solid var(--line);border-radius:8px;background:var(--bg);padding:7px 10px;font-size:11px;font-weight:600}.primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}.tip{font-size:12px;padding:11px 0;border-top:1px solid var(--line);margin-top:15px}.footer{display:flex;gap:12px;border-top:1px solid var(--line);padding-top:11px;margin-top:12px}.link{border:0;background:none;padding:0;font-size:11px;color:var(--muted)}.cloud{border:1px solid var(--line);border-radius:10px;padding:12px;margin-top:12px}.cloud strong{font-size:12px}.cloud .fine{overflow-wrap:anywhere}.result{border-left:2px solid var(--accent);padding-left:10px}.notice{font-size:11px;color:var(--muted);margin-top:9px}.cloud textarea{width:100%;max-height:100px;font:11px/1.4 monospace;resize:vertical;background:var(--soft);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:7px}.status{font-size:11px;color:var(--muted)}
@media(prefers-color-scheme:dark){:host{--bg:#262725;--ink:#eeeee8;--muted:#b2b3a8;--line:#44453e;--soft:#31322e;--green:#86bd9e;--yellow:#e0b966;--red:#ed947e}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
`;
export function createPanel(options: PanelOptions) {
  const d = options.doc;
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') { const node = d.createElement(tag); node.className = className; node.textContent = text; return node; }
  function button(text: string, cls = 'action') { const b = el('button', cls, text); b.type = 'button'; return b; }
  const host = el('div'); host.dataset.pleaseExe = 'meter';
  const root = host.attachShadow({ mode: options.shadowMode ?? 'closed' });
  const style = el('style'); style.textContent = css;
  const bar = button('', 'bar'); bar.setAttribute('aria-expanded', 'false'); bar.setAttribute('aria-controls', 'please-panel');
  const brand = el('span', 'brand', 'p.'); brand.setAttribute('aria-hidden', 'true');
  const label = el('span', 'label', 'Not rated'); label.setAttribute('aria-live', 'polite'); label.setAttribute('aria-atomic', 'true');
  const ticks = el('span', 'ticks'); ticks.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 12; i++) ticks.append(el('span', 'tick'));
  bar.append(brand, label, ticks, el('span', 'chevron', '▾'));
  const details = el('section', 'panel'); details.id = 'please-panel'; details.hidden = true; details.setAttribute('aria-label', 'Please.exe tone coach');
  root.append(style, bar, details);
  let current = ''; let revision = 0; let disposed = false;
  bar.addEventListener('click', () => { details.hidden = !details.hidden; bar.setAttribute('aria-expanded', String(!details.hidden)); });
  root.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Escape') { details.hidden = true; bar.setAttribute('aria-expanded', 'false'); bar.focus(); } });
  function update(analysis: Analysis, text: string) {
    current = text; revision++;
    label.textContent = analysis.label;
    bar.setAttribute('aria-label', `Please.exe: ${analysis.label}. Open tone feedback`);
    host.style.setProperty('--tone', `var(--${analysis.level === 'neutral' ? 'muted' : analysis.level})`);
    const count = { neutral: 0, green: 4, yellow: 8, red: 12 }[analysis.level];
    [...ticks.children].forEach((node, i) => node.classList.toggle('on', i < count));
    details.replaceChildren(el('div', 'eyebrow', 'PLEASE.EXE · LOCAL TONE CHECK'), el('h3', '', analysis.caption), el('p', 'muted', analysis.explanation));
    for (const f of analysis.findings.slice(0, 3)) {
      const item = el('div', 'finding'); item.append(el('div', 'quote', `“${f.quote}”`), el('p', 'fine', f.reason)); details.append(item);
    }
    if (analysis.findings.length > 3) details.append(el('p', 'fine', `${analysis.findings.length - 3} more phrases included in the suggested edit.`));
    if (analysis.suggestion) {
      const suggestion = el('div', 'suggestion'); suggestion.dataset.suggestion = 'true';
      const copy = button('Copy suggested edit', 'action primary'); const status = el('span', 'status'); status.setAttribute('role', 'status');
      copy.addEventListener('click', async () => { try { await options.onCopy(analysis.suggestion!); status.textContent = 'Copied. Review, then paste it yourself.'; } catch { status.textContent = 'Clipboard unavailable. Select the preview and copy it.'; } });
      suggestion.append(el('div', 'eyebrow', 'SAME REQUEST. LESS HEAT.'), el('p', 'draft', analysis.suggestion), copy, status, el('p', 'fine', 'A targeted edit, not a full rewrite. Review for meaning before pasting.'));
      details.append(suggestion);
    }
    details.append(el('div', 'tip', analysis.tip));
    const cloud = el('div', 'cloud'); const ask = button(options.reviewInExtension ? 'Review with Jev ↗' : 'Get a Jev second opinion'); ask.dataset.cloud = 'true';
    const cloudStatus = el('div', 'status'); cloudStatus.setAttribute('role', 'status');
    cloud.append(el('strong', '', 'A second opinion, on your terms.'), el('p', 'fine', options.reviewInExtension ? 'Review a snapshot in the extension tab before anything leaves your device.' : 'Optional Jev classification. Nothing is sent until you review and confirm.'), ask, cloudStatus);
    ask.disabled = !text.trim() || text.length > CLOUD_LIMIT;
    if (text.length > CLOUD_LIMIT) cloudStatus.textContent = 'Jev checks support drafts up to 8,000 characters.';
    ask.addEventListener('click', event => {
      if (!event.isTrusted) return;
      const endpoint = options.endpoint();
      if (!endpoint) { options.onSettings(); return; }
      const snapshot = current; const version = revision;
      if (options.reviewInExtension) {
        ask.disabled = true;
        void options.onCloud(snapshot, endpoint).then(() => { if (revision === version) cloudStatus.textContent = 'Review is open in the extension tab. Nothing has been sent to Jev yet.'; }).catch(error => { if (revision === version) cloudStatus.textContent = error instanceof Error ? error.message : 'Could not open review.'; }).finally(() => { if (revision === version) ask.disabled = false; });
        return;
      }
      const consent = el('div');
      consent.append(el('p', 'fine', `This entire draft will be sent to ${endpoint}, then to TypeSafe AI. The relay operator and TypeSafe handle it under their own policies. Don’t include secrets or sensitive information.`));
      const preview = el('textarea'); preview.readOnly = true; preview.value = snapshot; preview.rows = 3; preview.setAttribute('aria-label', 'Draft to send to Jev'); consent.append(preview);
      const send = button('Send this draft to Jev', 'action primary'); const cancel = button('Keep it local'); const actions = el('div', 'actions'); actions.append(send, cancel); consent.append(actions);
      ask.hidden = true; cloud.append(consent);
      cancel.addEventListener('click', () => { consent.remove(); ask.hidden = false; });
      send.addEventListener('click', async e => {
        if (!e.isTrusted || disposed || version !== revision) return;
        send.disabled = true; cancel.disabled = true; cloudStatus.textContent = 'Asking Jev… local checks still work.';
        try {
          const result = await options.onCloud(snapshot, endpoint);
          if (!result || disposed || revision !== version || current !== snapshot) return;
          const title = { neutral: 'Uncertain', green: 'Clear & direct', yellow: 'Getting sharp', red: 'Sounds harsh' }[result.level];
          cloudStatus.replaceChildren(el('p', 'result', `Jev: ${title}. ${JEV_REASONS[result.reason]}`), el('p', 'fine', `${result.model} · ${Math.round(result.latencyMs)} ms · ${result.inputTokens.toLocaleString()} input tokens`), el('p', 'fine', 'A model estimate, not a policy or account-safety verdict.'));
        } catch (error) {
          if (disposed || revision !== version) return;
          cloudStatus.textContent = error instanceof Error ? error.message : 'Jev is unavailable. Local checks still work.';
        } finally { if (!disposed && revision === version) { consent.remove(); ask.hidden = false; } }
      });
    });
    details.append(cloud, el('p', 'notice', 'English-first heuristic · Can miss context · Green does not mean policy-safe. No chat history is read.'));
    const footer = el('div', 'footer');
    const settings = button('Settings & privacy', 'link'); settings.addEventListener('click', options.onSettings);
    const pause = button('Pause on this site', 'link'); pause.addEventListener('click', options.onPause);
    footer.append(settings, pause); details.append(footer);
  }
  return { host, update, invalidate() { revision++; }, dispose() { disposed = true; revision++; current = ''; host.remove(); } };
}
