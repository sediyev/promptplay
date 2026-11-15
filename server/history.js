// What the tutor is sent of a level's chat, and what is kept of a reply that was cut off.
// A game level's replies each carry the whole game file, so sending every old version back on every turn made each
// message cost more than the one before. Only the newest game or creation is useful: the older ones are replaced by a note.

const DONE = /```(?:html|creation)[\s\S]*?```/g; // a complete output block
const OPEN = /```(?:html|creation)[\s\S]*$/; // one that was never finished (a reply cut off part-way)
// The note left where an older version was. The system prompt tells the tutor what it means and never to write it.
export const OLDER = '[an older version was here; the newest version is the one to change]';

// The text of a reply without its last, unfinished ``` block (and the block alone: complete ones stay).
export function cutOpenBlock(text) {
  const rest = String(text).replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length)), i = rest.lastIndexOf('```');
  return i < 0 ? String(text) : String(text).slice(0, i).trimEnd();
}

/**
 * The conversation to send: rows are [{role, content}], oldest first. Returns { messages, hasOutput }.
 * Roles alternate and start with 'user' (what the API wants); every output block but the newest becomes OLDER.
 * hasOutput says whether the newest game or creation is in there, so the caller can add it when it is older than the rows.
 */
export function buildHistory(rows) {
  let newest = -1;
  rows.forEach((m, i) => { if (m.role === 'assistant' && m.content.search(DONE) >= 0) newest = i; });
  const messages = [];
  rows.forEach((m, i) => {
    let content = m.content;
    if (m.role === 'assistant') {
      if (i === newest) { // keep the last complete block of this reply only
        const blocks = content.match(DONE), last = content.lastIndexOf(blocks[blocks.length - 1]);
        content = content.slice(0, last).replace(DONE, OLDER) + content.slice(last);
        const tail = last + blocks[blocks.length - 1].length;
        content = content.slice(0, tail) + content.slice(tail).replace(OPEN, '').trimEnd();
      } else content = content.replace(DONE, OLDER).replace(OPEN, '').trim() || OLDER;
    }
    const prev = messages[messages.length - 1];
    if (prev?.role === m.role) prev.content += '\n\n' + content; else messages.push({ role: m.role, content });
  });
  while (messages[0]?.role === 'assistant') messages.shift();
  return { messages, hasOutput: newest >= 0 && messages.some((m) => m.role === 'assistant' && m.content.search(DONE) >= 0) };
}
