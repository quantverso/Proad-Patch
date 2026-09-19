// ============================================================
// REGIÃO DELIMITADA {{ }}
// ============================================================
//
// Localiza o primeiro trecho:
//
//   {{ conteúdo }}
//
// e retorna:
//
// - html: HTML original do conteúdo interno;
// - text: texto puro do conteúdo interno;
// - insertionRange: Range NATIVO colapsado exatamente no ponto
//   onde a geração deverá ser inserida.
//
// IMPORTANTE:
//
// Este módulo NÃO depende de:
//
//   CKEDITOR.dom
//   globalThis.CKEDITOR
//   namespace CKEDITOR no TypeScript
//
// A manipulação da região delimitada é feita exclusivamente
// com as APIs nativas do DOM.
// ============================================================

export interface DelimitedRegion {
  html: string;
  text: string;
  insertionRange: Range;
}

// ============================================================
// TIPO MÍNIMO DO EDITOR
// ============================================================
//
// Não precisamos conhecer o tipo completo do CKEditor aqui.
// Precisamos somente do pedaço da API utilizado por este
// módulo: editor.document.getBody().$
// ============================================================

interface EditorDocument {
  getBody(): {
    $: HTMLElement;
  } | null;
}

interface EditorLike {
  document: EditorDocument;
}

// ============================================================
// TEXT NODES
// ============================================================

function getTextNodes(root: Node): Text[] {
  const ownerDocument = root.ownerDocument;

  if (!ownerDocument) {
    return [];
  }

  const walker = ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  const nodes: Text[] = [];

  let current = walker.nextNode();

  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      nodes.push(current as Text);
    }

    current = walker.nextNode();
  }

  return nodes;
}

// ============================================================
// RESOLVE POSIÇÃO GLOBAL -> TEXT NODE
// ============================================================
//
// O conteúdo textual de todos os nós é tratado como uma única
// sequência.
//
// Exemplo:
//
//   node 1: "abc"
//   node 2: "defgh"
//   node 3: "ijk"
//
// posição 5:
//   node 2, offset 2
//
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
  // Permite posição exatamente no final do último nó.
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
// FIND DELIMITED REGION
// ============================================================

export function findDelimitedRegion(
  editor: EditorLike,
): DelimitedRegion | null {
  // ----------------------------------------------------------
  // Corpo do editor.
  // ----------------------------------------------------------

  const body = editor.document.getBody();

  if (!body) {
    return null;
  }

  // ----------------------------------------------------------
  // Elemento DOM NATIVO do corpo do iframe.
  // ----------------------------------------------------------

  const nativeBody = body.$;

  if (!nativeBody) {
    return null;
  }

  // ----------------------------------------------------------
  // Todos os nós de texto.
  // ----------------------------------------------------------

  const nodes = getTextNodes(nativeBody);

  if (nodes.length === 0) {
    return null;
  }

  // ----------------------------------------------------------
  // Constrói o texto completo.
  // ----------------------------------------------------------

  let fullText = '';

  for (const node of nodes) {
    fullText += node.data;
  }

  // ==========================================================
  // LOCALIZA {{
  // ==========================================================

  const openIndex = fullText.indexOf('{{');

  if (openIndex === -1) {
    return null;
  }

  // ==========================================================
  // LOCALIZA }}
  // ==========================================================

  const closeIndex = fullText.indexOf('}}', openIndex + 2);

  if (closeIndex === -1) {
    return null;
  }

  // ==========================================================
  // POSIÇÕES DO CONTEÚDO INTERNO
  // ==========================================================

  const innerStartIndex = openIndex + 2;

  const innerEndIndex = closeIndex;

  const innerStart = resolvePosition(nodes, innerStartIndex);

  const innerEnd = resolvePosition(nodes, innerEndIndex);

  if (!innerStart || !innerEnd) {
    return null;
  }

  // ==========================================================
  // DOCUMENTO NATIVO
  // ==========================================================

  const nativeDocument = nativeBody.ownerDocument;

  if (!nativeDocument) {
    return null;
  }

  // ==========================================================
  // RANGE NATIVO
  // ==========================================================

  const nativeRange = nativeDocument.createRange();

  nativeRange.setStart(innerStart.node, innerStart.offset);

  nativeRange.setEnd(innerEnd.node, innerEnd.offset);

  // ==========================================================
  // CAPTURA HTML ORIGINAL
  // ==========================================================

  const fragment = nativeRange.cloneContents();

  const wrapper = nativeDocument.createElement('div');

  wrapper.appendChild(fragment);

  const html = wrapper.innerHTML;

  const text = wrapper.textContent ?? '';

  // ==========================================================
  // REMOVE SOMENTE O CONTEÚDO INTERNO
  // ==========================================================
  //
  // Exemplo:
  //
  // Antes:
  //
  //   {{ escreva o ofício }}
  //
  // Depois:
  //
  //   {{ }}
  //
  // Os delimitadores permanecem.
  //
  // ==========================================================

  nativeRange.deleteContents();

  // ----------------------------------------------------------
  // O range agora está colapsado no ponto onde o texto
  // gerado deverá ser inserido.
  // ----------------------------------------------------------

  nativeRange.collapse(true);

  // ==========================================================
  // RESULTADO
  // ==========================================================

  return {
    html,
    text,
    insertionRange: nativeRange,
  };
}
