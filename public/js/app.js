// Global utility functions for ClickUp Replica

// ─── Toast Notifications ────────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="ml-2 text-white/80 hover:text-white" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── Task Detail Modal ───────────────────────────────────────────────────────

async function openTaskDetail(taskId) {
  const container = document.getElementById('task-modal-container');
  const content = document.getElementById('task-modal-content');

  try {
    const res = await fetch(`/tasks/${taskId}`, {
      headers: { 'Accept': 'text/html' }
    });

    if (!res.ok) throw new Error('Failed to load task');

    const html = await res.text();
    content.innerHTML = html;

    container.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    attachTaskModalListeners();

  } catch (error) {
    console.error(error);
    showToast('Failed to load task details', 'error');
  }
}

function closeTaskDetail() {
  const container = document.getElementById('task-modal-container');
  container.classList.add('hidden');
  document.body.style.overflow = '';
  stopLiveTimer();
  window.location.reload();
}

// ─── Live Timer ──────────────────────────────────────────────────────────────

let _timerInterval = null;
let _timerSeconds = 0;

function startLiveTimer(initialSeconds) {
  stopLiveTimer();
  _timerSeconds = initialSeconds;
  const display = document.getElementById('timer-display');
  if (!display) return;

  _timerInterval = setInterval(() => {
    _timerSeconds++;
    display.textContent = formatTimerHMS(_timerSeconds);
  }, 1000);
}

function stopLiveTimer() {
  if (_timerInterval) {
    clearInterval(_timerInterval);
    _timerInterval = null;
  }
}

