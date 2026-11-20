// Leonida Trophy Guide — GTA VI (PS5). Static, offline, no network at runtime.
// Progress, notes and the spoiler setting live in localStorage only.
const KEY = 'gta6-trophy-guide-v1';
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const GRADE_LETTER = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };
const KIND_LABEL = {
  story: 'Story', side: 'Side missions', collectible: 'Collectibles',
  activity: 'Activities', combat: 'Combat', money: 'Money & robberies',
  world: 'World & oddities', completion: 'Platinum & 100%',
};

let data = null;
let state = { earned: [], notes: {}, spoiler: false };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  if (saved && typeof saved === 'object') state = { ...state, ...saved };
} catch { /* corrupted save: start fresh */ }
const earned = new Set(state.earned.filter((n) => Number.isInteger(n)));
const notes = state.notes && typeof state.notes === 'object' ? state.notes : {};
const openDetails = new Set();

function save() {
  state.earned = [...earned].sort((a, b) => a - b);
  state.notes = notes;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
}

const $ = (id) => document.getElementById(id);
const els = {
  list: $('list'), search: $('search'), kind: $('kind'), grade: $('grade'),
  status: $('status'), sort: $('sort'), missableOnly: $('missableOnly'),
  spoiler: $('spoiler'), spoilerNote: $('spoilerNote'),
  earnedCount: $('earnedCount'), progressFill: $('progressFill'),
  progressText: $('progressText'), gradeCounts: $('gradeCounts'),
  resultCount: $('resultCount'), roadmap: $('roadmap'),
  missableList: $('missableList'), unconfirmedList: $('unconfirmedList'),
  sourcesBody: $('sourcesBody'),
};
els.spoiler.checked = state.spoiler;

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function trophyCard(t) {
  const isEarned = earned.has(t.id);
  const hidden = state.spoiler && t.kind === 'story' && !isEarned;
  const card = document.createElement('article');
  card.className = 'card' + (isEarned ? ' earned' : '') + (hidden ? ' hidden-trophy' : '');
  card.dataset.id = t.id;

  const head = document.createElement('div');
  head.className = 'card-head';
  const badge = document.createElement('span');
  badge.className = 'grade-badge ' + t.grade;
  badge.textContent = hidden ? '?' : GRADE_LETTER[t.grade];
  badge.title = t.grade;
  const titleBox = document.createElement('div');
  titleBox.className = 'card-title';
  const h = document.createElement('h3');
  h.textContent = hidden ? 'Hidden story trophy' : t.name;
  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = hidden ? 'Earn it to reveal its name and description.' : t.description;
  titleBox.append(h, desc);
  const earn = document.createElement('label');
  earn.className = 'earn';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned;
  box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.id); else earned.delete(t.id);
    save(); renderAll();
  });
  earn.append(box, document.createTextNode(isEarned ? 'Earned' : 'Earn'));
  head.append(badge, titleBox, earn);
  card.append(head);

  const tags = document.createElement('div');
  tags.className = 'tags';
  const mk = (text, cls) => {
    const s = document.createElement('span');
    s.className = 'tag' + (cls ? ' ' + cls : '');
    s.textContent = text;
    return s;
  };
  tags.append(mk(t.grade, 'grade-' + t.grade), mk(KIND_LABEL[t.kind] || t.kind));
  if (t.target !== null && t.target !== undefined) tags.append(mk('Target: ' + t.target, 'target'));
  if (t.missable) tags.append(mk('Missable', 'missable'));
  if (t.unconfirmed) tags.append(mk('Method unconfirmed', 'unconfirmed'));
  card.append(tags);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guide-toggle';
  const isOpen = openDetails.has(t.id);
  toggle.textContent = isOpen ? 'Hide guide ▲' : (hidden ? 'Guide hidden until earned' : 'Read the guide ▼');
  toggle.disabled = hidden;
  toggle.addEventListener('click', () => {
    if (openDetails.has(t.id)) openDetails.delete(t.id); else openDetails.add(t.id);
    renderList();
  });
  card.append(toggle);

  if (isOpen && !hidden) {
    const detail = document.createElement('div');
    detail.className = 'detail';
    if (t.missable && t.missable_reason) {
      const m = document.createElement('p');
      m.className = 'missable-note';
      m.textContent = '⚠ Missable: ' + t.missable_reason;
      detail.append(m);
    }
    if (t.unconfirmed) {
      const u = document.createElement('p');
      u.className = 'unconfirmed-note';
      u.textContent = 'Method not yet confirmed: no cited guide has confirmed how this unlocks. The guide below works only from the official description — check the linked sources for updates.';
      detail.append(u);
    }
    const guideH = document.createElement('h4');
    guideH.textContent = 'How to earn it';
    const guideP = document.createElement('p');
    guideP.textContent = t.guide;
    detail.append(guideH, guideP);
    if (t.steps && t.steps.length) {
      const stepsH = document.createElement('h4');
      stepsH.textContent = 'Steps';
      const ol = document.createElement('ol');
      for (const s of t.steps) {
        const li = document.createElement('li');
        li.textContent = s;
        ol.append(li);
      }
      detail.append(stepsH, ol);
    }
    if (t.sources && t.sources.length) {
      const srcH = document.createElement('h4');
      srcH.textContent = 'Sources';
      const ul = document.createElement('ul');
      ul.className = 'sources';
      for (const s of t.sources) {
        const li = document.createElement('li');
        if (s.url) {
          const a = document.createElement('a');
          a.href = s.url;
          a.textContent = s.name;
          a.target = '_blank';
          a.rel = 'noopener';
          li.append(a);
        } else {
          li.textContent = s.name;
        }
        ul.append(li);
      }
      detail.append(srcH, ul);
    }
    const noteLabel = document.createElement('label');
    noteLabel.className = 'note-label';
    noteLabel.textContent = 'My note (saved in this browser)';
    const ta = document.createElement('textarea');
    ta.value = notes[t.id] || '';
    ta.placeholder = 'e.g. “Found 6 of 18 meditation spots”';
    ta.addEventListener('input', () => { notes[t.id] = ta.value; save(); });
    noteLabel.append(ta);
    detail.append(noteLabel);
    card.append(detail);
  }
  return card;
}

