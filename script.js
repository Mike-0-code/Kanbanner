// ===== ESTADO GLOBAL =====
let kanbanState = {
    todo: [],
    progress: [],
    done: []
};

let currentEditingCard = null;
let currentColumn = null;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    loadFromStorage();
    renderAllColumns();
    setupEventListeners();
    setupDragAndDrop();
});

// ===== GESTIÓN DE DATOS =====
function saveToStorage() {
    localStorage.setItem('kanbaner-data', JSON.stringify(kanbanState));
}

function loadFromStorage() {
    const saved = localStorage.getItem('kanbaner-data');
    if (saved) {
        kanbanState = JSON.parse(saved);
    }
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
        const cardElement = createCardElement(card, columnId, index);
        container.appendChild(cardElement);
    });
}

function createCardElement(card, columnId, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.draggable = true;
    cardDiv.setAttribute('data-column', columnId);
    cardDiv.setAttribute('data-index', index);

    cardDiv.innerHTML = `
        <div class="card-title" onclick="editCard('${columnId}', ${index})">${escapeHtml(card.title)}</div>
        ${card.description ? `<div class="card-desc" onclick="editCard('${columnId}', ${index})">${escapeHtml(card.description)}</div>` : ''}
        <div class="card-date">${formatDate(card.createdAt)}</div>
    `;

    // Eventos de drag and drop
    setupCardDragEvents(cardDiv);

    return cardDiv;
}

// ===== MODAL Y FORMULARIO =====
function openCardModal(column) {
    currentColumn = column;
    currentEditingCard = null;
    
    document.getElementById('modal-title').textContent = 'Nueva Tarjeta';
    document.getElementById('card-title').value = '';
    document.getElementById('card-desc').value = '';
    document.getElementById('title-count').textContent = '0/60';
    document.getElementById('desc-count').textContent = '0/140';
    
    document.getElementById('card-modal').style.display = 'block';
    document.getElementById('card-title').focus();
}

function closeCardModal() {
    document.getElementById('card-modal').style.display = 'none';
    currentEditingCard = null;
    currentColumn = null;
}

function editCard(column, index) {
    currentColumn = column;
    currentEditingCard = index;
    const card = kanbanState[column][index];
    
    document.getElementById('modal-title').innerHTML = `
        <div class="modal-title-container">
            <span>Editar Tarjeta</span>
            <button type="button" class="delete-card-btn" onclick="confirmDeleteCard('${column}', ${index})">
                Eliminar
            </button>
        </div>
    `;
    
    document.getElementById('card-title').value = card.title;
    document.getElementById('card-desc').value = card.description || '';
    updateCharCounters();
    
    document.getElementById('card-modal').style.display = 'block';
    document.getElementById('card-title').focus();
}

// ===== GESTIÓN DE TARJETAS =====
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
    if (confirm('¿Estás seguro de que quieres eliminar esta tarjeta?')) {
        kanbanState[column].splice(index, 1);
        saveToStorage();
        renderColumn(column, kanbanState[column]);
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Formulario de tarjeta
    document.getElementById('card-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const title = document.getElementById('card-title').value;
        const description = document.getElementById('card-desc').value;
        
        if (!title.trim()) {
            alert('El título es obligatorio');
            return;
        }

        if (currentEditingCard !== null) {
            updateCard(currentColumn, currentEditingCard, title, description);
        } else {
            addCard(currentColumn, title, description);
        }
        
        closeCardModal();
    });

    // Contadores de caracteres
    document.getElementById('card-title').addEventListener('input', updateCharCounters);
    document.getElementById('card-desc').addEventListener('input', updateCharCounters);

    // Cerrar modal al hacer click fuera
    document.getElementById('card-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeCardModal();
        }
    });

    // Switch de tema
    document.getElementById('theme-toggle').addEventListener('change', function() {
        document.body.classList.toggle('dark-theme', !this.checked);
        document.body.classList.toggle('light-theme', this.checked);
    });
}

function updateCharCounters() {
    const titleInput = document.getElementById('card-title');
    const descInput = document.getElementById('card-desc');
    
    document.getElementById('title-count').textContent = `${titleInput.value.length}/60`;
    document.getElementById('desc-count').textContent = `${descInput.value.length}/140`;
}

// ===== UTILIDADES =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return `Hoy ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
        return `Ayer ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return date.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short',
            hour: '2-digit', 
            minute: '2-digit'
        });
    }
}

// ===== DRAG AND DROP (Fase básica) =====
function setupDragAndDrop() {
    const columns = document.querySelectorAll('.cards-container');
    
    columns.forEach(column => {
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
