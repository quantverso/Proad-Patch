import { MODEL_CONFIG, SIDEBAR_WIDTH } from '../../config';

import { getActiveEditor, getEditorContents } from '../../utils/ckeditor';

import { escapeHtml, htmlToPlainText } from '../../utils/html';

import {
  createContextRow,
  loadContext,
  renderEmptyContext,
  setContextChanged,
} from './context';

import { collapseEditorToEnd } from './editor-writer';

import { maskDocument, unmaskDocument } from './masking';

import { buildPrompt } from './prompt';

import { streamGemini } from './gemini';

import { ICONS } from './icons';

import type { AssistantState } from './types';

import { getProadTitle, getProadNumber } from '../../utils/proad';

import { loadProadContext, clearProadContext } from '../../utils/storage';

import { findDelimitedRegion } from '../../utils/editor-region';

export const assistantStates = new WeakMap<Element, AssistantState>();

// ============================================================
// STATUS
// ============================================================

export function setAssistantStatus(
  state: AssistantState,
  text: string,
  busy = false,
) {
  state.statusText.textContent = text;

  state.status.classList.toggle('busy', busy);
}

// ============================================================
// THINKING
// ============================================================

export function getThinkingLabel(level: string): string {
  const labels: Record<string, string> = {
    auto: 'Automático',
    minimal: 'Mínimo',
    low: 'Baixo',
    medium: 'Médio',
    high: 'Alto',
  };

  return labels[level] ?? level;
}

export function updateThinkingOptions(state: AssistantState) {
  const config =
    MODEL_CONFIG[state.modelSelect.value as keyof typeof MODEL_CONFIG];

  if (!config) {
    return;
  }

  state.thinkingSelect.innerHTML = '';

  for (const level of config.thinking) {
    const option = document.createElement('option');

    option.value = level;
    option.textContent = getThinkingLabel(level);

    state.thinkingSelect.appendChild(option);
  }

  state.thinkingSelect.value = config.defaultThinking;

  state.modelDescription.textContent = config.description;
}

// ============================================================
// PROMPT
// ============================================================

export function autoResizePrompt(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';

  textarea.style.height = Math.min(textarea.scrollHeight, 220) + 'px';
}

// ============================================================
// LAYOUT
// ============================================================

export function updateEditorLayout(contents: Element) {
  const iframe = contents.querySelector(
    '.cke_wysiwyg_frame',
  ) as HTMLElement | null;

  const sidebar = contents.querySelector(
    '.trt14-sidebar',
  ) as HTMLElement | null;

  if (!iframe) {
    return;
  }

  const open = sidebar?.dataset.open === 'true';

  iframe.style.width = open ? `calc(100% - ${SIDEBAR_WIDTH}px)` : '100%';

  iframe.style.boxSizing = 'border-box';
}

// ============================================================
// TOGGLE
// ============================================================

export function toggleSidebar(button: HTMLElement) {
  const contents = getEditorContents(button);

  if (!contents) {
    return;
  }

  const sidebar = contents.querySelector(
    '.trt14-sidebar',
  ) as HTMLElement | null;

  if (!sidebar) {
    return;
  }

  const isOpen = sidebar.dataset.open === 'true';

  sidebar.dataset.open = String(!isOpen);

  sidebar.style.display = isOpen ? 'none' : 'block';

  updateEditorLayout(contents);

  button.classList.toggle('cke_button_on', !isOpen);

  button.classList.toggle('cke_button_off', isOpen);

  button.setAttribute('aria-pressed', String(!isOpen));

  button.setAttribute(
    'aria-label',
    isOpen ? 'Abrir assistente' : 'Fechar assistente',
  );

  button.setAttribute(
    'title',
    isOpen ? 'Abrir assistente' : 'Fechar assistente',
  );
}

// ============================================================
// CONTEXTO — CARREGAMENTO COMPARTILHADO
// ============================================================

