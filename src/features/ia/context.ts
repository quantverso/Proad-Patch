import { saveProadContext, type ProadContext } from '../../utils/storage';

import { ICONS } from './icons';

import type { AssistantState } from './types';

// ============================================================
// RENDERIZA CONTEXTO VAZIO
// ============================================================

export function renderEmptyContext(state: AssistantState) {
  state.contextBody.innerHTML = `     <tr class="trt14-context-empty-row">       <td
        colspan="3"
        class="trt14-context-empty"       >
        Nenhum campo adicionado.       </td>     </tr>
  `;
}

// ============================================================
// LÊ CONTEXTO DA INTERFACE
// ============================================================

export function getContextData(state: AssistantState): ProadContext {
  const context: ProadContext = {};

  state.contextBody.querySelectorAll('tr').forEach((row) => {
    const inputs = row.querySelectorAll('.trt14-context-input');

    if (inputs.length !== 2) {
      return;
    }

    const keyInput = inputs[0] as HTMLInputElement;

    const valueInput = inputs[1] as HTMLInputElement;

    const key = keyInput.value.trim();

    if (!key) {
      return;
    }

    context[key] = valueInput.value;
  });

  return context;
}

// ============================================================
// LÊ SOMENTE AS KEYS
//
// Esta função é usada pela IA.
// Os valores nunca são enviados.
// ============================================================

export function getContextKeys(state: AssistantState): string[] {
  return Object.keys(getContextData(state));
}

// ============================================================
// SALVA CONTEXTO DO PROAD
// ============================================================

export function persistContext(state: AssistantState): void {
  if (!state.proadReference) {
    return;
  }

  const context = getContextData(state);

  saveProadContext(state.proadReference, context);
}

// ============================================================
// STATUS + PERSISTÊNCIA
// ============================================================

export function setContextChanged(state: AssistantState) {
  state.contextStatusText.textContent = 'Salvando...';

  state.contextStatusDot.style.background = '#1a73e8';

  persistContext(state);

  state.contextStatusText.textContent = 'Sincronizado';

  state.contextStatusDot.style.background = '#34a853';
}

// ============================================================
// CRIA LINHA
// ============================================================

export function createContextRow(state: AssistantState, key = '', value = '') {
  const empty = state.contextBody.querySelector('.trt14-context-empty-row');

  empty?.remove();

  const row = document.createElement('tr');

  const keyCell = document.createElement('td');

  const valueCell = document.createElement('td');

  const actionCell = document.createElement('td');

  const keyInput = document.createElement('input');

  const valueInput = document.createElement('input');

  const removeButton = document.createElement('button');

  // ----------------------------------------------------------
  // Campo
  // ----------------------------------------------------------

  keyInput.type = 'text';

  keyInput.className = 'trt14-context-input';

  keyInput.placeholder = 'Campo';

  keyInput.value = key;

  // ----------------------------------------------------------
  // Valor
  // ----------------------------------------------------------

  valueInput.type = 'text';

  valueInput.className = 'trt14-context-input';

  valueInput.placeholder = 'Valor';

  valueInput.value = value;

  // ----------------------------------------------------------
  // Remover
  // ----------------------------------------------------------

  removeButton.type = 'button';

  removeButton.className = 'trt14-remove-row';

  removeButton.title = 'Remover campo';

  removeButton.innerHTML = ICONS.trash;

  removeButton.addEventListener('click', () => {
    row.remove();

    if (!state.contextBody.querySelector('tr')) {
      renderEmptyContext(state);
    }

    setContextChanged(state);
  });

  // ----------------------------------------------------------
  // Alterações
  // ----------------------------------------------------------

  keyInput.addEventListener('input', () => {
    setContextChanged(state);
  });

  valueInput.addEventListener('input', () => {
    setContextChanged(state);
  });

  // ----------------------------------------------------------
  // Monta linha
  // ----------------------------------------------------------

  keyCell.appendChild(keyInput);

  valueCell.appendChild(valueInput);

  actionCell.appendChild(removeButton);

  row.appendChild(keyCell);

  row.appendChild(valueCell);

  row.appendChild(actionCell);

  state.contextBody.appendChild(row);
}

// ============================================================
// CARREGA CONTEXTO NA INTERFACE
// ============================================================

export function loadContext(state: AssistantState, context: ProadContext) {
  state.contextBody.innerHTML = '';

  const entries = Object.entries(context);

  if (entries.length === 0) {
    renderEmptyContext(state);

    state.contextStatusText.textContent = 'Sincronizado';

    state.contextStatusDot.style.background = '#34a853';

    return;
  }

  for (const [key, value] of entries) {
    createContextRow(state, key, value);
  }

  state.contextStatusText.textContent = 'Sincronizado';

  state.contextStatusDot.style.background = '#34a853';
}
