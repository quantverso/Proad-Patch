import { initializeProadStorage } from '../../utils/storage';



import {
  applyAnnotationFilter,
  createAnnotationCell,
  createAnnotationHeader,
  initializeAnnotations,
  sortAnnotations,
} from './annotations';

import { applyColumnVisibility, createColumnButton } from './columns';

import { openAnnotationEditor } from './modal';

import { getTableContainer, getRows } from './table';

import {
  injectEstouTratandoStyles,
  captureOriginalToolbarButtonColors,
} from './styles';

let bodyObserver: MutationObserver | null = null;
let observerTimer: number | null = null;
let isApplying = false;

/**
 * Enquanto o PrimeFaces estiver tratando um clique de expansão,
 * nossa feature não deve reaplicar alterações na tabela.
 */
let expansionGuardUntil = 0;

// ============================================================
// APLICAÇÃO
// ============================================================

async function applyEnhancements(): Promise<void> {
  if (isApplying || !getTableContainer()) {
    return;
  }

  isApplying = true;

  try {
    captureOriginalToolbarButtonColors();

    createColumnButton();

    createAnnotationHeader(() => sortAnnotations());

    for (const row of getRows()) {
      createAnnotationCell(row, (processKey) => {
        void openAnnotationEditor(processKey);
      });
    }

    await applyColumnVisibility();

    applyAnnotationFilter();
  } finally {
    isApplying = false;
  }
}

// ============================================================
// EVENTOS DO DOCUMENTO
// ============================================================

function setupDocumentEvents(): void {
  if (document.documentElement.dataset.proadEstouTratandoEvents) {
    return;
  }

  document.documentElement.dataset.proadEstouTratandoEvents = 'true';

  document.addEventListener('click', (event) => {
    const panel = document.getElementById('proad-column-panel');

    if (!panel) {
      return;
    }

    const button = document.getElementById('proad-column-toggle');

    const target = event.target;

    if (target instanceof Node && panel.contains(target)) {
      return;
    }

    if (button && target instanceof Node && button.contains(target)) {
      return;
    }

    panel.remove();
  });
}

// ============================================================
// EXPANSÃO DO PRIMEFACES
// ============================================================

function isRowToggleTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest('#formProtocolos\\:tblEstouTratando .ui-row-toggler'),
    )
  );
}

function setupExpansionGuard(): void {
  if (document.documentElement.dataset.proadExpansionGuard) {
    return;
  }

  document.documentElement.dataset.proadExpansionGuard = 'true';

  document.addEventListener(
    'click',
    (event) => {
      if (!isRowToggleTarget(event.target)) {
        return;
      }

      /*
       * O PrimeFaces precisa controlar sozinho o ciclo de
       * expansão/contração. Nesse intervalo não deixamos nosso
       * MutationObserver reaplicar a feature.
       */
      expansionGuardUntil = performance.now() + 800;
    },
    true,
  );
}

// ============================================================
// IDENTIFICA MUTAÇÕES DE EXPANSÃO
// ============================================================

function isExpansionMutation(mutation: MutationRecord): boolean {
  const target = mutation.target;

  /*
   * Alteração dentro de um conteúdo expandido.
   */
  if (target instanceof Element && target.closest('.ui-expanded-row-content')) {
    return true;
  }

  const nodes = [
    ...Array.from(mutation.addedNodes),
    ...Array.from(mutation.removedNodes),
  ];

  if (nodes.length === 0) {
    return false;
  }

  /*
   * Inserção/remoção da própria linha expandida.
   */
  return nodes.every((node) => {
    if (!(node instanceof Element)) {
      return false;
    }

    return (
      node.classList.contains('ui-expanded-row-content') ||
      Boolean(node.querySelector('.ui-expanded-row-content'))
    );
  });
}

// ============================================================
// OBSERVADOR
// ============================================================

function observePage(): void {
  if (bodyObserver || !document.body) {
    return;
  }

  bodyObserver = new MutationObserver((mutations) => {
    /*
     * Se acabamos de clicar em um botão de expandir,
     * deixamos o PrimeFaces terminar primeiro.
     */
    if (performance.now() < expansionGuardUntil) {
      return;
    }

    const childListMutations = mutations.filter(
      (mutation) => mutation.type === 'childList',
    );

    if (childListMutations.length === 0) {
      return;
    }

    /*
     * Não precisamos reaplicar a feature quando a única
     * alteração foi a criação/remoção/conteúdo da linha
     * expandida.
     */
    if (childListMutations.every(isExpansionMutation)) {
      return;
    }

    if (observerTimer !== null) {
      window.clearTimeout(observerTimer);
    }

    observerTimer = window.setTimeout(() => {
      observerTimer = null;

      void applyEnhancements();
    }, 100);
  });

  bodyObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// ============================================================
// INIT
// ============================================================

async function init(): Promise<void> {
  if (!location.pathname.endsWith('/estoutratando.xhtml')) {
    return;
  }

  injectEstouTratandoStyles();

  setupDocumentEvents();

  await initializeProadStorage();

  await initializeAnnotations();

  await applyEnhancements();

  setupExpansionGuard();

  observePage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void init(), {
    once: true,
  });
} else {
  void init();
}
