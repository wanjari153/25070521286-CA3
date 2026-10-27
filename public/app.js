const token = localStorage.getItem('token');
if (!token) location.href = '/';

const $ = (id) => document.getElementById(id);
let editingId = null;

function logout() {
  localStorage.removeItem('token');
  location.href = '/';
}

// Helper: every request carries the login token
async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error('Session expired');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error');
  return data;
}

// ---------- Load user, stats, tasks ----------
async function loadUser() {
  const user = await api('/api/auth/me');
  $('welcome').textContent = 'Hi, ' + user.name;
}

async function loadStats() {
  const s = await api('/api/tasks/stats');
  $('statTotal').textContent = s.total;
  $('statDone').textContent = s.completed;
  $('statPending').textContent = s.pending;
  $('statOverdue').textContent = s.overdue;
}

async function loadTasks() {
  const params = new URLSearchParams();
  if ($('search').value.trim()) params.set('search', $('search').value.trim());
  if ($('filterStatus').value) params.set('status', $('filterStatus').value);
  if ($('filterPriority').value) params.set('priority', $('filterPriority').value);

  const tasks = await api('/api/tasks?' + params.toString());
  const list = $('taskList');
  list.innerHTML = '';
  $('empty').classList.toggle('hidden', tasks.length > 0);

  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = 'task' + (task.done ? ' done' : '');

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = task.done;
    check.onchange = () => updateTask(task._id, { done: check.checked });

    const info = document.createElement('div');
    info.className = 'info';

    const title = document.createElement('strong');
    title.textContent = task.title;
    info.appendChild(title);

    if (task.description) {
      const desc = document.createElement('p');
      desc.textContent = task.description;
      info.appendChild(desc);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';

    const pri = document.createElement('span');
    pri.className = 'badge ' + task.priority;
    pri.textContent = task.priority;
    meta.appendChild(pri);

    const cat = document.createElement('span');
    cat.className = 'badge category';
    cat.textContent = task.category;
    meta.appendChild(cat);

    if (task.dueDate) {
      const due = document.createElement('span');
      const overdue = !task.done && new Date(task.dueDate) < new Date();
      due.className = 'due' + (overdue ? ' overdue' : '');
      due.textContent = 'Due: ' + new Date(task.dueDate).toLocaleDateString();
      meta.appendChild(due);
    }
    info.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'ghost small';
    editBtn.onclick = () => startEdit(task);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'danger small';
    delBtn.onclick = () => deleteTask(task._id);

    actions.append(editBtn, delBtn);
    li.append(check, info, actions);
    list.appendChild(li);
  });
}

function refresh() {
  loadTasks();
  loadStats();
}

// ---------- Actions ----------
async function updateTask(id, data) {
  await api('/api/tasks/' + id, { method: 'PUT', body: JSON.stringify(data) });
  refresh();
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await api('/api/tasks/' + id, { method: 'DELETE' });
  refresh();
}

function startEdit(task) {
  editingId = task._id;
  $('title').value = task.title;
  $('description').value = task.description || '';
  $('priority').value = task.priority;
  $('category').value = task.category;
  $('dueDate').value = task.dueDate ? task.dueDate.slice(0, 10) : '';
  $('formTitle').textContent = 'Edit task';
  $('saveBtn').textContent = 'Update task';
  $('cancelBtn').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  editingId = null;
  $('taskForm').reset();
  $('formTitle').textContent = 'Add a new task';
  $('saveBtn').textContent = 'Add task';
  $('cancelBtn').classList.add('hidden');
  $('formError').textContent = '';
}

$('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('formError').textContent = '';

  const data = {
    title: $('title').value,
    description: $('description').value,
    priority: $('priority').value,
    category: $('category').value || 'General',
    dueDate: $('dueDate').value,
  };

  try {
    if (editingId) {
      await api('/api/tasks/' + editingId, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await api('/api/tasks', { method: 'POST', body: JSON.stringify(data) });
    }
    resetForm();
    refresh();
  } catch (err) {
    $('formError').textContent = err.message;
  }
});

$('cancelBtn').onclick = resetForm;
$('logoutBtn').onclick = logout;
$('search').addEventListener('input', loadTasks);
$('filterStatus').addEventListener('change', loadTasks);
$('filterPriority').addEventListener('change', loadTasks);

// ---------- Start ----------
loadUser();
refresh();