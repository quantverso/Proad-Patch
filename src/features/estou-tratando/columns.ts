import {
  loadColumnVisibility,
  saveColumnVisibility,
} from '../../utils/storage';

import {
  escapeHtml,
  getHeaderRow,
  getHtmlTable,
  getRows,
  getProcessKey,
  normalizeText,
  slugify,
} from './table';

export const COLUMN_BUTTON_ID = 'proad-column-toggle';
export const COLUMN_PANEL_ID = 'proad-column-panel';

export function getColumnHeaders(): HTMLTableCellElement[] {
  const row = getHeaderRow();
  return row ? Array.from(row.children) as HTMLTableCellElement[] : [];
}

export function getColumnTitle(th: HTMLElement): string {
  return normalizeText(th.querySelector('.ui-column-title')?.textContent);
}

export function getColumnKind(th: HTMLElement, index: number): string | null {
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

export function getColumnLabel(th: HTMLElement, index: number): string {
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

  return getColumnTitle(th) || normalizeText(th.textContent) || `Coluna ${index + 1}`;
}

export function getColumnKey(th: HTMLElement, index: number): string {
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

export function isColumnVisible(th: HTMLElement): boolean {
  return (
    th.style.display !== 'none' &&
    getComputedStyle(th).display !== 'none'
  );
}

export function setColumnHidden(index: number, hidden: boolean): void {
  const table = getHtmlTable();

  if (!table) {
    return;
  }

  const display = hidden ? 'none' : '';
  const header = table.querySelector('thead tr')?.children[index] as HTMLElement | undefined;

  if (header) {
    header.style.display = display;
  }

  for (const row of getRows()) {
    const cell = row.children[index] as HTMLElement | undefined;

    if (cell) {
      cell.style.display = display;
    }
  }
}

export async function applyColumnVisibility(): Promise<void> {
  const visibility = await loadColumnVisibility();

  getColumnHeaders().forEach((th, index) => {
    const key = getColumnKey(th, index);

    if (typeof visibility[key] === 'boolean') {
      setColumnHidden(index, !visibility[key]);
    }
  });
}

export function repositionColumnPanel(): void {
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

export function closeColumnPanel(): void {
  document.getElementById(COLUMN_PANEL_ID)?.remove();
  window.removeEventListener('resize', repositionColumnPanel);
  window.removeEventListener('scroll', repositionColumnPanel, true);
}

export async function openColumnPanel(): Promise<void> {
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

  const list = panel.querySelector<HTMLElement>('.proad-column-panel-list');
  const headers = getColumnHeaders();
  const visibility = await loadColumnVisibility();

  if (!list) {
    return;
  }

  headers.forEach((th, index) => {
    const label = getColumnLabel(th, index);
    const key = getColumnKey(th, index);
    const saved = visibility[key];
    const visible = typeof saved === 'boolean' ? saved : isColumnVisible(th);

    const item = document.createElement('label');
    item.className = 'proad-column-item';
    item.innerHTML = `
      <input type="checkbox" ${visible ? 'checked' : ''}>
      <span class="proad-column-check"></span>
      <span class="proad-column-item-label">${escapeHtml(label)}</span>
    `;

    const checkbox = item.querySelector<HTMLInputElement>('input');

    checkbox?.addEventListener('change', () => {
      const current = { ...visibility, [key]: Boolean(checkbox.checked) };
      Object.assign(visibility, current);
      void saveColumnVisibility(current);
      setColumnHidden(index, !checkbox.checked);
    });

    list.appendChild(item);
  });

  panel
    .querySelector('.proad-column-panel-close')
    ?.addEventListener('click', closeColumnPanel);

  panel
    .querySelector('.proad-columns-show-all')
    ?.addEventListener('click', () => {
      const current = { ...visibility };

      headers.forEach((th, index) => {
        current[getColumnKey(th, index)] = true;
        setColumnHidden(index, false);
      });

      void saveColumnVisibility(current);
      void openColumnPanel();
    });

  repositionColumnPanel();
  window.addEventListener('resize', repositionColumnPanel);
  window.addEventListener('scroll', repositionColumnPanel, true);
}

export function createColumnButton(): void {
  const tableContainer = document.getElementById('formProtocolos:tblEstouTratando');

  if (!tableContainer || document.getElementById(COLUMN_BUTTON_ID)) {
    return;
  }

  const datatableHeader = tableContainer.querySelector('.ui-datatable-header');

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

    if (document.getElementById(COLUMN_PANEL_ID)) {
      closeColumnPanel();
    } else {
      void openColumnPanel();
    }
  });
}