async function restoreAssistantContext(state: AssistantState): Promise<void> {
  if (!state.proadReference) {
    loadContext(state, {});

    return;
  }

  try {
    const context = await loadProadContext(state.proadReference);

    loadContext(state, context);
  } catch (error) {
    console.error('[TRT14 Assistente] Erro ao carregar contexto:', error);

    loadContext(state, {});

    state.contextStatusText.textContent = 'Falha ao carregar';

    state.contextStatusDot.style.background = '#c5221f';
  }
}

// ============================================================
// GERAÇÃO
// ============================================================

export async function generateAssistant(state: AssistantState) {
  if (state.generating) {
    return;
  }

  // ==========================================================
  // SOLICITAÇÃO
  // ==========================================================

  const prompt = state.prompt.value.trim();

  if (!prompt) {
    setAssistantStatus(state, 'Digite uma solicitação.');

    state.prompt.focus();

    return;
  }

  // ==========================================================
  // EDITOR
  // ==========================================================

  const editor = getActiveEditor();

  if (!editor) {
    setAssistantStatus(state, 'CKEditor não encontrado.');

    return;
  }

  // ==========================================================
  // CONTEXTO
  // ==========================================================
  //
  // IMPORTANTE:
  //
  // O contexto agora está no IndexedDB.
  // Portanto, a leitura precisa ser aguardada.
  //
  // Isso garante que a IA enxergue também os dados
  // inseridos pela tela "Estou Tratando".
  // ==========================================================

  let context: Record<string, string> = {};

  if (state.proadReference) {
    try {
      context = await loadProadContext(state.proadReference);

      // Mantém a interface sincronizada com o
      // registro mais recente do IndexedDB.
      loadContext(state, context);
    } catch (error) {
      console.error(
        '[TRT14 Assistente] Erro ao carregar contexto para geração:',
        error,
      );

      context = {};
    }
  }

  const contextKeys = Object.keys(context);

  // ==========================================================
  // ESTADO
  // ==========================================================

  state.generating = true;

  state.sendButton.disabled = true;

  state.sendButton.innerHTML = ICONS.stop;

  setAssistantStatus(state, 'Preparando documento...', true);

  const controller = new AbortController();

  state.abortController = controller;

  let receivedText = '';

  let completed = false;

  // ==========================================================
  // CAPTURA DOCUMENTO
  // ==========================================================

  const currentDocumentHtml = editor.getData();

  // ==========================================================
  // PROCURA {{ }}
  // ==========================================================

  const delimitedRegion = findDelimitedRegion(editor);

  const isDelimited = delimitedRegion !== null;

  // ==========================================================
  // DOCUMENTO AUTORIZADO PARA A IA
  // ==========================================================

  let authorizedDocument = '';

  if (delimitedRegion) {
    // --------------------------------------------------------
    // Somente o conteúdo entre {{ }}
    // --------------------------------------------------------

    authorizedDocument = htmlToPlainText(delimitedRegion.html);
  } else {
    // --------------------------------------------------------
    // Documento inteiro
    // --------------------------------------------------------

    authorizedDocument = htmlToPlainText(currentDocumentHtml);
  }

  // ==========================================================
  // MASCARA DADOS
  // ==========================================================

  const maskedDocument = maskDocument(authorizedDocument, context);

  // ==========================================================
  // PROAD
  // ==========================================================

  const proadNumber = getProadNumber();

  // ==========================================================
  // PROMPT
  // ==========================================================

  const input = buildPrompt(
    state,
    maskedDocument,
    contextKeys,
    proadNumber,
    isDelimited,
  );

  // ==========================================================
  // POSIÇÃO DE INSERÇÃO
  // ==========================================================

  if (delimitedRegion) {
    // --------------------------------------------------------
    // O findDelimitedRegion() apagou somente o conteúdo.
    //
    // {{ e }} continuam intactos.
    // --------------------------------------------------------

    const range = delimitedRegion.insertionRange;

    editor.focus();

    range.select();

    range.collapse(true);

    const selection = editor.getSelection();

    if (selection) {
      selection.selectRanges([range]);
    }
  } else {
    // ========================================================
    // SEM {{ }}
    // ========================================================
    //
    // Primeiro limpa.
    // Depois cria o Range.
    // ========================================================

    await new Promise<void>((resolve) => {
      editor.setData('', () => resolve());
    });

    editor.focus();

    const range = editor.createRange();

    const editable = editor.editable();

    if (!editable) {
      throw new Error('Área editável do CKEditor não encontrada.');
    }

    range.moveToElementEditStart(editable);

    range.select();

    range.collapse(true);

    const selection = editor.getSelection();

    if (selection) {
      selection.selectRanges([range]);
    }
  }

  // ==========================================================
  // INSERE CHUNK
  // ==========================================================
  //
  // Sem tabs automáticos.
  //
  // A IA gera exatamente o texto solicitado.
  //
  // \n → <br>
  // ==========================================================

  const insertChunk = (text: string) => {
    if (!text) {
      return;
    }

    // --------------------------------------------------------
    // Converte o texto em HTML seguro.
    // --------------------------------------------------------

    let html = escapeHtml(text);

    // --------------------------------------------------------
    // Preserva quebras de linha.
    // --------------------------------------------------------

    html = html
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n/g, '<br>');

    // --------------------------------------------------------
    // RESTAURA VALORES LOCALMENTE
    //
    // A LLM nunca recebe os valores reais.
    // --------------------------------------------------------

    html = unmaskDocument(html, context);

    // --------------------------------------------------------
    // Insere no ponto atual.
    // --------------------------------------------------------

    editor.insertHtml(html);

    // --------------------------------------------------------
    // Mantém o cursor no final do chunk.
    // --------------------------------------------------------

    const selection = editor.getSelection();

    if (selection) {
      const ranges = selection.getRanges();

      if (ranges.length > 0) {
        const range = ranges[0].clone();

        range.collapse(true);

        selection.selectRanges([range]);
      }
    }
  };

  // ==========================================================
  // GERAÇÃO
  // ==========================================================

  setAssistantStatus(state, 'Gerando documento...', true);

  try {
    await streamGemini({
      input,

      model: state.modelSelect.value,

      thinking: state.thinkingSelect.value,

      signal: controller.signal,

      // ======================================================
      // CHUNK
      // ======================================================

      onText(text) {
        receivedText += text;

        insertChunk(text);

        setAssistantStatus(
          state,
          `Gerando... ${receivedText.length} caracteres`,
          true,
        );
      },

      // ======================================================
      // CONCLUÍDO
      // ======================================================

      onComplete() {
        completed = true;
      },
    });

    // ========================================================
    // NENHUM TEXTO
    // ========================================================

    if (!receivedText) {
      setAssistantStatus(state, 'Nenhum texto foi recebido.');

      return;
    }

    // ========================================================
    // FINAL
    // ========================================================
    //
    // COM {{ }}:
    //
    // NÃO usamos collapseEditorToEnd().
    //
    // Os delimitadores continuam no lugar.
    //
    // SEM {{ }}:
    //
    // Podemos posicionar no final.
    // ========================================================

    if (!isDelimited) {
      collapseEditorToEnd(editor);
    }

    // ========================================================
    // STATUS
    // ========================================================

    setAssistantStatus(state, completed ? 'Concluído.' : 'Geração finalizada.');
  } catch (error) {
    // ========================================================
    // CANCELAMENTO
    // ========================================================

    if (error instanceof DOMException && error.name === 'AbortError') {
      setAssistantStatus(state, 'Geração interrompida.');
    } else {
      console.error('[TRT14 Assistente]', error);

      setAssistantStatus(
        state,
        `Erro: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } finally {
    state.generating = false;

    state.abortController = null;

    state.sendButton.disabled = false;

    state.sendButton.innerHTML = ICONS.send;
  }
}

// ============================================================
// CANCELAR
// ============================================================

export function cancelGeneration(state: AssistantState) {
  if (!state.generating || !state.abortController) {
    return;
  }

  state.abortController.abort();
}

// ============================================================
// CRIAR SIDEBAR
// ============================================================

export function createSidebar(contents: HTMLElement): HTMLElement | null {
  if (!contents) {
    return null;
  }

  const existing = contents.querySelector(
    '.trt14-sidebar',
  ) as HTMLElement | null;

  if (existing) {
    return existing;
  }

  // ==========================================================
  // POSICIONAMENTO
  // ==========================================================

  if (getComputedStyle(contents).position === 'static') {
    contents.style.position = 'relative';
  }

  // ==========================================================
  // SIDEBAR
  // ==========================================================

  const sidebar = document.createElement('div');

  sidebar.className = 'trt14-sidebar';

  sidebar.dataset.open = 'false';

  Object.assign(sidebar.style, {
    position: 'absolute',
    top: '0',
    right: '0',
    width: `${SIDEBAR_WIDTH}px`,
    height: '100%',
    background: '#fff',
    borderLeft: '1px solid #d0d0d0',
    display: 'none',
    zIndex: '10',
    overflow: 'hidden',
  });

  // ==========================================================
  // APP
  // ==========================================================

  const app = document.createElement('div');

  app.className = 'trt14-assistant-main';

  // ==========================================================
  // SCROLL
  // ==========================================================

  const scroll = document.createElement('div');

  scroll.className = 'trt14-assistant-scroll';

  // ==========================================================
  // CONTEXTO
  // ==========================================================

  const contextPanel = document.createElement('section');

  contextPanel.className = 'trt14-context-panel';

  contextPanel.innerHTML = `
    <div class="trt14-context-table-wrap">
      <table class="trt14-context-table">
        <thead>
          <tr>
            <th>Campo</th>
            <th>Valor</th>
            <th></th>
          </tr>
        </thead>

        <tbody></tbody>
      </table>
    </div>

    <div class="trt14-context-footer">

      <div class="trt14-context-status">
        <span
          class="trt14-context-dot"
        ></span>

        <span>
          Sincronizado
        </span>
      </div>

      <div class="trt14-context-actions">

        <button
          type="button"
          class="trt14-context-action"
          data-action="add"
        >
          ${ICONS.plus}
          Adicionar
        </button>

        <button
          type="button"
          class="trt14-context-action"
          data-action="clear"
        >
          ${ICONS.trash}
          Limpar
        </button>

      </div>

    </div>
  `;

  // ==========================================================
  // COMPOSER
  // ==========================================================

  const composer = document.createElement('div');

  composer.className = 'trt14-composer';

  composer.innerHTML = `
    <div class="trt14-input-shell">

      <textarea
        class="trt14-prompt"
        placeholder="Descreva o que você deseja gerar..."
      ></textarea>

      <div class="trt14-composer-footer">

        <div class="trt14-status">
          <span
            class="trt14-status-dot"
          ></span>

          <span>
            Pronto
          </span>
        </div>

        <button
          type="button"
          class="trt14-send"
          title="Gerar documento"
        >
          ${ICONS.send}
        </button>

      </div>

    </div>

    <div class="trt14-generation-options">

      <div class="trt14-generation-option">

        <span class="trt14-generation-label">
          Modelo
        </span>

        <select
          class="trt14-generation-select trt14-model-select"
        >
          <option value="gemini-3.5-flash-lite">
            Gemini 3.5 Flash-Lite
          </option>

          <option value="gemini-3.5-flash">
            Gemini 3.5 Flash
          </option>

          <option value="gemini-3.1-flash-lite">
            Gemini 3.1 Flash-Lite
          </option>

          <option value="gemini-3.6-flash">
            Gemini 3.6 Flash
          </option>

          <option value="gemini-3.8-flash">
            Gemini 3.8 Flash
          </option>
        </select>

        <div class="trt14-select-chevron">
          ${ICONS.chevron}
        </div>

      </div>

      <div class="trt14-generation-option">

        <span class="trt14-generation-label">
          Raciocínio
        </span>

        <select
          class="trt14-generation-select trt14-thinking-select"
        ></select>

        <div class="trt14-select-chevron">
          ${ICONS.chevron}
        </div>

      </div>

    </div>

    <div class="trt14-model-description"></div>

    <div class="trt14-warning">
      Atenção: nunca insira dados sensíveis
      neste assistente sem autorização.
    </div>
  `;

  // ==========================================================
  // WORKSPACE
  // ==========================================================

  const workspace = document.createElement('div');

  workspace.className = 'trt14-assistant-workspace';

  // ==========================================================
  // CAMPOS — TOPO
  // ==========================================================

  workspace.appendChild(contextPanel);

  // ==========================================================
  // IA — FUNDO
  // ==========================================================

  workspace.appendChild(composer);

  scroll.appendChild(workspace);

  app.appendChild(scroll);

  sidebar.appendChild(app);

  contents.appendChild(sidebar);

  // ==========================================================
  // REFERÊNCIA DO PROAD
  // ==========================================================

  const proadReference = getProadNumber() ?? getProadTitle();

  // ==========================================================
  // ESTADO
  // ==========================================================

  const state: AssistantState = {
    sidebar,

    contextBody: contextPanel.querySelector('tbody') as HTMLElement,

    contextStatusText: contextPanel.querySelector(
      '.trt14-context-status span:last-child',
    ) as HTMLElement,

    contextStatusDot: contextPanel.querySelector(
      '.trt14-context-dot',
    ) as HTMLElement,

    modelSelect: composer.querySelector(
      '.trt14-model-select',
    ) as HTMLSelectElement,

    thinkingSelect: composer.querySelector(
      '.trt14-thinking-select',
    ) as HTMLSelectElement,

    modelDescription: composer.querySelector(
      '.trt14-model-description',
    ) as HTMLElement,

    prompt: composer.querySelector('.trt14-prompt') as HTMLTextAreaElement,

    sendButton: composer.querySelector('.trt14-send') as HTMLButtonElement,

    status: composer.querySelector('.trt14-status') as HTMLElement,

    statusText: composer.querySelector(
      '.trt14-status span:last-child',
    ) as HTMLElement,

    generating: false,

    abortController: null,

    proadReference,
  };

  assistantStates.set(contents, state);

  // ==========================================================
  // CARREGA CONTEXTO DO INDEXEDDB
  // ==========================================================
  //
  // createSidebar() precisa continuar síncrona porque os
  // consumidores atuais esperam o HTMLElement imediatamente.
  //
  // A leitura do IndexedDB acontece em seguida.
  //
  // Quando terminar, loadContext() atualiza a interface.
  // ==========================================================

  void restoreAssistantContext(state);

  updateThinkingOptions(state);

  // ==========================================================
  // ADICIONAR CONTEXTO
  // ==========================================================

  contextPanel
    .querySelector('[data-action="add"]')
    ?.addEventListener('click', () => {
      createContextRow(state);

      const rows = state.contextBody.querySelectorAll('tr');

      (
        rows[rows.length - 1]?.querySelector(
          '.trt14-context-input',
        ) as HTMLInputElement | null
      )?.focus();

      setContextChanged(state);
    });

  // ==========================================================
  // LIMPAR CONTEXTO
  // ==========================================================

  contextPanel
    .querySelector('[data-action="clear"]')
    ?.addEventListener('click', () => {
      state.contextBody.innerHTML = '';

      renderEmptyContext(state);

      if (state.proadReference) {
        void clearProadContext(state.proadReference).catch((error) => {
          console.error('[TRT14 Assistente] Erro ao limpar contexto:', error);
        });
      }

      state.contextStatusText.textContent = 'Contexto limpo';

      state.contextStatusDot.style.background = '#1a73e8';
    });

  // ==========================================================
  // MODELO
  // ==========================================================

  state.modelSelect.addEventListener('change', () => {
    updateThinkingOptions(state);

    setAssistantStatus(state, 'Modelo alterado.');
  });

  // ==========================================================
  // RACIOCÍNIO
  // ==========================================================

  state.thinkingSelect.addEventListener('change', () => {
    setAssistantStatus(
      state,
      `Raciocínio: ${getThinkingLabel(state.thinkingSelect.value)}.`,
    );
  });

  // ==========================================================
  // PROMPT
  // ==========================================================

  state.prompt.addEventListener('input', () => {
    autoResizePrompt(state.prompt);
  });

  state.prompt.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      void generateAssistant(state);
    }
  });

  // ==========================================================
  // ENVIAR / PARAR
  // ==========================================================

  state.sendButton.addEventListener('click', () => {
    if (state.generating) {
      cancelGeneration(state);
    } else {
      void generateAssistant(state);
    }
  });

  // ==========================================================
  // AUTO RESIZE
  // ==========================================================

  autoResizePrompt(state.prompt);

  return sidebar;
}

// ============================================================
// TOOLBAR DO ASSISTENTE
// ============================================================

export function createAssistantToolbar(editorContainer: HTMLElement) {
  if (editorContainer.querySelector('.trt14-assistant-toolbar')) {
    return;
  }

  const replaceButton = editorContainer.querySelector(
    '.cke_button__replace',
  ) as HTMLElement | null;

  if (!replaceButton) {
    return;
  }

  const replaceToolbar = replaceButton.closest('.cke_toolbar');

  if (!(replaceToolbar instanceof Element)) {
    return;
  }

  // ==========================================================
  // TOOLBAR
  // ==========================================================

  const toolbar = document.createElement('span');

  toolbar.className = 'cke_toolbar trt14-assistant-toolbar';

  toolbar.setAttribute('role', 'toolbar');

  // ==========================================================
  // LABEL ACESSÍVEL
  // ==========================================================

  const voiceLabel = document.createElement('span');

  voiceLabel.className = 'cke_voice_label';

  voiceLabel.textContent = 'Assistente';

  toolbar.appendChild(voiceLabel);

  // ==========================================================
  // START
  // ==========================================================

  const toolbarStart = document.createElement('span');

  toolbarStart.className = 'cke_toolbar_start';

  toolbar.appendChild(toolbarStart);

  // ==========================================================
  // TOOLGROUP
  // ==========================================================

  const toolgroup = document.createElement('span');

  toolgroup.className = 'cke_toolgroup';

  toolgroup.setAttribute('role', 'presentation');

  // ==========================================================
  // BOTÃO
  // ==========================================================

  const button = document.createElement('a');

  button.className = 'cke_button cke_button_off';

  button.href = "javascript:void('Abrir assistente')";

  button.title = 'Abrir assistente';

  button.setAttribute('tabindex', '-1');

  button.setAttribute('hidefocus', 'true');

  button.setAttribute('role', 'button');

  button.setAttribute('aria-label', 'Abrir assistente');

  button.setAttribute('aria-pressed', 'false');

  // ==========================================================
  // ÍCONE
  // ==========================================================

  const icon = document.createElement('span');

  icon.className = 'cke_button_icon';

  icon.textContent = '🤖';

  Object.assign(icon.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    fontSize: '15px',
    lineHeight: '16px',
    background: 'none',
  });

  const label = document.createElement('span');

  label.className = 'cke_button_label';

  label.textContent = 'Assistente';

  label.style.display = 'none';

  button.appendChild(icon);

  button.appendChild(label);

  // ==========================================================
  // NÃO ROUBA FOCO
  // ==========================================================

  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });

  // ==========================================================
  // TOGGLE
  // ==========================================================

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    toggleSidebar(button);
  });

  // ==========================================================
  // END
  // ==========================================================

  const toolbarEnd = document.createElement('span');

  toolbarEnd.className = 'cke_toolbar_end';

  toolgroup.appendChild(button);

  toolbar.appendChild(toolgroup);

  toolbar.appendChild(toolbarEnd);

  // ==========================================================
  // INSERE COMO SEÇÃO PRÓPRIA
  // ==========================================================

  replaceToolbar.insertAdjacentElement('afterend', toolbar);
}
