import type { ProadContext } from '../../utils/storage';

import { unmaskDocument } from './masking';

// ============================================================
// ESCAPA HTML
// ============================================================

export function escapeHtml(text: string): string {
  return String(text)
    .replaceAll('&', '&')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", "'");
}

// ============================================================
// CONVERTE CHUNK PARA HTML
// ============================================================

export function chunkToHtml(text: string): string {
  return escapeHtml(text).replaceAll('\r\n', '<br>').replaceAll('\n', '<br>');
}

// ============================================================
// GARANTE CURSOR NO FINAL
// ============================================================

export function collapseEditorToEnd(editor: any) {
  const range = editor.createRange();

  range.moveToElementEditEnd(editor.editable());

  range.collapse(true);

  const selection = editor.getSelection();

  selection.selectRanges([range]);
}

// ============================================================
// INSERE CHUNK
// ============================================================

export function appendChunkToEditor(editor: any, text: string) {
  if (!text) {
    return;
  }

  editor.insertHtml(chunkToHtml(text));
}

// ============================================================
// DESMASCA O DOCUMENTO INTEIRO
//
// Lê o HTML atual do CKEditor,
// substitui os placeholders pelos valores
// e escreve novamente no editor.
// ============================================================

export function unmaskEditor(editor: any, context: ProadContext): void {
  if (!editor) {
    return;
  }

  const html = editor.getData();

  if (!html) {
    return;
  }

  const unmasked = unmaskDocument(html, context);

  if (unmasked === html) {
    return;
  }

  editor.setData(unmasked);

  editor.fire('change');
}
