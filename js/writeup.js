// writeup.js - Logic for writeup.html

const urlParams        = new URLSearchParams(window.location.search);
const id               = urlParams.get('id');
const writeupContainer = document.getElementById('writeup-container');
const sectionWriteups  = document.getElementById('section-writeups');

// ── BUILD TOC ON LEFT SIDE ──
function buildTOC(pageTitle, contentSel, backHref) {
  const content = document.querySelector(contentSel);
  if (!content) return;

  const headings = Array.from(content.querySelectorAll('h2,h3'));
  const sidebar = document.getElementById('toc-sidebar');
  if (!sidebar || headings.length === 0) return;

  headings.forEach((h, i) => { if (!h.id) h.id = 'toc-' + i; });

  let html = `
    <div class="toc-header">
      <span class="toc-icon">≡</span>
      <span class="toc-title-label">On This Page</span>
    </div>
    <ul class="toc-list">`;

  headings.forEach(h => {
    const level = parseInt(h.tagName[1]);
    const indent = level === 2 ? '' : 'toc-l3';
    const text = h.textContent.replace(/^[#/]+ */, '').trim();
    html += `<li class="toc-item ${indent}">
      <a href="#${h.id}" class="toc-link">${text}</a>
    </li>`;
  });

  html += `</ul>`;
  sidebar.innerHTML = html;
  sidebar.style.display = 'block';

  const links = sidebar.querySelectorAll('.toc-link');
  const listEl = sidebar.querySelector('.toc-list');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const active = sidebar.querySelector(`.toc-link[href="#${e.target.id}"]`);
        if (active) {
          active.classList.add('active');
          if (listEl) {
            const itemTop = active.parentElement.offsetTop;
            const listHeight = listEl.clientHeight;
            listEl.scrollTo({ top: itemTop - listHeight / 2, behavior: 'smooth' });
          }
        }
      }
    });
  }, { rootMargin: '-8% 0px -75% 0px' });

  headings.forEach(h => observer.observe(h));
}

// ── ORBIT CIRCLE ──
function initOrbit() {
  const img    = document.getElementById('wu-orbit-img');
  const stats  = document.getElementById('wu-stats-row');
  const circle = document.querySelector('.wu-orbit-circle');

  if (!img || !WRITEUPS) return;

  // Stats
  if (stats) {
    const total  = WRITEUPS.length;
    const pwned  = WRITEUPS.filter(w => !w.locked).length;
    const active = WRITEUPS.filter(w =>  w.locked).length;
    const easy   = WRITEUPS.filter(w => (w.difficulty||'').toLowerCase() === 'easy').length;
    const medium = WRITEUPS.filter(w => (w.difficulty||'').toLowerCase() === 'medium').length;
    const hard   = WRITEUPS.filter(w => (w.difficulty||'').toLowerCase() === 'hard').length;
    const insane = WRITEUPS.filter(w => (w.difficulty||'').toLowerCase() === 'insane').length;

    stats.innerHTML = [
      { label:'TOTAL',  val: total,  color:'var(--neon-cyan)'   },
      { label:'PWNED',  val: pwned,  color:'var(--neon-green)'  },
      { label:'ACTIVE', val: active, color:'var(--neon-pink)'   },
      { label:'EASY',   val: easy,   color:'var(--neon-green)'  },
      { label:'MEDIUM', val: medium, color:'#ffa500'             },
      { label:'HARD',   val: hard,   color:'var(--neon-pink)'   },
      { label:'INSANE', val: insane, color:'var(--neon-purple)' },
    ].map(s => `
      <div class="wu-orbit-stat">
        <span class="wu-orbit-stat-val" style="color:${s.color}">${s.val}</span>
        <span class="wu-orbit-stat-label">${s.label}</span>
      </div>`).join('');
  }

  // Rotate images
  const images = WRITEUPS.map(w => ({ src: w.image, id: w.id, locked: w.locked }));
  if (images.length === 0) return;

  let cur = 0;
  function rotate() {
    const next = (cur + 1) % images.length;
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = images[next].src;
      img.style.opacity = '1';
      if (circle) {
        circle.dataset.id     = images[next].id;
        circle.dataset.locked = images[next].locked ? '1' : '';
      }
      cur = next;
    }, 400);
  }

  img.src = images[0].src;
  if (circle) {
    circle.dataset.id     = images[0].id;
    circle.dataset.locked = images[0].locked ? '1' : '';
    circle.addEventListener('click', () => {
      const wid    = circle.dataset.id;
      const locked = circle.dataset.locked === '1';
      if (wid && !locked) window.location.href = `writeup.html?id=${wid}`;
    });
  }
  setInterval(rotate, 3500);
}

