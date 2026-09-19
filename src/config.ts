export const EDITOR_IDS = [
  'formCriarMinutaDocumento:editor:editor',
  'formCriarAutoTexto:editor:editor',
];

export const SIDEBAR_WIDTH = 300;

export const GEMINI_API_KEY = 'AQ.Ab8';

export const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/interactions?alt=sse';

export const MODEL_CONFIG = {
  'gemini-3.5-flash-lite': {
    label: 'Gemini 3.5 Flash-Lite',
    description: 'Rápido e econômico, ideal para tarefas de alto volume.',
    thinking: ['auto', 'minimal', 'low', 'medium', 'high'],
    defaultThinking: 'minimal',
  },

  'gemini-3.5-flash': {
    label: 'Gemini 3.5 Flash',
    description: 'Modelo Flash de alta capacidade para geração de documentos.',
    thinking: ['auto', 'minimal', 'low', 'medium', 'high'],
    defaultThinking: 'medium',
  },

  'gemini-3.1-flash-lite': {
    label: 'Gemini 3.1 Flash-Lite',
    description: 'Modelo econômico para tarefas rápidas.',
    thinking: ['auto', 'minimal', 'low', 'medium', 'high'],
    defaultThinking: 'minimal',
  },

  'gemini-3.6-flash': {
    label: 'Gemini 3.6 Flash',
    description: 'Excelente equilíbrio entre inteligência e velocidade.',
    thinking: ['auto', 'minimal', 'low', 'medium', 'high'],
    defaultThinking: 'medium',
  },

  'gemini-3.8-flash': {
    label: 'Gemini 3.8 Flash',
    description: 'Modelo rápido e avançado para geração de documentos.',
    thinking: ['low', 'medium', 'high'],
    defaultThinking: 'medium',
  },
} as const;
