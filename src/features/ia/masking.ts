import { escapeHtml } from '../../utils/html';
import type { ProadContext } from '../../utils/storage';

// ============================================================
// ESCAPA REGEX
// ============================================================

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// PLACEHOLDER
// ============================================================

export function createPlaceholder(key: string): string {
  return `[${key}]`;
}

// ============================================================
// MASCARA
// ============================================================
//
// IMPORTANTE:
//
// Esta função deve receber TEXTO PURO.
//
// Não passe HTML do CKEditor diretamente aqui.
// ============================================================

export function maskDocument(document: string, context: ProadContext): string {
  let masked = document;

  const entries = Object.entries(context)
    .filter(([key, value]) => key.trim() && String(value) !== '')
    .sort(([, a], [, b]) => String(b).length - String(a).length);

  for (const [key, value] of entries) {
    const normalizedValue = String(value);

    if (!normalizedValue) {
      continue;
    }

    const regex = new RegExp(escapeRegExp(normalizedValue), 'g');

    masked = masked.replace(regex, createPlaceholder(key));
  }

  return masked;
}

// ============================================================
// DESMASCARA
//
// Valor existente:
// [servidor]
// ↓
// João da Silva
//
// Valor inexistente:
// [data]
// ↓
// <strong>[data]</strong>
//
// Os valores reais são escapados para impedir que conteúdo
// salvo no contexto seja interpretado como HTML.
// ============================================================

export function unmaskDocument(
  document: string,
  context: ProadContext,
): string {
  let unmasked = document;

  // ----------------------------------------------------------
  // Valores disponíveis
  // ----------------------------------------------------------

  for (const [key, value] of Object.entries(context)) {
    const placeholder = createPlaceholder(key);

    const normalizedValue = String(value);

    if (!normalizedValue) {
      continue;
    }

    const regex = new RegExp(escapeRegExp(placeholder), 'g');

    unmasked = unmasked.replace(regex, () => escapeHtml(normalizedValue));
  }

  // ----------------------------------------------------------
  // Placeholders que permaneceram.
  // ----------------------------------------------------------

  unmasked = unmasked.replace(
    /\[[^\]\r\n]+\]/g,
    (placeholder) => `<strong>${placeholder}</strong>`,
  );

  return unmasked;
}

// ============================================================
// VERIFICA PLACEHOLDERS
// ============================================================

export function hasPlaceholders(
  document: string,
  context: ProadContext,
): boolean {
  return Object.keys(context).some((key) =>
    document.includes(createPlaceholder(key)),
  );
}
