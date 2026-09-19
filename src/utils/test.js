// ==UserScript==
// @name        TRT14 PROAD - Anotações
// @namespace   Violentmonkey Scripts
// @icon        https://proad.trt14.jus.br/proad/favicon.ico
// @version     1.6.2
//
// @match       https://proad.trt14.jus.br/proad/pages/estoutratando.xhtml*
// @grant       GM_getValue
// @grant       GM_setValue
//
// @author      Leviel
// @description Anotações, contexto, tarefas, filtro e gerenciamento de colunas do PROAD.
// ==/UserScript==

(function () {
  'use strict';

  // ============================================================
  // CONFIGURAÇÃO
  // ============================================================

  const TABLE_ID = 'formProtocolos:tblEstouTratando';
  const ANNOTATION_STORAGE_PREFIX = 'proad-annotation:';
  const COLUMN_VISIBILITY_KEY = 'proad-column-visibility:v2';
  const TODO_STORAGE_PREFIX = 'proad-todo:';

  // Contexto agora vive no GM_setValue (isolado, ~1 GB de folga).
  const CONTEXT_STORAGE_PREFIX = 'proad-context:';

  // Prefixo antigo (localStorage) — usado apenas para a migração.
  const LEGACY_CONTEXT_PREFIX = 'trt14-assistant-context:v1:';
  const CONTEXT_MIGRATION_FLAG = 'proad-context-migration:done';

  const COLUMN_BUTTON_ID = 'proad-column-toggle';
  const COLUMN_PANEL_ID = 'proad-column-panel';
  const MODAL_ID = 'proad-annotation-modal';
  const STYLE_ID = 'proad-modern-style';

  const DEFAULT_COLOR = 'yellow';

  const COLORS = {
    red: {
      name: 'Vermelho',
      background: '#fee2e2',
      border: '#fca5a5',
    },
    green: {
      name: 'Verde',
      background: '#dcfce7',
      border: '#86efac',
    },
    yellow: {
      name: 'Amarelo',
      background: '#fef3c7',
      border: '#fcd34d',
    },
  };

  let sortDirection = null;
  let annotationFilter = '';
  let isApplying = false;
  let bodyObserver = null;

  // ============================================================
  // TABELA
  // ============================================================

  function getTableContainer() {
    return document.getElementById(TABLE_ID);
  }

  function getHtmlTable() {
    return (
      getTableContainer()?.querySelector(
        '.ui-datatable-tablewrapper > table',
      ) || null
    );
  }

  function getHeaderRow() {
    return getHtmlTable()?.querySelector('thead tr') || null;
  }

  function getRows() {
    const table = getHtmlTable();

    if (!table) {
      return [];
    }

    return [...table.querySelectorAll('tbody > tr[data-rk]')];
  }

  function getExpandedSibling(row) {
    const next = row.nextElementSibling;

    if (
      next &&
      !next.hasAttribute('data-rk') &&
      next.classList.contains('ui-expanded-row-content')
    ) {
      return next;
    }

    return null;
  }

  // ============================================================
  // PROCESSO
  // ============================================================

  function getProcessKey(row) {
    const rk = row.dataset.rk || '';

    const match = rk.match(/Protocolo\s+(\d+)\s+ano\s+(\d+)/i);

    if (match) {
      return `${match[1]}/${match[2]}`;
    }

    const link = row.querySelector('a[href*="fichadoprocesso.xhtml"]');

    if (!link) {
      return null;
    }

    try {
      const url = new URL(link.href, location.origin);

      const protocolo = url.searchParams.get('numeroProtocolo');
      const ano = url.searchParams.get('numeroAno');

      if (protocolo && ano) {
        return `${protocolo}/${ano}`;
      }
    } catch {
      // Ignora URL inválida.
    }

    return null;
  }

  // ============================================================
  // UTILITÁRIOS
  // ============================================================

  function normalizeText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeForSearch(value) {
    return normalizeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function slugify(value) {
    return normalizeForSearch(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function generateId() {
    return (
      Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9)
    );
  }

  // ============================================================
  // ANOTAÇÕES
  // ============================================================

  function getAnnotationKey(processKey) {
    return ANNOTATION_STORAGE_PREFIX + processKey;
  }

  function getAnnotation(processKey) {
    if (!processKey) {
      return { text: '', color: DEFAULT_COLOR };
    }

    const stored = GM_getValue(getAnnotationKey(processKey), '');

    if (typeof stored === 'string') {
      return { text: stored, color: DEFAULT_COLOR };
    }

    if (stored && typeof stored === 'object') {
      return {
        text: typeof stored.text === 'string' ? stored.text : '',
        color: COLORS[stored.color] ? stored.color : DEFAULT_COLOR,
      };
    }

    return { text: '', color: DEFAULT_COLOR };
  }

  function saveAnnotation(processKey, text, color) {
    if (!processKey) {
      return;
    }

    GM_setValue(getAnnotationKey(processKey), {
      text,
      color: COLORS[color] ? color : DEFAULT_COLOR,
    });
  }

  // ============================================================
  // CONTEXTO — armazenado via GM_setValue (isolado, folgado)
  // ============================================================

  function getContextKey(processKey) {
    return CONTEXT_STORAGE_PREFIX + processKey;
  }

  function loadContextData(processKey) {
    if (!processKey) {
      return {};
    }

    const stored = GM_getValue(getContextKey(processKey), null);

    if (!stored || typeof stored !== 'object') {
      return {};
    }

    // Formato canônico: { reference, context, updatedAt }
    if (stored.context && typeof stored.context === 'object') {
      return { ...stored.context };
    }

    // Compatibilidade: aceita o objeto direto.
    return { ...stored };
  }

  function saveContextData(processKey, context) {
    if (!processKey) {
      return false;
    }

    try {
      GM_setValue(getContextKey(processKey), {
        reference: processKey,
        context: { ...context },
        updatedAt: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('[TRT14 Storage] Erro ao salvar contexto:', error);

      return false;
    }
  }

  function clearContextData(processKey) {
    if (!processKey) {
      return;
    }

    try {
      GM_setValue(getContextKey(processKey), null);
    } catch (error) {
      console.error('[TRT14 Storage] Erro ao limpar contexto:', error);
    }
  }

  /**
   * Migra contextos antigos que estavam no localStorage para o
   * GM_setValue. Roda uma única vez (flag em GM_setValue).
   *
   * O prefixo antigo guardava a referência do assistente de IA,
   * que usava o título da página como referência (ex.:
   * "PROAD nº 12345/2024 - ..."). Extraímos o número para gerar
   * a chave canônica nova.
   */
  function migrateLegacyContexts() {
    if (GM_getValue(CONTEXT_MIGRATION_FLAG, false)) {
      return;
    }

    let migrated = 0;
    let skipped = 0;

    try {
      const keysToRemove = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (!key || !key.startsWith(LEGACY_CONTEXT_PREFIX)) {
          continue;
        }

        const raw = localStorage.getItem(key);

        if (!raw) {
          continue;
        }

        // Decodifica a referência (ex.: "PROAD nº 12345/2024")
        let reference;

        try {
          reference = decodeURIComponent(
            key.slice(LEGACY_CONTEXT_PREFIX.length),
          );
        } catch {
          reference = key.slice(LEGACY_CONTEXT_PREFIX.length);
        }

        // Extrai o número do processo.
        const match = reference.match(/(\d+)\s*\/\s*(\d+)/);

        if (!match) {
          skipped++;
          continue;
        }

        const processKey = `${match[1]}/${match[2]}`;

        // Não sobrescreve uma entrada já existente no GM.
        const gmKey = getContextKey(processKey);

        if (GM_getValue(gmKey, null)) {
          keysToRemove.push(key);
          continue;
        }

        // Lê o payload antigo.
        let data;

        try {
          data = JSON.parse(raw);
        } catch (error) {
          console.warn('[TRT14 Migração] JSON inválido:', key, error);

          continue;
        }

        const context =
          data && typeof data === 'object' && data.context
            ? data.context
            : data;

        if (!context || typeof context !== 'object') {
          skipped++;
          continue;
        }

        try {
          GM_setValue(gmKey, {
            reference: processKey,
            context: { ...context },
            updatedAt: (data && data.updatedAt) || new Date().toISOString(),
          });

          migrated++;
          keysToRemove.push(key);
        } catch (error) {
          console.error('[TRT14 Migração] Erro ao salvar:', processKey, error);
        }
      }

      // Só remove do localStorage os que foram migrados com
      // sucesso (ou já existiam no GM).
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('[TRT14 Migração] Erro geral na migração:', error);
    }

    GM_setValue(CONTEXT_MIGRATION_FLAG, true);

    console.log(
      `[TRT14 Migração] Contextos migrados: ${migrated}, ignorados: ${skipped}.`,
    );
  }

  // ============================================================
  // TAREFAS (todo list)
  // ============================================================

  function getTodoKey(processKey) {
    return TODO_STORAGE_PREFIX + processKey;
  }

  function loadTodos(processKey) {
    if (!processKey) {
      return [];
    }

    const stored = GM_getValue(getTodoKey(processKey), []);

    if (!Array.isArray(stored)) {
      return [];
    }

    return stored
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: String(item.id || generateId()),
        title: String(item.title || ''),
        done: Boolean(item.done),
      }));
  }

  function saveTodos(processKey, todos) {
    if (!processKey) {
      return;
    }

    GM_setValue(getTodoKey(processKey), todos);
  }

  // ============================================================
  // MODAL
  // ============================================================

  let activeModalState = null;

  function closeAnnotationModal() {
    document.getElementById(MODAL_ID)?.remove();

    activeModalState = null;

    document.removeEventListener('keydown', handleModalKeydown, true);
  }

  function handleModalKeydown(event) {
    if (!activeModalState) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();

      closeAnnotationModal();

      return;
    }

    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      activeModalState.save();

      return;
    }
  }

  function openAnnotationEditor(processKey) {
    if (!processKey) {
      return;
    }

    closeAnnotationModal();

    const annotation = getAnnotation(processKey);
    const context = loadContextData(processKey);
    const todos = loadTodos(processKey);

    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;

    overlay.innerHTML = `
            <div class="proad-annotation-backdrop"></div>

            <div class="proad-annotation-dialog" role="dialog" aria-modal="true">

                <div class="proad-annotation-header">
                    <div>
                        <div class="proad-annotation-title">Anotação</div>
                        <div class="proad-annotation-process">
                            PROAD ${escapeHtml(processKey)}
                        </div>
                    </div>

                    <button type="button" class="proad-annotation-close" title="Fechar">×</button>
                </div>

                <div class="proad-annotation-tabs" role="tablist">

                    <button
                        type="button"
                        class="proad-tab-button is-active"
                        role="tab"
                        data-tab="annotation"
                        aria-selected="true"
                    >
                        Anotação
                    </button>

                    <button
                        type="button"
                        class="proad-tab-button"
                        role="tab"
                        data-tab="todo"
                        aria-selected="false"
                    >
                        Tarefas
                    </button>

                    <button
                        type="button"
                        class="proad-tab-button"
                        role="tab"
                        data-tab="context"
                        aria-selected="false"
                    >
                        Contexto
                    </button>

                </div>

                <div class="proad-annotation-content">

                    <!-- ===================================================== -->
                    <!-- ABA: ANOTAÇÃO                                          -->
                    <!-- ===================================================== -->

                    <div
                        class="proad-tab-panel is-active"
                        data-panel="annotation"
                        role="tabpanel"
                    >

                        <textarea
                            class="proad-annotation-textarea"
                            placeholder="Digite uma anotação sobre este processo..."
                        ></textarea>

                        <div class="proad-annotation-color-block">
                            <div class="proad-annotation-label">Cor da anotação</div>

                            <div class="proad-annotation-color-options">
                                ${Object.entries(COLORS)
                                  .map(
                                    ([key, config]) => `
                                    <label class="proad-color-option ${annotation.color === key ? 'is-selected' : ''}">
                                        <input
                                            type="radio"
                                            name="proad-annotation-color"
                                            value="${key}"
                                            ${annotation.color === key ? 'checked' : ''}
                                        >
                                        <span
                                            class="proad-color-circle"
                                            style="background:${config.background};border-color:${config.border};"
                                        ></span>
                                        <span class="proad-color-name">${config.name}</span>
                                    </label>
                                `,
                                  )
                                  .join('')}
                            </div>
                        </div>

                    </div>

                    <!-- ===================================================== -->
                    <!-- ABA: TAREFAS                                           -->
                    <!-- ===================================================== -->

                    <div
                        class="proad-tab-panel"
                        data-panel="todo"
                        role="tabpanel"
                        hidden
                    >

                        <div class="proad-todo-board">
                            <div class="proad-todo-list"></div>

                            <button
                                type="button"
                                class="proad-todo-add"
                            >
                                <span class="proad-todo-add-icon">+</span>
                                <span>Adicionar tarefa</span>
                            </button>
                        </div>

                    </div>

                    <!-- ===================================================== -->
                    <!-- ABA: CONTEXTO                                          -->
                    <!-- ===================================================== -->

                    <div
                        class="proad-tab-panel"
                        data-panel="context"
                        role="tabpanel"
                        hidden
                    >

                        <div class="proad-context-table-wrap">
                            <table class="proad-context-table">
                                <thead>
                                    <tr>
                                        <th>Campo</th>
                                        <th>Valor</th>
                                        <th></th>
                                    </tr>
                                </thead>

                                <tbody></tbody>
                            </table>
                        </div>

                        <div class="proad-context-footer">

                            <div class="proad-context-actions">

                                <button
                                    type="button"
                                    class="proad-context-action"
                                    data-action="add"
                                >
                                    + Adicionar
                                </button>

                                <button
                                    type="button"
                                    class="proad-context-action"
                                    data-action="clear"
                                >
                                    Limpar
                                </button>

                            </div>

                        </div>

                    </div>

                </div>

                <div class="proad-annotation-footer">
                    <span class="proad-annotation-shortcut">Ctrl + Enter para salvar</span>

                    <div class="proad-annotation-actions">
                        <button type="button" class="proad-btn-secondary proad-annotation-cancel">
                            Cancelar
                        </button>
                        <button type="button" class="proad-btn-primary proad-annotation-save">
                            Salvar
                        </button>
                    </div>
                </div>

            </div>
        `;

    document.body.appendChild(overlay);

    // --------------------------------------------------------
    // REFERÊNCIAS DO DOM
    // --------------------------------------------------------

    const textarea = overlay.querySelector('.proad-annotation-textarea');
    const tabs = overlay.querySelectorAll('.proad-tab-button');
    const panels = overlay.querySelectorAll('.proad-tab-panel');

    const contextBody = overlay.querySelector('.proad-context-table tbody');

    const todoList = overlay.querySelector('.proad-todo-list');

    // --------------------------------------------------------
    // SALVAR ANOTAÇÃO
    // --------------------------------------------------------

    const saveAnnotationAndClose = () => {
      const color =
        overlay.querySelector('input[name="proad-annotation-color"]:checked')
          ?.value || DEFAULT_COLOR;

      saveAnnotation(processKey, textarea.value, color);

      refreshAnnotationCell(processKey);
      applyAnnotationFilter();

      closeAnnotationModal();
    };

    // --------------------------------------------------------
    // ESTADO DO MODAL (para handlers globais)
    // --------------------------------------------------------

    activeModalState = {
      save: saveAnnotationAndClose,
    };

    // --------------------------------------------------------
    // ABAS
    // --------------------------------------------------------

    tabs.forEach((tab) => {
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const target = tab.dataset.tab;

        tabs.forEach((item) => {
          const isActive = item === tab;

          item.classList.toggle('is-active', isActive);
          item.setAttribute('aria-selected', String(isActive));
        });

        panels.forEach((panel) => {
          const isActive = panel.dataset.panel === target;

          panel.classList.toggle('is-active', isActive);
          panel.hidden = !isActive;
        });
      });
    });

    // --------------------------------------------------------
    // TEXTAREA
    // --------------------------------------------------------

    textarea.value = annotation.text;

    // --------------------------------------------------------
    // CORES
    // --------------------------------------------------------

    overlay.querySelectorAll('.proad-color-option').forEach((option) => {
      const input = option.querySelector('input');

      input.addEventListener('change', () => {
        overlay
          .querySelectorAll('.proad-color-option')
          .forEach((item) => item.classList.remove('is-selected'));

        if (input.checked) {
          option.classList.add('is-selected');
        }
      });
    });

    // --------------------------------------------------------
    // BOTÕES DE FECHAR / CANCELAR / SALVAR
    // --------------------------------------------------------

    overlay
      .querySelector('.proad-annotation-close')
      .addEventListener('click', closeAnnotationModal);

    overlay
      .querySelector('.proad-annotation-cancel')
      .addEventListener('click', closeAnnotationModal);

    overlay
      .querySelector('.proad-annotation-backdrop')
      .addEventListener('click', closeAnnotationModal);

    overlay
      .querySelector('.proad-annotation-save')
      .addEventListener('click', saveAnnotationAndClose);

    // --------------------------------------------------------
    // CONTEXTO — helpers
    // --------------------------------------------------------

    const readContextTable = () => {
      const data = {};

      contextBody.querySelectorAll('tr').forEach((row) => {
        const inputs = row.querySelectorAll('.proad-context-input');

        if (inputs.length !== 2) {
          return;
        }

        const key = inputs[0].value.trim();

        if (!key) {
          return;
        }

        data[key] = inputs[1].value;
      });

      return data;
    };

    const syncContextStatus = () => {
      contextStatusText.textContent = 'Salvando...';
      contextStatusDot.style.background = '#1a73e8';

      const ok = saveContextData(processKey, readContextTable());

      if (ok) {
        contextStatusText.textContent = 'Sincronizado';
        contextStatusDot.style.background = '#34a853';
      } else {
        contextStatusText.textContent = 'Falha ao salvar';
        contextStatusDot.style.background = '#c5221f';
      }
    };

    const renderContextEmpty = () => {
      contextBody.innerHTML = `
                <tr class="proad-context-empty-row">
                    <td colspan="3" class="proad-context-empty">
                        Nenhum campo adicionado.
                    </td>
                </tr>
            `;
    };

    const createContextRow = (key = '', value = '') => {
      contextBody.querySelector('.proad-context-empty-row')?.remove();

      const row = document.createElement('tr');

      const keyCell = document.createElement('td');
      const valueCell = document.createElement('td');
      const actionCell = document.createElement('td');

      const keyInput = document.createElement('input');
      keyInput.type = 'text';
      keyInput.className = 'proad-context-input';
      keyInput.placeholder = 'Campo';
      keyInput.value = key;

      const valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.className = 'proad-context-input';
      valueInput.placeholder = 'Valor';
      valueInput.value = value;

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'proad-context-remove';
      removeButton.title = 'Remover campo';
      removeButton.textContent = '×';

      removeButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        row.remove();

        if (!contextBody.querySelector('tr')) {
          renderContextEmpty();
        }

        syncContextStatus();
      });

      keyInput.addEventListener('input', syncContextStatus);
      valueInput.addEventListener('input', syncContextStatus);

      keyCell.appendChild(keyInput);
      valueCell.appendChild(valueInput);
      actionCell.appendChild(removeButton);

      row.appendChild(keyCell);
      row.appendChild(valueCell);
      row.appendChild(actionCell);

      contextBody.appendChild(row);
    };

    // Carrega linhas iniciais
    {
      const entries = Object.entries(context);

      if (entries.length === 0) {
        renderContextEmpty();
      } else {
        for (const [key, value] of entries) {
          createContextRow(key, value);
        }
      }
    }

    // Ações do contexto
    overlay
      .querySelector('[data-action="add"]')
      .addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        createContextRow();

        const rows = contextBody.querySelectorAll('tr');

        rows[rows.length - 1]?.querySelector('.proad-context-input')?.focus();

        syncContextStatus();
      });

    overlay
      .querySelector('[data-action="clear"]')
      .addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        contextBody.innerHTML = '';
        renderContextEmpty();

        clearContextData(processKey);

        contextStatusText.textContent = 'Contexto limpo';
        contextStatusDot.style.background = '#1a73e8';
      });

    // --------------------------------------------------------
    // TAREFAS — helpers
    // --------------------------------------------------------

    const persistTodos = () => {
      const data = [];

      todoList.querySelectorAll('.proad-todo-card').forEach((card) => {
        const id = card.dataset.todoId;
        const title = card.querySelector('.proad-todo-title').value;
        const done = card.querySelector('.proad-todo-checkbox').checked;

        data.push({ id, title, done });
      });

      saveTodos(processKey, data);
    };

    const renderTodoEmpty = () => {
      todoList.innerHTML = `
                <div class="proad-todo-empty">
                    Nenhuma tarefa. Clique em <strong>Adicionar tarefa</strong>.
                </div>
            `;
    };

    const refreshTodoZebra = () => {
      const cards = todoList.querySelectorAll('.proad-todo-card');
      cards.forEach((card, index) => {
        card.dataset.index = String(index);
      });
    };

    const createTodoCard = (
      todo = { id: generateId(), title: '', done: false },
    ) => {
      todoList.querySelector('.proad-todo-empty')?.remove();

      const card = document.createElement('div');
      card.className = 'proad-todo-card';
      card.dataset.todoId = todo.id;

      if (todo.done) {
        card.classList.add('is-done');
      }

      const checkLabel = document.createElement('label');
      checkLabel.className = 'proad-todo-check-wrap';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'proad-todo-checkbox';
      checkbox.checked = todo.done;

      const checkSpan = document.createElement('span');
      checkSpan.className = 'proad-todo-check';

      checkLabel.appendChild(checkbox);
      checkLabel.appendChild(checkSpan);

      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'proad-todo-title';
      titleInput.placeholder = 'Digite a tarefa...';
      titleInput.value = todo.title;

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'proad-todo-remove';
      removeButton.title = 'Remover tarefa';
      removeButton.textContent = '×';

      checkbox.addEventListener('change', () => {
        card.classList.toggle('is-done', checkbox.checked);
        persistTodos();
      });

      titleInput.addEventListener('input', persistTodos);

      titleInput.addEventListener('keydown', (event) => {
        event.stopPropagation();

        if (event.key === 'Enter') {
          event.preventDefault();

          createTodoCard();
          persistTodos();

          const allTitles = todoList.querySelectorAll('.proad-todo-title');

          allTitles[allTitles.length - 1]?.focus();
        }
      });

      titleInput.addEventListener('keyup', (event) => event.stopPropagation());
      titleInput.addEventListener('keypress', (event) =>
        event.stopPropagation(),
      );

      removeButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        card.remove();

        if (!todoList.querySelector('.proad-todo-card')) {
          renderTodoEmpty();
        }

        persistTodos();
        refreshTodoZebra();
      });

      card.appendChild(checkLabel);
      card.appendChild(titleInput);
      card.appendChild(removeButton);

      todoList.appendChild(card);

      refreshTodoZebra();
    };

    // Carrega tarefas iniciais
    {
      if (todos.length === 0) {
        renderTodoEmpty();
      } else {
        todos.forEach((todo) => createTodoCard(todo));
      }
    }

    // Adicionar tarefa
    overlay
      .querySelector('.proad-todo-add')
      .addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        createTodoCard();
        persistTodos();

        const allTitles = todoList.querySelectorAll('.proad-todo-title');

        allTitles[allTitles.length - 1]?.focus();
      });

    // --------------------------------------------------------
    // TECLADO GLOBAL
    // --------------------------------------------------------

    document.addEventListener('keydown', handleModalKeydown, true);

    // --------------------------------------------------------
    // FOCO INICIAL
    // --------------------------------------------------------

    requestAnimationFrame(() => textarea.focus());
  }

  // ============================================================
  // CÉLULA DE ANOTAÇÃO
  // ============================================================

  function createAnnotationCell(row) {
    if (row.querySelector('[data-proad-annotation-cell]')) {
      return;
    }

    const cell = document.createElement('td');

    cell.className = 'proad-annotation-cell';
    cell.dataset.proadAnnotationCell = 'true';

    row.appendChild(cell);

    renderAnnotationCell(cell, getProcessKey(row));
  }

  function renderAnnotationCell(cell, processKey) {
    const annotation = getAnnotation(processKey);
    const hasAnnotation = annotation.text.trim().length > 0;

    cell.innerHTML = '';

    cell.onclick = null;
    cell.ondblclick = null;

    if (!hasAnnotation) {
      cell.classList.add('is-empty');

      cell.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        openAnnotationEditor(processKey);
      };

      const empty = document.createElement('div');
      empty.className = 'proad-annotation-empty';

      empty.innerHTML = `
                <span class="proad-annotation-add-icon">+</span>
                <span>Adicionar anotação</span>
            `;

      cell.appendChild(empty);

      return;
    }

    cell.classList.remove('is-empty');

    cell.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    cell.ondblclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openAnnotationEditor(processKey);
    };

    const preview = document.createElement('div');

    preview.className = 'proad-annotation-preview';
    preview.textContent = annotation.text;
    preview.title = 'Duplo clique para editar';

    applyAnnotationColor(preview, annotation.color);

    cell.appendChild(preview);
  }

  function applyAnnotationColor(element, color) {
    const config = COLORS[color] || COLORS[DEFAULT_COLOR];

    element.style.backgroundColor = config.background;
    element.style.borderColor = config.border;
  }

  function refreshAnnotationCell(processKey) {
    for (const row of getRows()) {
      if (getProcessKey(row) !== processKey) {
        continue;
      }

      const cell = row.querySelector('[data-proad-annotation-cell]');

      if (cell) {
        renderAnnotationCell(cell, processKey);
      }

      return;
    }
  }

  // ============================================================
  // CABEÇALHO ANOTAÇÕES
  // ============================================================

  function createAnnotationHeader() {
    const headRow = getHeaderRow();

    if (!headRow) {
      return;
    }

    if (headRow.querySelector('[data-proad-annotations-header]')) {
      return;
    }

    const th = document.createElement('th');

    th.className = 'ui-state-default proad-annotations-header';
    th.scope = 'col';
    th.dataset.proadAnnotationsHeader = 'true';

    th.innerHTML = `
            <span class="proad-annotations-header-content" title="Ordenar por anotação">
                <span class="ui-column-title">Anotação</span>
                <span class="proad-annotations-sort">↕</span>
            </span>

            <div class="proad-annotations-filter-wrap">
                <input
                    type="text"
                    class="proad-annotations-filter"
                    autocomplete="off"
                    spellcheck="false"
                >
                <button
                    type="button"
                    class="proad-annotations-filter-clear"
                    title="Limpar filtro"
                    tabindex="-1"
                >×</button>
            </div>
        `;

    th.querySelector('.proad-annotations-header-content').addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        sortAnnotations();
      },
    );

    const input = th.querySelector('.proad-annotations-filter');
    const clear = th.querySelector('.proad-annotations-filter-clear');
    const wrap = th.querySelector('.proad-annotations-filter-wrap');

    const syncClear = () => {
      wrap.classList.toggle('has-value', input.value !== '');
    };

    input.value = annotationFilter;
    syncClear();

    input.addEventListener('input', () => {
      annotationFilter = input.value;
      syncClear();
      applyAnnotationFilter();
    });

    input.addEventListener('keydown', (event) => {
      event.stopPropagation();

      if (event.key === 'Enter') {
        event.preventDefault();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        input.value = '';
        annotationFilter = '';
        syncClear();
        applyAnnotationFilter();
      }
    });

    input.addEventListener('keyup', (event) => event.stopPropagation());
    input.addEventListener('keypress', (event) => event.stopPropagation());
    input.addEventListener('click', (event) => event.stopPropagation());
    input.addEventListener('mousedown', (event) => event.stopPropagation());

    clear.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      input.value = '';
      annotationFilter = '';
      syncClear();
      applyAnnotationFilter();

      input.focus();
    });

    headRow.appendChild(th);
  }

  // ============================================================
  // FILTRO E ZEBRA
  // ============================================================

  function applyAnnotationFilter() {
    const term = normalizeForSearch(annotationFilter);

    for (const row of getRows()) {
      let match = true;

      if (term) {
        const text = normalizeForSearch(getAnnotation(getProcessKey(row)).text);

        match = text.includes(term);
      }

      row.classList.toggle('proad-row-filtered', !match);

      getExpandedSibling(row)?.classList.toggle('proad-row-filtered', !match);
    }

    updateZebra();
  }

  function updateZebra() {
    let index = 0;

    for (const row of getRows()) {
      if (row.classList.contains('proad-row-filtered')) {
        continue;
      }

      row.dataset.proadZebra = index % 2 ? 'odd' : 'even';
      index++;
    }
  }

  // ============================================================
  // ORDENAÇÃO
  // ============================================================

  function sortAnnotations() {
    const tbody = getHtmlTable()?.querySelector('tbody');

    if (!tbody) {
      return;
    }

    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';

    const items = getRows().map((row) => ({
      row,
      extra: getExpandedSibling(row),
      text: getAnnotation(getProcessKey(row)).text.trim(),
    }));

    items.sort((a, b) => {
      const emptyA = a.text === '';
      const emptyB = b.text === '';

      if (emptyA && !emptyB) {
        return 1;
      }

      if (!emptyA && emptyB) {
        return -1;
      }

      const result = a.text.localeCompare(b.text, 'pt-BR', {
        sensitivity: 'base',
      });

      return sortDirection === 'asc' ? result : -result;
    });

    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      fragment.appendChild(item.row);

      if (item.extra) {
        fragment.appendChild(item.extra);
      }
    });

    tbody.appendChild(fragment);

    updateSortIndicator();
    updateZebra();
  }

  function updateSortIndicator() {
    const indicator = document
      .querySelector('[data-proad-annotations-header]')
      ?.querySelector('.proad-annotations-sort');

    if (!indicator) {
      return;
    }

    indicator.textContent =
      sortDirection === 'asc' ? '↑' : sortDirection === 'desc' ? '↓' : '↕';
  }

  // ============================================================
  // COLUNAS
  // ============================================================

  function getColumnHeaders() {
    const row = getHeaderRow();

    return row ? [...row.children] : [];
  }

  function getColumnTitle(th) {
    return normalizeText(th.querySelector('.ui-column-title')?.textContent);
  }

  function getColumnKind(th, index) {
    if (th.matches('[data-proad-annotations-header]')) {
      return 'annotations';
    }

    if (th.classList.contains('ui-selection-column')) {
      return 'selection';
    }

    if (getColumnTitle(th)) {
      return null;
    }

    const sample = getRows().find((row) => row.children[index]);
    const cell = sample?.children[index];

    if (cell?.querySelector('.ui-row-toggler')) {
      return 'expander';
    }

    if (
      cell?.querySelector(
        '.ui-chkbox, .ui-radiobutton, input[type="checkbox"], input[type="radio"]',
      )
    ) {
      return 'selection';
    }

    return null;
  }

  function getColumnLabel(th, index) {
    const kind = getColumnKind(th, index);

    if (kind === 'annotations') {
      return 'Anotações';
    }

    if (kind === 'selection') {
      return 'Seleção (caixa de marcação)';
    }

    if (kind === 'expander') {
      return 'Expandir detalhes';
    }

    const label = getColumnTitle(th) || normalizeText(th.textContent);

    return label || `Coluna ${index + 1}`;
  }

  function getColumnKey(th, index) {
    const kind = getColumnKind(th, index);

    if (kind) {
      return kind;
    }

    const title = getColumnTitle(th) || normalizeText(th.textContent);

    if (!title) {
      return `empty-column:${index}`;
    }

    return `label:${slugify(title)}`;
  }

  function getColumnVisibility() {
    const value = GM_getValue(COLUMN_VISIBILITY_KEY, {});

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value;
  }

  function saveColumnVisibility(value) {
    GM_setValue(COLUMN_VISIBILITY_KEY, value);
  }

  function getSavedColumnVisibility(th, index, visibility) {
    const candidates = [
      getColumnKey(th, index),
      th.id ? `id:${th.id}` : null,
      `column:${index}:${slugify(getColumnLabel(th, index))}`,
      `index:${index}`,
    ];

    for (const key of candidates) {
      if (key && Object.prototype.hasOwnProperty.call(visibility, key)) {
        return visibility[key];
      }
    }

    return undefined;
  }

  function isColumnVisible(th) {
    return (
      th.style.display !== 'none' && getComputedStyle(th).display !== 'none'
    );
  }

  function setColumnHidden(index, hidden) {
    const table = getHtmlTable();

    if (!table) {
      return;
    }

    const display = hidden ? 'none' : '';

    const header = table.querySelector('thead tr')?.children[index];

    if (header) {
      header.style.display = display;
    }

    for (const row of getRows()) {
      const cell = row.children[index];

      if (cell) {
        cell.style.display = display;
      }
    }
  }

  function applyColumnVisibility() {
    const visibility = getColumnVisibility();

    getColumnHeaders().forEach((th, index) => {
      const saved = getSavedColumnVisibility(th, index, visibility);

      if (typeof saved === 'boolean') {
        setColumnHidden(index, !saved);
      }
    });
  }

  // ============================================================
  // PAINEL DE COLUNAS
  // ============================================================

  function repositionColumnPanel() {
    const panel = document.getElementById(COLUMN_PANEL_ID);
    const button = document.getElementById(COLUMN_BUTTON_ID);

    if (!panel || !button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || 315;
    const panelHeight = panel.offsetHeight;

    let left = rect.right - panelWidth;

    left = Math.max(12, Math.min(left, window.innerWidth - panelWidth - 12));

    let top = rect.bottom + 8;

    if (top + panelHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - panelHeight - 8);
    }

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function closeColumnPanel() {
    document.getElementById(COLUMN_PANEL_ID)?.remove();

    window.removeEventListener('resize', repositionColumnPanel);
    window.removeEventListener('scroll', repositionColumnPanel, true);
  }

  function toggleColumnPanel() {
    if (document.getElementById(COLUMN_PANEL_ID)) {
      closeColumnPanel();
    } else {
      openColumnPanel();
    }
  }

  function openColumnPanel() {
    closeColumnPanel();

    if (!document.getElementById(COLUMN_BUTTON_ID)) {
      return;
    }

    const panel = document.createElement('div');
    panel.id = COLUMN_PANEL_ID;

    panel.innerHTML = `
            <div class="proad-column-panel-header">
                <div>
                    <div class="proad-column-panel-title">Colunas</div>
                    <div class="proad-column-panel-subtitle">Escolha o que deseja exibir</div>
                </div>

                <button type="button" class="proad-column-panel-close" title="Fechar">×</button>
            </div>

            <div class="proad-column-panel-list"></div>

            <div class="proad-column-panel-footer">
                <button type="button" class="proad-columns-show-all">Mostrar todas</button>
            </div>
        `;

    document.body.appendChild(panel);

    const list = panel.querySelector('.proad-column-panel-list');
    const headers = getColumnHeaders();
    const visibility = getColumnVisibility();

    headers.forEach((th, index) => {
      const label = getColumnLabel(th, index);
      const key = getColumnKey(th, index);
      const saved = getSavedColumnVisibility(th, index, visibility);

      const visible = typeof saved === 'boolean' ? saved : isColumnVisible(th);

      const item = document.createElement('label');
      item.className = 'proad-column-item';

      item.innerHTML = `
                <input type="checkbox" ${visible ? 'checked' : ''}>
                <span class="proad-column-check"></span>
                <span class="proad-column-item-label">${escapeHtml(label)}</span>
            `;

      const checkbox = item.querySelector('input');

      checkbox.addEventListener('change', () => {
        const current = getColumnVisibility();

        current[key] = checkbox.checked;

        saveColumnVisibility(current);
        setColumnHidden(index, !checkbox.checked);
      });

      list.appendChild(item);
    });

    panel
      .querySelector('.proad-column-panel-close')
      .addEventListener('click', closeColumnPanel);

    panel
      .querySelector('.proad-columns-show-all')
      .addEventListener('click', () => {
        const current = getColumnVisibility();

        headers.forEach((th, index) => {
          current[getColumnKey(th, index)] = true;
          setColumnHidden(index, false);
        });

        saveColumnVisibility(current);

        closeColumnPanel();
        openColumnPanel();
      });

    repositionColumnPanel();

    window.addEventListener('resize', repositionColumnPanel);
    window.addEventListener('scroll', repositionColumnPanel, true);
  }

  // ============================================================
  // BOTÃO DE COLUNAS
  // ============================================================

  function createColumnButton() {
    const tableContainer = getTableContainer();

    if (!tableContainer) {
      return;
    }

    if (document.getElementById(COLUMN_BUTTON_ID)) {
      return;
    }

    const datatableHeader = tableContainer.querySelector(
      '.ui-datatable-header',
    );

    if (!datatableHeader) {
      return;
    }

    let rightGroup = datatableHeader.querySelector('.ui-toolbar-group-right');

    if (!rightGroup) {
      const toolbar = datatableHeader.querySelector('.ui-toolbar');

      if (!toolbar) {
        return;
      }

      rightGroup = document.createElement('div');
      rightGroup.className = 'ui-toolbar-group-right';

      toolbar.appendChild(rightGroup);
    }

    const button = document.createElement('button');

    button.id = COLUMN_BUTTON_ID;
    button.type = 'button';
    button.className = 'proad-columns-button';
    button.title = 'Ocultar ou mostrar colunas';

    button.innerHTML = `
            <span class="proad-columns-button-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 6h14"></path>
                    <path d="M5 12h14"></path>
                    <path d="M5 18h14"></path>
                </svg>
            </span>
            <span>Colunas</span>
        `;

    rightGroup.appendChild(button);

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      toggleColumnPanel();
    });
  }

  // ============================================================
  // FECHAR PAINEL CLICANDO FORA
  // ============================================================

  function setupDocumentEvents() {
    if (document.documentElement.dataset.proadModernEvents) {
      return;
    }

    document.documentElement.dataset.proadModernEvents = 'true';

    document.addEventListener('click', (event) => {
      const panel = document.getElementById(COLUMN_PANEL_ID);

      if (!panel) {
        return;
      }

      const button = document.getElementById(COLUMN_BUTTON_ID);

      if (panel.contains(event.target)) {
        return;
      }

      if (button && button.contains(event.target)) {
        return;
      }

      closeColumnPanel();
    });
  }

  // ============================================================
  // ESTILO MODERNO
  // ============================================================

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');

    style.id = STYLE_ID;

    style.textContent = `

            /* ================================================= */
            /* TOKENS                                             */
            /* ================================================= */

            :root {
                --slate-50:  #f8fafc;
                --slate-100: #f1f5f9;
                --slate-200: #e2e8f0;
                --slate-300: #cbd5e1;
                --slate-400: #94a3b8;
                --slate-500: #64748b;
                --slate-600: #475569;
                --slate-700: #334155;
                --slate-800: #1e293b;
                --slate-900: #0f172a;

                --blue-50:  #eff6ff;
                --blue-100: #dbeafe;
                --blue-500: #3b82f6;
                --blue-600: #2563eb;
                --blue-700: #1d4ed8;

                --ring: 0 0 0 3px rgb(59 130 246 / .25);

                --shadow-sm: 0 1px 2px 0 rgb(15 23 42 / .06);
                --shadow-md:
                    0 4px 8px -2px rgb(15 23 42 / .10),
                    0 2px 4px -2px rgb(15 23 42 / .06);
                --shadow-lg:
                    0 20px 40px -8px rgb(15 23 42 / .22),
                    0 8px 16px -6px rgb(15 23 42 / .10);

                --font-ui:
                    "Inter", "Segoe UI", system-ui, -apple-system,
                    BlinkMacSystemFont, sans-serif;
            }

            /* ================================================= */
            /* PÁGINA                                             */
            /* ================================================= */

            html,
            body,
            .wrapper,
            .content-wrapper,
            main.content-wrapper {
                background: var(--slate-200) !important;
            }

            main.content-wrapper {
                font-family: var(--font-ui);
                color: var(--slate-800);
            }

            #conteudoPagina {
                padding: 0 18px 24px;
            }

            .content-header {
                padding: 15px 4px 12px;
            }

            .tituloPagina {
                margin: 0 !important;
                font-size: 22px !important;
                line-height: 1.25;
                font-weight: 650 !important;
                letter-spacing: -.25px;
                color: var(--slate-900) !important;
            }

            .descricaoPagina {
                color: var(--slate-500);
            }

            /* ================================================= */
            /* CARD PRINCIPAL                                     */
            /* ================================================= */

            .box {
                margin-bottom: 14px;
                border: 1px solid var(--slate-300) !important;
                border-radius: 14px !important;
                background: var(--slate-50) !important;
                box-shadow: var(--shadow-md) !important;
                overflow: visible !important;
            }

            .box-body {
                padding: 14px 16px !important;
                background: transparent !important;
            }

            /* ================================================= */
            /* ABAS (página)                                      */
            /* ================================================= */

            .seletorAbaArea {
                color: var(--slate-600);
            }

            .seletorAbaArea.ui-buttonset {
                display: inline-flex;
                gap: 4px;
                padding: 4px;
                border: 1px solid var(--slate-300);
                border-radius: 10px;
                background: var(--slate-200);
            }

            .seletorAbaArea .ui-button {
                border: 0 !important;
                border-radius: 7px !important;
                background: transparent !important;
                box-shadow: none !important;
                color: var(--slate-600) !important;
            }

            .seletorAbaArea .ui-button:hover {
                background: var(--slate-100) !important;
                color: var(--slate-800) !important;
            }

            .seletorAbaArea .ui-button.ui-state-active {
                background: #ffffff !important;
                color: var(--blue-600) !important;
                box-shadow: var(--shadow-sm) !important;
                font-weight: 600;
            }

            /* ================================================= */
            /* TOOLBAR                                            */
            /* ================================================= */

            [id="formProtocolos:toolbar"] {
                margin-top: 4px;
                padding: 10px 12px !important;
                border: 1px solid var(--slate-300) !important;
                border-radius: 10px !important;
                background: var(--slate-100) !important;
                box-shadow: none !important;
                overflow: visible !important;
            }

            #formProtocolos .ui-toolbar-group-left,
            #formProtocolos .ui-toolbar-group-right {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 8px;
                min-width: 0;
            }

            #formProtocolos button.ui-button {
                min-height: 32px;
                border: 1px solid var(--slate-300) !important;
                border-radius: 8px !important;
                background: #ffffff !important;
                color: var(--slate-700) !important;
                box-shadow: var(--shadow-sm) !important;
                transition: background .12s ease, border-color .12s ease, box-shadow .12s ease;
            }

            #formProtocolos button.ui-button:hover {
                background: var(--slate-50) !important;
                border-color: var(--slate-400) !important;
                box-shadow: var(--shadow-md) !important;
            }

            /* ================================================= */
            /* INPUTS / SELECTS                                   */
            /* ================================================= */

            #formProtocolos .ui-inputfield,
            #formProtocolos .ui-selectonemenu,
            #formProtocolos .ui-selectcheckboxmenu,
            #formProtocolos .ui-autocomplete,
            #formProtocolos .ui-autocomplete-input,
            #formProtocolos .ui-autocomplete-multiple-container,
            #formProtocolos .ui-calendar,
            #formProtocolos .ui-column-filter {
                box-sizing: border-box !important;
                max-width: 100%;
            }

            #formProtocolos .ui-inputfield {
                min-height: 32px;
                border: 1px solid var(--slate-300) !important;
                border-radius: 8px !important;
                background: #ffffff !important;
                color: var(--slate-800) !important;
                box-shadow: none !important;
                transition: border-color .12s ease, box-shadow .12s ease;
            }

            #formProtocolos .ui-inputfield:focus {
                border-color: var(--blue-500) !important;
                box-shadow: var(--ring) !important;
                outline: none !important;
            }

            #formProtocolos .ui-selectonemenu,
            #formProtocolos .ui-selectcheckboxmenu,
            #formProtocolos .ui-autocomplete-multiple-container {
                border: 1px solid var(--slate-300) !important;
                border-radius: 8px !important;
                background: #ffffff !important;
                box-shadow: none !important;
            }

            #formProtocolos .ui-selectonemenu .ui-inputfield,
            #formProtocolos .ui-selectcheckboxmenu .ui-inputfield,
            #formProtocolos .ui-autocomplete-multiple-container .ui-inputfield {
                min-height: 0;
                border: 0 !important;
                border-radius: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
            }

            #formProtocolos .ui-selectonemenu .ui-selectonemenu-label {
                display: block;
                width: 100% !important;
                box-sizing: border-box !important;
                padding-right: 2.4em !important;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            #formProtocolos .ui-selectonemenu .ui-selectonemenu-trigger {
                border: 0 !important;
                background: transparent !important;
            }

            #formProtocolos .ui-selectonemenu:focus-within,
            #formProtocolos .ui-selectonemenu.ui-state-focus,
            #formProtocolos .ui-selectcheckboxmenu.ui-state-focus,
            #formProtocolos .ui-autocomplete-multiple-container.ui-state-focus {
                border-color: var(--blue-500) !important;
                box-shadow: var(--ring) !important;
            }

            [id="formProtocolos:remetentes"] {
                box-sizing: border-box !important;
                max-width: 100%;
            }

            /* ================================================= */
            /* DATATABLE                                          */
            /* ================================================= */

            [id="${TABLE_ID}"] {
                border: 1px solid var(--slate-300);
                border-radius: 12px;
                background: var(--slate-50);
                overflow: visible;
                box-shadow: var(--shadow-md);
            }

            [id="${TABLE_ID}"] .ui-datatable-header {
                padding: 9px 10px !important;
                border: 0 !important;
                border-bottom: 1px solid var(--slate-200) !important;
                border-radius: 12px 12px 0 0;
                background: var(--slate-100) !important;
            }

            [id="${TABLE_ID}"] .ui-datatable-tablewrapper {
                border-radius: 0 0 12px 12px;
                overflow-x: auto;
            }

            [id="${TABLE_ID}"] table {
                border-collapse: separate !important;
                border-spacing: 0 !important;
            }

            [id="${TABLE_ID}"] thead th {
                position: sticky;
                top: 0;
                z-index: 5;
                height: 42px;
                padding: 8px 10px !important;
                border: 0 !important;
                border-bottom: 1px solid var(--slate-300) !important;
                background: var(--slate-200) !important;
                color: var(--slate-700) !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                text-transform: none !important;
                overflow: visible !important;
                box-sizing: border-box;
            }

            [id="${TABLE_ID}"] tbody td {
                padding: 8px 10px !important;
                border: 0 !important;
                border-bottom: 1px solid var(--slate-200) !important;
                background: var(--slate-50);
                color: var(--slate-700);
                font-size: 12.5px;
                vertical-align: middle;
            }

            [id="${TABLE_ID}"] tbody tr[data-proad-zebra="odd"] td {
                background: var(--slate-100);
            }

            [id="${TABLE_ID}"] tbody tr[data-proad-zebra="even"] td {
                background: var(--slate-50);
            }

            [id="${TABLE_ID}"] tbody tr:hover td {
                background: var(--blue-50) !important;
            }

            [id="${TABLE_ID}"] tbody tr.ui-state-highlight td {
                background: var(--blue-100) !important;
                color: var(--slate-900);
            }

            [id="${TABLE_ID}"] tbody tr:last-child td {
                border-bottom: 0 !important;
            }

            [id="${TABLE_ID}"] tr.proad-row-filtered {
                display: none !important;
            }

            [id="${TABLE_ID}"] a.panel-item-value {
                color: var(--blue-600);
                text-decoration: none;
                transition: color .1s ease;
            }

            [id="${TABLE_ID}"] a.panel-item-value:hover {
                color: var(--blue-700);
                text-decoration: underline;
            }

            /* ================================================= */
            /* FILTROS DA TABELA                                  */
            /* ================================================= */

            [id="${TABLE_ID}"] .ui-column-filter,
            [id="${TABLE_ID}"] thead th input[type="text"]:not(.proad-annotations-filter) {
                display: block;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                box-sizing: border-box !important;
                margin: 5px 0 0 !important;
                min-height: 28px !important;
                padding: 4px 8px !important;
                border: 1px solid var(--slate-300) !important;
                border-radius: 7px !important;
                background: #ffffff !important;
                color: var(--slate-800) !important;
                font-size: 11.5px !important;
                box-shadow: none !important;
                transition: border-color .12s ease, box-shadow .12s ease;
            }

            [id="${TABLE_ID}"] .ui-column-filter:focus,
            [id="${TABLE_ID}"] thead th input[type="text"]:focus {
                border-color: var(--blue-500) !important;
                box-shadow: var(--ring) !important;
                outline: none !important;
            }

            [id="${TABLE_ID}"] thead th .ui-column-customfilter,
            [id="${TABLE_ID}"] thead th .ui-selectonemenu,
            [id="${TABLE_ID}"] thead th .ui-column-customfilter > * {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            [id="${TABLE_ID}"] thead th .ui-selectonemenu {
                margin-top: 5px;
                border: 1px solid var(--slate-300) !important;
                border-radius: 7px !important;
                background: #ffffff !important;
            }

            [id="${TABLE_ID}"] thead th .ui-selectonemenu .ui-inputfield {
                border: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
            }

            /* ================================================= */
            /* ANOTAÇÕES — coluna                                 */
            /* ================================================= */

            [data-proad-annotations-header] {
                width: 320px !important;
                min-width: 320px !important;
                text-align: left;
            }

            .proad-annotations-header-content {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                user-select: none;
            }

            .proad-annotations-header-content:hover {
                color: var(--blue-600);
            }

            .proad-annotations-sort {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 17px;
                height: 17px;
                color: var(--slate-500);
                font-size: 12px;
            }

            .proad-annotations-filter-wrap {
                position: relative;
                width: 100%;
                margin-top: 5px;
            }

            .proad-annotations-filter {
                display: block;
                width: 100%;
                min-width: 0;
                height: 28px;
                box-sizing: border-box;
                padding: 4px 26px 4px 8px;
                border: 1px solid var(--slate-300);
                border-radius: 7px;
                background: #ffffff;
                color: var(--slate-800);
                font-family: inherit;
                font-size: 11.5px;
                font-weight: 400;
                outline: none;
                box-shadow: none;
                transition: border-color .12s ease, box-shadow .12s ease;
            }

            .proad-annotations-filter::placeholder {
                color: var(--slate-400);
            }

            .proad-annotations-filter:focus {
                border-color: var(--blue-500);
                box-shadow: var(--ring);
            }

            .proad-annotations-filter-clear {
                position: absolute;
                top: 50%;
                right: 4px;
                width: 20px;
                height: 20px;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 0;
                border: 0;
                border-radius: 5px;
                background: transparent;
                color: var(--slate-500);
                font-size: 16px;
                line-height: 1;
                cursor: pointer;
                transform: translateY(-50%);
            }

            .proad-annotations-filter-wrap.has-value .proad-annotations-filter-clear {
                display: flex;
            }

            .proad-annotations-filter-clear:hover {
                background: var(--slate-200);
                color: var(--slate-800);
            }

            .proad-annotation-cell {
                width: 320px !important;
                min-width: 320px !important;
                max-width: 320px !important;
                padding: 7px 8px !important;
                vertical-align: middle !important;
                cursor: pointer;
                user-select: none;
            }

            .proad-annotation-preview {
                width: 100%;
                box-sizing: border-box;
                padding: 8px 10px;
                border: 1px solid;
                border-radius: 8px;
                color: var(--slate-800);
                font-size: 13.5px;
                line-height: 1.42;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
                max-height: 112px;
                overflow: hidden;
                cursor: pointer;
                transition: box-shadow .12s ease, filter .12s ease;
            }

            .proad-annotation-preview:hover {
                filter: brightness(.98);
                box-shadow: var(--shadow-md);
            }

            .proad-annotation-empty {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                min-height: 30px;
                padding: 5px 10px;
                border: 1px dashed var(--slate-300);
                border-radius: 8px;
                background: rgb(255 255 255 / .55);
                color: var(--slate-500);
                font-size: 12.5px;
                transition: border-color .12s ease, background .12s ease, color .12s ease;
            }

            .proad-annotation-cell.is-empty:hover .proad-annotation-empty {
                border-color: var(--blue-500);
                background: var(--blue-50);
                color: var(--blue-600);
            }

            .proad-annotation-add-icon {
                width: 18px;
                height: 18px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: var(--slate-200);
                color: var(--slate-600);
                font-size: 14px;
                font-weight: 600;
            }

            /* ================================================= */
            /* BOTÃO COLUNAS                                      */
            /* ================================================= */

            .proad-columns-button {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                height: 32px;
                padding: 0 11px;
                border: 1px solid var(--slate-300);
                border-radius: 8px;
                background: #ffffff;
                color: var(--slate-700);
                font-family: var(--font-ui);
                font-size: 12.5px;
                font-weight: 500;
                cursor: pointer;
                box-shadow: var(--shadow-sm);
                transition: background .12s ease, border-color .12s ease, box-shadow .12s ease, transform .08s ease;
            }

            .proad-columns-button:hover {
                background: var(--slate-50);
                border-color: var(--slate-400);
                box-shadow: var(--shadow-md);
            }

            .proad-columns-button:active {
                transform: translateY(1px);
            }

            .proad-columns-button:focus-visible {
                outline: 2px solid var(--blue-500);
                outline-offset: 2px;
            }

            .proad-columns-button-icon {
                width: 16px;
                height: 16px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .proad-columns-button-icon svg {
                width: 16px;
                height: 16px;
                fill: none;
                stroke: currentColor;
                stroke-width: 1.8;
                stroke-linecap: round;
            }

            /* ================================================= */
            /* PAINEL DE COLUNAS                                  */
            /* ================================================= */

            #${COLUMN_PANEL_ID} {
                position: fixed;
                width: 315px;
                max-width: calc(100vw - 24px);
                z-index: 2147483640;
                box-sizing: border-box;
                overflow: hidden;
                border: 1px solid var(--slate-300);
                border-radius: 12px;
                background: var(--slate-50);
                box-shadow: var(--shadow-lg);
                font-family: var(--font-ui);
            }

            .proad-column-panel-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
                padding: 14px 15px 12px;
                border-bottom: 1px solid var(--slate-200);
            }

            .proad-column-panel-title {
                font-size: 14px;
                font-weight: 650;
                color: var(--slate-900);
            }

            .proad-column-panel-subtitle {
                margin-top: 2px;
                color: var(--slate-500);
                font-size: 11.5px;
            }

            .proad-column-panel-close {
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                border: 0;
                border-radius: 7px;
                background: transparent;
                color: var(--slate-500);
                font-size: 21px;
                cursor: pointer;
            }

            .proad-column-panel-close:hover {
                background: var(--slate-200);
                color: var(--slate-900);
            }

            .proad-column-panel-list {
                max-height: 360px;
                overflow-y: auto;
                padding: 6px;
            }

            .proad-column-panel-list::-webkit-scrollbar {
                width: 7px;
            }

            .proad-column-panel-list::-webkit-scrollbar-thumb {
                background: var(--slate-300);
                border-radius: 20px;
            }

            .proad-column-item {
                position: relative;
                display: flex;
                align-items: center;
                gap: 9px;
                min-height: 36px;
                padding: 0 9px;
                border-radius: 8px;
                cursor: pointer;
                user-select: none;
            }

            .proad-column-item:hover {
                background: var(--slate-200);
            }

            .proad-column-item input {
                position: absolute;
                opacity: 0;
                pointer-events: none;
            }

            .proad-column-check {
                width: 17px;
                height: 17px;
                flex: 0 0 17px;
                position: relative;
                box-sizing: border-box;
                border: 1px solid var(--slate-400);
                border-radius: 5px;
                background: #ffffff;
            }

            .proad-column-item input:checked + .proad-column-check {
                border-color: var(--blue-600);
                background: var(--blue-600);
            }

            .proad-column-item input:checked + .proad-column-check::after {
                content: "";
                position: absolute;
                left: 5px;
                top: 1px;
                width: 4px;
                height: 9px;
                border: solid #ffffff;
                border-width: 0 2px 2px 0;
                transform: rotate(45deg);
            }

            .proad-column-item-label {
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                color: var(--slate-700);
                font-size: 12.5px;
            }

            .proad-column-panel-footer {
                display: flex;
                justify-content: flex-end;
                padding: 9px 11px;
                border-top: 1px solid var(--slate-200);
                background: var(--slate-100);
            }

            .proad-columns-show-all {
                border: 0;
                border-radius: 7px;
                padding: 6px 10px;
                background: transparent;
                color: var(--blue-600);
                font-family: inherit;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
            }

            .proad-columns-show-all:hover {
                background: var(--blue-100);
            }

            /* ================================================= */
            /* MODAL                                              */
            /* ================================================= */

            #${MODAL_ID} {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                font-family: var(--font-ui);
            }

            .proad-annotation-backdrop {
                position: absolute;
                inset: 0;
                background: rgb(15 23 42 / .45);
                backdrop-filter: blur(3px);
            }

            .proad-annotation-dialog {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 570px;
                max-width: calc(100vw - 28px);
                transform: translate(-50%, -50%);
                overflow: hidden;
                border: 1px solid var(--slate-300);
                border-radius: 14px;
                background: var(--slate-50);
                box-shadow: var(--shadow-lg);

                display: flex;
                flex-direction: column;

                max-height: calc(100vh - 40px);
            }

            .proad-annotation-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                padding: 16px 18px 14px;
                border-bottom: 1px solid var(--slate-200);
                flex: 0 0 auto;
            }

            .proad-annotation-title {
                font-size: 16px;
                font-weight: 650;
                color: var(--slate-900);
            }

            .proad-annotation-process {
                margin-top: 3px;
                color: var(--slate-500);
                font-size: 12px;
            }

            .proad-annotation-close {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                border: 0;
                border-radius: 8px;
                background: transparent;
                color: var(--slate-500);
                font-size: 23px;
                cursor: pointer;
            }

            .proad-annotation-close:hover {
                background: var(--slate-200);
                color: var(--slate-900);
            }

            /* ================================================= */
            /* ABAS DO MODAL                                      */
            /* ================================================= */

            .proad-annotation-tabs {
                display: flex;
                gap: 2px;
                padding: 8px 18px 0;
                border-bottom: 1px solid var(--slate-200);
                background: var(--slate-50);
                flex: 0 0 auto;
            }

            .proad-tab-button {
                position: relative;
                padding: 8px 14px 10px;
                border: 0;
                background: transparent;
                color: var(--slate-500);
                font-family: inherit;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                border-radius: 8px 8px 0 0;
                transition: color .12s ease, background .12s ease;
            }

            .proad-tab-button:hover {
                color: var(--slate-800);
                background: var(--slate-100);
            }

            .proad-tab-button.is-active {
                color: var(--blue-600);
                font-weight: 600;
            }

            .proad-tab-button.is-active::after {
                content: "";
                position: absolute;
                left: 8px;
                right: 8px;
                bottom: -1px;
                height: 2px;
                background: var(--blue-600);
                border-radius: 2px 2px 0 0;
            }

            /* ================================================= */
            /* CONTEÚDO DAS ABAS                                  */
            /* ================================================= */

            .proad-annotation-content {
                padding: 16px 18px 18px;

                flex: 1 1 auto;
                overflow-y: auto;
                min-height: 0;
            }

            .proad-tab-panel {
                display: none;
            }

            .proad-tab-panel.is-active {
                display: block;
            }

            .proad-tab-panel[hidden] {
                display: none !important;
            }

            /* ================================================= */
            /* ABA ANOTAÇÃO                                       */
            /* ================================================= */

            .proad-annotation-textarea {
                display: block;
                width: 100%;
                min-height: 190px;
                box-sizing: border-box;
                resize: vertical;
                padding: 11px 12px;
                border: 1px solid var(--slate-300);
                border-radius: 9px;
                outline: none;
                background: #ffffff;
                color: var(--slate-800);
                font-family: inherit;
                font-size: 14px;
                line-height: 1.5;
                transition: border-color .12s ease, box-shadow .12s ease;
            }

            .proad-annotation-textarea:focus {
                border-color: var(--blue-500);
                box-shadow: var(--ring);
            }

            .proad-annotation-color-block {
                margin-top: 16px;
            }

            .proad-annotation-label {
                margin-bottom: 8px;
                color: var(--slate-600);
                font-size: 12px;
                font-weight: 600;
            }

            .proad-annotation-color-options {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }

            .proad-color-option {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                padding: 6px 10px;
                border: 1px solid transparent;
                border-radius: 8px;
                color: var(--slate-600);
                font-size: 12.5px;
                cursor: pointer;
            }

            .proad-color-option:hover {
                background: var(--slate-200);
            }

            .proad-color-option.is-selected {
                border-color: var(--slate-300);
                background: #ffffff;
            }

            .proad-color-option input {
                margin: 0;
            }

            .proad-color-circle {
                width: 19px;
                height: 19px;
                box-sizing: border-box;
                border: 1px solid;
                border-radius: 6px;
            }

            /* ================================================= */
            /* ABA CONTEXTO                                       */
            /* ================================================= */

            .proad-context-table-wrap {
                border: 1px solid var(--slate-200);
                border-radius: 10px;
                background: #ffffff;
                overflow: hidden;
                max-height: 300px;
                overflow-y: auto;
            }

            .proad-context-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
            }

            .proad-context-table thead th {
                position: sticky;
                top: 0;
                height: 32px;
                padding: 0 10px;
                background: var(--slate-100);
                color: var(--slate-500);
                border-bottom: 1px solid var(--slate-200);
                font-size: 10.5px;
                font-weight: 600;
                text-align: left;
                text-transform: uppercase;
                letter-spacing: .4px;
            }

            .proad-context-table thead th:first-child { width: 32%; }
            .proad-context-table thead th:nth-child(2) { width: 56%; }
            .proad-context-table thead th:last-child { width: 12%; }

            .proad-context-table tbody td {
                height: 36px;
                padding: 0;
                border-bottom: 1px solid var(--slate-100);
                vertical-align: middle;
            }

            .proad-context-table tbody tr:last-child td {
                border-bottom: 0;
            }

            .proad-context-input {
                display: block;
                width: 100%;
                height: 36px;
                box-sizing: border-box;
                padding: 6px 10px;
                border: 0;
                outline: 0;
                background: transparent;
                color: var(--slate-800);
                font-family: inherit;
                font-size: 12.5px;
            }

            .proad-context-input::placeholder {
                color: var(--slate-400);
            }

            .proad-context-input:focus {
                background: var(--blue-50);
            }

            .proad-context-remove {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                margin: 0 auto;
                padding: 0;
                border: 0;
                border-radius: 5px;
                background: transparent;
                color: var(--slate-400);
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                transition: background .12s ease, color .12s ease;
            }

            .proad-context-remove:hover {
                background: #fff5f5;
                color: #c5221f;
            }

            .proad-context-empty {
                padding: 22px 12px !important;
                text-align: center;
                color: var(--slate-500);
                font-size: 12px;
            }

            .proad-context-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 10px;
                padding: 6px 8px 6px 10px;
                border: 1px solid var(--slate-200);
                border-radius: 9px;
                background: var(--slate-100);
            }

            .proad-context-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #34a853;
            }

            .proad-context-actions {
                display: flex;
                gap: 6px;
            }

            .proad-context-action {
                height: 28px;
                padding: 0 10px;
                border: 1px solid var(--slate-300);
                border-radius: 7px;
                background: #ffffff;
                color: var(--slate-700);
                font-family: inherit;
                font-size: 11.5px;
                font-weight: 500;
                cursor: pointer;
                transition: background .12s ease, border-color .12s ease;
            }

            .proad-context-action:hover {
                background: var(--slate-50);
                border-color: var(--slate-400);
            }

            /* ================================================= */
            /* ABA TAREFAS (estilo Trello)                        */
            /* ================================================= */

            .proad-todo-board {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .proad-todo-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .proad-todo-empty {
                padding: 22px 14px;
                border: 1px dashed var(--slate-300);
                border-radius: 10px;
                background: rgb(255 255 255 / .5);
                color: var(--slate-500);
                font-size: 12.5px;
                text-align: center;
            }

            .proad-todo-empty strong {
                color: var(--slate-700);
                font-weight: 600;
            }

            .proad-todo-card {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 12px;
                border: 1px solid var(--slate-200);
                border-radius: 9px;
                background: #ffffff;
                box-shadow: var(--shadow-sm);
                transition: box-shadow .12s ease, border-color .12s ease, background .12s ease;
            }

            .proad-todo-card:hover {
                border-color: var(--slate-300);
                box-shadow: var(--shadow-md);
            }

            .proad-todo-card.is-done {
                background: var(--slate-50);
                opacity: .78;
            }

            .proad-todo-check-wrap {
                position: relative;
                flex: 0 0 18px;
                width: 18px;
                height: 18px;
                display: inline-flex;
                cursor: pointer;
            }

            .proad-todo-checkbox {
                position: absolute;
                opacity: 0;
                pointer-events: none;
            }

            .proad-todo-check {
                width: 18px;
                height: 18px;
                box-sizing: border-box;
                border: 1.5px solid var(--slate-400);
                border-radius: 5px;
                background: #ffffff;
                position: relative;
                transition: background .12s ease, border-color .12s ease;
            }

            .proad-todo-check-wrap:hover .proad-todo-check {
                border-color: var(--blue-500);
            }

            .proad-todo-checkbox:checked + .proad-todo-check {
                border-color: var(--blue-600);
                background: var(--blue-600);
            }

            .proad-todo-checkbox:checked + .proad-todo-check::after {
                content: "";
                position: absolute;
                left: 5px;
                top: 1px;
                width: 5px;
                height: 10px;
                border: solid #ffffff;
                border-width: 0 2px 2px 0;
                transform: rotate(45deg);
            }

            .proad-todo-title {
                flex: 1 1 auto;
                min-width: 0;
                border: 0;
                outline: 0;
                padding: 4px 2px;
                background: transparent;
                color: var(--slate-800);
                font-family: inherit;
                font-size: 13px;
                line-height: 1.4;
                transition: color .12s ease;
            }

            .proad-todo-title::placeholder {
                color: var(--slate-400);
            }

            .proad-todo-card.is-done .proad-todo-title {
                color: var(--slate-400);
                text-decoration: line-through;
            }

            .proad-todo-remove {
                flex: 0 0 26px;
                width: 26px;
                height: 26px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                border: 0;
                border-radius: 6px;
                background: transparent;
                color: var(--slate-400);
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                transition: background .12s ease, color .12s ease;
            }

            .proad-todo-remove:hover {
                background: #fff5f5;
                color: #c5221f;
            }

            .proad-todo-add {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                width: 100%;
                padding: 10px 12px;
                border: 1px dashed var(--slate-300);
                border-radius: 9px;
                background: transparent;
                color: var(--slate-600);
                font-family: inherit;
                font-size: 12.5px;
                font-weight: 500;
                cursor: pointer;
                transition: background .12s ease, border-color .12s ease, color .12s ease;
            }

            .proad-todo-add:hover {
                border-color: var(--blue-500);
                background: var(--blue-50);
                color: var(--blue-600);
            }

            .proad-todo-add-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: var(--slate-200);
                color: var(--slate-600);
                font-size: 14px;
                font-weight: 600;
            }

            .proad-todo-add:hover .proad-todo-add-icon {
                background: var(--blue-100);
                color: var(--blue-600);
            }

            /* ================================================= */
            /* FOOTER DO MODAL                                    */
            /* ================================================= */

            .proad-annotation-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 15px;
                padding: 11px 18px;
                border-top: 1px solid var(--slate-200);
                background: var(--slate-100);
                flex: 0 0 auto;
            }

            .proad-annotation-shortcut {
                color: var(--slate-500);
                font-size: 11px;
            }

            .proad-annotation-actions {
                display: flex;
                gap: 8px;
            }

            .proad-btn-secondary,
            .proad-btn-primary {
                min-width: 84px;
                height: 34px;
                padding: 0 14px;
                border-radius: 8px;
                font-family: inherit;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
            }

            .proad-btn-secondary {
                border: 1px solid var(--slate-300);
                background: #ffffff;
                color: var(--slate-700);
            }

            .proad-btn-secondary:hover {
                background: var(--slate-100);
            }

            .proad-btn-primary {
                border: 1px solid var(--blue-600);
                background: var(--blue-600);
                color: #ffffff;
                box-shadow: 0 1px 2px rgb(37 99 235 / .25);
            }

            .proad-btn-primary:hover {
                border-color: var(--blue-700);
                background: var(--blue-700);
            }

            /* ================================================= */
            /* RESPONSIVO                                         */
            /* ================================================= */

            @media (max-width: 900px) {

                [id="${TABLE_ID}"] thead th {
                    position: static;
                }

                .proad-annotation-cell,
                [data-proad-annotations-header] {
                    width: 280px !important;
                    min-width: 280px !important;
                }

                .proad-annotation-shortcut {
                    display: none;
                }
            }

            @media (max-width: 640px) {

                #conteudoPagina {
                    padding: 0 8px 18px;
                }

                .box-body {
                    padding: 10px !important;
                }

                .proad-annotation-dialog {
                    width: calc(100vw - 18px);
                    max-height: calc(100vh - 24px);
                }

                .proad-annotation-content,
                .proad-annotation-header {
                    padding: 13px;
                }

                .proad-annotation-footer {
                    padding: 10px 13px;
                }

                .proad-columns-button {
                    padding: 0 8px;
                }
            }
        `;

    document.head.appendChild(style);
  }

  // ============================================================
  // APLICAÇÃO
  // ============================================================

  function applyEnhancements() {
    if (isApplying) {
      return;
    }

    if (!getTableContainer()) {
      return;
    }

    isApplying = true;

    try {
      createColumnButton();
      createAnnotationHeader();

      for (const row of getRows()) {
        createAnnotationCell(row);
      }

      applyColumnVisibility();
      applyAnnotationFilter();
    } finally {
      isApplying = false;
    }
  }

  // ============================================================
  // OBSERVADOR
  // ============================================================

  function observePage() {
    if (bodyObserver) {
      return;
    }

    bodyObserver = new MutationObserver((mutations) => {
      const relevant = mutations.some(
        (mutation) => mutation.type === 'childList',
      );

      if (!relevant) {
        return;
      }

      clearTimeout(observePage.timer);

      observePage.timer = setTimeout(applyEnhancements, 60);
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ============================================================
  // INIT
  // ============================================================

  function init() {
    migrateLegacyContexts();

    injectStyles();
    setupDocumentEvents();
    applyEnhancements();
    observePage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
