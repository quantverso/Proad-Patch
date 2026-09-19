import {
  loadAllAnnotations,
  saveAnnotation as saveAnnotationToStorage,
  normalizeProadReference,
} from '../../utils/storage';

import type { Annotation, AnnotationColor } from '../../types/proad';

import {
  escapeHtml,
  getHeaderRow,
  getHtmlTable,
  getProcessKey,
  getRows,
  normalizeForSearch,
  normalizeText,
} from './table';

export const DEFAULT_COLOR: AnnotationColor = 'yellow';

export const COLORS: Record<
  AnnotationColor,
  {
    name: string;
    background: string;
    border: string;
  }
> = {
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

let annotations = new Map<string, Annotation>();
let sortDirection: 'asc' | 'desc' | null = null;
let annotationFilter = '';

function emptyAnnotation(reference: string): Annotation {
  return {
    reference,
    text: '',
    color: DEFAULT_COLOR,
    updatedAt: '',
  };
}

export async function initializeAnnotations(): Promise<void> {
  const records = await loadAllAnnotations();

  annotations = new Map(
    records.map((annotation) => [
      normalizeProadReference(annotation.reference),
      annotation,
    ]),
  );
}

export function getAnnotation(processKey: string | null): Annotation {
  const reference = normalizeProadReference(processKey ?? '');

  if (!reference) {
    return emptyAnnotation('');
  }

  return annotations.get(reference) ?? emptyAnnotation(reference);
}

export async function saveAnnotation(
  processKey: string,
  text: string,
  color: AnnotationColor,
): Promise<void> {
  const reference = normalizeProadReference(processKey);

  if (!reference) {
    return;
  }

  const updatedAt = new Date().toISOString();
  const annotation: Annotation = {
    reference,
    text,
    color: COLORS[color] ? color : DEFAULT_COLOR,
    updatedAt,
  };

  annotations.set(reference, annotation);
  await saveAnnotationToStorage(reference, text, annotation.color);
}

export function createAnnotationCell(
  row: HTMLTableRowElement,
  onOpen: (processKey: string) => void,
): void {
  if (row.querySelector('[data-proad-annotation-cell]')) {
    return;
  }

  const cell = document.createElement('td');
  cell.className = 'proad-annotation-cell';
  cell.dataset.proadAnnotationCell = 'true';
  row.appendChild(cell);

  renderAnnotationCell(cell, getProcessKey(row), onOpen);
}

export function renderAnnotationCell(
  cell: HTMLTableCellElement,
  processKey: string | null,
  onOpen: (processKey: string) => void,
): void {
  const annotation = getAnnotation(processKey);
  const hasAnnotation = annotation.text.trim().length > 0;

  cell.innerHTML = '';
  cell.onclick = null;
  cell.ondblclick = null;

  if (!hasAnnotation) {
    cell.classList.add('is-empty');

    if (processKey) {
      cell.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpen(processKey);
      };
    }

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

  if (processKey) {
    cell.ondblclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onOpen(processKey);
    };
  }

  const preview = document.createElement('div');
  preview.className = 'proad-annotation-preview';
  preview.textContent = annotation.text;
  preview.title = 'Duplo clique para editar';
  applyAnnotationColor(preview, annotation.color);
  cell.appendChild(preview);
}

export function refreshAnnotationCell(
  processKey: string,
  onOpen: (processKey: string) => void,
): void {
  const reference = normalizeProadReference(processKey);

  for (const row of getRows()) {
    if (normalizeProadReference(getProcessKey(row) ?? '') !== reference) {
      continue;
    }

    const cell = row.querySelector<HTMLTableCellElement>(
      '[data-proad-annotation-cell]',
    );

    if (cell) {
      renderAnnotationCell(cell, reference, onOpen);
    }

    return;
  }
}

function applyAnnotationColor(
  element: HTMLElement,
  color: AnnotationColor,
): void {
  const config = COLORS[color] || COLORS[DEFAULT_COLOR];
  element.style.backgroundColor = config.background;
  element.style.borderColor = config.border;
}

