import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHistory, cutOpenBlock, OLDER } from '../server/history.js';

const game = (n) => 'Here!\n```html\n<html>v' + n + '</html>\n```\nTry a timer next.';
const u = (content) => ({ role: 'user', content }), a = (content) => ({ role: 'assistant', content });

test('history: only the newest game or creation is sent again', () => {
  const { messages, hasOutput } = buildHistory([u('make a game'), a(game(1)), u('blue'), a(game(2)), u('faster'), a(game(3)), u('add a score')]);
  const text = messages.map((m) => m.content).join('\n');
  assert.equal(hasOutput, true);
  assert.ok(text.includes('<html>v3</html>') && !text.includes('v1') && !text.includes('v2'));
  assert.equal(text.split(OLDER).length - 1, 2, 'the two older versions are notes');
  assert.ok(messages[1].content.startsWith('Here!') && messages[1].content.endsWith('Try a timer next.'), 'the words around a game stay');
  assert.deepEqual(messages.map((m) => m.role), ['user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user']);
});

test('history: roles alternate and start with the student, creations count too', () => {
  const { messages, hasOutput } = buildHistory([a('Hello!'), u('hi'), u('a hero'), a('Nice!\n```creation\nCaptain Cloud\n```'), u('more')]);
  assert.deepEqual(messages.map((m) => m.role), ['user', 'assistant', 'user']);
  assert.equal(messages[0].content, 'hi\n\na hero');
  assert.equal(hasOutput, true);
  assert.equal(buildHistory([u('hi'), a('Tell me more.'), u('ok')]).hasOutput, false);
  assert.deepEqual(buildHistory([]), { messages: [], hasOutput: false });
});

test('history: a reply that was cut off never leaves half a file behind', () => {
  assert.equal(cutOpenBlock('Here it comes!\n```html\n<html><body>half'), 'Here it comes!');
  assert.equal(cutOpenBlock(game(1)), game(1), 'a complete reply is untouched');
  assert.equal(cutOpenBlock(game(1) + '\n```html\n<html>half'), game(1), 'only the unfinished block goes');
  assert.equal(cutOpenBlock('```html\n<html>half'), '');
  // half files stored before this was handled are left out of what is sent
  const { messages } = buildHistory([u('big game'), a('Sure!\n```html\n<html>half'), u('smaller'), a(game(2)), u('thanks')]);
  assert.equal(messages[1].content, 'Sure!');
  assert.ok(messages[3].content.includes('v2'));
  assert.equal(buildHistory([u('big'), a('```html\n<html>half'), u('again')]).messages[1].content, OLDER, 'never an empty turn');
});