function formatTimerHMS(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Attach all listeners inside the task modal ──────────────────────────────

function attachTaskModalListeners() {
  // Close button
  const closeBtn = document.getElementById('close-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeTaskDetail);
  }

  // Live timer
  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    const isActive = timerDisplay.dataset.active === 'true';
    const initial = parseInt(timerDisplay.dataset.initial || '0', 10);
    if (isActive) {
      startLiveTimer(initial);
    }
  }

  // Timer Toggle button
  const timerBtn = document.getElementById('toggle-timer');
  if (timerBtn) {
    timerBtn.addEventListener('click', async () => {
      const taskId = timerBtn.getAttribute('data-task-id');
      const isActive = timerBtn.getAttribute('data-active') === 'true';

      try {
        const action = isActive ? 'stop' : 'start';
        const res = await fetch(`/api/tasks/${taskId}/time/${action}`, {
          method: 'POST'
        });

        if (res.ok) {
          showToast(`Timer ${action === 'start' ? 'started' : 'stopped'}`, 'success');
          stopLiveTimer();
          openTaskDetail(taskId);
        } else {
          showToast('Failed to toggle timer', 'error');
        }
      } catch (err) {
        showToast('Network error', 'error');
      }
    });
  }

  // Comment Form
  const commentForm = document.getElementById('comment-form');
  if (commentForm) {
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('comment-input');
      const taskId = document.getElementById('comment-task-id').value;

      try {
        const res = await fetch(`/api/tasks/${taskId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: input.value })
        });

        if (res.ok) {
          input.value = '';
          openTaskDetail(taskId);
        } else {
          showToast('Failed to post comment', 'error');
        }
      } catch (err) {
        showToast('Network error', 'error');
      }
    });
  }

  // Comment Edit / Delete buttons
  const commentsList = document.getElementById('comments-list');
  if (commentsList) {
    commentsList.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.comment-edit-btn');
      const deleteBtn = e.target.closest('.comment-delete-btn');
      const saveBtn = e.target.closest('.comment-edit-save');
      const cancelBtn = e.target.closest('.comment-edit-cancel');

      if (editBtn) {
        const item = editBtn.closest('.comment-item');
        item.querySelector('.comment-text').classList.add('hidden');
        item.querySelector('.comment-edit-form').classList.remove('hidden');
      }

      if (cancelBtn) {
        const item = cancelBtn.closest('.comment-item');
        item.querySelector('.comment-text').classList.remove('hidden');
        item.querySelector('.comment-edit-form').classList.add('hidden');
      }

      if (saveBtn) {
        const taskId = saveBtn.dataset.taskId;
        const commentId = saveBtn.dataset.commentId;
        const textarea = saveBtn.closest('.comment-edit-form').querySelector('.comment-edit-textarea');
        editComment(taskId, commentId, textarea.value.trim(), saveBtn.closest('.comment-item'));
      }

      if (deleteBtn) {
        const taskId = deleteBtn.dataset.taskId;
        const commentId = deleteBtn.dataset.commentId;
        const item = deleteBtn.closest('.comment-item');
        deleteComment(taskId, commentId, item);
      }
    });
  }

  // Add Subtask form
  const subtaskForm = document.getElementById('add-subtask-form');
  if (subtaskForm) {
    subtaskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('subtask-input');
      const taskId = subtaskForm.dataset.taskId;
      const title = input.value.trim();
      if (!title) return;
      await createSubtask(taskId, title);
      input.value = '';
    });
  }

  // Subtask toggle / delete (event delegation)
  const subtasksList = document.getElementById('subtasks-list');
  if (subtasksList) {
    subtasksList.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.subtask-toggle');
      const deleteBtn = e.target.closest('.subtask-delete');

      if (toggleBtn) {
        e.stopPropagation();
        const taskId = toggleBtn.dataset.taskId;
        const subtaskId = toggleBtn.dataset.subtaskId;
        const currentStatus = toggleBtn.dataset.currentStatus;
        toggleSubtask(taskId, subtaskId, currentStatus, toggleBtn.closest('.subtask-item'));
      }

      if (deleteBtn) {
        e.stopPropagation();
        const taskId = deleteBtn.dataset.taskId;
        const subtaskId = deleteBtn.dataset.subtaskId;
        deleteSubtask(taskId, subtaskId, deleteBtn.closest('.subtask-item'));
      }
    });
  }

  // Delete task button
  const deleteTaskBtn = document.getElementById('delete-task-btn');
  if (deleteTaskBtn) {
    deleteTaskBtn.addEventListener('click', () => {
      const taskId = deleteTaskBtn.dataset.taskId;
      deleteTask(taskId);
    });
  }
}

// ─── Subtask API Handlers ────────────────────────────────────────────────────

async function createSubtask(taskId, title) {
  try {
    const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });

    if (!res.ok) throw new Error('Server error');

    const subtask = await res.json();
    appendSubtaskToDOM(taskId, subtask);
    updateSubtaskCount();
    showToast('Subtask added', 'success');
  } catch (err) {
    showToast('Failed to add subtask', 'error');
  }
}

function appendSubtaskToDOM(taskId, subtask) {
  const list = document.getElementById('subtasks-list');
  if (!list) return;

  // Remove empty state
  const empty = document.getElementById('subtasks-empty');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = 'subtask-item flex items-center gap-3 p-2 rounded-lg hover_bg-gray-50 group';
  item.dataset.subtaskId = subtask.id;
  item.dataset.status = 'TODO';
  item.innerHTML = `
    <button class="subtask-toggle w-5 h-5 rounded border-2 border-gray-300 hover_border-brand-400 flex items-center justify-center flex-shrink-0 transition-colors"
      data-task-id="${taskId}"
      data-subtask-id="${subtask.id}"
      data-current-status="TODO"
      title="Toggle status">
    </button>
    <span class="flex-1 text-sm text-gray-700">${escapeHtml(subtask.title)}</span>
    <button class="subtask-delete opacity-0 group-hover_opacity-100 p-1 text-gray-400 hover_text-red-500 transition-all rounded"
      data-task-id="${taskId}"
      data-subtask-id="${subtask.id}"
      title="Delete subtask">
      <svg class="w-3_5 h-3_5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
      </svg>
    </button>
  `;
  list.appendChild(item);
}

async function toggleSubtask(taskId, subtaskId, currentStatus, itemEl) {
  const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
  try {
    const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) throw new Error('Server error');

    // Update DOM
    if (itemEl) {
      itemEl.dataset.status = newStatus;
      const btn = itemEl.querySelector('.subtask-toggle');
      const label = itemEl.querySelector('span.flex-1');

      if (newStatus === 'DONE') {
        btn.className = 'subtask-toggle w-5 h-5 rounded border-2 border-green-500 bg-green-500 text-white flex items-center justify-center flex-shrink-0 transition-colors';
        btn.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`;
        btn.dataset.currentStatus = 'DONE';
        if (label) { label.className = 'flex-1 text-sm line-through text-gray-400'; }
      } else {
        btn.className = 'subtask-toggle w-5 h-5 rounded border-2 border-gray-300 hover_border-brand-400 flex items-center justify-center flex-shrink-0 transition-colors';
        btn.innerHTML = '';
        btn.dataset.currentStatus = 'TODO';
        if (label) { label.className = 'flex-1 text-sm text-gray-700'; }
      }
      updateSubtaskCount();
    }
  } catch (err) {
    showToast('Failed to update subtask', 'error');
  }
}

async function deleteSubtask(taskId, subtaskId, itemEl) {
  if (!confirm('Delete this subtask?')) return;
  try {
    const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Server error');

    if (itemEl) itemEl.remove();
    updateSubtaskCount();

    // Show empty state if no subtasks remain
    const list = document.getElementById('subtasks-list');
    if (list && list.querySelectorAll('.subtask-item').length === 0) {
      const p = document.createElement('p');
      p.id = 'subtasks-empty';
      p.className = 'text-xs text-gray-400 italic py-1';
      p.textContent = 'No subtasks yet.';
      list.appendChild(p);
    }

    showToast('Subtask deleted', 'success');
  } catch (err) {
    showToast('Failed to delete subtask', 'error');
  }
}

function updateSubtaskCount() {
  const list = document.getElementById('subtasks-list');
  const countEl = document.getElementById('subtask-count');
  if (!list || !countEl) return;

  const all = list.querySelectorAll('.subtask-item');
  const done = list.querySelectorAll('.subtask-item[data-status="DONE"]');
  countEl.textContent = `${done.length}/${all.length} completed`;
}

