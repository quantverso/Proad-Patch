export const TABLE_ID = 'formProtocolos:tblEstouTratando';

export function getTableContainer(): HTMLElement | null {
  return document.getElementById(TABLE_ID);
}

export function getHtmlTable(): HTMLTableElement | null {
  return (
    getTableContainer()?.querySelector<HTMLTableElement>(
      '.ui-datatable-tablewrapper > table',
    ) ?? null
  );
}

export function getHeaderRow(): HTMLTableRowElement | null {
  return getHtmlTable()?.querySelector<HTMLTableRowElement>('thead tr') ?? null;
}

export function getRows(): HTMLTableRowElement[] {
  const table = getHtmlTable();

  if (!table) {
    return [];
  }

  return Array.from(
    table.querySelectorAll<HTMLTableRowElement>('tbody > tr[data-rk]'),
  );
}

export function getExpandedSibling(
  row: HTMLTableRowElement,
): HTMLTableRowElement | null {
  const next = row.nextElementSibling;

  if (
    next &&
    !next.hasAttribute('data-rk') &&
    next.classList.contains('ui-expanded-row-content')
  ) {
    return next as HTMLTableRowElement;
  }

  return null;
}

export function getProcessKey(
  row: HTMLTableRowElement,
): string | null {
  const rk = row.dataset.rk || '';
  const match = rk.match(/Protocolo\s+(\d+)\s+ano\s+(\d+)/i);

  if (match) {
    return `${match[1]}/${match[2]}`;
  }

  const link = row.querySelector<HTMLAnchorElement>(
    'a[href*="fichadoprocesso.xhtml"]',
  );

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

export function normalizeText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function normalizeForSearch(value: unknown): string {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function slugify(value: unknown): string {
  return normalizeForSearch(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
