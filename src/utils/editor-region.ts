export interface DelimitedRegion {
  // HTML original do conteúdo entre {{ e }}.
  html: string;

  // Texto puro do conteúdo entre {{ e }}.
  text: string;

  // Range exatamente entre {{ e }}.
  insertionRange: any;
}

// ============================================================
// OBTÉM TODOS OS TEXT NODES
// ============================================================

function getTextNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  const nodes: Text[] = [];

  let current = walker.nextNode();

  while (current) {
    nodes.push(current as Text);

    current = walker.nextNode();
  }

  return nodes;
}

// ============================================================
// RESOLVE POSIÇÃO GLOBAL
// ============================================================

function resolvePosition(
  nodes: Text[],
  position: number,
): {
  node: Text;
  offset: number;
} | null {
  let cursor = 0;

  for (const node of nodes) {
    const length = node.data.length;

    if (position >= cursor && position <= cursor + length) {
      return {
        node,
        offset: position - cursor,
      };
    }

    cursor += length;
  }

  // ----------------------------------------------------------
  // Exatamente no final.
  // ----------------------------------------------------------

  if (nodes.length > 0) {
    const totalLength = nodes.reduce(
      (total, node) => total + node.data.length,
      0,
    );

    if (position === totalLength) {
      const last = nodes[nodes.length - 1];

      return {
        node: last,
        offset: last.data.length,
      };
    }
  }

  return null;
}

// ============================================================
// CRIA RANGE CKEDITOR
// ============================================================

function createCKEditorRange(
  editor: any,
  start: {
    node: Text;
    offset: number;
  },
  end: {
    node: Text;
    offset: number;
  },
): any {
  const CKEDITOR = (globalThis as any).CKEDITOR;

  const range = new CKEDITOR.dom.range(editor.document);

  range.setStart(new CKEDITOR.dom.node(start.node), start.offset);

  range.setEnd(new CKEDITOR.dom.node(end.node), end.offset);

  return range;
}

// ============================================================
// ENCONTRA {{ }}
// ============================================================
//
// Importante:
//
// {{ e }} NÃO fazem parte do range.
//
// Somente o conteúdo interno é apagado.
// ============================================================

export function findDelimitedRegion(editor: any): DelimitedRegion | null {
  const body = editor.document.getBody();

  if (!body) {
    return null;
  }

  const nativeBody = body.$ as HTMLElement;

  const nodes = getTextNodes(nativeBody);

  if (nodes.length === 0) {
    return null;
  }

  // ==========================================================
  // TEXTO COMPLETO
  // ==========================================================

  let fullText = '';

  for (const node of nodes) {
    fullText += node.data;
  }

  // ==========================================================
  // ABERTURA
  // ==========================================================

  const openIndex = fullText.indexOf('{{');

  if (openIndex === -1) {
    return null;
  }

  // ==========================================================
  // FECHAMENTO
  // ==========================================================

  const closeIndex = fullText.indexOf('}}', openIndex + 2);

  if (closeIndex === -1) {
    return null;
  }

  // ==========================================================
  // INTERIOR
  // ==========================================================

  const innerStartIndex = openIndex + 2;

  const innerEndIndex = closeIndex;

  const innerStart = resolvePosition(nodes, innerStartIndex);

  const innerEnd = resolvePosition(nodes, innerEndIndex);

  if (!innerStart || !innerEnd) {
    return null;
  }

  // ==========================================================
  // EXTRAI HTML INTERNO
  // ==========================================================

  const nativeRange = nativeBody.ownerDocument!.createRange();

  nativeRange.setStart(innerStart.node, innerStart.offset);

  nativeRange.setEnd(innerEnd.node, innerEnd.offset);

  const fragment = nativeRange.cloneContents();

  const wrapper = nativeBody.ownerDocument!.createElement('div');

  wrapper.appendChild(fragment);

  const html = wrapper.innerHTML;

  const text = wrapper.textContent ?? '';

  // ==========================================================
  // RANGE INTERNO
  // ==========================================================
  //
  // IMPORTANTE:
  //
  // {{ [INÍCIO DO RANGE] conteúdo [FIM DO RANGE] }}
  //
  // Os delimitadores ficam fora.
  // ==========================================================

  const insertionRange = createCKEditorRange(editor, innerStart, innerEnd);

  // ==========================================================
  // APAGA SOMENTE O CONTEÚDO
  // ==========================================================

  insertionRange.deleteContents();

  insertionRange.collapse(true);

  return {
    html,
    text,
    insertionRange,
  };
}

// ============================================================
// LIMPA EDITOR
// ============================================================
//
// Utilizado somente quando não existem {{ }}.
// ============================================================

export function clearEditor(editor: any): void {
  editor.setData('');
}
