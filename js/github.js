// github.js - Logic for github.html
// Depends on: utils.js (renderMarkdown, parseCodeBlocks, restoreCodeBlocks)
//             githubs.js (REPOS)

// ── INFINITE SCROLL ──────────────────────────────────────────
function initInfiniteScroll(type, loadMoreFn) {
  const loadingEl = document.getElementById(`${type}-loading`);
  if (!loadingEl) return null;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) loadMoreFn(); });
  }, { threshold: 0.1 });
  observer.observe(loadingEl);
  return observer;
}

// ── LOAD & PARSE REPO MARKDOWN ───────────────────────────────
const reposDataCache = {};

window.loadRepoFromMarkdown = async function(repo) {
  if (reposDataCache[repo.id]) return reposDataCache[repo.id];
  try {
    const response = await fetch(`githubs/${repo.category}/${repo.id}.md`);
    if (!response.ok) throw new Error('MD file not found');
    const parsed = await parseRepoMarkdown(await response.text(), repo);
    reposDataCache[repo.id] = parsed;
    return parsed;
  } catch (e) {
    const defaultData = {
      name: repo.name, desc: repo.desc, category: repo.category,
      githubUrl: repo.githubUrl, lang: repo.lang || 'Unknown',
      stars: null,
      readme: `# ${repo.name}\n\nCreate \`githubs/${repo.category}/${repo.id}.md\` to add content.`,
      files: []
    };
    reposDataCache[repo.id] = defaultData;
    return defaultData;
  }
};

async function parseRepoMarkdown(md, repo) {
  const result = {
    name: repo.name, desc: repo.desc, category: repo.category,
    githubUrl: repo.githubUrl, lang: 'Unknown', stars: null, readme: '', files: []
  };
  const langMatch = md.match(/\*\*Language:\*\* (.+)/);
  if (langMatch) result.lang = langMatch[1];
  const starsMatch = md.match(/\*\*Stars:\*\* (.+)/);
  if (starsMatch) result.stars = starsMatch[1];

  const readmeMatch = md.match(/## README\s+([\s\S]*?)(?=## Files|$)/);
  result.readme = readmeMatch
    ? readmeMatch[1].trim()
    : md.split('## Files')[0].replace(/^# .+\n/, '').trim();
  const rawUrls = [...md.matchAll(/\*\*Raw:\*\* (.+)/g)].map(m => m[1].trim());
  const mdClean = md.replace(/\*\*Raw:\*\*.*/gm, '').trimEnd();
  
  const filesSection = mdClean.match(/## Files\s+([\s\S]*?)$/);

  if (filesSection) {
    const blocks = filesSection[1].split(/\n(?=[A-Za-z0-9_-]+\.[A-Za-z0-9]+:)/);
    //const blocks = filesSection[1].split(/\n(?=[A-Za-z][A-Za-z0-9_-]*\.?[A-Za-z0-9]*:)/);
    
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length === 0) continue;
      
      const firstLine = lines[0].trim();

      const match = firstLine.match(/^([A-Za-z0-9_-]+\.[A-Za-z0-9]+):/);
      if (!match) continue;
      //const match = firstLine.match(/^([A-Za-z][A-Za-z0-9_-]*\.?[A-Za-z0-9]*):/);
      
      if (match) {
        const name = match[1];
        const isCodeFile = name.includes('.');
        let content = lines.slice(1).join('\n').trim();
  
        if (isCodeFile) {
          const codeMatch = content.match(/```(?:\w+)?\n([\s\S]*?)```/);
          if (codeMatch) {
            content = codeMatch[1].trim();
          }
          result.files.push({ name: name, content: content });
        } else {
          result.files.push({ name: name + '.txt', content: content });
        }
      }
    }
  }

  // Raw URLs
  for (const url of rawUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) result.files.push({ name: url.split('/').pop(), content: await res.text() });
    } catch (e) { console.warn('Error fetching raw file:', e); }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// REPOS LIST
// ═══════════════════════════════════════════════════════════════
if (typeof REPOS !== 'undefined' && document.getElementById('repo-list')) {
  const repoCats      = ['all', ...new Set(REPOS.map(r => r.category))];
  const repoFilterBar = document.getElementById('repo-filter-bar');
  if (repoFilterBar) {
    repoCats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className   = 'filter-btn' + (cat === 'all' ? ' active' : '');
      btn.dataset.filter = cat;
      btn.textContent = cat === 'all' ? 'All' : cat;
      repoFilterBar.appendChild(btn);
    });
  }

  const repoList  = document.getElementById('repo-list');
  const repoCount = document.getElementById('repo-count');
  let currentRepoFilter = 'all', currentRepoPage = 1;
  const REPOS_PER_PAGE  = 5;
  const allReposList    = [...REPOS];

  async function renderReposPage() {
    const filtered   = currentRepoFilter === 'all' ? allReposList : allReposList.filter(r => r.category === currentRepoFilter);
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

  async function loadMoreRepos() {
    const filtered   = currentRepoFilter === 'all' ? allReposList : allReposList.filter(r => r.category === currentRepoFilter);
    const totalPages = Math.ceil(filtered.length / REPOS_PER_PAGE);
    if (currentRepoPage < totalPages) { currentRepoPage++; await renderReposPage(); }
    else { const d = document.getElementById('repos-loading'); if (d) d.style.display = 'none'; }
  }

  if (repoFilterBar) {
    repoFilterBar.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      repoFilterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRepoFilter = btn.dataset.filter;
      currentRepoPage   = 1;
      renderReposPage();
    });
  }

  renderReposPage();
  initInfiniteScroll('repos', loadMoreRepos);
}

