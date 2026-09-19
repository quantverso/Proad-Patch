import {
  loadProadContext,
  loadTodos,
} from '../../utils/storage';

import {
  applyAnnotationFilter,
  COLORS,
  DEFAULT_COLOR,
  getAnnotation,
  refreshAnnotationCell,
  saveAnnotation,
} from './annotations';
import { setupContextPanel } from './context';
import { escapeHtml } from './table';
import { setupTodoPanel } from './todos';

export const MODAL_ID = 'proad-annotation-modal';

interface ActiveModalState {
  save: () => void | Promise<void>;
}

let activeModalState: ActiveModalState | null = null;

export function closeAnnotationModal(): void {
  document.getElementById(MODAL_ID)?.remove();
  activeModalState = null;
  document.removeEventListener('keydown', handleModalKeydown, true);
}

function handleModalKeydown(event: KeyboardEvent): void {
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
    void activeModalState.save();
  }
}

export async function openAnnotationEditor(processKey: string): Promise<void> {
  if (!processKey) {
    return;
  }

  closeAnnotationModal();

  const [annotation, context, todos] = await Promise.all([
    Promise.resolve(getAnnotation(processKey)),
    loadProadContext(processKey),
    loadTodos(processKey),
  ]);

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
        >Anotação</button>

        <button
          type="button"
          class="proad-tab-button"
          role="tab"
          data-tab="todo"
          aria-selected="false"
        >Tarefas</button>

        <button
          type="button"
          class="proad-tab-button"
          role="tab"
          data-tab="context"
          aria-selected="false"
        >Contexto</button>
      </div>

      <div class="proad-annotation-content">
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
              ${Object.entries(COLORS).map(([key, config]) => `
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
              `).join('')}
            </div>
          </div>
        </div>

        <div
          class="proad-tab-panel"
          data-panel="todo"
          role="tabpanel"
          hidden
        >
          <div class="proad-todo-board">
            <div class="proad-todo-list"></div>

            <button type="button" class="proad-todo-add">
              <span class="proad-todo-add-icon">+</span>
              <span>Adicionar tarefa</span>
            </button>
          </div>
        </div>

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
            <div class="proad-context-status">
              <span class="proad-context-dot"></span>
              <span class="proad-context-status-text">Sincronizado</span>
            </div>

            <div class="proad-context-actions">
              <button type="button" class="proad-context-action" data-action="add">
                + Adicionar
              </button>
              <button type="button" class="proad-context-action" data-action="clear">
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

  const textarea = overlay.querySelector<HTMLTextAreaElement>(
    '.proad-annotation-textarea',
  );
  const tabs = overlay.querySelectorAll<HTMLButtonElement>('.proad-tab-button');
  const panels = overlay.querySelectorAll<HTMLElement>('.proad-tab-panel');
  const contextBody = overlay.querySelector<HTMLTableSectionElement>(
    '.proad-context-table tbody',
  );
  const contextStatusText = overlay.querySelector<HTMLElement>(
    '.proad-context-status-text',
  );
  const contextStatusDot = overlay.querySelector<HTMLElement>(
    '.proad-context-dot',
  );
  const todoList = overlay.querySelector<HTMLElement>('.proad-todo-list');

  if (
    !textarea ||
    !contextBody ||
    !contextStatusText ||
    !contextStatusDot ||
    !todoList
  ) {
    closeAnnotationModal();
    return;
  }

  const saveAnnotationAndClose = async () => {
    const saveButton = overlay.querySelector<HTMLButtonElement>(
      '.proad-annotation-save',
    );

    const colorValue = overlay.querySelector<HTMLInputElement>(
      'input[name="proad-annotation-color"]:checked',
    )?.value;

    const color = (
      colorValue && COLORS[colorValue as keyof typeof COLORS]
        ? colorValue
        : DEFAULT_COLOR
    ) as keyof typeof COLORS;

    saveButton?.setAttribute('disabled', 'true');

    try {
      await saveAnnotation(processKey, textarea.value, color);
      refreshAnnotationCell(processKey, openAnnotationEditor);
      applyAnnotationFilter();
      closeAnnotationModal();
    } finally {
      saveButton?.removeAttribute('disabled');
    }
  };

  activeModalState = {
    save: saveAnnotationAndClose,
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const target = tab.dataset.tab;

      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });

      panels.forEach((panel) => {
        const active = panel.dataset.panel === target;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
      });
    });
  });

  textarea.value = annotation.text;

  overlay.querySelectorAll<HTMLElement>('.proad-color-option').forEach((option) => {
    const input = option.querySelector<HTMLInputElement>('input');

    input?.addEventListener('change', () => {
      overlay
        .querySelectorAll('.proad-color-option')
        .forEach((item) => item.classList.remove('is-selected'));

      if (input.checked) {
        option.classList.add('is-selected');
      }
    });
  });

  overlay
    .querySelector('.proad-annotation-close')
    ?.addEventListener('click', closeAnnotationModal);

  overlay
    .querySelector('.proad-annotation-cancel')
    ?.addEventListener('click', closeAnnotationModal);

  overlay
    .querySelector('.proad-annotation-backdrop')
    ?.addEventListener('click', closeAnnotationModal);

  overlay
    .querySelector('.proad-annotation-save')
    ?.addEventListener('click', () => void saveAnnotationAndClose());

  setupContextPanel(processKey, {
    body: contextBody,
    statusText: contextStatusText,
    statusDot: contextStatusDot,
  }, context);

  setupTodoPanel(processKey, todoList, todos);

  document.addEventListener('keydown', handleModalKeydown, true);

  requestAnimationFrame(() => textarea.focus());
}
