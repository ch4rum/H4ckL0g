// main.js - Logic for index.html
// Depends on: utils.js · posts.js · writeups.js · githubs.js · github.js

// ── ROTATING PROMPT ──────────────────────────────────────────
const PROMPTS = [
  '$ ls -la /posts/',
  '$ nmap -sV -p 1-1024 target',
  '$ cat /etc/shadow',
  '$ msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.10 LPORT=4444 -f exe -o ch4rum.exe',
  '$ python3 exploit.py --target 192.168.1.1',
  '$ grep -r "password" /var/www/',
  '$ msfconsole -q',
  '$ xxd -l 64 malware.exe',
  '$ hashcat -m 0 hash.txt rockyou.txt',
  '$ wireshark -i eth0',
  '$ whoami && id',
  '$ git clone https://github.com/ch4rum/tools',
  '$ cat writeup.md',
  '$ grep flag.txt',
  '$ ./exploit.py',
  '$ cat solution.md',
  '$ cat post.md',
  '$ ls -la github/',
  '$ git log --oneline',
  '$ git status',
  '$ less article.txt',
  '$ grep -i "exploit" notes.md',
  '$ man hacking',
  '$ python -c "print(hex(0x133d - 0x12a7))"'
];
let promptIdx = 0;
const promptEl = document.getElementById('prompt-text');
if (promptEl) {
  promptEl.textContent = PROMPTS[0];
  promptEl.style.transition = 'opacity .3s';
  setInterval(() => {
    promptEl.style.opacity = 0;
    setTimeout(() => {
      promptIdx = (promptIdx + 1) % PROMPTS.length;
      promptEl.textContent = PROMPTS[promptIdx];
      promptEl.style.opacity = 1;
    }, 300);
  }, 3500);
}

// ── INFINITE SCROLL ──────────────────────────────────────────
function initInfiniteScroll(type, loadMoreFn) {
  const el = document.getElementById(`${type}-loading`);
  if (!el) return;
  new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) loadMoreFn(); });
  }, { threshold: 0.1 }).observe(el);
}

// ── SECTION SWITCHER (index.html tiene las 3 secciones ocultas) ──
function showSection(name, link) {
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  link.classList.add('active');
  ['home','github','writeups'].forEach(s => {
    const el = document.getElementById(`section-${s}`);
    if (el) el.style.display = s === name ? 'block' : 'none';
  });
  window.scrollTo(0, 0);
}

// ═══════════════════════════════════════════════════════════════
// POSTS
// ═══════════════════════════════════════════════════════════════
if (typeof POSTS !== 'undefined') {
  const postFilterBar  = document.getElementById('post-filter-bar');
  const postsGrid      = document.getElementById('posts-grid');
  const noResultsPosts = document.getElementById('no-results-posts');
  const postCount      = document.getElementById('post-count');

  if (postFilterBar) {
    ['all', ...new Set(POSTS.map(p => p.category))].forEach(cat => {
      const btn = document.createElement('button');
      btn.className      = 'filter-btn' + (cat === 'all' ? ' active' : '');
      btn.dataset.filter = cat;
      btn.textContent    = cat === 'all' ? 'All' : cat;
      postFilterBar.appendChild(btn);
    });
  }

  let currentPostFilter = 'all', currentPostPage = 1;
  const POSTS_PER_PAGE  = 6;

  function renderPostsPage() {
    const filtered   = currentPostFilter === 'all' ? POSTS : POSTS.filter(p => p.category === currentPostFilter);
    const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE);
    const pagePosts  = filtered.slice((currentPostPage - 1) * POSTS_PER_PAGE, currentPostPage * POSTS_PER_PAGE);

    if (postCount)      postCount.textContent = `(${filtered.length})`;
    if (currentPostPage === 1 && postsGrid) postsGrid.innerHTML = '';
    if (noResultsPosts) noResultsPosts.style.display = filtered.length === 0 ? 'block' : 'none';

    pagePosts.forEach((post, i) => {
      const card = document.createElement('a');
      card.href  = `post.html?id=${post.id}`;
      card.className = 'card';
      card.style.animationDelay = `${i * 0.08}s`;
      card.innerHTML = `
        <div class="card-img"><img src="${post.image}" alt="${post.title}" loading="lazy"/></div>
        <div class="card-body">
          <span class="card-tag">${post.category}</span>
          <h2 class="card-title">${post.title}</h2>
          <p class="card-excerpt">${post.excerpt}</p>
          <div class="card-meta"><span>📅 ${post.date}</span><span>⏱ ${post.reading}</span></div>
        </div>`;
      postsGrid.appendChild(card);
    });

    const d = document.getElementById('posts-loading');
    if (d) d.style.display = currentPostPage >= totalPages ? 'none' : 'block';
  }

  if (postFilterBar) {
    postFilterBar.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      postFilterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPostFilter = btn.dataset.filter;
      currentPostPage   = 1;
      renderPostsPage();
    });
  }

  renderPostsPage();
  initInfiniteScroll('posts', () => {
    const filtered = currentPostFilter === 'all' ? POSTS : POSTS.filter(p => p.category === currentPostFilter);
    if (currentPostPage < Math.ceil(filtered.length / POSTS_PER_PAGE)) { currentPostPage++; renderPostsPage(); }
    else { const d = document.getElementById('posts-loading'); if (d) d.style.display = 'none'; }
  });
}

