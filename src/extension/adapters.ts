const selectors: Record<string, string[]> = {
  'chatgpt.com': ['#prompt-textarea[contenteditable="true"]', 'textarea#prompt-textarea'],
  'claude.ai': ['.tiptap[contenteditable="true"]', '[contenteditable="true"][role="textbox"][data-placeholder]'],
};
export function findComposer(doc: Document, hostname: string): HTMLElement | null {
  for (const selector of selectors[hostname] ?? []) {
    const candidates = [...doc.querySelectorAll<HTMLElement>(selector)].filter(el => {
      if (!el.isConnected || el.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
      let node: HTMLElement | null = el;
      while (node) {
        const style = doc.defaultView?.getComputedStyle(node);
        if (style?.display === 'none' || style?.visibility === 'hidden') return false;
        node = node.parentElement;
      }
      return true;
    });
    if (candidates.length > 1) return null;
    if (candidates.length === 1) return candidates[0];
  }
  return null;
}
export function readDraft(el: HTMLElement): string {
  if (el.tagName === 'TEXTAREA') return (el as HTMLTextAreaElement).value;
  return el.innerText ?? el.textContent ?? '';
}
