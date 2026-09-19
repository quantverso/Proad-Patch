// ============================================================
// TAB VISUAL DO DOCUMENTO
// ============================================================
//
// Este é o mesmo "tab" usado pelo atalho Tab do CKEditor.
//
// Ele não possui conteúdo editável e fica visualmente branco,
// funcionando como um recuo fixo no início do parágrafo.
// ============================================================

export const EDITOR_TAB_HTML =
  '<span contenteditable="false" style="color:#ffffff; user-select:none;">________</span>';

// ============================================================
// CONFIGURAÇÃO VISUAL DO EDITOR
// ============================================================

export function configureEditorTypography(iframe: HTMLIFrameElement): void {
  const doc = iframe.contentDocument;

  if (!doc?.body) {
    return;
  }

  doc.body.style.fontFamily = 'Arial, sans-serif';

  doc.body.style.fontSize = '16px';
}

// ============================================================
// GERA PARÁGRAFOS
//
// Recebe HTML seguro que pode conter <strong> para placeholders
// não preenchidos.
// ============================================================

export function buildParagraphsHtml(html: string): string {
  const normalized = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  if (!normalized) {
    return '';
  }

  const paragraphs = normalized.split(/\n{2,}/);

  return paragraphs
    .map((paragraph) => {
      const content = paragraph.replace(/\n/g, '<br>');

      return `<p>${EDITOR_TAB_HTML}${content}</p>`;
    })
    .join('');
}
