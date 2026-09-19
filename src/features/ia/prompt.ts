import type { AssistantState } from './types';

// ============================================================
// MONTA PROMPT
//
// IMPORTANTE:
// Este arquivo recebe SOMENTE AS KEYS.
//
// Os valores do contexto nunca são utilizados aqui.
// ============================================================

export function buildPrompt(
  state: AssistantState,
  maskedDocument: string,
  contextKeys: string[],
  proadNumber: string | null,
  isDelimited: boolean,
): string {
  const contextText =
    contextKeys.length > 0
      ? contextKeys.map((key) => `[${key}]`).join(', ')
      : '(nenhum)';

  const proadText = proadNumber ?? '(não identificado)';

  const documentInstruction = isDelimited
    ? `
O conteúdo abaixo é o único trecho autorizado para leitura e geração.

Não existe nenhuma outra parte do documento disponível para você.

A resposta deverá substituir exclusivamente esse trecho.
`
    : `
O conteúdo abaixo corresponde ao documento atual e está integralmente disponível para leitura e geração.
`;

  return `
Você é um assistente especializado na elaboração de documentos administrativos e jurídicos do Tribunal Regional do Trabalho da 14ª Região.

Escreva diretamente o conteúdo solicitado pelo usuário.

Regras:

* Responda apenas com o texto que deverá entrar no documento.
* Não explique o que você está fazendo.
* Não use Markdown.
* Não use blocos de código.
* Não coloque o texto entre aspas.
* Não gere HTML.
* Mantenha linguagem formal, objetiva e adequada a documentos administrativos.
* Preserve informações fornecidas pelo usuário.
* Não invente fatos, números, datas, nomes ou fundamentos.
* Os placeholders entre colchetes representam informações protegidas.
* Nunca tente descobrir, adivinhar ou substituir o conteúdo dos placeholders.
* Sempre preserve exatamente os placeholders quando eles forem necessários.
* Quando precisar se referir a uma informação protegida, utilize exatamente o placeholder correspondente.
* Os únicos placeholders disponíveis são: ${contextText}
* O número do PROAD pode ser utilizado normalmente quando for pertinente à redação.
* Não escreva os delimitadores {{ }} na resposta.
* Gere somente o conteúdo que deverá ser inserido no editor.

Número do PROAD:
${proadText}

Contexto disponível:
${contextText}

${documentInstruction}

Conteúdo autorizado do documento:
${maskedDocument || '(vazio)'}

Solicitação do usuário:
${state.prompt.value.trim()}
`.trim();
}
