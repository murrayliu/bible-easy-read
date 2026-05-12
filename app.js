// ── State ──────────────────────────────────────────────────────────────────────
const state = {
  difficulty: null,
  themes: [],
  filtered: [],
  activeVerseId: null,
};

const PREVIEW_LIMIT = 24; // max preview cards shown

// ── Data helpers ───────────────────────────────────────────────────────────────
function filterVerses() {
  return BIBLE_VERSES.filter(v => {
    const diffOk  = !state.difficulty || v.difficulty === state.difficulty;
    const themeOk = state.themes.length === 0 || v.themes.some(t => state.themes.includes(t));
    return diffOk && themeOk;
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── HTML builders ──────────────────────────────────────────────────────────────
function badge(cls, text) {
  return `<span class="badge ${cls}">${text}</span>`;
}
function diffBadge(d) {
  return badge(`badge-${d}`, DIFFICULTIES[d]?.label ?? d);
}
function themeBadges(themes) {
  return themes.map(t => badge('badge-theme', (THEMES[t]?.icon ?? '') + ' ' + (THEMES[t]?.label ?? t))).join('');
}

// ── Render: featured card ──────────────────────────────────────────────────────
function renderFeatured(verse, pool) {
  const area = document.getElementById('results-area');
  const idx  = pool.findIndex(v => v.id === verse.id);
  const prev = pool.length > 1 ? pool[(idx - 1 + pool.length) % pool.length] : null;
  const next = pool.length > 1 ? pool[(idx + 1) % pool.length]               : null;
  const previewPool = pool.filter(v => v.id !== verse.id).slice(0, PREVIEW_LIMIT);

  area.innerHTML = `
    <div class="featured-card" id="featured-card">
      <div class="verse-meta">
        <span class="verse-ref">✦ ${verse.ref}</span>
        ${diffBadge(verse.difficulty)}
        ${themeBadges(verse.themes)}
      </div>
      <div class="verse-text-wrap">
        <span class="quote-mark" aria-hidden="true">❝</span>
        <div class="verse-text" id="verse-body">${verse.text ?? ''}</div>
      </div>
      <div class="verse-actions">
        <div class="action-group">
          <button class="btn-sm" id="bg-btn" type="button" data-id="${verse.id}" aria-expanded="false">
            📖 經文資訊
          </button>
          <button class="btn-sm" id="copy-btn" type="button">📋 複製</button>
        </div>
        <div class="nav-btns">
          ${prev ? `<button class="btn-nav" id="prev-btn" data-id="${prev.id}" type="button">← 上一節</button>` : ''}
          ${next ? `<button class="btn-nav" id="next-btn" data-id="${next.id}" type="button">下一節 →</button>` : ''}
        </div>
      </div>
    </div>
    ${pool.length > 1 ? `
      <p class="results-label">共找到 <strong>${pool.length}</strong> 節相符經文${pool.length > PREVIEW_LIMIT ? `，以下顯示前 ${PREVIEW_LIMIT} 節` : ''}</p>
      <div class="preview-grid" id="preview-grid">
        ${previewPool.map(v => `
          <div class="preview-card" data-id="${v.id}" role="button" tabindex="0" aria-label="選擇 ${v.ref}">
            <div class="preview-ref">✦ ${v.ref}</div>
            <div class="preview-text">${v.text.slice(0, 55)}${v.text.length > 55 ? '…' : ''}</div>
            <div class="preview-badges">
              ${diffBadge(v.difficulty)}
              ${v.themes.slice(0, 2).map(t => badge('badge-theme', (THEMES[t]?.icon ?? '') + ' ' + (THEMES[t]?.label ?? t))).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  state.activeVerseId = verse.id;

  // Copy button
  document.getElementById('copy-btn')?.addEventListener('click', () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(verse.text + '\n—— ' + verse.ref).then(() => {
      const btn = document.getElementById('copy-btn');
      if (btn) {
        btn.textContent = '✓ 已複製';
        setTimeout(() => { btn.innerHTML = '📋 複製'; }, 2000);
      }
    });
  });

  // Events
  document.getElementById('bg-btn')?.addEventListener('click', () => openDrawer(verse));
  document.getElementById('prev-btn')?.addEventListener('click', () => { if (prev) switchVerse(prev, pool); });
  document.getElementById('next-btn')?.addEventListener('click', () => { if (next) switchVerse(next, pool); });

  document.querySelectorAll('.preview-card').forEach(card => {
    const handler = () => {
      const v = BIBLE_VERSES.find(x => x.id === card.dataset.id);
      if (v) switchVerse(v, pool);
    };
    card.addEventListener('click', handler);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
  });
}

function switchVerse(verse, pool) {
  const card = document.getElementById('featured-card');
  if (card) {
    card.style.transition = 'opacity .18s, transform .18s';
    card.style.opacity = '0';
    card.style.transform = 'translateY(-8px)';
    setTimeout(() => renderFeatured(verse, pool), 200);
  } else {
    renderFeatured(verse, pool);
  }
}

// ── Render: states ─────────────────────────────────────────────────────────────
function renderWelcome() {
  document.getElementById('results-area').innerHTML = `
    <div class="welcome-state">
      <div class="state-icon">✦</div>
      <div class="state-title">歡迎使用聖經金句輕鬆讀</div>
      <div class="state-desc">從 ${BIBLE_VERSES.length.toLocaleString()} 節經文中，選擇難度與主題開始探索<br>或直接點「隨機推薦」</div>
    </div>
  `;
}

function renderEmpty() {
  document.getElementById('results-area').innerHTML = `
    <div class="empty-state">
      <div class="state-icon">🔍</div>
      <div class="state-title">找不到符合的金句</div>
      <div class="state-desc">試試看選擇更多主題，或放寬難度限制</div>
      <button class="btn btn-secondary" id="empty-random-btn" type="button">✦ 隨機推薦</button>
    </div>
  `;
  document.getElementById('empty-random-btn')?.addEventListener('click', handleRandom);
}

// ── Drawer ────────────────────────────────────────────────────────────────────
function renderDrawer(verse) {
  const themeList = verse.themes.map(t => `<span class="badge badge-theme">${THEMES[t]?.icon ?? ''} ${THEMES[t]?.label ?? t}</span>`).join(' ');
  const diffLabel = DIFFICULTIES[verse.difficulty]?.label ?? verse.difficulty;
  const diffDesc  = DIFFICULTIES[verse.difficulty]?.desc ?? '';

  document.getElementById('drawer-body').innerHTML = `
    <div class="drawer-verse-ref">✦ ${verse.ref}</div>
    <div class="bg-section">
      <div class="bg-label">📚 書卷</div>
      <div class="bg-content">${verse.ref.split(' ').slice(0, -1).join(' ')}</div>
    </div>
    <div class="bg-section">
      <div class="bg-label">🎯 難度</div>
      <div class="bg-content">${diffLabel}　<span style="color:var(--text-muted);font-size:.85em">${diffDesc}</span></div>
    </div>
    <div class="bg-section">
      <div class="bg-label">🏷️ 主題</div>
      <div class="bg-content" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">${themeList}</div>
    </div>
    <div class="bg-section">
      <div class="bg-label">📖 全文</div>
      <div class="bg-content" style="font-size:1rem;line-height:2;border-left:3px solid var(--accent-mid);padding-left:12px;margin-top:4px">${verse.text}</div>
    </div>
  `;
}

function openDrawer(verse) {
  renderDrawer(verse);
  document.getElementById('info-drawer').classList.add('open');
  document.getElementById('info-drawer').setAttribute('aria-hidden', 'false');
  document.getElementById('backdrop').classList.add('visible');
  document.getElementById('bg-btn')?.setAttribute('aria-expanded', 'true');
  document.getElementById('drawer-close-btn')?.focus();
  document.addEventListener('keydown', onEsc);
}

function closeDrawer() {
  document.getElementById('info-drawer').classList.remove('open');
  document.getElementById('info-drawer').setAttribute('aria-hidden', 'true');
  document.getElementById('backdrop').classList.remove('visible');
  document.getElementById('bg-btn')?.setAttribute('aria-expanded', 'false');
  document.removeEventListener('keydown', onEsc);
  document.getElementById('bg-btn')?.focus();
}

function onEsc(e) { if (e.key === 'Escape') closeDrawer(); }

// ── Filter UI ─────────────────────────────────────────────────────────────────
function updateCountBadge() {
  const n = filterVerses().length;
  const el = document.getElementById('count-badge');
  if (el) el.textContent = n > 0 ? n.toLocaleString() : '';
}

function renderDifficultyOptions() {
  const container = document.getElementById('difficulty-options');
  container.innerHTML = Object.entries(DIFFICULTIES).map(([key, val]) => `
    <div class="difficulty-card${state.difficulty === key ? ' active' : ''}" data-diff="${key}" role="button" tabindex="0" aria-pressed="${state.difficulty === key}">
      <span class="difficulty-dot"></span>
      <span class="difficulty-info">
        <span class="difficulty-label">${val.label}</span>
        <span class="difficulty-desc">${val.desc}</span>
      </span>
    </div>
  `).join('');

  container.querySelectorAll('.difficulty-card').forEach(card => {
    const toggle = () => {
      const key = card.dataset.diff;
      container.querySelectorAll('.difficulty-card').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      if (state.difficulty === key) {
        state.difficulty = null;
      } else {
        state.difficulty = key;
        card.classList.add('active');
        card.setAttribute('aria-pressed', 'true');
      }
      updateCountBadge();
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
}

function renderThemeGrid() {
  const grid = document.getElementById('theme-grid');
  grid.innerHTML = Object.entries(THEMES).map(([key, val]) => `
    <button class="theme-btn${state.themes.includes(key) ? ' active' : ''}"
            data-theme="${key}" type="button" aria-pressed="${state.themes.includes(key)}">
      <span class="theme-icon">${val.icon}</span>
      <span>${val.label}</span>
    </button>
  `).join('');

  grid.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.theme;
      const idx = state.themes.indexOf(key);
      if (idx >= 0) {
        state.themes.splice(idx, 1);
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      } else {
        state.themes.push(key);
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      }
      updateCountBadge();
    });
  });
}

// ── Handlers ──────────────────────────────────────────────────────────────────
function handleSearch() {
  const pool = shuffle(filterVerses());
  state.filtered = pool;
  if (pool.length === 0) renderEmpty();
  else renderFeatured(pool[0], pool);
}

function handleRandom() {
  const pool = shuffle(BIBLE_VERSES);
  renderFeatured(pool[0], pool);
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  renderDifficultyOptions();
  renderThemeGrid();
  renderWelcome();
  updateCountBadge();

  document.getElementById('search-btn').addEventListener('click', handleSearch);
  document.getElementById('random-btn').addEventListener('click', handleRandom);
  document.getElementById('drawer-close-btn').addEventListener('click', closeDrawer);
  document.getElementById('backdrop').addEventListener('click', closeDrawer);
}

document.addEventListener('DOMContentLoaded', init);
