const STORE_KEY = 'checklist_items';
const THEME_KEY = 'checklist_theme';

let items = JSON.parse(localStorage.getItem(STORE_KEY) || '[]').map(i => ({ children: [], ...i }));
let showCompleted = false;
let addingChildTo = null;

const list = document.getElementById('itemList');
const form = document.getElementById('addForm');
const textarea = document.getElementById('newItem');
const showCompletedToggle = document.getElementById('showCompleted');
const themeBtn = document.getElementById('themeToggle');

// --- Theme ---
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}

themeBtn.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});

applyTheme(localStorage.getItem(THEME_KEY) || 'light');

// --- Persistence ---
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(items));
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function findItem(id) {
  return items.find(i => i.id === id);
}

function findChild(parentId, childId) {
  return findItem(parentId)?.children.find(c => c.id === childId);
}

// --- Edit mode ---
function enterEditMode(li, item) {
  const row = li.querySelector(':scope > .item-row');
  const textSpan = row?.querySelector('.item-text');
  const editBtn = row?.querySelector('.item-edit-btn');
  if (!textSpan || row.querySelector('.item-edit-input')) return;

  const ta = document.createElement('textarea');
  ta.className = 'item-edit-input';
  ta.value = item.text;
  ta.rows = 1;
  textSpan.replaceWith(ta);
  editBtn.style.visibility = 'hidden';
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);

  function commit() {
    const newText = ta.value.trim();
    if (newText) item.text = newText;
    save();
    render();
  }

  ta.addEventListener('blur', commit);
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.removeEventListener('blur', commit); commit(); }
    if (e.key === 'Escape') { ta.removeEventListener('blur', commit); render(); }
  });
}

// --- Sub-item add form ---
function makeSubAddForm(parentId) {
  const li = document.createElement('li');
  li.className = 'sub-add-row';

  const ta = document.createElement('textarea');
  ta.className = 'sub-add-input';
  ta.placeholder = 'Sub-item…';
  ta.rows = 1;

  const addBtn = document.createElement('button');
  addBtn.className = 'sub-add-btn';
  addBtn.textContent = 'Add';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'sub-cancel-btn';
  cancelBtn.textContent = '✕';

  function submit() {
    const text = ta.value.trim();
    if (text) {
      const parent = findItem(parentId);
      if (parent) {
        parent.children.push({ id: Date.now().toString(), text, done: false });
        save();
      }
    }
    addingChildTo = null;
    render();
  }

  addBtn.addEventListener('click', submit);
  cancelBtn.addEventListener('click', () => { addingChildTo = null; render(); });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === 'Escape') { addingChildTo = null; render(); }
  });

  li.append(ta, addBtn, cancelBtn);
  return li;
}

// --- Render ---
function renderChildItem(child, parentId) {
  const li = document.createElement('li');
  li.className = `item sub-item${child.done ? ' done' : ''}`;
  li.dataset.id = child.id;
  li.dataset.parent = parentId;

  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input type="checkbox" class="item-check" ${child.done ? 'checked' : ''} data-id="${child.id}" data-parent="${parentId}" aria-label="Mark complete">
    <span class="item-text">${escapeHtml(child.text)}</span>
    <button class="item-edit-btn" data-id="${child.id}" data-parent="${parentId}" aria-label="Edit">✏</button>
    <button class="item-delete" data-id="${child.id}" data-parent="${parentId}" aria-label="Delete">&times;</button>
  `;
  li.appendChild(row);
  return li;
}

function renderTopItem(item) {
  const li = document.createElement('li');
  li.className = `item${item.done ? ' done' : ''}`;
  li.dataset.id = item.id;

  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input type="checkbox" class="item-check" ${item.done ? 'checked' : ''} data-id="${item.id}" aria-label="Mark complete">
    <span class="item-text">${escapeHtml(item.text)}</span>
    <button class="item-edit-btn" data-id="${item.id}" aria-label="Edit">✏</button>
    <button class="item-add-child-btn" data-id="${item.id}" aria-label="Add sub-item" title="Add sub-item">+</button>
    <button class="item-delete" data-id="${item.id}" aria-label="Delete">&times;</button>
  `;
  li.appendChild(row);

  const visibleChildren = showCompleted ? item.children : item.children.filter(c => !c.done);
  if (visibleChildren.length > 0 || addingChildTo === item.id) {
    const subList = document.createElement('ul');
    subList.className = 'sub-list';
    visibleChildren.forEach(child => subList.appendChild(renderChildItem(child, item.id)));
    if (addingChildTo === item.id) subList.appendChild(makeSubAddForm(item.id));
    li.appendChild(subList);
  }

  return li;
}

function render() {
  const visible = showCompleted ? items : items.filter(i => !i.done);
  list.innerHTML = '';

  if (visible.length === 0) {
    list.innerHTML = `<p class="empty">${items.length === 0 ? 'No items yet.<br>Add one above.' : 'Nothing pending.<br>Toggle "Show done" to see completed items.'}</p>`;
    return;
  }

  visible.forEach(item => list.appendChild(renderTopItem(item)));
}

// --- Events ---
list.addEventListener('change', e => {
  if (!e.target.classList.contains('item-check')) return;
  const { id, parent } = e.target.dataset;
  const target = parent ? findChild(parent, id) : findItem(id);
  if (target) { target.done = e.target.checked; save(); render(); }
});

list.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const { id, parent } = btn.dataset;

  if (btn.classList.contains('item-delete')) {
    if (parent) {
      const p = findItem(parent);
      if (p) p.children = p.children.filter(c => c.id !== id);
    } else {
      items = items.filter(i => i.id !== id);
    }
    save(); render();
    return;
  }

  if (btn.classList.contains('item-edit-btn')) {
    const target = parent ? findChild(parent, id) : findItem(id);
    const li = e.target.closest('li');
    if (target && li) enterEditMode(li, target);
    return;
  }

  if (btn.classList.contains('item-add-child-btn')) {
    addingChildTo = addingChildTo === id ? null : id;
    render();
    list.querySelector('.sub-add-input')?.focus();
    return;
  }
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const text = textarea.value.trim();
  if (!text) return;
  items.unshift({ id: Date.now().toString(), text, done: false, children: [] });
  save(); render();
  textarea.value = '';
  textarea.focus();
});

showCompletedToggle.addEventListener('change', () => {
  showCompleted = showCompletedToggle.checked;
  render();
});

textarea.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.dispatchEvent(new Event('submit')); }
});

render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
