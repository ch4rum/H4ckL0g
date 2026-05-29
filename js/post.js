// post.js — Logic for post.html
// Depends on: utils.js (renderMarkdown), posts.js (POSTS)

const id        = new URLSearchParams(window.location.search).get('id');
const meta      = POSTS.find(p => p.id === id);
const container = document.getElementById('post-container');

if (!meta) {
  container.innerHTML = `
    <div class="post-header">
      <a href="index.html" class="back-link">← Back to home</a>
      <h1 class="post-title">Post not found</h1>
      <p>The article you're looking for doesn't exist or was removed.</p>
    </div>`;
} else {
  document.title = '💀 ' + meta.title + ' - H4ckL0g';

  fetch(`posts/${meta.category}/${meta.id}.md`)
    .then(res => res.ok ? res.text() : Promise.reject())
    .then(md => {
      container.innerHTML = `
        <div class="post-header">
          <a href="index.html" class="back-link">← Back to home</a>
          <span class="post-tag">${meta.category}</span>
          <h1 class="post-title">${meta.title}</h1>
          <div class="post-meta">
            <span>📅 ${meta.date}</span>
            <span>✍️ ${meta.author || 'H4ckL0g'}</span>
            <span>⏱ ${meta.reading}</span>
          </div>
        </div>
        <div class="post-cover">
          <img src="${meta.image}" alt="${meta.title}"/>
        </div>
        <div class="post-content">
          ${renderMarkdown(md, 'post-img')}
        </div>`;
      setTimeout(() => {
        document.querySelectorAll('pre code').forEach(block => {
          hljs.highlightElement(block);
        });
      }, 100);
    })
    .catch(() => {
      container.innerHTML = `
        <div class="post-header">
          <a href="index.html" class="back-link">← Back to home</a>
          <h1 class="post-title">${meta.title}</h1>
          <div class="warning-box">
            Markdown file not found. Check that
            <code>posts/${meta.category}/${meta.id}.md</code> exists.
          </div>
        </div>`;
    });
}