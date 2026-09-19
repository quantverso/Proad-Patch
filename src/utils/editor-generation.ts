export const GENERATION_MARKER_ATTRIBUTE = 'data-trt14-generation-marker';

// ============================================================
// GERA ID ÚNICO
// ============================================================

export function createGenerationId(): string {
  return `trt14-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ============================================================
// CRIA MARCADOR CKEDITOR
// ============================================================

export function createGenerationMarker(
  editor: any,
  id: string,
  type: 'start' | 'end',
): any {
  const marker = new (globalThis as any).CKEDITOR.dom.element('span');

  marker.setAttribute(GENERATION_MARKER_ATTRIBUTE, `${id}-${type}`);

  marker.setAttribute('contenteditable', 'false');

  // Invisível para o usuário.
  marker.setStyle('display', 'none');

  return marker;
}

// ============================================================
// LOCALIZA MARCADOR
// ============================================================

export function findGenerationMarker(
  editor: any,
  id: string,
  type: 'start' | 'end',
): any | null {
  const body = editor.document.getBody();

  if (!body) {
    return null;
  }

  const marker = body.findOne(
    `[${GENERATION_MARKER_ATTRIBUTE}="${id}-${type}"]`,
  );

  return marker ?? null;
}