// ── INDIVIDUAL WRITEUP ──
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

  } else if (meta.locked) {
    document.title = '🔒 ' + meta.title + ' - H4ckL0g Writeup';
    writeupContainer.innerHTML = `
      <div class="post-header">
        <a href="writeup.html" class="back-link">← Back to writeups</a>
        <span class="post-tag ${meta.category}">${meta.category.toUpperCase()}</span>
        <div class="post-meta">
          <span>📅 ${meta.date}</span>
          <span>🏷️ ${meta.platform || meta.category}</span>
          <span>⭐ ${meta.difficulty || 'Medium'}</span>
          ${meta.os ? `<span class="os-badge os-${meta.os.toLowerCase()}">${meta.os}</span>` : ''}
        </div>
      </div>
      <div class="post-cover" style="position:relative">
        <img src="${meta.image}" alt="${meta.title}" style="filter:blur(4px) brightness(.4)"/>
        <div class="locked-overlay">
          <div class="locked-box">
            <div class="locked-icon">🔒</div>
            <h3>Protected Content</h3>
            <p>This machine is currently <strong>active</strong> on HackTheBox.<br>
               The writeup will be published once it retires.</p>
            <a href="writeup.html" class="btn-back-locked">← Back to writeups</a>
          </div>
        </div>
      </div>`;

  } else {
    document.title = '💀 ' + meta.title + ' - H4ckL0g Writeup';
    fetch(`writeups/${meta.category}/${meta.id}.md`)
      .then(res => { if (!res.ok) throw new Error('Not found'); return res.text(); })
      .then(md => {
        writeupContainer.innerHTML = `
          <div class="post-header">
            <a href="writeup.html" class="back-link">← Back to writeups</a>
            <div class="post-hero-row">
              <div class="post-hero-img-wrap">
                <img src="${meta.image}" alt="${meta.title}" class="post-hero-circle"/>
              </div>
              <div class="post-hero-info">
                <span class="post-tag ${meta.category}">${meta.category.toUpperCase()}</span>
                <h1 class="post-title">${meta.title}</h1>
                <div class="post-meta">
                  <span>📅 ${meta.date}</span>
                  <span>🏷️ ${meta.platform || meta.category}</span>
                  <span>⭐ ${meta.difficulty || 'Medium'}</span>
                  ${meta.os ? `<span class="os-badge os-${meta.os.toLowerCase()}">${meta.os}</span>` : ''}
                  <span>✍️ ${meta.author || 'H4ckL0g'}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="post-content" id="writeup-body">${renderMarkdown(md)}</div>`;

        setTimeout(() => {
          document.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
          buildTOC(meta.title, '#writeup-body', 'writeup.html');
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
  // ── LIST VIEW ──
  if (writeupContainer) writeupContainer.style.display = 'none';
  if (sectionWriteups)  sectionWriteups.style.display  = 'block';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrbit);
  } else {
    initOrbit();
  }

  const platformSelect   = document.getElementById('wu-platform-select');
  const statusSelect     = document.getElementById('wu-status-select');
  const writeupsList     = document.getElementById('writeups-list');
  const writeupCount     = document.getElementById('writeup-count');
  const osSelect         = document.getElementById('wu-os-select');
  const diffSelect       = document.getElementById('wu-diff-select');
  const tagsDropdown     = document.getElementById('wu-tags-dropdown');
  const tagsToggle       = document.getElementById('wu-tags-toggle');
  const tagsToggleLabel  = document.getElementById('wu-tags-toggle-label');
  const tagsPanel        = document.getElementById('wu-tags-panel');

  const currentFilters = { platform: 'all', status: 'all', os: 'all', difficulty: 'all', tags: new Set() };

  // Platform dropdown
  if (platformSelect && WRITEUPS) {
    const categories = ['all', ...new Set(WRITEUPS.map(w => w.category))];
    platformSelect.innerHTML = categories.map(cat =>
      `<option value="${cat}">${cat === 'all' ? 'All Platforms' : cat.toUpperCase()}</option>`).join('');
  }

  // Status dropdown (locked = active HTB, unpublished / no locked = pwned, now published)
  if (statusSelect) {
    statusSelect.innerHTML = `
      <option value="all">All Status</option>
      <option value="pwned">Pwned</option>
      <option value="active">Active</option>`;
  }

  // OS dropdown
  if (osSelect && WRITEUPS) {
    const osList = ['all', ...new Set(WRITEUPS.map(w => (w.os || '').trim()).filter(Boolean))];
    osSelect.innerHTML = osList.map(o =>
      `<option value="${o}">${o === 'all' ? 'All OS' : o}</option>`).join('');
  }

  // Difficulty dropdown
  if (diffSelect && WRITEUPS) {
    const diffList = ['all', ...new Set(WRITEUPS.map(w => (w.difficulty || '').trim()).filter(Boolean))];
    diffSelect.innerHTML = diffList.map(d =>
      `<option value="${d}">${d === 'all' ? 'All Difficulty' : d}</option>`).join('');
  }

  // Tags dropdown (multi-select)
  if (tagsPanel && WRITEUPS) {
    const allTags = [...new Set(WRITEUPS.flatMap(w => w.tags || []))].sort();
    if (allTags.length === 0) {
      if (tagsDropdown) tagsDropdown.style.display = 'none';
    } else {
      tagsPanel.innerHTML = allTags.map(tag => `
        <label class="wu-tag-option">
          <input type="checkbox" value="${tag}">
          <span>${tag}</span>
        </label>`).join('');
    }
  }

  function updateTagsLabel() {
    if (!tagsToggleLabel) return;
    const n = currentFilters.tags.size;
    tagsToggleLabel.textContent = n === 0 ? 'Tags' : `Tags (${n})`;
  }

  function buildCard(writeup) {
    const card = document.createElement('div');
    card.className = 'writeup-card';

    const osBadge = writeup.os
      ? `<span class="os-badge os-${writeup.os.toLowerCase()}">${writeup.os}</span>` : '';

    card.innerHTML = `
      <div class="wc-img-wrap">
        <img src="${writeup.image}" alt="${writeup.title}" loading="lazy"
             onerror="this.src='https://placehold.co/80x80/0d1117/00e0ff?text=HTB'"/>
        ${writeup.locked ? '<div class="wc-img-lock">🔒</div>' : ''}
      </div>
      <div class="wc-body">
        <div class="wc-meta-top">
          <span class="repo-badge ${writeup.category}">${writeup.category.toUpperCase()}</span>
          ${osBadge}
          <span class="wc-diff diff-${(writeup.difficulty||'medium').toLowerCase()}">
            ⭐ ${writeup.difficulty || 'Medium'}
          </span>
        </div>
        <div class="wc-title">${writeup.title}</div>
        <div class="wc-excerpt">${writeup.excerpt.substring(0, 130)}…</div>
        <div class="wc-footer">
          <span class="wc-date">📅 ${writeup.date}</span>
          <span class="wc-arrow">${writeup.locked ? '🔒' : '→'}</span>
        </div>
      </div>`;

    card.addEventListener('click', () => {
      if (writeup.locked) showLockedModal(writeup);
      else window.location.href = `writeup.html?id=${writeup.id}`;
    });
    return card;
  }

  function passesFilters(w) {
    if (currentFilters.platform   !== 'all' && w.category !== currentFilters.platform)   return false;
    if (currentFilters.status !== 'all') {
      const isLocked = !!w.locked;
      if (currentFilters.status === 'active' && !isLocked) return false;
      if (currentFilters.status === 'pwned'  &&  isLocked) return false;
    }
    if (currentFilters.os         !== 'all' && (w.os || '') !== currentFilters.os)       return false;
    if (currentFilters.difficulty !== 'all' && (w.difficulty || '') !== currentFilters.difficulty) return false;
    if (currentFilters.tags.size > 0) {
      const wTags  = w.tags || [];
      const hasAny = [...currentFilters.tags].some(t => wTags.includes(t));
      if (!hasAny) return false;
    }
    return true;
  }

  function renderWriteupsList() {
    const filtered = WRITEUPS.filter(passesFilters);
    if (writeupCount) writeupCount.textContent = `(${filtered.length})`;
    if (writeupsList) writeupsList.innerHTML = '';
    filtered.forEach(w => writeupsList && writeupsList.appendChild(buildCard(w)));
  }

  if (platformSelect) {
    platformSelect.addEventListener('change', () => {
      currentFilters.platform = platformSelect.value;
      renderWriteupsList();
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', () => {
      currentFilters.status = statusSelect.value;
      renderWriteupsList();
    });
  }
  
  if (osSelect) {
    osSelect.addEventListener('change', () => {
      currentFilters.os = osSelect.value;
      renderWriteupsList();
    });
  }

  if (diffSelect) {
    diffSelect.addEventListener('change', () => {
      currentFilters.difficulty = diffSelect.value;
      renderWriteupsList();
    });
  }

  if (tagsPanel) {
    tagsPanel.addEventListener('change', e => {
      const cb = e.target.closest('input[type="checkbox"]');
      if (!cb) return;
      if (cb.checked) currentFilters.tags.add(cb.value);
      else currentFilters.tags.delete(cb.value);
      updateTagsLabel();
      renderWriteupsList();
    });
  }

  if (tagsToggle) {
    tagsToggle.addEventListener('click', e => {
      e.stopPropagation();
      tagsDropdown.classList.toggle('open');
    });
  }

  document.addEventListener('click', e => {
    if (tagsDropdown && !tagsDropdown.contains(e.target)) {
      tagsDropdown.classList.remove('open');
    }
  });

  renderWriteupsList();
}

// ── LOCKED MODAL ──
function showLockedModal(meta) {
  document.getElementById('locked-modal')?.remove();
  const modal = document.createElement('div');
  modal.id        = 'locked-modal';
  modal.className = 'locked-modal-backdrop';
  modal.innerHTML = `
    <div class="locked-modal-box">
      <div class="locked-modal-img">
        <img src="${meta.image}" alt="${meta.title}"/>
        <div class="locked-modal-img-overlay"></div>
        <span class="locked-modal-lock">🔒</span>
      </div>
      <h3 class="locked-modal-title">${meta.title}</h3>
      <p class="locked-modal-sub">
        This machine is <span style="color:#ff4d6d">active</span> on HackTheBox.<br>
        The report will be published when it retires.
      </p>
      <div class="locked-modal-badges">
        <span class="repo-badge ${meta.category}">${meta.category.toUpperCase()}</span>
        ${meta.os ? `<span class="os-badge os-${meta.os.toLowerCase()}">${meta.os}</span>` : ''}
        <span class="wc-diff diff-${(meta.difficulty||'medium').toLowerCase()}">⭐ ${meta.difficulty||'Medium'}</span>
      </div>
      <button class="locked-modal-close" id="locked-modal-close-btn">✕ Close</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.id === 'locked-modal-close-btn') modal.remove();
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); }
  });
}