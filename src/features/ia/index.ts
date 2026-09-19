import {
  createSidebar,
  createAssistantToolbar,
  updateEditorLayout,
} from './ui';

import { injectAssistantStyles } from './styles';
import { configureEditorTypography } from '../../utils/editor-format';

// ============================================================
// CONFIGURA EDITORES
// ============================================================

function setupAssistant() {
  const editors = document.querySelectorAll('.cke');

  for (const editorContainer of editors) {
    const contents = editorContainer.querySelector(
      '.cke_contents',
    ) as HTMLElement | null;

    if (!contents) {
      continue;
    }

    const iframe = contents.querySelector(
      '.cke_wysiwyg_frame',
    ) as HTMLIFrameElement | null;

    if (!iframe) {
      continue;
    }

    iframe.style.boxSizing = 'border-box';

    // --------------------------------------------------------
    // Arial 16
    // --------------------------------------------------------

    configureEditorTypography(iframe);

    createSidebar(contents);

    createAssistantToolbar(editorContainer as HTMLElement);

    updateEditorLayout(contents);
  }
}

// ============================================================
// SETUP
// ============================================================

function setup() {
  injectAssistantStyles();

  const observer = new MutationObserver(() => {
    setupAssistant();
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  setupAssistant();
}

setup();
