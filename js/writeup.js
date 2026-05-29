// writeup.js - Logic for writeup.html 

const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id');

const writeupContainer = document.getElementById('writeup-container');
const sectionWriteups = document.getElementById('section-writeups');

if (id) {
  if (sectionWriteups) sectionWriteups.style.display = 'none';
  if (writeupContainer) writeupContainer.style.display = 'block';
  
  const meta = WRITEUPS.find(w => w.id === id);
  
  if (!meta) {
    writeupContainer.innerHTML = `
      <div class="post-header">
        <a href="writeup.html" class="back-link">← Back to writeups</a>
        <h1 class="post-title">Writeup not found</h1>
        <p>The writeup you're looking for doesn't exist or was removed.</p>
      </div>`;
  } else {
    document.title = '💀 ' + meta.title + ' - H4ckL0g Writeup';
    fetch(`writeups/${meta.category}/${meta.id}.md`)
      .then(res => {
        if (!res.ok) throw new Error('File not found');
        return res.text();
      })
      .then(md => {
        writeupContainer.innerHTML = `
          <div class="post-header">
            <a href="writeup.html" class="back-link">← Back to writeups</a>
            <span class="post-tag">${meta.category}</span>
            <h1 class="post-title">${meta.title}</h1>
            <div class="post-meta">
              <span>📅 ${meta.date}</span>
              <span>🏷️ ${meta.platform || meta.category}</span>
              <span>⭐ Difficulty:${meta.difficulty || 'Medium'}</span>
              <span>✍️ ${meta.author || "H4ckL0g"}</span>
            </div>
          </div>
          <div class="post-cover"><img src="${meta.image}" alt="${meta.title}"/></div>
          <div class="post-content">${renderMarkdown(md)}</div>`;
        setTimeout(() => {
          document.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
          });
        }, 100);
        
      })
      .catch(() => {
        writeupContainer.innerHTML = `
          <div class="post-header">
            <a href="writeup.html" class="back-link">← Back to writeups</a>
            <h1 class="post-title">${meta.title}</h1>
            <div class="warning-box">The markdown file for this writeup could not be found.</div>
          </div>`;
      });
  }
} else {
  if (writeupContainer) writeupContainer.style.display = 'none';
  if (sectionWriteups) sectionWriteups.style.display = 'block';

  const writeupFilterBar = document.getElementById('writeup-filter-bar');
  const writeupsList = document.getElementById('writeups-list');
  const writeupCount = document.getElementById('writeup-count');

  if (writeupFilterBar && WRITEUPS) {
    const categories = ['all', ...new Set(WRITEUPS.map(w => w.category))];
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (cat === 'all' ? ' active' : '');
      btn.dataset.filter = cat;
      btn.textContent = cat === 'all' ? 'All' : cat;
      writeupFilterBar.appendChild(btn);
    });
  }

  let currentFilter = 'all', currentPage = 1;
  const PER_PAGE = 5;

  function renderWriteupsList() {
    const filtered = currentFilter === 'all' ? WRITEUPS : WRITEUPS.filter(w => w.category === currentFilter);
    const pageItems = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    
    if (writeupCount) writeupCount.textContent = `(${filtered.length})`;
    if (currentPage === 1 && writeupsList) writeupsList.innerHTML = '';

    pageItems.forEach(writeup => {
      const card = document.createElement('div');
      card.className = 'repo-card';
      card.innerHTML = `
        <div class="repo-left">
          <div class="repo-name">${writeup.title}</div>
          <div class="repo-desc">${writeup.excerpt.substring(0, 120)}...</div>
        </div>
        <div class="repo-right">
          <span class="repo-badge ${writeup.category}">${writeup.category}</span>
          <span style="color:#9aa0a6;font-size:.75rem">📅 ${writeup.date}</span>
          <span style="color:#9aa0a6;font-size:.75rem">⭐ ${writeup.difficulty || 'Medium'}</span>
          <span class="repo-arrow">→</span>
        </div>`;
      card.addEventListener('click', () => {
        window.location.href = `writeup.html?id=${writeup.id}`;
      });
      writeupsList.appendChild(card);
    });
  }

  if (writeupFilterBar) {
    writeupFilterBar.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      writeupFilterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      currentPage = 1;
      renderWriteupsList();
    });
  }

  renderWriteupsList();
}