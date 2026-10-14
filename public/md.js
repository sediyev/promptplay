import { esc } from '/common.js';

// Small, safe markdown renderer for tutor replies: everything is escaped first, then a limited set of syntax is turned into tags.
export function md(src) {
  const code = [];
  let s = esc(src).replace(/```[^\n`]*\n?([\s\S]*?)```/g, (_, c) => `\u0001${code.push(`<pre><code>${c.replace(/\n$/, '')}</code></pre>`) - 1}\u0002`);
  const inline = (x) => x.replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>').replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
  const out = []; let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const line of s.split('\n')) {
    let m;
    if ((m = line.match(/^\s*(?:[-*•]|(\d+)[.)])\s+(.*)/))) {
      const kind = m[1] ? 'ol' : 'ul';
      if (list !== kind) { close(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline(m[2])}</li>`);
    } else if ((m = line.match(/^#{1,6}\s+(.*)/))) { close(); out.push(`<h4>${inline(m[1])}</h4>`); }
    else if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { close(); out.push('<hr>'); }
    else if ((m = line.match(/^&gt;\s?(.*)/))) { close(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); }
    else if (!line.trim()) close();
    else if (/^\u0001\d+\u0002$/.test(line.trim())) { close(); out.push(line.trim()); }
    else { close(); out.push(`<p>${inline(line)}</p>`); }
  }
  close();
  return out.join('').replace(/\u0001(\d+)\u0002/g, (_, i) => code[i]);
}
