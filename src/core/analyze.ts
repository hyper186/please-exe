export type Level = 'neutral' | 'green' | 'yellow' | 'red';
export type Mode = 'playful' | 'plain';
export interface Finding { start: number; end: number; quote: string; reason: string; replacement: string; level: 'yellow' | 'red' }
export interface Analysis { level: Level; label: string; caption: string; explanation: string; findings: Finding[]; suggestion?: string; tip: string; source: 'local' }
export const LOCAL_LIMIT = 12_000;
const tips = [
  'Name what went wrong, say what needs to change, then explain how to check it.',
  'Direct is fine. “That is incorrect; check the math” is useful feedback.',
  'A specific example helps more than an extra “please”.',
  'Keep your constraints: budget, deadline, format, and what a good answer looks like.',
];
const copy: Record<Level, [string, string, string, string]> = {
  neutral: ['Not rated', 'A little context, please.', 'No tone rating available.', 'Local checks work best with English instructions.'],
  green: ['Clear & direct', 'Firm. Fair. Ready to send.', 'No harsh phrasing detected.', 'The local rules found no obvious harsh phrasing. Direct feedback is welcome.'],
  yellow: ['Getting sharp', 'The keyboard is getting warm.', 'Some phrasing may sound dismissive.', 'Try naming the missing requirement or error so the next answer has a clear target.'],
  red: ['Sounds harsh', 'Keep the feedback. Lose the flamethrower.', 'Directly hostile phrasing detected.', 'An insult describes the recipient, not the fix. Keep your criticism and make the next step specific.'],
};
interface Rule { pattern: RegExp; level: 'yellow' | 'red'; reason: string; replacement: string }
const rules: Rule[] = [
  { pattern: /\byou(?:['’]re| are)\s+(?:(?:a|an|such|so|really|completely|utterly|totally|fucking|damn|useless|stupid)\s+)*(?:idiot|moron|dumbass|asshole|useless|stupid|pathetic|worthless|incompetent|dumb)\b/gi, level: 'red', reason: 'This labels the assistant instead of describing what needs fixing.', replacement: 'This response needs improvement' },
  { pattern: /\byou\s+(?:(?:useless|fucking|stupid|damn)\s+)*(?:idiot|moron|dumbass|asshole)\b/gi, level: 'red', reason: 'A direct insult can obscure the correction you actually need.', replacement: 'please address the issue' },
  { pattern: /\b(?:stupid|useless|worthless|idiotic)\s+(?:bot|chatbot|AI|assistant)\b/gi, level: 'red', reason: 'Aim the feedback at the answer or behavior.', replacement: 'unhelpful response' },
  { pattern: /\b(?:fuck off|shut (?:the fuck )?up)\b/gi, level: 'red', reason: 'An abusive dismissal gives no useful next step.', replacement: 'Stop and let me clarify the request' },
  { pattern: /\b(?:this|that|your (?:answer|response|code|output))\s+(?:is|was)\s+(?:(?:absolute|total|complete|fucking|utter)\s+)*(?:garbage|trash|bullshit|shit|crap|rubbish)\b/gi, level: 'yellow', reason: 'A broad put-down is less actionable than naming the error.', replacement: 'This needs revision' },
  { pattern: /\byou\s+(?:never listen|never learn|always fail|always mess (?:this|it) up|keep screwing (?:this|it) up)\b/gi, level: 'yellow', reason: '“Always” and “never” broaden a specific problem into an accusation.', replacement: 'Please follow the requirements' },
  { pattern: /\byou (?:ignored|disregarded)\b/gi, level: 'yellow', reason: 'Name the missing requirement rather than assuming intention.', replacement: 'The response missed' },
  { pattern: /\b(?:are you (?:stupid|an idiot)|how (?:stupid|dumb) are you)\b/gi, level: 'red', reason: 'A question can still be a personal insult.', replacement: 'Can you check the mistake' },
];
// Nonmatching, equal-length masking preserves offsets into the original draft. Never change quoted/code text.
export function maskProtected(text: string): string {
  return text.replace(/```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`|"[^"]*"|“[^”]*”|‘[\s\S]*?’(?!\w)|(?<!\w)'[^'\n]+'(?!\w)|^\s*>.*$/gm, m => m.replace(/[^\n]/g, '\uE000'));
}
export function analyze(text: string, mode: Mode = 'playful'): Analysis {
  const base = (level: Level, explanation?: string): Analysis => ({
    level, label: copy[level][0], caption: copy[level][mode === 'plain' ? 2 : 1],
    explanation: explanation ?? copy[level][3], findings: [], tip: tips[text.length % tips.length], source: 'local',
  });
  if (!text.trim()) return base('neutral', 'Start typing. Your draft stays on this device during local checks.');
  if (text.length > LOCAL_LIMIT) return base('neutral', 'This draft is too long for local checks (12,000 characters). It has not been rated.');
  const masked = maskProtected(text);
  const findings: Finding[] = [];
  for (const rule of rules) {
    for (const match of masked.matchAll(rule.pattern)) {
      const start = match.index!;
      const end = start + match[0].length;
      if (findings.some(f => start < f.end && end > f.start)) continue;
      // Don't mistake a negated instruction to the model for a direct insult.
      const prefix = masked.slice(Math.max(0, start - 36), start);
      if (/\b(?:don['’]t say|do not say|never say|avoid saying)\s*$/i.test(prefix)) continue;
      findings.push({ start, end, quote: text.slice(start, end), reason: rule.reason, replacement: rule.replacement, level: rule.level });
    }
  }
  findings.sort((a, b) => a.start - b.start);
  const letters = (masked.match(/\p{L}/gu) ?? []).length;
  const latin = (masked.match(/[a-z]/gi) ?? []).length;
  const englishSignal = /\b(?:the|this|that|you|your|please|thanks|thank|explain|summarize|summarise|translate|fix|check|review|write|give|make|can|could|do|don't|use|using|is|are|and|with|my|it|help|stop|no|yes|wrong|correct|hello|hi|why|what|how|keep|try|not|to|for)\b/i.test(masked);
  if (!findings.length && (!englishSignal || latin < letters * 0.7)) return base('neutral', 'English-first checks: there is not enough supported text to rate confidently. Quoted text and code are skipped.');
  const level = findings.some(f => f.level === 'red') ? 'red' : findings.length ? 'yellow' : 'green';
  const result = base(level);
  result.findings = findings;
  if (findings.length) {
    let suggestion = text;
    for (const f of [...findings].reverse()) suggestion = suggestion.slice(0, f.start) + f.replacement + suggestion.slice(f.end);
    result.suggestion = suggestion;
  }
  return result;
}
