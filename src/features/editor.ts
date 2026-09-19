import { EDITOR_IDS } from '../config';
import { getEditorById } from '../utils/ckeditor';
import { EDITOR_TAB_HTML } from '../utils/editor-format';

// function setupEditors() {
//   if (typeof CKEDITOR === 'undefined') {
//     return;
//   }

//   for (const editorId of EDITOR_IDS) {
//     const editor = getEditorById(editorId);

//     if (!editor) {
//       continue;
//     }

//     if (editor._trt14TabConfigured) {
//       continue;
//     }

//     editor._trt14TabConfigured = true;

//     editor.on('key', function (event: any) {
//       if (event.data.keyCode !== 9) {
//         return;
//       }

//       const selection = editor.getSelection();

//       if (!selection) {
//         return;
//       }

//       const startElement = selection.getStartElement();

//       // Dentro de tabela:
//       // deixa o CKEditor tratar normalmente.
//       if (startElement && startElement.getAscendant('table', true)) {
//         return;
//       }

//       event.cancel();

//       editor.insertHtml(
//         '<span contenteditable="false" style="color:#ffffff; user-select:none;">________</span>',
//       );
//     });
//   }
// }

function setupEditors() {
  if (typeof CKEDITOR === 'undefined') {
    return;
  }

  for (const editorId of EDITOR_IDS) {
    const editor = getEditorById(editorId);

    if (!editor) {
      continue;
    }

    if (editor._trt14TabConfigured) {
      continue;
    }

    editor._trt14TabConfigured = true;

    editor.on('key', function (event: any) {
      if (event.data.keyCode !== 9) {
        return;
      }

      const selection = editor.getSelection();

      if (!selection) {
        return;
      }

      const startElement = selection.getStartElement();

      // Dentro de tabela:
      // deixa o CKEditor tratar normalmente.
      if (startElement && startElement.getAscendant('table', true)) {
        return;
      }

      event.cancel();

      editor.insertHtml(EDITOR_TAB_HTML);
    });
  }
}

function setup() {
  const observer = new MutationObserver(() => {
    setupEditors();
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  setupEditors();
}

setup();
