// ============================================================
// DECODIFICA ENTIDADES HTML
// ============================================================

export function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');

  textarea.innerHTML = text;

  return textarea.value;
}

// ============================================================
// HTML → TEXTO
// ============================================================

export function htmlToPlainText(html: string): string {
  const container = document.createElement('div');

  container.innerHTML = html;

  // ----------------------------------------------------------
  // BR → quebra
  // ----------------------------------------------------------

  container.querySelectorAll('br').forEach((br) => {
    br.replaceWith('\n');
  });

  // ----------------------------------------------------------
  // Blocos
  // ----------------------------------------------------------

  container.querySelectorAll('p, div, li').forEach((element) => {
    element.insertAdjacentText('beforeend', '\n');
  });

  let text = container.textContent ?? '';

  // ----------------------------------------------------------
  // Normalização
  // ----------------------------------------------------------

  text = text
    .replace(/\u00A0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

// ============================================================
// ESCAPA HTML
// ============================================================

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
