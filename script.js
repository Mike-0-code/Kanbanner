// ===== ESTADO GLOBAL =====
let kanbanState = {
    todo: [],
    progress: [],
    done: []
};

let currentEditingCard = null;
let currentColumn = null;
let pendingDelete = null;

// ===== FUNCIÓN DE ACTUALIZACIÓN (DEBE IR PRIMERO) =====
function updateExistingDates() {
    console.log('🔄 Actualizando fechas existentes...');
    
    const columns = ['todo', 'progress', 'done'];
    let updated = false;
    
    columns.forEach(column => {
        if (kanbanState[column]) {
            kanbanState[column].forEach(task => {
                if (task.createdAt) {
                    try {
                        const newDate = new Date(task.createdAt).toISOString();
                        task.createdAt = newDate;
                        updated = true;
                    } catch (e) {
                        console.log('Error actualizando fecha:', e);
                    }
                }
            });
        }
    });
    
    if (updated) {
        saveToStorage();
        console.log('✅ Fechas actualizadas correctamente');
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    
    if (!localStorage.getItem('kanbanner_fechas_actualizadas')) {
        updateExistingDates();
        localStorage.setItem('kanbanner_fechas_actualizadas', 'true');
    }
    
    renderAllColumns();
    setupEventListeners();
    setupDragAndDrop();
    setupConfirmModal();
    setupInfoTooltip(); 
});

// ===== GESTIÓN DE DATOS =====
function saveToStorage() {
    localStorage.setItem('kanbaner-data', JSON.stringify(kanbanState));
}

function loadFromStorage() {
    const saved = localStorage.getItem('kanbaner-data');
    if (saved) kanbanState = JSON.parse(saved);
}

// ===== INFORMACIÓN DE ALMACENAMIENTO =====
function setupInfoTooltip() {
    const infoBtn = document.querySelector('.info-btn');
    const tooltip = document.createElement('div');
    
    tooltip.className = 'info-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-title">Almacenamiento Local</div>
        <div class="tooltip-text">
            Tus tareas se guardan automáticamente en este navegador. 
            Si limpias el historial o cambias de navegador, se reiniciará el tablero.
        </div>
        <div class="tooltip-note">
            Solo visible para ti en este dispositivo
        </div>
    `;
    
    document.querySelector('.header-actions').appendChild(tooltip);
    
    let hideTimeout;
    
    infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tooltip.classList.toggle('show');
    });
    
    // Cerrar al hacer click fuera
    document.addEventListener('click', () => {
        tooltip.classList.remove('show');
    });
    
    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            tooltip.classList.remove('show');
        }
    });
}

// ===== RENDERIZADO =====
function renderAllColumns() {
    renderColumn('todo', kanbanState.todo);
    renderColumn('progress', kanbanState.progress);
    renderColumn('done', kanbanState.done);
}

function renderColumn(columnId, cards) {
    const container = document.getElementById(`${columnId}-cards`);
    container.innerHTML = '';

    cards.forEach((card, index) => {
        container.appendChild(createCardElement(card, columnId, index));
    });
}

function createCardElement(card, columnId, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.draggable = true;
    cardDiv.setAttribute('data-column', columnId);
    cardDiv.setAttribute('data-index', index);

    cardDiv.addEventListener('click', () => editCard(columnId, index));

    cardDiv.innerHTML = `
        <div class="card-title">${escapeHtml(card.title)}</div>
        ${card.description ? `<div class="card-desc">${escapeHtml(card.description)}</div>` : ''}
        <div class="card-date">${formatDate(card.createdAt)}</div>
    `;

    setupCardDragEvents(cardDiv);
    return cardDiv;
}

// ===== MODALES =====
function openCardModal(column) {
    currentColumn = column;
    currentEditingCard = null;
    
    document.getElementById('modal-title').innerHTML = `
        <div class="modal-header">
            <div class="modal-title-container">
                <span>Nueva Tarea</span>
                <div style="width: 70px;"></div>
            </div>
        </div>
    `;
    
    document.getElementById('card-title').value = '';
    document.getElementById('card-desc').value = '';
    updateCharCounters();
    
    showModal('card-modal');
    document.getElementById('card-title').focus();
}

function closeCardModal() {
    hideModal('card-modal');
    currentEditingCard = null;
    currentColumn = null;
}

function editCard(column, index) {
    currentColumn = column;
    currentEditingCard = index;
    const card = kanbanState[column][index];
    
    document.getElementById('modal-title').innerHTML = `
        <div class="modal-header">
            <div class="modal-title-container">
                <span>Editar Tarea</span>
                <button type="button" class="delete-card-btn" onclick="event.stopPropagation(); confirmDeleteCard('${column}', ${index})">
                    Eliminar
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('card-title').value = card.title;
    document.getElementById('card-desc').value = card.description || '';
    updateCharCounters();
    
    showModal('card-modal');
    document.getElementById('card-title').focus();
}