export function createAnnotationHeader(onSort: () => void): void {
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
    <span
      class="proad-annotations-header-content"
      title="Ordenar por anotação"
    >
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

  th.querySelector('.proad-annotations-header-content')?.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      onSort();
    },
  );

  const input = th.querySelector<HTMLInputElement>('.proad-annotations-filter');
  const clear = th.querySelector<HTMLButtonElement>(
    '.proad-annotations-filter-clear',
  );
  const wrap = th.querySelector<HTMLElement>('.proad-annotations-filter-wrap');

  if (!input || !clear || !wrap) {
    return;
  }

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

export function applyAnnotationFilter(): void {
  const term = normalizeForSearch(annotationFilter);

  for (const row of getRows()) {
    let match = true;

    if (term) {
      const text = normalizeForSearch(getAnnotation(getProcessKey(row)).text);
      match = text.includes(term);
    }

    row.classList.toggle('proad-row-filtered', !match);

    const expanded = row.nextElementSibling;

    if (
      expanded &&
      !expanded.hasAttribute('data-rk') &&
      expanded.classList.contains('ui-expanded-row-content')
    ) {
      expanded.classList.toggle('proad-row-filtered', !match);
    }
  }

  updateZebra();
}

function preserveNativeRowColor(row: HTMLTableRowElement): void {
  const computed = getComputedStyle(row);

  const backgroundColor = computed.backgroundColor;

  /*
   * Cores transparentes significam que o PROAD não está
   * aplicando uma cor específica à linha.
   *
   * Nesse caso, deixamos nosso zebra cuidar da aparência.
   */
  const isTransparent =
    !backgroundColor ||
    backgroundColor === 'transparent' ||
    backgroundColor === 'rgba(0, 0, 0, 0)';

  /*
   * Branco puro também é tratado como estado normal da tabela.
   * Assim, somente cores efetivamente diferenciadas do padrão
   * serão preservadas.
   */
  const isWhite =
    backgroundColor === 'rgb(255, 255, 255)' ||
    backgroundColor === 'rgba(255, 255, 255, 1)';

  if (isTransparent || isWhite) {
    row.removeAttribute('data-proad-native-color');

    row.style.removeProperty('--proad-native-row-background');

    return;
  }

  row.dataset.proadNativeColor = 'true';

  row.style.setProperty('--proad-native-row-background', backgroundColor);
}

function updateZebra(): void {
  let index = 0;

  for (const row of getRows()) {
    /*
     * Primeiro preservamos qualquer cor que pertença
     * originalmente à linha do PROAD.
     */
    preserveNativeRowColor(row);

    /*
     * Linhas filtradas não participam do zebra.
     */
    if (row.classList.contains('proad-row-filtered')) {
      continue;
    }

    row.dataset.proadZebra = index % 2 ? 'odd' : 'even';

    index++;
  }
}

export function sortAnnotations(): void {
  const tbody = getHtmlTable()?.querySelector('tbody');

  if (!tbody) {
    return;
  }

  sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';

  const items = getRows().map((row) => ({
    row,
    extra:
      row.nextElementSibling &&
      !row.nextElementSibling.hasAttribute('data-rk') &&
      row.nextElementSibling.classList.contains('ui-expanded-row-content')
        ? (row.nextElementSibling as HTMLTableRowElement)
        : null,
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

  for (const item of items) {
    fragment.appendChild(item.row);

    if (item.extra) {
      fragment.appendChild(item.extra);
    }
  }

  tbody.appendChild(fragment);
  updateSortIndicator();
  updateZebra();
}

function updateSortIndicator(): void {
  const indicator = document
    .querySelector('[data-proad-annotations-header]')
    ?.querySelector('.proad-annotations-sort');

  if (!indicator) {
    return;
  }

  indicator.textContent =
    sortDirection === 'asc' ? '↑' : sortDirection === 'desc' ? '↓' : '↕';
}