// ─── Comment API Handlers ────────────────────────────────────────────────────

async function editComment(taskId, commentId, newContent, itemEl) {
  if (!newContent) {
    showToast('Comment cannot be empty', 'error');
    return;
  }
  try {
    const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent })
    });

    if (!res.ok) throw new Error('Server error');

    if (itemEl) {
      const textEl = itemEl.querySelector('.comment-text');
      if (textEl) textEl.textContent = newContent;
      itemEl.querySelector('.comment-text').classList.remove('hidden');
      itemEl.querySelector('.comment-edit-form').classList.add('hidden');
    }
    showToast('Comment updated', 'success');
  } catch (err) {
    showToast('Failed to update comment', 'error');
  }
}

async function deleteComment(taskId, commentId, itemEl) {
  if (!confirm('Delete this comment?')) return;
  try {
    const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Server error');

    if (itemEl) itemEl.remove();
    showToast('Comment deleted', 'success');
  } catch (err) {
    showToast('Failed to delete comment', 'error');
  }
}

// ─── Task Delete ─────────────────────────────────────────────────────────────

async function deleteTask(taskId) {
  if (!confirm('Delete this task? This action cannot be undone.')) return;
  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Server error');

    showToast('Task deleted', 'success');

    // Remove task card/row from the page DOM
    const card = document.querySelector(`.task-card[data-id="${taskId}"]`);
    if (card) card.remove();
    const row = document.querySelector(`[onclick*="openTaskDetail('${taskId}')"]`);
    if (row) row.remove();

    // Close modal without reload, then reload to sync state
    const container = document.getElementById('task-modal-container');
    if (container) container.classList.add('hidden');
    document.body.style.overflow = '';
    stopLiveTimer();

    setTimeout(() => window.location.reload(), 400);
  } catch (err) {
    showToast('Failed to delete task', 'error');
  }
}

// ─── Workspace API Handlers ──────────────────────────────────────────────────

function openWorkspaceSettings() {
  const modal = document.getElementById('workspace-settings-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeWorkspaceSettings() {
  const modal = document.getElementById('workspace-settings-modal');
  if (modal) modal.classList.add('hidden');
}

async function saveWorkspaceName(workspaceId) {
  const input = document.getElementById('ws-name-input');
  const name = input ? input.value.trim() : '';
  if (!name) { showToast('Name cannot be empty', 'error'); return; }
  await updateWorkspace(workspaceId, name);
}

async function updateWorkspace(workspaceId, name) {
  try {
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (!res.ok) throw new Error('Server error');

    showToast('Workspace updated', 'success');
    setTimeout(() => window.location.reload(), 600);
  } catch (err) {
    showToast('Failed to update workspace', 'error');
  }
}

async function deleteWorkspace(workspaceId) {
  if (!confirm('Delete this workspace? All lists and tasks inside will be permanently removed.')) return;
  try {
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Server error');

    showToast('Workspace deleted', 'success');
    setTimeout(() => { window.location.href = '/dashboard'; }, 600);
  } catch (err) {
    showToast('Failed to delete workspace', 'error');
  }
}

async function removeMember(workspaceId, userId, rowEl) {
  if (!confirm('Remove this member from the workspace?')) return;
  try {
    const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Server error');

    if (rowEl) rowEl.remove();
    showToast('Member removed', 'success');
  } catch (err) {
    showToast('Failed to remove member', 'error');
  }
}

// ─── List API Handlers ───────────────────────────────────────────────────────

async function renameList(listId, currentName) {
  const newName = prompt('Rename list:', currentName);
  if (!newName || newName.trim() === currentName) return;
  await updateList(listId, newName.trim());
}

async function updateList(listId, name) {
  try {
    const res = await fetch(`/api/lists/${listId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (!res.ok) throw new Error('Server error');

    showToast('List renamed', 'success');
    setTimeout(() => window.location.reload(), 400);
  } catch (err) {
    showToast('Failed to rename list', 'error');
  }
}

async function deleteList(listId) {
  if (!confirm('Delete this list? All tasks inside will be permanently removed.')) return;
  try {
    const res = await fetch(`/api/lists/${listId}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Server error');

    showToast('List deleted', 'success');
    // Redirect to workspace root (find workspace id from current URL)
    const match = window.location.pathname.match(/\/workspaces\/([^/]+)/);
    const wsId = match ? match[1] : '';
    setTimeout(() => { window.location.href = wsId ? `/workspaces/${wsId}` : '/dashboard'; }, 600);
  } catch (err) {
    showToast('Failed to delete list', 'error');
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Global Event Listeners ──────────────────────────────────────────────────

// Click outside task modal to close
document.addEventListener('click', (e) => {
  const container = document.getElementById('task-modal-container');
  if (container && !container.classList.contains('hidden') && e.target === container) {
    closeTaskDetail();
  }
});

// Click outside workspace settings modal to close
document.addEventListener('click', (e) => {
  const modal = document.getElementById('workspace-settings-modal');
  if (modal && !modal.classList.contains('hidden') && e.target === modal) {
    closeWorkspaceSettings();
  }
});
