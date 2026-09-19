import { EDITOR_IDS } from '../config';

export function getCKEditor() {
  if (typeof CKEDITOR === 'undefined') {
    return null;
  }

  return CKEDITOR;
}

export function getEditorById(editorId: string) {
  const ckeditor = getCKEditor();

  if (!ckeditor) {
    return null;
  }

  return ckeditor.instances[editorId] ?? null;
}

export function getActiveEditor() {
  const ckeditor = getCKEditor();

  if (!ckeditor) {
    return null;
  }

  for (const editorId of EDITOR_IDS) {
    const editor = ckeditor.instances[editorId];

    if (editor && editor.status === 'ready') {
      return editor;
    }
  }

  return null;
}

export function getEditorContainer(element: Element) {
  return element.closest('.cke');
}

export function getEditorContents(element: Element) {
  const container = getEditorContainer(element);

  if (!container) {
    return null;
  }

  return container.querySelector('.cke_contents');
}

export function collapseEditorToEnd(editor: any) {
  const range = editor.createRange();

  range.moveToElementEditEnd(editor.editable());

  range.collapse(true);

  const selection = editor.getSelection();

  selection.selectRanges([range]);
}
