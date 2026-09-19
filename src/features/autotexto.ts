import { EDITOR_IDS } from '../config';
import { getEditorById } from '../utils/ckeditor';

function fixAutotextPanel() {
  const panel = document.querySelector('.cke_combopanel');

  if (!panel) {
    return;
  }

  (panel as HTMLElement).style.position = 'fixed';
}

function setupAutotextClear() {
  document.addEventListener(
    'mousedown',
    (event) => {
      if (typeof CKEDITOR === 'undefined') {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const combo = target.closest('.cke_combo__comboautotexto');

      if (!combo) {
        return;
      }

      for (const editorId of EDITOR_IDS) {
        const editor = getEditorById(editorId);

        if (!editor || !editor.container) {
          continue;
        }

        if (editor.container.$.contains(combo)) {
          editor.setData('');
          editor.focus();

          break;
        }
      }
    },
    true,
  );
}

function setup() {
  const observer = new MutationObserver(() => {
    fixAutotextPanel();
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  fixAutotextPanel();
  setupAutotextClear();
}

setup();
