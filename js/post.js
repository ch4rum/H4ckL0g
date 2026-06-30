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
          <div class="post-hero-row">
            <div class="post-hero-img-wrap">
              <img src="${meta.image}" alt="${meta.title}" class="post-hero-circle"/>
            </div>
            <div class="post-hero-info">
              <span class="post-tag">${meta.category}</span>
              <h1 class="post-title">${meta.title}</h1>
              <div class="post-meta">
                <span>📅 ${meta.date}</span>
                <span>✍️ ${meta.author || 'H4ckL0g'}</span>
                <span>⏱ ${meta.reading}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="post-content" id="post-body">
          ${renderMarkdown(md, 'post-img')}
        </div>`;

      setTimeout(() => {
        document.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
        buildTOC(meta.title, '#post-body', 'index.html');
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

// ── TABLE OF CONTENTS ─────────────────────────────────────────
function buildTOC(pageTitle, contentSel, backHref) {
  const content = document.querySelector(contentSel);
  if (!content) return;

  const headings = Array.from(content.querySelectorAll('h1,h2,h3'));
  const sidebar  = document.getElementById('toc-sidebar');
  if (!sidebar || headings.length === 0) return;

  headings.forEach((h, i) => {
    if (!h.id) h.id = 'toc-' + i;
  });

  let html = `
    <div class="toc-header">
      <span class="toc-icon">≡</span>
      <span class="toc-title-label">On This Page</span>
    </div>
    <ul class="toc-list" id="toc-list-inner">`;

  headings.forEach(h => {
    const level  = parseInt(h.tagName[1]);
    const indent = level === 1 ? '' : level === 2 ? 'toc-l2' : 'toc-l3';
    const text   = h.textContent.replace(/^[#/]+ */, '').trim();
    html += `<li class="toc-item ${indent}">
      <a href="#${h.id}" class="toc-link" title="${text}">${text}</a>
    </li>`;
  });

  html += `</ul>`;
  sidebar.innerHTML = html;
  sidebar.style.display = 'block';

  const links  = sidebar.querySelectorAll('.toc-link');
  const listEl = sidebar.querySelector('#toc-list-inner');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const active = sidebar.querySelector(`.toc-link[href="#${e.target.id}"]`);
        if (active) {
          active.classList.add('active');
          if (listEl) {
            const itemTop    = active.parentElement.offsetTop;
            const listHeight = listEl.clientHeight;
            listEl.scrollTo({ top: itemTop - listHeight / 2, behavior: 'smooth' });
          }
        }
      }
    });
  }, { rootMargin: '-8% 0px -75% 0px' });

  headings.forEach(h => observer.observe(h));
}