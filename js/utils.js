// utils.js — Shared functions used across all pages
// Used by: post.js, writeup.js, github.js

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function copyCode(btn) {
  const code = btn.closest('.code-block').querySelector('code');
  navigator.clipboard.writeText(code.textContent);
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ffb3" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
  setTimeout(() => {
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  }, 2000);
}

function buildCodeBlock(lang, code) {
  return `
    <div class="code-block">
      <div class="code-header">
        <span class="code-lang">${lang || 'bash'}</span>
        <button class="code-copy-btn" onclick="copyCode(this)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      </div>
      <pre><code>${escapeHtml(code.trimEnd())}</code></pre>
    </div>`;
}

function parseCodeBlocks(text) {
  const blocks = [];
  const result = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const i = blocks.length;
    blocks.push(buildCodeBlock(lang, code));
    return `CODEBLOCK_${i}_END`;
  });
  return { text: result, blocks };
}

function restoreCodeBlocks(html, blocks) {
  blocks.forEach((block, i) => {
    html = html.replace(`<p>CODEBLOCK_${i}_END</p>`, block);
    html = html.replace(`CODEBLOCK_${i}_END`, block);
  });
  return html;
}

// imgClass: 'post-img' for posts (cyan hacker filter)
//           'writeup-img' for writeups (full color, no filter)  ← default
function renderMarkdown(md, imgClass) {
  if (!md) return '<p>No content available.</p>';
  imgClass = imgClass || 'writeup-img';

  const { text, blocks } = parseCodeBlocks(md);
  let html = text;

  // Tables
  html = html.replace(/^\|(.+)\|\r?\n\|[-| :]+\|\r?\n((?:\|.+\|\r?\n?)+)/gm, (_, headerRow, bodyRows) => {
    const headers = headerRow.split('|').map(c => c.trim()).filter(Boolean);
    let t = '<table class="markdown-table"><thead><tr>';
    headers.forEach(h => { t += `<th>${h}</th>`; });
    t += '</tr></thead><tbody>';
    bodyRows.trim().split('\n').forEach(row => {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean);
      t += '<tr>';
      cells.forEach(c => { t += `<td>${c}</td>`; });
      t += '</tr>';
    });
    t += '</tbody></table>';
    return t;
  });

  html = html
    .replace(/^# (.+)$/gm,    '<h1>$1</h1>')
    .replace(/^## (.+)$/gm,   '<h2>$1</h2>')
    .replace(/^### (.+)$/gm,  '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,    '<em>$1</em>')
    .replace(/`([^`]+)`/g,    '<code>$1</code>')
    .replace(/^> (.+)$/gm,    '<blockquote>$1</blockquote>')
    .replace(/^---$/gm,        '<hr>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, `<img src="$2" alt="$1" class="${imgClass}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,  '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm,    '<li>$1</li>')
    .replace(/\n\n/g,          '</p><p>')
    .replace(/\n/g,            ' ');

  if (!html.startsWith('<')) html = '<p>' + html + '</p>';
  return restoreCodeBlocks(html, blocks);
}