// ═══════════════════════════════════════════════════════════════
// WRITEUPS
// ═══════════════════════════════════════════════════════════════
if (typeof WRITEUPS !== 'undefined') {
  const writeupFilterBar = document.getElementById('writeup-filter-bar');
  const writeupsList     = document.getElementById('writeups-list');
  const writeupCount     = document.getElementById('writeup-count');

  if (writeupFilterBar) {
    ['all', ...new Set(WRITEUPS.map(w => w.category))].forEach(cat => {
      const btn = document.createElement('button');
      btn.className      = 'filter-btn' + (cat === 'all' ? ' active' : '');
      btn.dataset.filter = cat;
      btn.textContent    = cat === 'all' ? 'All' : cat;
      writeupFilterBar.appendChild(btn);
    });
  }

  let currentWriteupFilter = 'all', currentWriteupPage = 1;
  const WRITEUPS_PER_PAGE  = 5;

  function renderWriteupsPage() {
    const filtered   = currentWriteupFilter === 'all' ? WRITEUPS : WRITEUPS.filter(w => w.category === currentWriteupFilter);
    const totalPages = Math.ceil(filtered.length / WRITEUPS_PER_PAGE);
    const page       = filtered.slice((currentWriteupPage - 1) * WRITEUPS_PER_PAGE, currentWriteupPage * WRITEUPS_PER_PAGE);

    if (writeupCount) writeupCount.textContent = `(${filtered.length})`;
    if (currentWriteupPage === 1 && writeupsList) writeupsList.innerHTML = '';

    page.forEach((writeup, i) => {
      const card = document.createElement('div');
      card.className = 'repo-card';
      card.style.animationDelay = `${i * 0.06}s`;
      card.innerHTML = `
        <div class="repo-left">
          <div class="repo-name">✍️ ${writeup.title}</div>
          <div class="repo-desc">${writeup.excerpt}</div>
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

    const d = document.getElementById('writeups-loading');
    if (d) d.style.display = currentWriteupPage >= totalPages ? 'none' : 'block';
  }

  if (writeupFilterBar) {
    writeupFilterBar.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      writeupFilterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentWriteupFilter = btn.dataset.filter;
      currentWriteupPage   = 1;
      renderWriteupsPage();
    });
  }

  renderWriteupsPage();
  initInfiniteScroll('writeups', () => {
    const filtered = currentWriteupFilter === 'all' ? WRITEUPS : WRITEUPS.filter(w => w.category === currentWriteupFilter);
    if (currentWriteupPage < Math.ceil(filtered.length / WRITEUPS_PER_PAGE)) { currentWriteupPage++; renderWriteupsPage(); }
    else { const d = document.getElementById('writeups-loading'); if (d) d.style.display = 'none'; }
  });
}

// ═══════════════════════════════════════════════════════════════
// REPOS en index.html — usa window.loadRepoFromMarkdown de github.js
// ═══════════════════════════════════════════════════════════════
if (typeof REPOS !== 'undefined' && document.getElementById('repo-list')) {
  const repoFilterBar = document.getElementById('repo-filter-bar');
  const repoList      = document.getElementById('repo-list');
  const repoCount     = document.getElementById('repo-count');

  if (repoFilterBar) {
    ['all', ...new Set(REPOS.map(r => r.category))].forEach(cat => {
      const btn = document.createElement('button');
      btn.className      = 'filter-btn' + (cat === 'all' ? ' active' : '');
      btn.dataset.filter = cat;
      btn.textContent    = cat === 'all' ? 'All' : cat;
      repoFilterBar.appendChild(btn);
    });
  }

  let currentRepoFilter = 'all', currentRepoPage = 1;
  const REPOS_PER_PAGE  = 5;

  async function renderReposPageIndex() {
    const filtered   = currentRepoFilter === 'all' ? REPOS : REPOS.filter(r => r.category === currentRepoFilter);
    const totalPages = Math.ceil(filtered.length / REPOS_PER_PAGE);
    const pageRepos  = filtered.slice((currentRepoPage - 1) * REPOS_PER_PAGE, currentRepoPage * REPOS_PER_PAGE);

    if (repoCount) repoCount.textContent = `(${filtered.length})`;
    if (currentRepoPage === 1 && repoList) repoList.innerHTML = '';

    for (const repo of pageRepos) {
      const repoData = await window.loadRepoFromMarkdown(repo);
      const card = document.createElement('div');
      card.className = 'repo-card';
      card.innerHTML = `
        <div class="repo-left">
          <div class="repo-name">${repo.name}</div>
          <div class="repo-desc">${repo.desc}</div>
        </div>
        <div class="repo-right">
          <span class="repo-badge ${repo.category}">${repo.category}</span>
          <span style="color:#9aa0a6;font-size:.75rem">${repoData.stars ? `★ ${repoData.stars}` : '★ ?'}</span>
          <span style="color:#9aa0a6;font-size:.75rem">${repoData.lang}</span>
          <span class="repo-arrow">→</span>
        </div>`;
      card.addEventListener('click', () => window.openModal(repo, repoData));
      repoList.appendChild(card);
    }

    const d = document.getElementById('repos-loading');
    if (d) d.style.display = currentRepoPage >= totalPages ? 'none' : 'block';
  }

  if (repoFilterBar) {
    repoFilterBar.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      repoFilterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRepoFilter = btn.dataset.filter;
      currentRepoPage   = 1;
      renderReposPageIndex();
    });
  }

  renderReposPageIndex();
  initInfiniteScroll('repos', async () => {
    const filtered = currentRepoFilter === 'all' ? REPOS : REPOS.filter(r => r.category === currentRepoFilter);
    if (currentRepoPage < Math.ceil(filtered.length / REPOS_PER_PAGE)) { currentRepoPage++; await renderReposPageIndex(); }
    else { const d = document.getElementById('repos-loading'); if (d) d.style.display = 'none'; }
  });
}

// ── RANDOM HERO IMAGE FROM POSTS ──────────────────────────────
function initRandomHeroImage() {
  const heroImageDiv = document.getElementById('random-hero-image');
  const heroImg = document.getElementById('random-post-img');
  const heroTag = document.querySelector('.hero-post-tag');
  const heroTitle = document.querySelector('.hero-post-title');
  
  if (!heroImageDiv || !heroImg) return;
  
  function startRotation() {
    if (typeof POSTS !== 'undefined' && POSTS.length > 0) {
      let currentIndex = 0;
      
      function updateRandomImage() {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * POSTS.length);
        } while (POSTS.length > 1 && newIndex === currentIndex);
        
        currentIndex = newIndex;
        const post = POSTS[currentIndex];

        heroImg.src = post.image;
        heroImg.alt = post.title;

        if (heroTag) heroTag.textContent = post.category;
        if (heroTitle) heroTitle.textContent = post.title;

        heroImageDiv.dataset.postId = post.id;
      }
      
      // Change image 10 seg
      setInterval(updateRandomImage, 10000);
      updateRandomImage();
      heroImageDiv.addEventListener('click', function() {
        const postId = this.dataset.postId;
        if (postId) {
          window.location.href = `post.html?id=${postId}`;
        }
      });
    } else {
      setTimeout(startRotation, 100);
    }
  }
  
  startRotation();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRandomHeroImage);
} else {
  initRandomHeroImage();
}