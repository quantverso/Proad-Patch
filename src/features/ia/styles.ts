export function injectAssistantStyles() {
  if (document.getElementById('trt14-assistant-styles')) {
    return;
  }

  const style = document.createElement('style');

  style.id = 'trt14-assistant-styles';

  style.textContent = `
    /* ======================================================
       BASE
       ====================================================== */

    .trt14-sidebar,
    .trt14-sidebar * {
        box-sizing: border-box;
    }

    .trt14-sidebar {
        color: #202123;
        background: #ffffff;

        font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            sans-serif;
    }

    /* ======================================================
       APP
       ====================================================== */

    .trt14-assistant-main {
        width: 100%;
        height: 100%;

        display: flex;
        flex-direction: column;

        overflow: hidden;
    }

    /* ======================================================
       SCROLL
       ====================================================== */

    .trt14-assistant-scroll {
        flex: 1;

        min-height: 0;

        width: 100%;
        height: 100%;

        overflow-y: auto;

        padding: 14px 12px 12px;

        display: flex;
        flex-direction: column;
    }

    /* ======================================================
       WORKSPACE
       ====================================================== */

    .trt14-assistant-workspace {
        width: 100%;

        min-height: 100%;

        display: flex;
        flex-direction: column;

        flex: 1;
    }

    /* ======================================================
       CONTEXTO
       ====================================================== */

    .trt14-context-panel {
        width: 100%;

        flex: 0 0 auto;

        border: 1px solid #e3e3e7;
        border-radius: 10px;

        background: #fff;

        overflow: hidden;
    }

    .trt14-context-table-wrap {
        max-height: 210px;

        overflow: auto;
    }

    .trt14-context-table {
        width: 100%;

        border-collapse: collapse;

        table-layout: fixed;
    }

    .trt14-context-table th {
        height: 31px;

        padding: 0 8px;

        border-bottom: 1px solid #e3e3e7;

        background: #f7f7f8;

        color: #666;

        font-size: 10px;
        font-weight: 600;

        text-align: left;
    }

    .trt14-context-table th:first-child {
        width: 31%;
    }

    .trt14-context-table th:nth-child(2) {
        width: 59%;
    }

    .trt14-context-table th:last-child {
        width: 10%;
    }

    .trt14-context-table td {
        height: 33px;

        border-bottom: 1px solid #eeeef0;
    }

    .trt14-context-table tr:last-child td {
        border-bottom: 0;
    }

    /* ======================================================
       INPUTS DO CONTEXTO
       ====================================================== */

    .trt14-context-input {
        width: 100%;
        height: 33px;

        padding: 6px 8px;

        border: 0;
        outline: 0;

        background: transparent;

        color: #202123;

        font-size: 11px;
    }

    .trt14-context-input:focus {
        background: #fafafa;
    }

    /* ======================================================
       REMOVER CAMPO
       ====================================================== */

    .trt14-remove-row {
        width: 24px;
        height: 24px;

        margin: auto;

        border: 0;
        border-radius: 5px;

        background: transparent;

        color: #aaa;

        cursor: pointer;

        display: flex;
        align-items: center;
        justify-content: center;
    }

    .trt14-remove-row:hover {
        background: #fff5f5;

        color: #c5221f;
    }

    .trt14-remove-row svg {
        width: 12px;
        height: 12px;
    }

    /* ======================================================
       CONTEXTO VAZIO
       ====================================================== */

    .trt14-context-empty {
        padding: 20px !important;

        text-align: center;

        color: #777;

        font-size: 11px;
    }

    /* ======================================================
       RODAPÉ DO CONTEXTO
       ====================================================== */

    .trt14-context-footer {
        min-height: 37px;

        padding: 5px 7px 5px 9px;

        border-top: 1px solid #e3e3e7;

        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .trt14-context-status {
        display: flex;
        align-items: center;

        gap: 5px;

        color: #777;

        font-size: 10px;
    }

    .trt14-context-dot {
        width: 6px;
        height: 6px;

        border-radius: 50%;

        background: #34a853;
    }

    .trt14-context-actions {
        display: flex;

        gap: 5px;
    }

    .trt14-context-action {
        height: 26px;

        padding: 0 7px;

        border: 1px solid #e3e3e7;
        border-radius: 7px;

        background: #fff;

        color: #666;

        cursor: pointer;

        display: flex;
        align-items: center;

        gap: 4px;

        font-size: 10px;
    }

    .trt14-context-action:hover {
        background: #f7f7f8;

        color: #202123;
    }

    .trt14-context-action svg {
        width: 12px;
        height: 12px;
    }

    /* ======================================================
       COMPOSER — FUNDO
       ====================================================== */

    .trt14-composer {
        width: 100%;

        margin-top: auto;

        padding-top: 10px;

        display: flex;
        flex-direction: column;

        flex: 0 0 auto;
    }

    /* ======================================================
       CAMPO DA IA
       ====================================================== */

    .trt14-input-shell {
        width: 100%;

        border: 1px solid #e3e3e7;
        border-radius: 12px;

        background: #fff;

        overflow: hidden;
    }

    .trt14-prompt {
        display: block;

        width: 100%;

        min-height: 90px;
        max-height: 220px;

        padding: 11px 12px 8px;

        resize: none;

        border: 0;
        outline: 0;

        background: transparent;

        color: #202123;

        font-size: 12px;
        line-height: 1.5;
    }

    .trt14-prompt::placeholder {
        color: #999;
    }

    /* ======================================================
       RODAPÉ DO COMPOSER
       ====================================================== */

    .trt14-composer-footer {
        min-height: 39px;

        padding: 4px 7px 6px 10px;

        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .trt14-status {
        display: flex;
        align-items: center;

        gap: 5px;

        color: #909090;

        font-size: 10px;
    }

    .trt14-status-dot {
        width: 6px;
        height: 6px;

        border-radius: 50%;

        background: #34a853;
    }

    .trt14-status.busy
    .trt14-status-dot {
        background: #1a73e8;

        animation:
            trt14Pulse
            1s
            infinite
            ease-in-out;
    }

    @keyframes trt14Pulse {
        0%,
        100% {
            opacity: .35;
        }

        50% {
            opacity: 1;
        }
    }

    /* ======================================================
       BOTÃO ENVIAR
       ====================================================== */

    .trt14-send {
        width: 30px;
        height: 30px;

        border: 0;
        border-radius: 8px;

        background: #111827;

        color: #fff;

        display: flex;
        align-items: center;
        justify-content: center;

        cursor: pointer;
    }

    .trt14-send:hover {
        background: #000;
    }

    .trt14-send:disabled {
        opacity: .45;

        cursor: default;
    }

    .trt14-send svg {
        width: 15px;
        height: 15px;
    }

    /* ======================================================
       OPÇÕES DE GERAÇÃO
       ====================================================== */

    .trt14-generation-options {
        width: 100%;

        display: flex;

        gap: 6px;

        margin-top: 7px;
    }

    .trt14-generation-option {
        position: relative;

        flex: 1;

        min-width: 0;
    }

    .trt14-generation-select {
        width: 100%;
        height: 31px;

        border: 1px solid #e3e3e7;
        border-radius: 7px;

        background: #fff;

        color: #202123;

        appearance: none;

        padding: 0 25px 0 8px;

        font-size: 10px;

        outline: none;
    }

    .trt14-generation-label {
        position: absolute;

        top: -4px;
        left: 7px;

        z-index: 1;

        padding: 0 3px;

        background: #fff;

        color: #999;

        font-size: 8px;

        line-height: 1;
    }

    .trt14-select-chevron {
        position: absolute;

        top: 50%;
        right: 8px;

        transform: translateY(-50%);

        color: #777;

        pointer-events: none;
    }

    .trt14-select-chevron svg {
        width: 12px;
        height: 12px;
    }

    /* ======================================================
       DESCRIÇÃO DO MODELO
       ====================================================== */

    .trt14-model-description {
        padding: 5px 1px 0;

        color: #999;

        font-size: 9px;

        line-height: 1.4;
    }

    /* ======================================================
       AVISO
       ====================================================== */

    .trt14-warning {
        margin: 6px 1px 0;

        color: #c5221f;

        font-size: 9px;

        line-height: 1.35;
    }

    /* ======================================================
       SCROLLBAR
       ====================================================== */

    .trt14-assistant-scroll::-webkit-scrollbar {
        width: 6px;
    }

    .trt14-assistant-scroll::-webkit-scrollbar-thumb {
        background: #d6d6da;

        border-radius: 10px;
    }
  `;

  document.head.appendChild(style);
}
