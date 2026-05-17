/* ===================================================
   MichiRegistro — Script principal
   Gestión de registros con LocalStorage
   =================================================== */

(function () {
    'use strict';

    // ===================== CONSTANTES =====================
    const STORAGE_KEY = 'michiRegistro_data';

    // ===================== ELEMENTOS DOM =====================
    const form = document.getElementById('registration-form');
    const cardsContainer = document.getElementById('cards-container');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const toastContainer = document.getElementById('toast-container');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalText = document.getElementById('modal-text');

    // Stats
    const statsTotal = document.getElementById('stats-total');
    const statsOwners = document.getElementById('stats-owners');
    const statsBreeds = document.getElementById('stats-breeds');

    // Campos del formulario
    const fields = {
        ownerName:  document.getElementById('owner-name'),
        ownerPhone: document.getElementById('owner-phone'),
        ownerEmail: document.getElementById('owner-email'),
        catName:    document.getElementById('cat-name'),
        catAge:     document.getElementById('cat-age'),
        catAgeUnit: document.getElementById('cat-age-unit'),
        catBreed:   document.getElementById('cat-breed'),
        catNotes:   document.getElementById('cat-notes'),
    };

    // ID del registro pendiente de eliminación
    let pendingDeleteId = null;

    // ===================== LOCAL STORAGE =====================

    /** Obtener todos los registros del LocalStorage */
    function getRecords() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    /** Guardar registros en LocalStorage */
    function saveRecords(records) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }

    /** Agregar un nuevo registro */
    function addRecord(record) {
        const records = getRecords();
        record.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        record.createdAt = new Date().toISOString();
        records.push(record);
        saveRecords(records);
        return record;
    }

    /** Eliminar un registro por ID */
    function deleteRecord(id) {
        const records = getRecords().filter(r => r.id !== id);
        saveRecords(records);
    }

    // ===================== VALIDACIÓN =====================

    const validators = {
        ownerName(value) {
            if (!value.trim()) return 'El nombre es obligatorio.';
            if (value.trim().length < 3) return 'Ingresa al menos 3 caracteres.';
            return '';
        },
        ownerPhone(value) {
            if (!value.trim()) return 'El teléfono es obligatorio.';
            // Acepta 7-15 dígitos, opcionalmente con + al inicio y espacios/guiones
            if (!/^\+?[\d\s\-]{7,15}$/.test(value.trim())) return 'Formato inválido. Ej: 5512345678';
            return '';
        },
        ownerEmail(value) {
            if (!value.trim()) return 'El correo es obligatorio.';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Formato inválido. Ej: usuario@correo.com';
            return '';
        },
        catName(value) {
            if (!value.trim()) return 'El nombre del gatito es obligatorio.';
            return '';
        },
        catAge(value) {
            if (value === '' || value === undefined || value === null) return 'La edad es obligatoria.';
            const n = Number(value);
            if (isNaN(n) || n < 0 || n > 30) return 'Ingresa una edad válida (0-30).';
            return '';
        },
        catBreed(value) {
            if (!value.trim()) return 'La raza es obligatoria.';
            return '';
        },
        catNotes(value) {
            if (!value.trim()) return 'Agrega al menos una nota.';
            return '';
        },
    };

    /** Mostrar error en un campo */
    function showFieldError(fieldKey, message) {
        const input = fields[fieldKey];
        const errorSpan = document.getElementById('error-' + input.id);
        input.classList.add('input--error');
        if (errorSpan) {
            errorSpan.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ' + message;
            errorSpan.classList.add('visible');
        }
    }

    /** Limpiar error de un campo */
    function clearFieldError(fieldKey) {
        const input = fields[fieldKey];
        const errorSpan = document.getElementById('error-' + input.id);
        input.classList.remove('input--error');
        if (errorSpan) {
            errorSpan.textContent = '';
            errorSpan.classList.remove('visible');
        }
    }

    /** Validar todo el formulario. Retorna true si es válido. */
    function validateForm() {
        let isValid = true;
        for (const key of Object.keys(validators)) {
            const value = fields[key].value;
            const error = validators[key](value);
            if (error) {
                showFieldError(key, error);
                isValid = false;
            } else {
                clearFieldError(key);
            }
        }
        return isValid;
    }

    // Validación en tiempo real al perder el foco
    Object.keys(validators).forEach(key => {
        fields[key].addEventListener('blur', () => {
            const error = validators[key](fields[key].value);
            if (error) showFieldError(key, error);
            else clearFieldError(key);
        });
        fields[key].addEventListener('input', () => {
            // Limpiar error mientras escribe
            if (fields[key].classList.contains('input--error')) {
                const error = validators[key](fields[key].value);
                if (!error) clearFieldError(key);
            }
        });
    });

    // ===================== RENDERIZADO =====================

    /** Crear HTML de una tarjeta */
    function createCardHTML(record) {
        const date = new Date(record.createdAt);
        const dateStr = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

        // Escapar HTML para prevenir XSS
        const esc = str => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };

        return `
        <article class="card" data-id="${esc(record.id)}">
            <div class="card__header">
                <div class="card__avatar">
                    <i class="fa-solid fa-cat"></i>
                </div>
                <div class="card__cat-info">
                    <div class="card__cat-name">${esc(record.catName)}</div>
                    <div class="card__cat-breed">${esc(record.catBreed)} · ${esc(String(record.catAge))} ${esc(record.catAgeUnit)}</div>
                </div>
            </div>
            <div class="card__details">
                <div class="card__detail"><i class="fa-solid fa-user"></i><span>${esc(record.ownerName)}</span></div>
                <div class="card__detail"><i class="fa-solid fa-phone"></i><span>${esc(record.ownerPhone)}</span></div>
                <div class="card__detail"><i class="fa-solid fa-envelope"></i><span>${esc(record.ownerEmail)}</span></div>
                <div class="card__detail"><i class="fa-solid fa-calendar"></i><span>${dateStr}</span></div>
            </div>
            <div class="card__notes"><i class="fa-solid fa-note-sticky"></i> ${esc(record.catNotes)}</div>
            <div class="card__actions">
                <button class="card__btn-delete" data-id="${esc(record.id)}" title="Eliminar registro">
                    <i class="fa-solid fa-trash-can"></i> Eliminar
                </button>
            </div>
        </article>`;
    }

    /** Renderizar todas las tarjetas */
    function renderCards(filter = '') {
        let records = getRecords();

        // Filtrar por búsqueda
        if (filter) {
            const q = filter.toLowerCase();
            records = records.filter(r =>
                r.catName.toLowerCase().includes(q) ||
                r.ownerName.toLowerCase().includes(q) ||
                r.catBreed.toLowerCase().includes(q)
            );
        }

        // Ordenar: más recientes primero
        records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (records.length === 0) {
            cardsContainer.innerHTML = '';
            emptyState.classList.add('visible');
        } else {
            emptyState.classList.remove('visible');
            cardsContainer.innerHTML = records.map(createCardHTML).join('');
        }

        updateStats();
    }

    /** Actualizar estadísticas */
    function updateStats() {
        const records = getRecords();
        const owners = new Set(records.map(r => r.ownerEmail.toLowerCase()));
        const breeds = new Set(records.map(r => r.catBreed.toLowerCase()));

        animateNumber(statsTotal, records.length);
        animateNumber(statsOwners, owners.size);
        animateNumber(statsBreeds, breeds.size);
    }

    /** Animación de números en stats */
    function animateNumber(el, target) {
        const current = parseInt(el.textContent) || 0;
        if (current === target) return;
        const duration = 400;
        const start = performance.now();
        function step(timestamp) {
            const progress = Math.min((timestamp - start) / duration, 1);
            el.textContent = Math.round(current + (target - current) * progress);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // ===================== EVENTOS =====================

    // Envío del formulario
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!validateForm()) {
            showToast('Corrige los errores del formulario.', 'error');
            // Hacer scroll al primer error
            const firstError = form.querySelector('.input--error');
            if (firstError) firstError.focus();
            return;
        }

        const record = {
            ownerName:  fields.ownerName.value.trim(),
            ownerPhone: fields.ownerPhone.value.trim(),
            ownerEmail: fields.ownerEmail.value.trim(),
            catName:    fields.catName.value.trim(),
            catAge:     fields.catAge.value,
            catAgeUnit: fields.catAgeUnit.value,
            catBreed:   fields.catBreed.value.trim(),
            catNotes:   fields.catNotes.value.trim(),
        };

        addRecord(record);
        form.reset();
        renderCards(searchInput.value);
        showToast(`¡${record.catName} fue registrado con éxito! 🐱`, 'success');

        // Scroll suave al listado
        document.getElementById('listado').scrollIntoView({ behavior: 'smooth' });
    });

    // Delegación de eventos para botones de eliminar
    cardsContainer.addEventListener('click', function (e) {
        const btn = e.target.closest('.card__btn-delete');
        if (!btn) return;

        pendingDeleteId = btn.dataset.id;
        const records = getRecords();
        const record = records.find(r => r.id === pendingDeleteId);
        if (record) {
            modalText.textContent = `Se eliminará el registro de "${record.catName}" (dueño: ${record.ownerName}). Esta acción no se puede deshacer.`;
        }
        modalOverlay.classList.add('active');
    });

    // Modal: confirmar eliminación
    modalConfirm.addEventListener('click', function () {
        if (pendingDeleteId) {
            const records = getRecords();
            const record = records.find(r => r.id === pendingDeleteId);
            const name = record ? record.catName : 'el gatito';
            deleteRecord(pendingDeleteId);
            pendingDeleteId = null;
            renderCards(searchInput.value);
            showToast(`Registro de ${name} eliminado.`, 'warning');
        }
        modalOverlay.classList.remove('active');
    });

    // Modal: cancelar
    modalCancel.addEventListener('click', function () {
        pendingDeleteId = null;
        modalOverlay.classList.remove('active');
    });

    // Cerrar modal al hacer clic fuera
    modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) {
            pendingDeleteId = null;
            modalOverlay.classList.remove('active');
        }
    });

    // Búsqueda
    searchInput.addEventListener('input', function () {
        const val = searchInput.value.trim();
        searchClear.style.display = val ? 'flex' : 'none';
        renderCards(val);
    });

    searchClear.addEventListener('click', function () {
        searchInput.value = '';
        searchClear.style.display = 'none';
        renderCards();
        searchInput.focus();
    });

    // Tecla Escape para cerrar modal
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            pendingDeleteId = null;
            modalOverlay.classList.remove('active');
        }
    });

    // ===================== TOAST =====================
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation' };
        toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.success}"></i> ${message}`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut .3s ease forwards';
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    }

    // ===================== INICIALIZACIÓN =====================
    renderCards();

})();
