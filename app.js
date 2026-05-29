const STORE_KEY = 'checklist_items';

let items = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
let showCompleted = false;

const list = document.getElementById('itemList');
const form = document.getElementById('addForm');
const textarea = document.getElementById('newItem');
const toggle = document.getElementById('showCompleted');

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(items));
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function render() {
  const visible = showCompleted ? items : items.filter(i => !i.done);

  list.innerHTML = '';

  if (visible.length === 0) {
    const msg = items.length === 0
      ? 'No items yet.<br>Add one above.'
      : 'Nothing pending.<br>Toggle "Show done" to see completed items.';
    list.innerHTML = `<p class="empty">${msg}</p>`;
    return;
  }

  visible.forEach(item => {
    const li = document.createElement('li');
    li.className = `item${item.done ? ' done' : ''}`;
    li.innerHTML = `
      <input type="checkbox" class="item-check" ${item.done ? 'checked' : ''} data-id="${item.id}" aria-label="Mark complete">
      <span class="item-text">${escapeHtml(item.text)}</span>
      <button class="item-delete" data-id="${item.id}" aria-label="Delete item">&times;</button>
    `;
    list.appendChild(li);
  });
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const text = textarea.value.trim();
  if (!text) return;
  items.unshift({ id: Date.now().toString(), text, done: false });
  save();
  render();
  textarea.value = '';
  textarea.focus();
});

// Tap checkbox to toggle done
list.addEventListener('change', e => {
  if (!e.target.classList.contains('item-check')) return;
  const item = items.find(i => i.id === e.target.dataset.id);
  if (item) {
    item.done = e.target.checked;
    save();
    render();
  }
});

// Tap × to delete
list.addEventListener('click', e => {
  if (!e.target.classList.contains('item-delete')) return;
  items = items.filter(i => i.id !== e.target.dataset.id);
  save();
  render();
});

toggle.addEventListener('change', () => {
  showCompleted = toggle.checked;
  render();
});

// Enter submits, Shift+Enter inserts newline
textarea.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.dispatchEvent(new Event('submit'));
  }
});

render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