// ═══════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════
if (document.getElementById('repo-modal')) {
  let currentFileContent = '';

  window.openModal = function(repo, repoData) {
    document.getElementById('modal-title').innerHTML = `<span style="opacity:.5">~/</span>${repo.name}`;
    document.getElementById('modal-meta').innerHTML = `
      <span>${repoData.stars ? `★ ${repoData.stars} stars` : '★ private'}</span>
      <span>${repoData.lang}</span>
      <span>${repoData.files.length} files</span>
      <span class="repo-badge ${repo.category}" style="font-size:.7rem">${repo.category}</span>`;

    const githubLink = document.getElementById('modal-github-link');
    if (repo.githubUrl && repo.githubUrl !== '#') {
      githubLink.href = repo.githubUrl;
      githubLink.className = 'download-btn';
      githubLink.textContent = '⇗ View on GitHub';
    } else {
      githubLink.href = `githubs/0xLocal_code/${repo.id}.zip`;
      githubLink.setAttribute('download', '');
      githubLink.className = 'download-btn';
      githubLink.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download .zip`;
    }

    document.getElementById('modal-footer-meta').textContent = `${repoData.lang} · ${repoData.files.length} files`;
    document.getElementById('modal-readme').innerHTML = renderMarkdown(repoData.readme);
    setTimeout(() => {
        document.querySelectorAll('#modal-readme pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    }, 50);
    const fileList = document.getElementById('modal-file-list');
    fileList.innerHTML = '';
    document.getElementById('modal-file-count').textContent = `${repoData.files.length} files · ready for inspection`;

    repoData.files.forEach((f, i) => {
      const item = document.createElement('div');
      item.className   = 'file-item' + (i === 0 ? ' active' : '');
      item.textContent = f.name;
      item.addEventListener('click', () => {
        fileList.querySelectorAll('.file-item').forEach(x => x.classList.remove('active'));
        item.classList.add('active');
        showFileInModal(f);
      });
      fileList.appendChild(item);
    });

    if (repoData.files.length > 0) showFileInModal(repoData.files[0]);
    window.switchTab('readme', document.querySelector('.modal-tab'));
    document.getElementById('repo-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.showFileInModal = function(file) {
    currentFileContent = file.content;
    document.getElementById('viewer-filename').textContent = file.name;
    const viewer = document.getElementById('viewer-content');
    viewer.innerHTML = `<code>${escapeHtml(file.content || 'No content')}</code>`;
    setTimeout(() => {
        viewer.querySelectorAll('code').forEach(block => {
            hljs.highlightElement(block);
        });
    }, 10);
};

  window.copyCurrentFile = function() {
    if (!currentFileContent) return;
    navigator.clipboard.writeText(currentFileContent);
    const btn  = document.querySelector('.copy-btn');
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  };

  window.closeModal = function() {
    document.getElementById('repo-modal').classList.remove('open');
    document.body.style.overflow = '';
  };

  window.switchTab = function(name, btn) {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + name).classList.add('active');
  };

  document.getElementById('repo-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('repo-modal')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}