function filteredTrophies() {
  const q = els.search.value.trim().toLowerCase();
  let list = data.trophies.filter((t) => {
    if (els.kind.value === 'online') return false;
    if (els.kind.value !== 'all' && t.kind !== els.kind.value) return false;
    if (els.grade.value !== 'all' && t.grade !== els.grade.value) return false;
    if (els.status.value === 'earned' && !earned.has(t.id)) return false;
    if (els.status.value === 'unearned' && earned.has(t.id)) return false;
    if (els.missableOnly.checked && !t.missable) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
    return true;
  });
  if (els.sort.value === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  else if (els.sort.value === 'grade') list = [...list].sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
  else if (els.sort.value === 'missable') list = [...list].sort((a, b) => (b.missable - a.missable) || a.id - b.id);
  else list = [...list].sort((a, b) => a.id - b.id);
  return list;
}

function renderList() {
  els.list.replaceChildren();
  if (els.kind.value === 'online') {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = '<strong>No online trophies.</strong><br>All 55 trophies are earned offline in single-player — KeenGamer’s guide confirms there is nothing to do online for the platinum.';
    els.list.append(empty);
    els.resultCount.textContent = '0 online trophies — all 55 are offline';
    return;
  }
  const list = filteredTrophies();
  els.resultCount.textContent = list.length + ' of 55 trophies shown · ' + earned.size + ' earned';
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No trophies match these filters. Clear the search or widen the filters.';
    els.list.append(empty);
    return;
  }
  for (const t of list) els.list.append(trophyCard(t));
}

function renderProgress() {
  const total = data.trophies.length;
  const pct = Math.round((earned.size / total) * 100);
  els.earnedCount.textContent = earned.size;
  els.progressFill.style.width = pct + '%';
  els.progressText.textContent = earned.size === total
    ? 'Platinum earned — Leonida Legend!'
    : pct + '% to the platinum · ' + (total - earned.size) + ' to go';
  const counts = {};
  for (const t of data.trophies) counts[t.grade] = (counts[t.grade] || 0) + (earned.has(t.id) ? 1 : 0);
  els.gradeCounts.textContent = 'Platinum ' + (counts.platinum || 0) + '/1 · Gold ' + (counts.gold || 0) + '/2 · Silver ' + (counts.silver || 0) + '/6 · Bronze ' + (counts.bronze || 0) + '/46';
}

