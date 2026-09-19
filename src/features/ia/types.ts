export type ThinkingLevel = 'auto' | 'minimal' | 'low' | 'medium' | 'high';

export type AssistantState = {
  sidebar: HTMLElement;

  contextBody: HTMLElement;

  contextStatusText: HTMLElement;

  contextStatusDot: HTMLElement;

  modelSelect: HTMLSelectElement;

  thinkingSelect: HTMLSelectElement;

  modelDescription: HTMLElement;

  prompt: HTMLTextAreaElement;

  sendButton: HTMLButtonElement;

  status: HTMLElement;

  statusText: HTMLElement;

  generating: boolean;

  abortController: AbortController | null;

  proadReference: string | null;

  __trt14GenerationId?: string;
};
