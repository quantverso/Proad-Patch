const STYLE_ID = 'proad-modern-style';

function normalizeButtonText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
}

export function captureOriginalToolbarButtonColors(): void {
  const targetLabels = new Set([
    'arquivar temporariamente',
    'organizar processos',
  ]);

  const buttons = document.querySelectorAll<HTMLElement>(
    '#formProtocolos .ui-button',
  );

  /*
   * Se nossa stylesheet já estiver aplicada, nós a desativamos
   * temporariamente para conseguir consultar a aparência original.
   *
   * Isso deixa a captura robusta mesmo quando a página foi
   * parcialmente renderizada antes da execução da feature.
   */
  const style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

  const wasDisabled = style?.disabled ?? false;

  if (style) {
    style.disabled = true;
  }

  try {
    buttons.forEach((button) => {
      const text = normalizeButtonText(button.textContent ?? '');

      if (!targetLabels.has(text)) {
        return;
      }

      const computed = getComputedStyle(button);

      button.style.setProperty(
        '--proad-original-button-background',
        computed.background,
      );

      button.style.setProperty('--proad-original-button-color', computed.color);

      button.dataset.proadOriginalButton = 'true';
    });
  } finally {
    if (style) {
      style.disabled = wasDisabled;
    }
  }
}

export function injectEstouTratandoStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');

  style.id = STYLE_ID;

  style.textContent = `
    :root {
      --slate-50: #f8fafc;
      --slate-100: #f1f5f9;
      --slate-200: #e2e8f0;
      --slate-300: #cbd5e1;
      --slate-400: #94a3b8;
      --slate-500: #64748b;
      --slate-600: #475569;
      --slate-700: #334155;
      --slate-800: #1e293b;
      --slate-900: #0f172a;

      --blue-50: #eff6ff;
      --blue-100: #dbeafe;
      --blue-500: #3b82f6;
      --blue-600: #2563eb;
      --blue-700: #1d4ed8;

      --ring: 0 0 0 3px rgb(59 130 246 / .25);
      --shadow-sm: 0 1px 2px 0 rgb(15 23 42 / .06);
      --shadow-md:
        0 4px 8px -2px rgb(15 23 42 / .10),
        0 2px 4px -2px rgb(15 23 42 / .06);
      --shadow-lg:
        0 20px 40px -8px rgb(15 23 42 / .22),
        0 8px 16px -6px rgb(15 23 42 / .10);
      --font-ui:
        "Inter", "Segoe UI", system-ui, -apple-system,
        BlinkMacSystemFont, sans-serif;
    }

    html,
    body,
    .wrapper,
    .content-wrapper,
    main.content-wrapper {
      background: var(--slate-200) !important;
    }

    main.content-wrapper {
      font-family: var(--font-ui);
      color: var(--slate-800);
    }

    #conteudoPagina {
      padding: 0 18px 24px;
    }

    .content-header {
      padding: 15px 4px 12px;
    }

    .tituloPagina {
      margin: 0 !important;
      font-size: 22px !important;
      line-height: 1.25;
      font-weight: 650 !important;
      letter-spacing: -.25px;
      color: var(--slate-900) !important;
    }

    .descricaoPagina {
      color: var(--slate-500);
    }

    .box {
      margin-bottom: 14px;
      border: 1px solid var(--slate-300) !important;
      border-radius: 14px !important;
      background: var(--slate-50) !important;
      box-shadow: var(--shadow-md) !important;
      overflow: visible !important;
    }

    .box-body {
      padding: 14px 16px !important;
      background: transparent !important;
    }

    .seletorAbaArea {
      color: var(--slate-600);
    }

    .seletorAbaArea.ui-buttonset {
      display: inline-flex;
      gap: 4px;
      padding: 4px;
      border: 1px solid var(--slate-300);
      border-radius: 10px;
      background: var(--slate-200);
    }

    .seletorAbaArea .ui-button {
      border: 0 !important;
      border-radius: 7px !important;
      background: transparent !important;
      box-shadow: none !important;
      color: var(--slate-600) !important;
    }

    .seletorAbaArea .ui-button:hover {
      background: var(--slate-100) !important;
      color: var(--slate-800) !important;
    }

    .seletorAbaArea .ui-button.ui-state-active {
      background: #ffffff !important;
      color: var(--blue-600) !important;
      box-shadow: var(--shadow-sm) !important;
      font-weight: 600;
    }

    [id="formProtocolos:toolbar"] {
      margin-top: 4px;
      padding: 10px 12px !important;
      border: 1px solid var(--slate-300) !important;
      border-radius: 10px !important;
      background: var(--slate-100) !important;
      box-shadow: none !important;
      overflow: visible !important;
    }

    #formProtocolos .ui-toolbar-group-left,
    #formProtocolos .ui-toolbar-group-right {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      min-width: 0;
    }

    #formProtocolos button.ui-button {
      min-height: 32px;
      border: 1px solid var(--slate-300) !important;
      border-radius: 8px !important;
      background: #ffffff !important;
      color: var(--slate-700) !important;
      box-shadow: var(--shadow-sm) !important;
      transition:
        background .12s ease,
        border-color .12s ease,
        box-shadow .12s ease;
    }

    #formProtocolos button.ui-button[data-proad-original-button="true"] {
      background: var(--proad-original-button-background) !important;
      color: var(--proad-original-button-color) !important;
    }

    #formProtocolos button.ui-button:hover {
      background: var(--slate-50) !important;
      border-color: var(--slate-400) !important;
      box-shadow: var(--shadow-md) !important;
    }

    #formProtocolos .ui-inputfield,
    #formProtocolos .ui-selectonemenu,
    #formProtocolos .ui-selectcheckboxmenu,
    #formProtocolos .ui-autocomplete,
    #formProtocolos .ui-autocomplete-input,
    #formProtocolos .ui-autocomplete-multiple-container,
    #formProtocolos .ui-calendar,
    #formProtocolos .ui-column-filter {
      box-sizing: border-box !important;
      max-width: 100%;
    }

    #formProtocolos .ui-inputfield {
      min-height: 32px;
      border: 1px solid var(--slate-300) !important;
      border-radius: 8px !important;
      background: #ffffff !important;
      color: var(--slate-800) !important;
      box-shadow: none !important;
      transition: border-color .12s ease, box-shadow .12s ease;
    }

    #formProtocolos .ui-inputfield:focus {
      border-color: var(--blue-500) !important;
      box-shadow: var(--ring) !important;
      outline: none !important;
    }

    #formProtocolos .ui-selectonemenu,
    #formProtocolos .ui-selectcheckboxmenu,
    #formProtocolos .ui-autocomplete-multiple-container {
      border: 1px solid var(--slate-300) !important;
      border-radius: 8px !important;
      background: #ffffff !important;
      box-shadow: none !important;
    }

    #formProtocolos .ui-selectonemenu .ui-inputfield,
    #formProtocolos .ui-selectcheckboxmenu .ui-inputfield,
    #formProtocolos .ui-autocomplete-multiple-container .ui-inputfield {
      min-height: 0;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    #formProtocolos .ui-selectonemenu .ui-selectonemenu-label {
      display: block;
      width: 100% !important;
      box-sizing: border-box !important;
      padding-right: 2.4em !important;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #formProtocolos .ui-selectonemenu .ui-selectonemenu-trigger {
      border: 0 !important;
      background: transparent !important;
    }

    #formProtocolos .ui-selectonemenu:focus-within,
    #formProtocolos .ui-selectonemenu.ui-state-focus,
    #formProtocolos .ui-selectcheckboxmenu.ui-state-focus,
    #formProtocolos .ui-autocomplete-multiple-container.ui-state-focus {
      border-color: var(--blue-500) !important;
      box-shadow: var(--ring) !important;
    }

    [id="formProtocolos:remetentes"] {
      box-sizing: border-box !important;
      max-width: 100%;
    }

    [id="formProtocolos:tblEstouTratando"] {
      border: 1px solid var(--slate-300);
      border-radius: 12px;
      background: var(--slate-50);
      overflow: visible;
      box-shadow: var(--shadow-md);
    }

    [id="formProtocolos:tblEstouTratando"] .ui-datatable-header {
      padding: 9px 10px !important;
      border: 0 !important;
      border-bottom: 1px solid var(--slate-200) !important;
      border-radius: 12px 12px 0 0;
      background: var(--slate-100) !important;
    }

    [id="formProtocolos:tblEstouTratando"] .ui-datatable-tablewrapper {
      border-radius: 0 0 12px 12px;
      overflow-x: auto;
    }

    [id="formProtocolos:tblEstouTratando"] table {
      border-collapse: separate !important;
      border-spacing: 0 !important;
    }

    [id="formProtocolos:tblEstouTratando"] thead th {
      position: sticky;
      top: 0;
      z-index: 5;
      height: 42px;
      padding: 8px 10px !important;
      border: 0 !important;
      border-bottom: 1px solid var(--slate-300) !important;
      background: var(--slate-200) !important;
      color: var(--slate-700) !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      text-transform: none !important;
      overflow: visible !important;
      box-sizing: border-box;
    }

    [id="formProtocolos:tblEstouTratando"] tbody td {
      padding: 8px 10px !important;
      border: 0 !important;
      border-bottom: 1px solid var(--slate-200) !important;
      background: var(--slate-50);
      color: var(--slate-700);
      font-size: 12.5px;
      vertical-align: middle;
    }

    [id="formProtocolos:tblEstouTratando"] tbody tr[data-proad-zebra="odd"] td {
      background: var(--slate-100);
    }

    [id="formProtocolos:tblEstouTratando"] tbody tr[data-proad-zebra="even"] td {
      background: var(--slate-50);
    }

    /*
    * Hover normal da tabela.
    * Não será aplicado às linhas que possuem
    * uma cor nativa preservada.
    */
    [id="formProtocolos:tblEstouTratando"]
      tbody tr:not([data-proad-native-color]):hover
      td {
      background: var(--blue-50) !important;
    }

    /*
    * Seleção normal da tabela.
    * Linhas nativas continuarão com sua própria cor.
    */
    [id="formProtocolos:tblEstouTratando"]
      tbody tr:not([data-proad-native-color]).ui-state-highlight
      td {
      background: var(--blue-100) !important;
      color: var(--slate-900);
    }

    /*
    * Preserva a cor original do PROAD.
    *
    * A cor é aplicada diretamente nas células porque
    * elas já recebem background próprio pelo zebra.
    */
    [id="formProtocolos:tblEstouTratando"]
      tbody tr[data-proad-native-color]
      td {
      background: var(--proad-native-row-background) !important;
    }

    /*
    * Hover não altera uma linha que possui cor nativa.
    */
    [id="formProtocolos:tblEstouTratando"]
      tbody tr[data-proad-native-color]:hover
      td {
      background: var(--proad-native-row-background) !important;
    }

    [id="formProtocolos:tblEstouTratando"] tbody tr:last-child td {
      border-bottom: 0 !important;
    }

    [id="formProtocolos:tblEstouTratando"] tr.proad-row-filtered {
      display: none !important;
    }

    [id="formProtocolos:tblEstouTratando"] a.panel-item-value {
      color: var(--blue-600);
      text-decoration: none;
      transition: color .1s ease;
    }

    [id="formProtocolos:tblEstouTratando"] a.panel-item-value:hover {
      color: var(--blue-700);
      text-decoration: underline;
    }

    [id="formProtocolos:tblEstouTratando"] .ui-column-filter,
    [id="formProtocolos:tblEstouTratando"] thead th input[type="text"]:not(.proad-annotations-filter) {
      display: block;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
      margin: 5px 0 0 !important;
      min-height: 28px !important;
      padding: 4px 8px !important;
      border: 1px solid var(--slate-300) !important;
      border-radius: 7px !important;
      background: #ffffff !important;
      color: var(--slate-800) !important;
      font-size: 11.5px !important;
      box-shadow: none !important;
      transition: border-color .12s ease, box-shadow .12s ease;
    }

    [id="formProtocolos:tblEstouTratando"] .ui-column-filter:focus,
    [id="formProtocolos:tblEstouTratando"] thead th input[type="text"]:focus {
      border-color: var(--blue-500) !important;
      box-shadow: var(--ring) !important;
      outline: none !important;
    }

    [id="formProtocolos:tblEstouTratando"] thead th .ui-column-customfilter,
    [id="formProtocolos:tblEstouTratando"] thead th .ui-selectonemenu,
    [id="formProtocolos:tblEstouTratando"] thead th .ui-column-customfilter > * {
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }

    [id="formProtocolos:tblEstouTratando"] thead th .ui-selectonemenu {
      margin-top: 5px;
      border: 1px solid var(--slate-300) !important;
      border-radius: 7px !important;
      background: #ffffff !important;
    }

    [id="formProtocolos:tblEstouTratando"] thead th .ui-selectonemenu .ui-inputfield {
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    [data-proad-annotations-header] {
      width: 320px !important;
      min-width: 320px !important;
      text-align: left;
    }

    .proad-annotations-header-content {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
    }

    .proad-annotations-header-content:hover {
      color: var(--blue-600);
    }

    .proad-annotations-sort {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 17px;
      height: 17px;
      color: var(--slate-500);
      font-size: 12px;
    }

    .proad-annotations-filter-wrap {
      position: relative;
      width: 100%;
      margin-top: 5px;
    }

    .proad-annotations-filter {
      display: block;
      width: 100%;
      min-width: 0;
      height: 28px;
      box-sizing: border-box;
      padding: 4px 26px 4px 8px;
      border: 1px solid var(--slate-300);
      border-radius: 7px;
      background: #ffffff;
      color: var(--slate-800);
      font-family: inherit;
      font-size: 11.5px;
      font-weight: 400;
      outline: none;
      box-shadow: none;
      transition: border-color .12s ease, box-shadow .12s ease;
    }

    .proad-annotations-filter::placeholder {
      color: var(--slate-400);
    }

    .proad-annotations-filter:focus {
      border-color: var(--blue-500);
      box-shadow: var(--ring);
    }

    .proad-annotations-filter-clear {
      position: absolute;
      top: 50%;
      right: 4px;
      width: 20px;
      height: 20px;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 0;
      border-radius: 5px;
      background: transparent;
      color: var(--slate-500);
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      transform: translateY(-50%);
    }

    .proad-annotations-filter-wrap.has-value .proad-annotations-filter-clear {
      display: flex;
    }

    .proad-annotations-filter-clear:hover {
      background: var(--slate-200);
      color: var(--slate-800);
    }

    .proad-annotation-cell {
      width: 320px !important;
      min-width: 320px !important;
      max-width: 320px !important;
      padding: 7px 8px !important;
      vertical-align: middle !important;
      cursor: pointer;
      user-select: none;
    }

    .proad-annotation-preview {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border: 1px solid;
      border-radius: 8px;
      color: var(--slate-800);
      font-size: 13.5px;
      line-height: 1.42;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      max-height: 112px;
      overflow: hidden;
      cursor: pointer;
      transition: box-shadow .12s ease, filter .12s ease;
    }

    .proad-annotation-preview:hover {
      filter: brightness(.98);
      box-shadow: var(--shadow-md);
    }

    .proad-annotation-empty {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 30px;
      padding: 5px 10px;
      border: 1px dashed var(--slate-300);
      border-radius: 8px;
      background: rgb(255 255 255 / .55);
      color: var(--slate-500);
      font-size: 12.5px;
      transition: border-color .12s ease, background .12s ease, color .12s ease;
    }

    .proad-annotation-cell.is-empty:hover .proad-annotation-empty {
      border-color: var(--blue-500);
      background: var(--blue-50);
      color: var(--blue-600);
    }

    .proad-annotation-add-icon {
      width: 18px;
      height: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--slate-200);
      color: var(--slate-600);
      font-size: 14px;
      font-weight: 600;
    }

    .proad-columns-button {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      height: 32px;
      padding: 0 11px;
      border: 1px solid var(--slate-300);
      border-radius: 8px;
      background: #ffffff;
      color: var(--slate-700);
      font-family: var(--font-ui);
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition: background .12s ease, border-color .12s ease, box-shadow .12s ease, transform .08s ease;
    }

    .proad-columns-button:hover {
      background: var(--slate-50);
      border-color: var(--slate-400);
      box-shadow: var(--shadow-md);
    }

    .proad-columns-button:active {
      transform: translateY(1px);
    }

    .proad-columns-button:focus-visible {
      outline: 2px solid var(--blue-500);
      outline-offset: 2px;
    }

    .proad-columns-button-icon {
      width: 16px;
      height: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .proad-columns-button-icon svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
    }

    #proad-column-panel {
      position: fixed;
      width: 315px;
      max-width: calc(100vw - 24px);
      z-index: 2147483640;
      box-sizing: border-box;
      overflow: hidden;
      border: 1px solid var(--slate-300);
      border-radius: 12px;
      background: var(--slate-50);
      box-shadow: var(--shadow-lg);
      font-family: var(--font-ui);
    }

    .proad-column-panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 15px 12px;
      border-bottom: 1px solid var(--slate-200);
    }

    .proad-column-panel-title {
      font-size: 14px;
      font-weight: 650;
      color: var(--slate-900);
    }

    .proad-column-panel-subtitle {
      margin-top: 2px;
      color: var(--slate-500);
      font-size: 11.5px;
    }

    .proad-column-panel-close {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: var(--slate-500);
      font-size: 21px;
      cursor: pointer;
    }

    .proad-column-panel-close:hover {
      background: var(--slate-200);
      color: var(--slate-900);
    }

    .proad-column-panel-list {
      max-height: 360px;
      overflow-y: auto;
      padding: 6px;
    }

    .proad-column-panel-list::-webkit-scrollbar {
      width: 7px;
    }

    .proad-column-panel-list::-webkit-scrollbar-thumb {
      background: var(--slate-300);
      border-radius: 20px;
    }

    .proad-column-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 9px;
      min-height: 36px;
      padding: 0 9px;
      border-radius: 8px;
      cursor: pointer;
      user-select: none;
    }

    .proad-column-item:hover {
      background: var(--slate-200);
    }

    .proad-column-item input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .proad-column-check {
      width: 17px;
      height: 17px;
      flex: 0 0 17px;
      position: relative;
      box-sizing: border-box;
      border: 1px solid var(--slate-400);
      border-radius: 5px;
      background: #ffffff;
    }

    .proad-column-item input:checked + .proad-column-check {
      border-color: var(--blue-600);
      background: var(--blue-600);
    }

    .proad-column-item input:checked + .proad-column-check::after {
      content: "";
      position: absolute;
      left: 5px;
      top: 1px;
      width: 4px;
      height: 9px;
      border: solid #ffffff;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .proad-column-item-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--slate-700);
      font-size: 12.5px;
    }

    .proad-column-panel-footer {
      display: flex;
      justify-content: flex-end;
      padding: 9px 11px;
      border-top: 1px solid var(--slate-200);
      background: var(--slate-100);
    }

    .proad-columns-show-all {
      border: 0;
      border-radius: 7px;
      padding: 6px 10px;
      background: transparent;
      color: var(--blue-600);
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }

    .proad-columns-show-all:hover {
      background: var(--blue-100);
    }

    #proad-annotation-modal {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      font-family: var(--font-ui);
    }

    .proad-annotation-backdrop {
      position: absolute;
      inset: 0;
      background: rgb(15 23 42 / .45);
      backdrop-filter: blur(3px);
    }

    .proad-annotation-dialog {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 570px;
      max-width: calc(100vw - 28px);
      transform: translate(-50%, -50%);
      overflow: hidden;
      border: 1px solid var(--slate-300);
      border-radius: 14px;
      background: var(--slate-50);
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 40px);
    }

    .proad-annotation-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 16px 18px 14px;
      border-bottom: 1px solid var(--slate-200);
      flex: 0 0 auto;
    }

    .proad-annotation-title {
      font-size: 16px;
      font-weight: 650;
      color: var(--slate-900);
    }

    .proad-annotation-process {
      margin-top: 3px;
      color: var(--slate-500);
      font-size: 12px;
    }

    .proad-annotation-close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--slate-500);
      font-size: 23px;
      cursor: pointer;
    }

    .proad-annotation-close:hover {
      background: var(--slate-200);
      color: var(--slate-900);
    }

    .proad-annotation-tabs {
      display: flex;
      gap: 2px;
      padding: 8px 18px 0;
      border-bottom: 1px solid var(--slate-200);
      background: var(--slate-50);
      flex: 0 0 auto;
    }

    .proad-tab-button {
      position: relative;
      padding: 8px 14px 10px;
      border: 0;
      background: transparent;
      color: var(--slate-500);
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border-radius: 8px 8px 0 0;
      transition: color .12s ease, background .12s ease;
    }

    .proad-tab-button:hover {
      color: var(--slate-800);
      background: var(--slate-100);
    }

    .proad-tab-button.is-active {
      color: var(--blue-600);
      font-weight: 600;
    }

    .proad-tab-button.is-active::after {
      content: "";
      position: absolute;
      left: 8px;
      right: 8px;
      bottom: -1px;
      height: 2px;
      background: var(--blue-600);
      border-radius: 2px 2px 0 0;
    }

    .proad-annotation-content {
      padding: 16px 18px 18px;
      flex: 1 1 auto;
      overflow-y: auto;
      min-height: 0;
    }

    .proad-tab-panel {
      display: none;
    }

    .proad-tab-panel.is-active {
      display: block;
    }

    .proad-tab-panel[hidden] {
      display: none !important;
    }

    .proad-annotation-textarea {
      display: block;
      width: 100%;
      min-height: 190px;
      box-sizing: border-box;
      resize: vertical;
      padding: 11px 12px;
      border: 1px solid var(--slate-300);
      border-radius: 9px;
      outline: none;
      background: #ffffff;
      color: var(--slate-800);
      font-family: inherit;
      font-size: 14px;
      line-height: 1.5;
      transition: border-color .12s ease, box-shadow .12s ease;
    }

    .proad-annotation-textarea:focus {
      border-color: var(--blue-500);
      box-shadow: var(--ring);
    }

    .proad-annotation-color-block {
      margin-top: 16px;
    }

    .proad-annotation-label {
      margin-bottom: 8px;
      color: var(--slate-600);
      font-size: 12px;
      font-weight: 600;
    }

    .proad-annotation-color-options {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .proad-color-option {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 10px;
      border: 1px solid transparent;
      border-radius: 8px;
      color: var(--slate-600);
      font-size: 12.5px;
      cursor: pointer;
    }

    .proad-color-option:hover {
      background: var(--slate-200);
    }

    .proad-color-option.is-selected {
      border-color: var(--slate-300);
      background: #ffffff;
    }

    .proad-color-option input {
      margin: 0;
    }

    .proad-color-circle {
      width: 19px;
      height: 19px;
      box-sizing: border-box;
      border: 1px solid;
      border-radius: 6px;
    }

    .proad-context-table-wrap {
      border: 1px solid var(--slate-200);
      border-radius: 10px;
      background: #ffffff;
      overflow: hidden;
      max-height: 300px;
      overflow-y: auto;
    }

    .proad-context-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .proad-context-table thead th {
      position: sticky;
      top: 0;
      height: 32px;
      padding: 0 10px;
      background: var(--slate-100);
      color: var(--slate-500);
      border-bottom: 1px solid var(--slate-200);
      font-size: 10.5px;
      font-weight: 600;
      text-align: left;
      text-transform: uppercase;
      letter-spacing: .4px;
    }

    .proad-context-table thead th:first-child { width: 32%; }
    .proad-context-table thead th:nth-child(2) { width: 56%; }
    .proad-context-table thead th:last-child { width: 12%; }

    .proad-context-table tbody td {
      height: 36px;
      padding: 0;
      border-bottom: 1px solid var(--slate-100);
      vertical-align: middle;
    }

    .proad-context-table tbody tr:last-child td {
      border-bottom: 0;
    }

    .proad-context-input {
      display: block;
      width: 100%;
      height: 36px;
      box-sizing: border-box;
      padding: 6px 10px;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--slate-800);
      font-family: inherit;
      font-size: 12.5px;
    }

    .proad-context-input::placeholder {
      color: var(--slate-400);
    }

    .proad-context-input:focus {
      background: var(--blue-50);
    }

    .proad-context-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin: 0 auto;
      padding: 0;
      border: 0;
      border-radius: 5px;
      background: transparent;
      color: var(--slate-400);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      transition: background .12s ease, color .12s ease;
    }

    .proad-context-remove:hover {
      background: #fff5f5;
      color: #c5221f;
    }

    .proad-context-empty {
      padding: 22px 12px !important;
      text-align: center;
      color: var(--slate-500);
      font-size: 12px;
    }

    .proad-context-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 10px;
      padding: 6px 8px 6px 10px;
      border: 1px solid var(--slate-200);
      border-radius: 9px;
      background: var(--slate-100);
    }

    .proad-context-status {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--slate-500);
      font-size: 11.5px;
    }

    .proad-context-dot {
      width: 7px;
      height: 7px;
      flex: 0 0 7px;
      border-radius: 50%;
      background: #34a853;
    }

    .proad-context-status-text {
      white-space: nowrap;
    }

    .proad-context-actions {
      display: flex;
      gap: 6px;
    }

    .proad-context-action {
      height: 28px;
      padding: 0 10px;
      border: 1px solid var(--slate-300);
      border-radius: 7px;
      background: #ffffff;
      color: var(--slate-700);
      font-family: inherit;
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      transition: background .12s ease, border-color .12s ease;
    }

    .proad-context-action:hover {
      background: var(--slate-50);
      border-color: var(--slate-400);
    }

    .proad-todo-board {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .proad-todo-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .proad-todo-empty {
      padding: 22px 14px;
      border: 1px dashed var(--slate-300);
      border-radius: 10px;
      background: rgb(255 255 255 / .5);
      color: var(--slate-500);
      font-size: 12.5px;
      text-align: center;
    }

    .proad-todo-empty strong {
      color: var(--slate-700);
      font-weight: 600;
    }

    .proad-todo-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid var(--slate-200);
      border-radius: 9px;
      background: #ffffff;
      box-shadow: var(--shadow-sm);
      transition: box-shadow .12s ease, border-color .12s ease, background .12s ease;
    }

    .proad-todo-card:hover {
      border-color: var(--slate-300);
      box-shadow: var(--shadow-md);
    }

    .proad-todo-card.is-done {
      background: var(--slate-50);
      opacity: .78;
    }

    .proad-todo-check-wrap {
      position: relative;
      flex: 0 0 18px;
      width: 18px;
      height: 18px;
      display: inline-flex;
      cursor: pointer;
    }

    .proad-todo-checkbox {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .proad-todo-check {
      width: 18px;
      height: 18px;
      box-sizing: border-box;
      border: 1.5px solid var(--slate-400);
      border-radius: 5px;
      background: #ffffff;
      position: relative;
      transition: background .12s ease, border-color .12s ease;
    }

    .proad-todo-check-wrap:hover .proad-todo-check {
      border-color: var(--blue-500);
    }

    .proad-todo-checkbox:checked + .proad-todo-check {
      border-color: var(--blue-600);
      background: var(--blue-600);
    }

    .proad-todo-checkbox:checked + .proad-todo-check::after {
      content: "";
      position: absolute;
      left: 5px;
      top: 1px;
      width: 5px;
      height: 10px;
      border: solid #ffffff;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .proad-todo-title {
      flex: 1 1 auto;
      min-width: 0;
      border: 0;
      outline: 0;
      padding: 4px 2px;
      background: transparent;
      color: var(--slate-800);
      font-family: inherit;
      font-size: 13px;
      line-height: 1.4;
      transition: color .12s ease;
    }

    .proad-todo-title::placeholder {
      color: var(--slate-400);
    }

    .proad-todo-card.is-done .proad-todo-title {
      color: var(--slate-400);
      text-decoration: line-through;
    }

    .proad-todo-remove {
      flex: 0 0 26px;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--slate-400);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      transition: background .12s ease, color .12s ease;
    }

    .proad-todo-remove:hover {
      background: #fff5f5;
      color: #c5221f;
    }

    .proad-todo-add {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      width: 100%;
      padding: 10px 12px;
      border: 1px dashed var(--slate-300);
      border-radius: 9px;
      background: transparent;
      color: var(--slate-600);
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      transition: background .12s ease, border-color .12s ease, color .12s ease;
    }

    .proad-todo-add:hover {
      border-color: var(--blue-500);
      background: var(--blue-50);
      color: var(--blue-600);
    }

    .proad-todo-add-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--slate-200);
      color: var(--slate-600);
      font-size: 14px;
      font-weight: 600;
    }

    .proad-todo-add:hover .proad-todo-add-icon {
      background: var(--blue-100);
      color: var(--blue-600);
    }

    .proad-annotation-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      padding: 11px 18px;
      border-top: 1px solid var(--slate-200);
      background: var(--slate-100);
      flex: 0 0 auto;
    }

    .proad-annotation-shortcut {
      color: var(--slate-500);
      font-size: 11px;
    }

    .proad-annotation-actions {
      display: flex;
      gap: 8px;
    }

    .proad-btn-secondary,
    .proad-btn-primary {
      min-width: 84px;
      height: 34px;
      padding: 0 14px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }

    .proad-btn-secondary {
      border: 1px solid var(--slate-300);
      background: #ffffff;
      color: var(--slate-700);
    }

    .proad-btn-secondary:hover {
      background: var(--slate-100);
    }

    .proad-btn-primary {
      border: 1px solid var(--blue-600);
      background: var(--blue-600);
      color: #ffffff;
      box-shadow: 0 1px 2px rgb(37 99 235 / .25);
    }

    .proad-btn-primary:hover {
      border-color: var(--blue-700);
      background: var(--blue-700);
    }

    .proad-btn-primary:disabled {
      opacity: .65;
      cursor: default;
    }

    @media (max-width: 900px) {
      [id="formProtocolos:tblEstouTratando"] thead th {
        position: static;
      }

      .proad-annotation-cell,
      [data-proad-annotations-header] {
        width: 280px !important;
        min-width: 280px !important;
      }

      .proad-annotation-shortcut {
        display: none;
      }
    }

    @media (max-width: 640px) {
      #conteudoPagina {
        padding: 0 8px 18px;
      }

      .box-body {
        padding: 10px !important;
      }

      .proad-annotation-dialog {
        width: calc(100vw - 18px);
        max-height: calc(100vh - 24px);
      }

      .proad-annotation-content,
      .proad-annotation-header {
        padding: 13px;
      }

      .proad-annotation-footer {
        padding: 10px 13px;
      }

      .proad-columns-button {
        padding: 0 8px;
      }
    }
  `;

  document.head.appendChild(style);
}