// ===== GESTIÓN DE TAREAS =====
function addCard(column, title, description) {
    const newCard = {
        title: title.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString()
    };

    kanbanState[column].push(newCard);
    saveToStorage();
    renderColumn(column, kanbanState[column]);
}

function updateCard(column, index, title, description) {
    kanbanState[column][index].title = title.trim();
    kanbanState[column][index].description = description.trim();
    saveToStorage();
    renderColumn(column, kanbanState[column]);
}

function deleteCard(column, index) {
    kanbanState[column].splice(index, 1);
    saveToStorage();
    renderColumn(column, kanbanState[column]);
}

// ===== CONFIRMACIÓN DE ELIMINACIÓN =====
function confirmDeleteCard(column, index) {
    const card = kanbanState[column][index];
    pendingDelete = { column, index };
    
    document.getElementById('confirm-message').textContent = 
        `¿Estás seguro de que quieres eliminar la tarea "${card.title}"?`;
    
    showModal('confirm-modal');
}

function setupConfirmModal() {
    document.getElementById('confirm-cancel').addEventListener('click', closeConfirmModal);
    document.getElementById('confirm-delete').addEventListener('click', executeDelete);
    
    document.getElementById('confirm-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeConfirmModal();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('confirm-modal').style.display === 'block') {
            closeConfirmModal();
        }
    });
}

function closeConfirmModal() {
    hideModal('confirm-modal');
    pendingDelete = null;
}

function executeDelete() {
    if (pendingDelete) {
        deleteCard(pendingDelete.column, pendingDelete.index);
        closeConfirmModal();
        closeCardModal();
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    document.getElementById('card-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('card-title').addEventListener('input', updateCharCounters);
    document.getElementById('card-desc').addEventListener('input', updateCharCounters);
    
    document.getElementById('card-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeCardModal();
    });
    
    document.getElementById('theme-toggle').addEventListener('change', (e) => {
        document.body.classList.toggle('dark-theme', !e.target.checked);
        document.body.classList.toggle('light-theme', e.target.checked);
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('card-title').value.trim();
    const description = document.getElementById('card-desc').value.trim();
    
    if (!title) {
        alert('El título es obligatorio');
        return;
    }

    if (currentEditingCard !== null) {
        updateCard(currentColumn, currentEditingCard, title, description);
    } else {
        addCard(currentColumn, title, description);
    }
    
    closeCardModal();
}

function updateCharCounters() {
    const titleLength = document.getElementById('card-title').value.length;
    const descLength = document.getElementById('card-desc').value.length;
    
    document.getElementById('title-count').textContent = `${titleLength}/60`;
    document.getElementById('desc-count').textContent = `${descLength}/140`;
}

// ===== DRAG AND DROP =====
function setupDragAndDrop() {
    document.querySelectorAll('.cards-container').forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
    });
}

function setupCardDragEvents(cardElement) {
    cardElement.addEventListener('dragstart', handleDragStart);
    cardElement.addEventListener('dragend', handleDragEnd);
}

function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', JSON.stringify({
        column: e.target.getAttribute('data-column'),
        index: e.target.getAttribute('data-index')
    }));
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    
    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
    const targetColumn = e.currentTarget.id.replace('-cards', '');
    
    moveCard(dragData.column, parseInt(dragData.index), targetColumn);
}

function moveCard(fromColumn, fromIndex, toColumn) {
    if (fromColumn === toColumn) return;
    
    const card = kanbanState[fromColumn][fromIndex];
    kanbanState[fromColumn].splice(fromIndex, 1);
    kanbanState[toColumn].push(card);
    
    saveToStorage();
    renderAllColumns();
}

// ===== UTILIDADES =====
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const noteDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = today - noteDate;
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return `Hoy ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
        return `Ayer ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
        const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        return `${days[date.getDay()]} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return date.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short',
            hour: '2-digit', 
            minute: '2-digit'
        });
    }
}
