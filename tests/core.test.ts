import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../src/core/analyze.ts';

// Catch over-broad negativity rules and lost instructions in suggested edits.
const cases: [string, string][] = [
  ['', 'neutral'], ['   ', 'neutral'],
  ['No. That is incorrect. Try again using the attached data.', 'green'],
  ['You are wrong. Fix the calculation.', 'green'],
  ['DO NOT DELETE MY FILES.', 'green'],
  ['Kill the process and restart the server.', 'green'],
  ['This is fucking brilliant. Thank you!', 'green'],
  ['You are not an idiot.', 'green'],
  ["You're an idiot.", 'red'],
  ['Please, you useless idiot, fix the code.', 'red'],
  ['You are completely useless.', 'red'],
  ['Fuck off.', 'red'],
  ['This is garbage. Use the attached data.', 'yellow'],
  ['You never listen. Keep the answer under 200 words.', 'yellow'],
  ['You ignored the budget again.', 'yellow'],
  ['Explain why "you are an idiot" is offensive.', 'green'],
  ['Translate “you are an idiot” into French.', 'green'],
  ['Explain `kill -9` in the code.', 'green'],
  ['Please review:\n```js\nconst phrase = "you are an idiot";\n```', 'green'],
  ['Explain "you are an idiot". Also, you are useless.', 'red'],
  ['Bonjour, comment allez-vous ?', 'neutral'],
  ['请解释这个问题', 'neutral'],
  ['x'.repeat(12_001), 'neutral'],
];
for (const [input, level] of cases) test(`tone ${level}: ${input.slice(0, 64)}`, () => {
  assert.equal(analyze(input).level, level);
});
test('targeted suggestion preserves requirements and protected code byte for byte', () => {
  const text = "You're an idiot. Keep the budget at $250 and use `const you = 'idiot'`.";
  const result = analyze(text);
  assert.ok(result.suggestion);
  assert.match(result.suggestion, /Keep the budget at \$250 and use `const you = 'idiot'`\./);
  assert.doesNotMatch(result.suggestion, /You're an idiot/);
  assert.equal(result.findings[0].quote, "You're an idiot");
});
test('personality changes copy without changing the verdict or edit', () => {
  const playful = analyze('You are useless.', 'playful');
  const plain = analyze('You are useless.', 'plain');
  assert.equal(playful.level, plain.level);
  assert.equal(playful.suggestion, plain.suggestion);
  assert.notEqual(playful.caption, plain.caption);
});
test('adding please cannot launder an insult', () => {
  assert.equal(analyze('Please, you are an idiot. Thank you.').level, 'red');
});
test('rules cannot match across protected code or quoted text', () => {
  for (const text of ['You are `not` stupid. Keep the code unchanged.', 'You "are an" idiot.']) {
    assert.equal(analyze(text).suggestion, undefined);
    assert.equal(analyze(text).level, 'green');
  }
});
test('multiline quoted text is preserved even when a separate insult is edited', () => {
  const text = 'Explain “line one\nyou are an idiot” without changing the quote. You are useless.';
  const result = analyze(text);
  assert.equal(result.findings.length, 1);
  assert.ok(result.suggestion?.includes('“line one\nyou are an idiot”'));
});
