// HTML5 Drag and Drop for Kanban Board

document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.task-card');
  const dropZones = document.querySelectorAll('.kanban-drop-zone');
  const columns = document.querySelectorAll('.kanban-column');

  cards.forEach(card => {
    card.addEventListener('dragstart', dragStart);
    card.addEventListener('dragend', dragEnd);
  });

  dropZones.forEach(zone => {
    zone.addEventListener('dragover', dragOver);
    zone.addEventListener('dragenter', dragEnter);
    zone.addEventListener('dragleave', dragLeave);
    zone.addEventListener('drop', drop);
  });

  let draggedCard = null;
  let sourceZone = null;

  function dragStart(e) {
    draggedCard = this;
    sourceZone = this.closest('.kanban-drop-zone');
    setTimeout(() => this.classList.add('dragging'), 0);
    // Needed for Firefox
    e.dataTransfer.setData('text/plain', this.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function dragEnd() {
    this.classList.remove('dragging');
    draggedCard = null;
    sourceZone = null;
    dropZones.forEach(z => z.classList.remove('drag-over'));
  }

  function dragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function dragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
  }

  function dragLeave() {
    this.classList.remove('drag-over');
  }

  async function drop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    if (this === sourceZone || !draggedCard) return;

    // Move DOM element
    this.appendChild(draggedCard);
    
    // Get target status from column
    const column = this.closest('.kanban-column');
    const newStatus = column.dataset.status;
    const taskId = draggedCard.dataset.id;

    // Update status in background
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) {
        throw new Error('Server returned error');
      }
      
      // Optional: show toast from app.js
      if (typeof showToast === 'function') {
        showToast('Task status updated', 'success');
      }

      // Update the card's data-status attribute to the new status
      draggedCard.dataset.status = newStatus;

      // Update task count in headers
      updateColumnCounts();

      // Re-apply active board filters so moved cards get hidden/shown correctly
      if (typeof applyBoardFilters === 'function') {
        applyBoardFilters();
      }
      
    } catch (err) {
      console.error(err);
      if (typeof showToast === 'function') {
        showToast('Failed to update status', 'error');
      }
      // Revert DOM change
      sourceZone.appendChild(draggedCard);
    }
  }
  
  function updateColumnCounts() {
    columns.forEach(col => {
      const count = col.querySelectorAll('.task-card').length;
      const countBadge = col.querySelector('.kanban-column-header span:last-child');
      if (countBadge) countBadge.textContent = count;
    });
  }
});
