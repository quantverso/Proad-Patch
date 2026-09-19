import { GEMINI_API_KEY, GEMINI_ENDPOINT } from '../../config';

export type GeminiStreamOptions = {
  input: string;
  model: string;
  thinking: string;
  signal: AbortSignal;

  onText: (text: string) => void;
  onComplete: () => void;
};

type GeminiEvent = {
  event_type?: string;
  delta?: {
    type?: string;
    text?: string;
  };
  error?: unknown;
  interaction?: {
    error?: unknown;
  };
};

function getErrorMessage(error: unknown): string {
  if (!error) {
    return 'Erro desconhecido.';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}

function parseEvent(rawEvent: string): GeminiEvent | null {
  const lines = rawEvent.split(/\r?\n/);

  const dataLine = lines.find((line) => line.startsWith('data:'));

  if (!dataLine) {
    return null;
  }

  const jsonText = dataLine.substring(5).trim();

  if (!jsonText || jsonText === '[DONE]') {
    return null;
  }

  try {
    return JSON.parse(jsonText) as GeminiEvent;
  } catch {
    return null;
  }
}

export async function streamGemini(
  options: GeminiStreamOptions,
): Promise<void> {
  const { input, model, thinking, signal, onText, onComplete } = options;

  if (!GEMINI_API_KEY) {
    throw new Error('Configure a chave Gemini.');
  }

  const generationConfig: Record<string, unknown> = {};

  if (thinking && thinking !== 'auto') {
    generationConfig.thinking_level = thinking;
  }

  const body: Record<string, unknown> = {
    model,
    input,
    stream: true,
    store: false,
  };

  if (Object.keys(generationConfig).length > 0) {
    body.generation_config = generationConfig;
  }

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',

      Accept: 'text/event-stream',

      'x-goog-api-key': GEMINI_API_KEY,
    },

    body: JSON.stringify(body),

    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(errorText || `HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error('A API não retornou um stream.');
  }

  const reader = response.body.getReader();

  const decoder = new TextDecoder('utf-8');

  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();

    if (value) {
      buffer += decoder.decode(value, {
        stream: true,
      });
    }

    const events = buffer.split(/\r?\n\r?\n/);

    if (done) {
      buffer = '';
    } else {
      buffer = events.pop() || '';
    }

    for (const rawEvent of events) {
      const event = parseEvent(rawEvent);

      if (!event) {
        continue;
      }

      if (event.event_type === 'step.delta' && event.delta?.type === 'text') {
        if (event.delta.text) {
          onText(event.delta.text);
        }

        continue;
      }

      if (event.event_type === 'error') {
        throw new Error(getErrorMessage(event.error));
      }

      if (event.event_type === 'interaction.failed') {
        throw new Error(getErrorMessage(event.interaction?.error));
      }

      if (event.event_type === 'interaction.completed') {
        onComplete();
      }
    }

    if (done) {
      break;
    }
  }
}