function renderRoadmap() {
  els.roadmap.replaceChildren();
  for (const stage of data.roadmap) {
    const li = document.createElement('li');
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = stage.stage;
    const body = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = 'Stage ' + stage.stage + ' — ' + stage.title;
    const p = document.createElement('p');
    p.textContent = stage.text;
    const chips = document.createElement('div');
    chips.className = 'stage-trophies';
    for (const id of stage.trophy_ids) {
      const t = data.trophies.find((x) => x.id === id);
      const s = document.createElement('span');
      if (earned.has(id)) s.className = 'done';
      s.textContent = (earned.has(id) ? '✓ ' : '') + t.name;
      chips.append(s);
    }
    body.append(h, p, chips);
    li.append(num, body);
    els.roadmap.append(li);
  }
}

function renderMissable() {
  els.missableList.replaceChildren();
  for (const t of data.trophies.filter((t) => t.missable)) {
    openDetails.add(t.id);
    els.missableList.append(trophyCard(t));
  }
  els.unconfirmedList.replaceChildren();
  for (const t of data.trophies.filter((t) => t.unconfirmed)) {
    openDetails.add(t.id);
    els.unconfirmedList.append(trophyCard(t));
  }
}

function renderSources() {
  const wrap = document.createElement('div');
  wrap.innerHTML =
    '<p class="lede">The official list is the anchor: names, descriptions and grades are as PlayStation publishes them, as listed by PSNProfiles and Exophase (the two agreed on every name, description and grade). Everything else — counts, locations, menu paths and methods — is taken from the published guides below and named beside the trophy it supports. Guide text is original, written for this entry; sources are cited, never copied.</p>' +
    '<ul class="source-list">' +
    data.sources.map((s) => '<li><strong>' + esc(s.name) + '</strong>' + (s.url ? '<br><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + '</a>' : '') + '</li>').join('') +
    '</ul>' +
    '<h3>What this guide does not claim</h3>' +
    '<p class="lede">Seven trophies have no confirmed method in any cited guide yet (Challenging Tank, In The Beginning…, Capital Offense, Personal Best, Bad Luck, I Guess, The Truth Is Out There, Ten Pin). Their entries say so openly instead of inventing a method. One meditation spot is flagged missable on GameMapa’s word. Counts such as 397 stunts, 18 card sets and 80 challenges are the counts the cited guides list.</p>' +
    '<h3>Accuracy note</h3>' +
    '<p class="lede">Trophy list as of 2026-11-18. The game is new and guides are still being updated — if a linked source corrects a method, this guide’s next update follows the source, and the unconfirmed list shrinks.</p>';
  els.sourcesBody.replaceChildren(wrap);
}

function renderAll() {
  renderProgress();
  renderList();
  renderRoadmap();
  renderMissable();
}

// Tabs
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== 'view-' + tab.dataset.view; });
  });
});

// Filters
for (const el of [els.search, els.kind, els.grade, els.status, els.sort, els.missableOnly]) {
  el.addEventListener('input', renderList);
  el.addEventListener('change', renderList);
}
els.spoiler.addEventListener('change', () => {
  state.spoiler = els.spoiler.checked;
  els.spoilerNote.hidden = !state.spoiler;
  save();
  renderAll();
});
els.spoilerNote.hidden = !state.spoiler;

// Export / import / reset
$('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ game: data.game, exported_at: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b), notes }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    const ids = imported.earned ?? imported;
    if (!Array.isArray(ids)) throw new Error('no earned list');
    earned.clear();
    for (const id of ids) if (Number.isInteger(id) && data.trophies.some((t) => t.id === id)) earned.add(id);
    if (imported.notes && typeof imported.notes === 'object') {
      for (const k of Object.keys(notes)) delete notes[k];
      Object.assign(notes, imported.notes);
    }
    save();
    renderAll();
  } catch {
    alert('That file is not a trophy-progress export from this guide.');
  }
  e.target.value = '';
});
$('resetBtn').addEventListener('click', () => {
  if (confirm('Clear all earned trophies and notes? This cannot be undone.')) {
    earned.clear();
    for (const k of Object.keys(notes)) delete notes[k];
    save();
    renderAll();
  }
});

data = await (await fetch('data/trophies.json')).json();
renderAll();
renderSources();
