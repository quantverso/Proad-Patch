// ============================================================
// OBTÉM O TÍTULO DO PROAD
// ============================================================

export function getProadTitle(): string | null {
  const element = document.querySelector('h1.tituloPagina');

  return element?.textContent?.trim() || null;
}

// ============================================================
// EXTRAI O NÚMERO DO PROAD
//
// Exemplo:
//
// "Minuta de Documento (PROAD n. 4375/2026)"
//
// retorna:
//
// "4375/2026"
// ============================================================

export function getProadNumber(): string | null {
  const title = getProadTitle();

  if (!title) {
    return null;
  }

  const match = title.match(/PROAD\s+n[º°.]?\s*([0-9]+\/[0-9]+)/i);

  return match?.[1] ?? null;
}
