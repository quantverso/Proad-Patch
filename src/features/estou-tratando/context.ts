import { clearProadContext, saveProadContext } from '../../utils/storage';

import type { ProadContext } from '../../types/proad';

export interface ContextPanelRefs {
  body: HTMLTableSectionElement;
  statusText: HTMLElement;
  statusDot: HTMLElement;
}

export function renderContextEmpty(body: HTMLTableSectionElement): void {
  body.innerHTML = `
    <tr class="proad-context-empty-row">
      <td colspan="3" class="proad-context-empty">
        Nenhum campo adicionado.
      </td>
    </tr>
  `;
}

export function readContextTable(body: HTMLTableSectionElement): ProadContext {
  const data: ProadContext = {};

  body.querySelectorAll<HTMLTableRowElement>('tr').forEach((row) => {
    const inputs = row.querySelectorAll<HTMLInputElement>(
      '.proad-context-input',
    );

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
}

export function createContextRow(
  refs: ContextPanelRefs,
  key = '',
  value = '',
  onChanged: () => void,
): HTMLTableRowElement {
  refs.body.querySelector('.proad-context-empty-row')?.remove();

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
  keyInput.className = 'proad-context-input';
  keyInput.placeholder = 'Campo';
  keyInput.value = key;

  // ----------------------------------------------------------
  // Valor
  // ----------------------------------------------------------

  valueInput.type = 'text';
  valueInput.className = 'proad-context-input';
  valueInput.placeholder = 'Valor';
  valueInput.value = value;

  // ----------------------------------------------------------
  // Remover
  // ----------------------------------------------------------

  removeButton.type = 'button';
  removeButton.className = 'proad-context-remove';
  removeButton.title = 'Remover campo';
  removeButton.textContent = '×';

  removeButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    row.remove();

    if (!refs.body.querySelector('tr')) {
      renderContextEmpty(refs.body);
    }

    onChanged();
  });

  // ----------------------------------------------------------
  // Alterações
  // ----------------------------------------------------------

  keyInput.addEventListener('input', onChanged);
  valueInput.addEventListener('input', onChanged);

  // ----------------------------------------------------------
  // Monta linha
  // ----------------------------------------------------------

  keyCell.appendChild(keyInput);
  valueCell.appendChild(valueInput);
  actionCell.appendChild(removeButton);

  row.appendChild(keyCell);
  row.appendChild(valueCell);
  row.appendChild(actionCell);

  refs.body.appendChild(row);

  return row;
}

export function setupContextPanel(
  processKey: string,
  refs: ContextPanelRefs,
  initialContext: ProadContext,
): void {
  let saveSequence = 0;

  const setStatus = (text: string, color: string): void => {
    refs.statusText.textContent = text;
    refs.statusDot.style.background = color;
  };

  const persist = async (): Promise<void> => {
    const sequence = ++saveSequence;

    setStatus('Salvando...', '#1a73e8');

    try {
      await saveProadContext(processKey, readContextTable(refs.body));

      if (sequence !== saveSequence) {
        return;
      }

      setStatus('Sincronizado', '#34a853');
    } catch (error) {
      console.error('[TRT14 Estou Tratando] Erro ao salvar contexto:', error);

      if (sequence === saveSequence) {
        setStatus('Falha ao salvar', '#c5221f');
      }
    }
  };

  // ----------------------------------------------------------
  // Contexto inicial
  // ----------------------------------------------------------

  const entries = Object.entries(initialContext);

  if (entries.length === 0) {
    renderContextEmpty(refs.body);
  } else {
    for (const [key, value] of entries) {
      createContextRow(refs, key, value, () => {
        void persist();
      });
    }
  }

  // ----------------------------------------------------------
  // Adicionar
  // ----------------------------------------------------------

  const addButton = document.querySelector<HTMLButtonElement>(
    '#proad-annotation-modal [data-action="add"]',
  );

  addButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const row = createContextRow(refs, '', '', () => {
      void persist();
    });

    row.querySelector<HTMLInputElement>('.proad-context-input')?.focus();

    void persist();
  });

  // ----------------------------------------------------------
  // Limpar
  // ----------------------------------------------------------

  const clearButton = document.querySelector<HTMLButtonElement>(
    '#proad-annotation-modal [data-action="clear"]',
  );

  clearButton?.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    refs.body.innerHTML = '';
    renderContextEmpty(refs.body);

    saveSequence += 1;

    setStatus('Limpando...', '#1a73e8');

    try {
      await clearProadContext(processKey);

      setStatus('Contexto limpo', '#1a73e8');
    } catch (error) {
      console.error('[TRT14 Estou Tratando] Erro ao limpar contexto:', error);

      setStatus('Falha ao limpar', '#c5221f');
    }
  });

  setStatus('Sincronizado', '#34a853');
}
