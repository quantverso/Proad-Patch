// ==UserScript==
// @name         TRT14 - PROAD Correções + Assistente IA + Estou Tratando
// @namespace    https://proad.trt14.jus.br/
// @icon         https://proad.trt14.jus.br/proad/favicon.ico
// @version      2.1.0
// @match        https://proad.trt14.jus.br/proad/pages/minuta.xhtml*
// @match        https://proad.trt14.jus.br/proad/pages/auto_textos_criar.xhtml*
// @match        https://proad.trt14.jus.br/proad/pages/estoutratando.xhtml*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_listValues
// @description  Correções, Assistente IA e ferramentas da tela Estou Tratando para o PROAD TRT14.
// ==/UserScript==
(function() {
	//#region src/config.ts
	var EDITOR_IDS = ["formCriarMinutaDocumento:editor:editor", "formCriarAutoTexto:editor:editor"];
	var GEMINI_API_KEY = "";
	var GEMINI_ENDPOINT = "";
	var MODEL_CONFIG = {
		"gemini-3.5-flash-lite": {
			label: "Gemini 3.5 Flash-Lite",
			description: "Rápido e econômico, ideal para tarefas de alto volume.",
			thinking: [
				"auto",
				"minimal",
				"low",
				"medium",
				"high"
			],
			defaultThinking: "minimal"
		},
		"gemini-3.5-flash": {
			label: "Gemini 3.5 Flash",
			description: "Modelo Flash de alta capacidade para geração de documentos.",
			thinking: [
				"auto",
				"minimal",
				"low",
				"medium",
				"high"
			],
			defaultThinking: "medium"
		},
		"gemini-3.1-flash-lite": {
			label: "Gemini 3.1 Flash-Lite",
			description: "Modelo econômico para tarefas rápidas.",
			thinking: [
				"auto",
				"minimal",
				"low",
				"medium",
				"high"
			],
			defaultThinking: "minimal"
		},
		"gemini-3.6-flash": {
			label: "Gemini 3.6 Flash",
			description: "Excelente equilíbrio entre inteligência e velocidade.",
			thinking: [
				"auto",
				"minimal",
				"low",
				"medium",
				"high"
			],
			defaultThinking: "medium"
		},
		"gemini-3.8-flash": {
			label: "Gemini 3.8 Flash",
			description: "Modelo rápido e avançado para geração de documentos.",
			thinking: [
				"low",
				"medium",
				"high"
			],
			defaultThinking: "medium"
		}
	};
	//#endregion
	//#region src/utils/ckeditor.ts
	function getCKEditor() {
		if (typeof CKEDITOR === "undefined") return null;
		return CKEDITOR;
	}
	function getEditorById(editorId) {
		const ckeditor = getCKEditor();
		if (!ckeditor) return null;
		return ckeditor.instances[editorId] ?? null;
	}
	function getActiveEditor() {
		const ckeditor = getCKEditor();
		if (!ckeditor) return null;
		for (const editorId of EDITOR_IDS) {
			const editor = ckeditor.instances[editorId];
			if (editor && editor.status === "ready") return editor;
		}
		return null;
	}
	function getEditorContainer(element) {
		return element.closest(".cke");
	}
	function getEditorContents(element) {
		const container = getEditorContainer(element);
		if (!container) return null;
		return container.querySelector(".cke_contents");
	}
	//#endregion
	//#region src/features/autotexto.ts
	function fixAutotextPanel() {
		const panel = document.querySelector(".cke_combopanel");
		if (!panel) return;
		panel.style.position = "fixed";
	}
	function setupAutotextClear() {
		document.addEventListener("mousedown", (event) => {
			if (typeof CKEDITOR === "undefined") return;
			const target = event.target;
			if (!(target instanceof Element)) return;
			const combo = target.closest(".cke_combo__comboautotexto");
			if (!combo) return;
			for (const editorId of EDITOR_IDS) {
				const editor = getEditorById(editorId);
				if (!editor || !editor.container) continue;
				if (editor.container.$.contains(combo)) {
					editor.setData("");
					editor.focus();
					break;
				}
			}
		}, true);
	}
	function setup$2() {
		const observer = new MutationObserver(() => {
			fixAutotextPanel();
		});
		if (document.documentElement) observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		fixAutotextPanel();
		setupAutotextClear();
	}
	setup$2();
	//#endregion
	//#region src/utils/editor-format.ts
	var EDITOR_TAB_HTML = "<span contenteditable=\"false\" style=\"color:#ffffff; user-select:none;\">________</span>";
	function configureEditorTypography(iframe) {
		const doc = iframe.contentDocument;
		if (!doc?.body) return;
		doc.body.style.fontFamily = "Arial, sans-serif";
		doc.body.style.fontSize = "16px";
	}
	//#endregion
	//#region src/features/editor.ts
	function setupEditors() {
		if (typeof CKEDITOR === "undefined") return;
		for (const editorId of EDITOR_IDS) {
			const editor = getEditorById(editorId);
			if (!editor) continue;
			if (editor._trt14TabConfigured) continue;
			editor._trt14TabConfigured = true;
			editor.on("key", function(event) {
				if (event.data.keyCode !== 9) return;
				const selection = editor.getSelection();
				if (!selection) return;
				const startElement = selection.getStartElement();
				if (startElement && startElement.getAscendant("table", true)) return;
				event.cancel();
				editor.insertHtml(EDITOR_TAB_HTML);
			});
		}
	}
	function setup$1() {
		const observer = new MutationObserver(() => {
			setupEditors();
		});
		if (document.documentElement) observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		setupEditors();
	}
	setup$1();
	//#endregion
	//#region src/utils/html.ts
	function htmlToPlainText(html) {
		const container = document.createElement("div");
		container.innerHTML = html;
		container.querySelectorAll("br").forEach((br) => {
			br.replaceWith("\n");
		});
		container.querySelectorAll("p, div, li").forEach((element) => {
			element.insertAdjacentText("beforeend", "\n");
		});
		let text = container.textContent ?? "";
		text = text.replace(/\u00A0/g, " ").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
		return text;
	}
	function escapeHtml$1(value) {
		return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
	}
	//#endregion
	//#region src/utils/storage.ts
	var DB_NAME = "trt14-proad";
	var DB_VERSION = 1;
	var CONTEXTS_STORE = "contexts";
	var ANNOTATIONS_STORE = "annotations";
	var TODOS_STORE = "todos";
	var SETTINGS_STORE = "settings";
	var LEGACY_CONTEXT_PREFIX = "trt14-assistant-context:v1:";
	var LEGACY_GM_CONTEXT_PREFIX = "proad-context:";
	var LEGACY_ANNOTATION_PREFIX = "proad-annotation:";
	var LEGACY_TODO_PREFIX = "proad-todo:";
	var LEGACY_COLUMN_VISIBILITY_KEY = "proad-column-visibility:v2";
	var MIGRATION_FLAG = "migration:v2:indexeddb";
	var dbPromise = null;
	var initializationPromise = null;
	function normalizeProadReference(reference) {
		const normalized = String(reference ?? "").trim();
		if (!normalized) return "";
		const match = normalized.match(/(\d+)\s*\/\s*(\d{4})/);
		if (match) return `${match[1]}/${match[2]}`;
		return normalized;
	}
	function requestToPromise(request) {
		return new Promise((resolve, reject) => {
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error ?? /* @__PURE__ */ new Error("IndexedDB request failed."));
		});
	}
	function transactionToPromise(transaction) {
		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error ?? /* @__PURE__ */ new Error("IndexedDB transaction failed."));
			transaction.onabort = () => reject(transaction.error ?? /* @__PURE__ */ new Error("IndexedDB transaction aborted."));
		});
	}
	function openDatabase() {
		if (dbPromise) return dbPromise;
		dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);
			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(CONTEXTS_STORE)) db.createObjectStore(CONTEXTS_STORE, { keyPath: "reference" });
				if (!db.objectStoreNames.contains(ANNOTATIONS_STORE)) db.createObjectStore(ANNOTATIONS_STORE, { keyPath: "reference" });
				if (!db.objectStoreNames.contains(TODOS_STORE)) db.createObjectStore(TODOS_STORE, { keyPath: "reference" });
				if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
			};
			request.onsuccess = () => {
				const db = request.result;
				db.onversionchange = () => {
					db.close();
					dbPromise = null;
				};
				resolve(db);
			};
			request.onerror = () => {
				dbPromise = null;
				reject(request.error ?? /* @__PURE__ */ new Error("Não foi possível abrir o IndexedDB."));
			};
			request.onblocked = () => {
				console.warn("[TRT14 Storage] Abertura do IndexedDB bloqueada por outra conexão.");
			};
		});
		return dbPromise;
	}
	async function readOne(storeName, key) {
		return requestToPromise((await openDatabase()).transaction(storeName, "readonly").objectStore(storeName).get(key));
	}
	async function readAll(storeName) {
		return requestToPromise((await openDatabase()).transaction(storeName, "readonly").objectStore(storeName).getAll());
	}
	async function writeOne(storeName, value) {
		const transaction = (await openDatabase()).transaction(storeName, "readwrite");
		transaction.objectStore(storeName).put(value);
		await transactionToPromise(transaction);
	}
	async function deleteOne(storeName, key) {
		const transaction = (await openDatabase()).transaction(storeName, "readwrite");
		transaction.objectStore(storeName).delete(key);
		await transactionToPromise(transaction);
	}
	async function getSetting(key) {
		return (await readOne(SETTINGS_STORE, key))?.value;
	}
	async function setSetting(key, value) {
		await writeOne(SETTINGS_STORE, {
			key,
			value
		});
	}
	function extractContextPayload(value) {
		if (!value || typeof value !== "object") return null;
		const candidate = value;
		const nested = candidate.context;
		if (nested && typeof nested === "object" && !Array.isArray(nested)) return {
			context: Object.fromEntries(Object.entries(nested).map(([key, item]) => [key, String(item ?? "")])),
			updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
		};
		return {
			context: Object.fromEntries(Object.entries(candidate).filter(([key]) => key !== "reference" && key !== "updatedAt").map(([key, item]) => [key, String(item ?? "")])),
			updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
		};
	}
	function normalizeAnnotationColor(value) {
		return value === "red" || value === "green" || value === "yellow" ? value : "yellow";
	}
	async function migrateLegacyLocalStorage(db) {
		let migrated = 0;
		const keysToRemove = [];
		try {
			for (let i = 0; i < localStorage.length; i += 1) {
				const key = localStorage.key(i);
				if (!key || !key.startsWith(LEGACY_CONTEXT_PREFIX)) continue;
				const raw = localStorage.getItem(key);
				if (!raw) continue;
				let reference;
				try {
					reference = decodeURIComponent(key.slice(27));
				} catch {
					reference = key.slice(27);
				}
				const processReference = normalizeProadReference(reference);
				if (!processReference) continue;
				let parsed;
				try {
					parsed = JSON.parse(raw);
				} catch (error) {
					console.warn("[TRT14 Storage] Contexto legado com JSON inválido:", key, error);
					continue;
				}
				const payload = extractContextPayload(parsed);
				if (!payload) continue;
				const transaction = db.transaction(CONTEXTS_STORE, "readwrite");
				const store = transaction.objectStore(CONTEXTS_STORE);
				if (!await requestToPromise(store.get(processReference))) {
					store.put({
						reference: processReference,
						context: payload.context,
						updatedAt: payload.updatedAt
					});
					migrated += 1;
				}
				await transactionToPromise(transaction);
				keysToRemove.push(key);
			}
			for (const key of keysToRemove) localStorage.removeItem(key);
		} catch (error) {
			console.error("[TRT14 Storage] Erro na migração do localStorage:", error);
		}
		return migrated;
	}
	async function migrateLegacyGM() {
		const result = {
			contexts: 0,
			annotations: 0,
			todos: 0,
			columns: 0
		};
		if (typeof GM_listValues !== "function") return result;
		const keys = await Promise.resolve(GM_listValues());
		for (const key of keys) {
			if (key === LEGACY_COLUMN_VISIBILITY_KEY) {
				if (typeof GM_getValue !== "function") continue;
				const value = await Promise.resolve(GM_getValue(key, {}));
				if (value && typeof value === "object" && !Array.isArray(value)) {
					if (!await getSetting("column-visibility")) {
						await setSetting("column-visibility", value);
						result.columns += 1;
					}
				}
				continue;
			}
			if (!key.startsWith(LEGACY_GM_CONTEXT_PREFIX) && !key.startsWith(LEGACY_ANNOTATION_PREFIX) && !key.startsWith(LEGACY_TODO_PREFIX)) continue;
			if (typeof GM_getValue !== "function") continue;
			const raw = await Promise.resolve(GM_getValue(key, null));
			if (key.startsWith(LEGACY_GM_CONTEXT_PREFIX)) {
				const reference = normalizeProadReference(key.slice(14));
				if (!reference) continue;
				const payload = extractContextPayload(raw);
				if (!payload) continue;
				if (!await readOne(CONTEXTS_STORE, reference)) {
					await writeOne(CONTEXTS_STORE, {
						reference,
						context: payload.context,
						updatedAt: payload.updatedAt
					});
					result.contexts += 1;
				}
				continue;
			}
			if (key.startsWith(LEGACY_ANNOTATION_PREFIX)) {
				const reference = normalizeProadReference(key.slice(17));
				if (!reference) continue;
				let annotation;
				if (typeof raw === "string") annotation = {
					reference,
					text: raw,
					color: "yellow",
					updatedAt: (/* @__PURE__ */ new Date()).toISOString()
				};
				else if (raw && typeof raw === "object") {
					const candidate = raw;
					annotation = {
						reference,
						text: typeof candidate.text === "string" ? candidate.text : "",
						color: normalizeAnnotationColor(candidate.color),
						updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
					};
				} else continue;
				if (!await readOne(ANNOTATIONS_STORE, reference)) {
					await writeOne(ANNOTATIONS_STORE, annotation);
					result.annotations += 1;
				}
				continue;
			}
			const reference = normalizeProadReference(key.slice(11));
			if (!reference || !Array.isArray(raw)) continue;
			const todos = raw.filter((item) => !!item && typeof item === "object").map((item) => ({
				id: String(item.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`),
				title: String(item.title || ""),
				done: Boolean(item.done)
			}));
			if (!await readOne(TODOS_STORE, reference)) {
				await writeOne(TODOS_STORE, {
					reference,
					todos,
					updatedAt: (/* @__PURE__ */ new Date()).toISOString()
				});
				result.todos += 1;
			}
		}
		return result;
	}
	async function migrateLegacyData() {
		if (await getSetting(MIGRATION_FLAG)) return;
		const localStorageMigrated = await migrateLegacyLocalStorage(await openDatabase());
		const gmMigrated = await migrateLegacyGM();
		await setSetting(MIGRATION_FLAG, true);
		console.info(`[TRT14 Storage] Migração concluída. localStorage: ${localStorageMigrated}; GM contexto: ${gmMigrated.contexts}; anotações: ${gmMigrated.annotations}; tarefas: ${gmMigrated.todos}; colunas: ${gmMigrated.columns}.`);
	}
	function initializeProadStorage() {
		if (!initializationPromise) initializationPromise = migrateLegacyData().catch((error) => {
			initializationPromise = null;
			throw error;
		});
		return initializationPromise;
	}
	async function saveProadContext(reference, context) {
		const normalizedReference = normalizeProadReference(reference);
		if (!normalizedReference) return;
		await initializeProadStorage();
		const data = {
			reference: normalizedReference,
			context: { ...context },
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		try {
			await writeOne(CONTEXTS_STORE, data);
		} catch (error) {
			console.error("[TRT14 Storage] Erro ao salvar contexto:", error);
		}
	}
	async function loadProadContext(reference) {
		const normalizedReference = normalizeProadReference(reference);
		if (!normalizedReference) return {};
		await initializeProadStorage();
		try {
			const stored = await readOne(CONTEXTS_STORE, normalizedReference);
			if (!stored || !stored.context || typeof stored.context !== "object") return {};
			return { ...stored.context };
		} catch (error) {
			console.error("[TRT14 Storage] Erro ao carregar contexto:", error);
			return {};
		}
	}
	async function clearProadContext(reference) {
		const normalizedReference = normalizeProadReference(reference);
		if (!normalizedReference) return;
		await initializeProadStorage();
		try {
			await deleteOne(CONTEXTS_STORE, normalizedReference);
		} catch (error) {
			console.error("[TRT14 Storage] Erro ao limpar contexto:", error);
		}
	}
	async function loadAllAnnotations() {
		await initializeProadStorage();
		try {
			return await readAll(ANNOTATIONS_STORE);
		} catch (error) {
			console.error("[TRT14 Storage] Erro ao carregar anotações:", error);
			return [];
		}
	}
	async function saveAnnotation$1(reference, text, color) {
		const normalizedReference = normalizeProadReference(reference);
		if (!normalizedReference) return;
		await initializeProadStorage();
		try {
			await writeOne(ANNOTATIONS_STORE, {
				reference: normalizedReference,
				text,
				color: normalizeAnnotationColor(color),
				updatedAt: (/* @__PURE__ */ new Date()).toISOString()
			});
		} catch (error) {
			console.error("[TRT14 Storage] Erro ao salvar anotação:", error);
		}
	}
	async function loadTodos(reference) {
		const normalizedReference = normalizeProadReference(reference);
		if (!normalizedReference) return [];
		await initializeProadStorage();
		try {
			const stored = await readOne(TODOS_STORE, normalizedReference);
			if (!stored || !Array.isArray(stored.todos)) return [];
			return stored.todos.map((item) => ({
				id: String(item.id),
				title: String(item.title),
				done: Boolean(item.done)
			}));
		} catch (error) {
			console.error("[TRT14 Storage] Erro ao carregar tarefas:", error);
			return [];
		}
	}
	async function saveTodos(reference, todos) {
		const normalizedReference = normalizeProadReference(reference);
		if (!normalizedReference) return;
		await initializeProadStorage();
		try {
			await writeOne(TODOS_STORE, {
				reference: normalizedReference,
				todos: todos.map((item) => ({
					id: String(item.id),
					title: String(item.title),
					done: Boolean(item.done)
				})),
				updatedAt: (/* @__PURE__ */ new Date()).toISOString()
			});
		} catch (error) {
			console.error("[TRT14 Storage] Erro ao salvar tarefas:", error);
		}
	}
	async function loadColumnVisibility() {
		await initializeProadStorage();
		try {
			const value = await getSetting("column-visibility");
			if (!value || typeof value !== "object" || Array.isArray(value)) return {};
			return { ...value };
		} catch (error) {
			console.error("[TRT14 Storage] Erro ao carregar visibilidade das colunas:", error);
			return {};
		}
	}
	async function saveColumnVisibility(value) {
		await initializeProadStorage();
		try {
			await setSetting("column-visibility", { ...value });
		} catch (error) {
			console.error("[TRT14 Storage] Erro ao salvar visibilidade das colunas:", error);
		}
	}
	//#endregion
	//#region src/features/ia/icons.ts
	var ICONS = {
		plus: `
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
        >
            <path d="M12 5v14"></path>
            <path d="M5 12h14"></path>
        </svg>
    `,
		trash: `
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M3 6h18"></path>
            <path d="M8 6V4h8v2"></path>
            <path d="M19 6l-1 14H6L5 6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
        </svg>
    `,
		send: `
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M12 19V5"></path>
            <path d="m6 11 6-6 6 6"></path>
        </svg>
    `,
		stop: `
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <rect
                x="6"
                y="6"
                width="12"
                height="12"
                rx="2"
            ></rect>
        </svg>
    `,
		chevron: `
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="m6 9 6 6 6-6"></path>
        </svg>
    `
	};
	//#endregion
	//#region src/features/ia/context.ts
	function renderEmptyContext(state) {
		state.contextBody.innerHTML = `     <tr class="trt14-context-empty-row">       <td
        colspan="3"
        class="trt14-context-empty"       >
        Nenhum campo adicionado.       </td>     </tr>
  `;
	}
	function getContextData(state) {
		const context = {};
		state.contextBody.querySelectorAll("tr").forEach((row) => {
			const inputs = row.querySelectorAll(".trt14-context-input");
			if (inputs.length !== 2) return;
			const keyInput = inputs[0];
			const valueInput = inputs[1];
			const key = keyInput.value.trim();
			if (!key) return;
			context[key] = valueInput.value;
		});
		return context;
	}
	function persistContext(state) {
		if (!state.proadReference) return;
		const context = getContextData(state);
		saveProadContext(state.proadReference, context);
	}
	function setContextChanged(state) {
		state.contextStatusText.textContent = "Salvando...";
		state.contextStatusDot.style.background = "#1a73e8";
		persistContext(state);
		state.contextStatusText.textContent = "Sincronizado";
		state.contextStatusDot.style.background = "#34a853";
	}
	function createContextRow$1(state, key = "", value = "") {
		state.contextBody.querySelector(".trt14-context-empty-row")?.remove();
		const row = document.createElement("tr");
		const keyCell = document.createElement("td");
		const valueCell = document.createElement("td");
		const actionCell = document.createElement("td");
		const keyInput = document.createElement("input");
		const valueInput = document.createElement("input");
		const removeButton = document.createElement("button");
		keyInput.type = "text";
		keyInput.className = "trt14-context-input";
		keyInput.placeholder = "Campo";
		keyInput.value = key;
		valueInput.type = "text";
		valueInput.className = "trt14-context-input";
		valueInput.placeholder = "Valor";
		valueInput.value = value;
		removeButton.type = "button";
		removeButton.className = "trt14-remove-row";
		removeButton.title = "Remover campo";
		removeButton.innerHTML = ICONS.trash;
		removeButton.addEventListener("click", () => {
			row.remove();
			if (!state.contextBody.querySelector("tr")) renderEmptyContext(state);
			setContextChanged(state);
		});
		keyInput.addEventListener("input", () => {
			setContextChanged(state);
		});
		valueInput.addEventListener("input", () => {
			setContextChanged(state);
		});
		keyCell.appendChild(keyInput);
		valueCell.appendChild(valueInput);
		actionCell.appendChild(removeButton);
		row.appendChild(keyCell);
		row.appendChild(valueCell);
		row.appendChild(actionCell);
		state.contextBody.appendChild(row);
	}
	function loadContext(state, context) {
		state.contextBody.innerHTML = "";
		const entries = Object.entries(context);
		if (entries.length === 0) {
			renderEmptyContext(state);
			state.contextStatusText.textContent = "Sincronizado";
			state.contextStatusDot.style.background = "#34a853";
			return;
		}
		for (const [key, value] of entries) createContextRow$1(state, key, value);
		state.contextStatusText.textContent = "Sincronizado";
		state.contextStatusDot.style.background = "#34a853";
	}
	//#endregion
	//#region src/features/ia/masking.ts
	function escapeRegExp(value) {
		return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
	function createPlaceholder(key) {
		return `[${key}]`;
	}
	function maskDocument(document, context) {
		let masked = document;
		const entries = Object.entries(context).filter(([key, value]) => key.trim() && String(value) !== "").sort(([, a], [, b]) => String(b).length - String(a).length);
		for (const [key, value] of entries) {
			const normalizedValue = String(value);
			if (!normalizedValue) continue;
			const regex = new RegExp(escapeRegExp(normalizedValue), "g");
			masked = masked.replace(regex, createPlaceholder(key));
		}
		return masked;
	}
	function unmaskDocument(document, context) {
		let unmasked = document;
		for (const [key, value] of Object.entries(context)) {
			const placeholder = createPlaceholder(key);
			const normalizedValue = String(value);
			if (!normalizedValue) continue;
			const regex = new RegExp(escapeRegExp(placeholder), "g");
			unmasked = unmasked.replace(regex, () => escapeHtml$1(normalizedValue));
		}
		unmasked = unmasked.replace(/\[[^\]\r\n]+\]/g, (placeholder) => `<strong>${placeholder}</strong>`);
		return unmasked;
	}
	//#endregion
	//#region src/features/ia/editor-writer.ts
	function collapseEditorToEnd(editor) {
		const range = editor.createRange();
		range.moveToElementEditEnd(editor.editable());
		range.collapse(true);
		editor.getSelection().selectRanges([range]);
	}
	//#endregion
	//#region src/features/ia/prompt.ts
	function buildPrompt(state, maskedDocument, contextKeys, proadNumber, isDelimited) {
		const contextText = contextKeys.length > 0 ? contextKeys.map((key) => `[${key}]`).join(", ") : "(nenhum)";
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
${proadNumber ?? "(não identificado)"}

Contexto disponível:
${contextText}

${isDelimited ? `
O conteúdo abaixo é o único trecho autorizado para leitura e geração.

Não existe nenhuma outra parte do documento disponível para você.

A resposta deverá substituir exclusivamente esse trecho.
` : `
O conteúdo abaixo corresponde ao documento atual e está integralmente disponível para leitura e geração.
`}

Conteúdo autorizado do documento:
${maskedDocument || "(vazio)"}

Solicitação do usuário:
${state.prompt.value.trim()}
`.trim();
	}
	//#endregion
	//#region src/features/ia/gemini.ts
	function getErrorMessage(error) {
		if (!error) return "Erro desconhecido.";
		if (typeof error === "string") return error;
		if (typeof error === "object" && error !== null && "message" in error) return String(error.message);
		return String(error);
	}
	function parseEvent(rawEvent) {
		const dataLine = rawEvent.split(/\r?\n/).find((line) => line.startsWith("data:"));
		if (!dataLine) return null;
		const jsonText = dataLine.substring(5).trim();
		if (!jsonText || jsonText === "[DONE]") return null;
		try {
			return JSON.parse(jsonText);
		} catch {
			return null;
		}
	}
	async function streamGemini(options) {
		const { input, model, thinking, signal, onText, onComplete } = options;
		const generationConfig = {};
		if (thinking && thinking !== "auto") generationConfig.thinking_level = thinking;
		const body = {
			model,
			input,
			stream: true,
			store: false
		};
		if (Object.keys(generationConfig).length > 0) body.generation_config = generationConfig;
		const response = await fetch(GEMINI_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "text/event-stream",
				"x-goog-api-key": GEMINI_API_KEY
			},
			body: JSON.stringify(body),
			signal
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(errorText || `HTTP ${response.status}`);
		}
		if (!response.body) throw new Error("A API não retornou um stream.");
		const reader = response.body.getReader();
		const decoder = new TextDecoder("utf-8");
		let buffer = "";
		while (true) {
			const { value, done } = await reader.read();
			if (value) buffer += decoder.decode(value, { stream: true });
			const events = buffer.split(/\r?\n\r?\n/);
			if (done) buffer = "";
			else buffer = events.pop() || "";
			for (const rawEvent of events) {
				const event = parseEvent(rawEvent);
				if (!event) continue;
				if (event.event_type === "step.delta" && event.delta?.type === "text") {
					if (event.delta.text) onText(event.delta.text);
					continue;
				}
				if (event.event_type === "error") throw new Error(getErrorMessage(event.error));
				if (event.event_type === "interaction.failed") throw new Error(getErrorMessage(event.interaction?.error));
				if (event.event_type === "interaction.completed") onComplete();
			}
			if (done) break;
		}
	}
	//#endregion
	//#region src/utils/proad.ts
	function getProadTitle() {
		return document.querySelector("h1.tituloPagina")?.textContent?.trim() || null;
	}
	function getProadNumber() {
		const title = getProadTitle();
		if (!title) return null;
		return title.match(/PROAD\s+n[º°.]?\s*([0-9]+\/[0-9]+)/i)?.[1] ?? null;
	}
	//#endregion
	//#region src/utils/editor-region.ts
	function getTextNodes(root) {
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		const nodes = [];
		let current = walker.nextNode();
		while (current) {
			nodes.push(current);
			current = walker.nextNode();
		}
		return nodes;
	}
	function resolvePosition(nodes, position) {
		let cursor = 0;
		for (const node of nodes) {
			const length = node.data.length;
			if (position >= cursor && position <= cursor + length) return {
				node,
				offset: position - cursor
			};
			cursor += length;
		}
		if (nodes.length > 0) {
			if (position === nodes.reduce((total, node) => total + node.data.length, 0)) {
				const last = nodes[nodes.length - 1];
				return {
					node: last,
					offset: last.data.length
				};
			}
		}
		return null;
	}
	function createCKEditorRange(editor, start, end) {
		const CKEDITOR = globalThis.CKEDITOR;
		const range = new CKEDITOR.dom.range(editor.document);
		range.setStart(new CKEDITOR.dom.node(start.node), start.offset);
		range.setEnd(new CKEDITOR.dom.node(end.node), end.offset);
		return range;
	}
	function findDelimitedRegion(editor) {
		const body = editor.document.getBody();
		if (!body) return null;
		const nativeBody = body.$;
		const nodes = getTextNodes(nativeBody);
		if (nodes.length === 0) return null;
		let fullText = "";
		for (const node of nodes) fullText += node.data;
		const openIndex = fullText.indexOf("{{");
		if (openIndex === -1) return null;
		const closeIndex = fullText.indexOf("}}", openIndex + 2);
		if (closeIndex === -1) return null;
		const innerStartIndex = openIndex + 2;
		const innerEndIndex = closeIndex;
		const innerStart = resolvePosition(nodes, innerStartIndex);
		const innerEnd = resolvePosition(nodes, innerEndIndex);
		if (!innerStart || !innerEnd) return null;
		const nativeRange = nativeBody.ownerDocument.createRange();
		nativeRange.setStart(innerStart.node, innerStart.offset);
		nativeRange.setEnd(innerEnd.node, innerEnd.offset);
		const fragment = nativeRange.cloneContents();
		const wrapper = nativeBody.ownerDocument.createElement("div");
		wrapper.appendChild(fragment);
		const html = wrapper.innerHTML;
		const text = wrapper.textContent ?? "";
		const insertionRange = createCKEditorRange(editor, innerStart, innerEnd);
		insertionRange.deleteContents();
		insertionRange.collapse(true);
		return {
			html,
			text,
			insertionRange
		};
	}
	//#endregion
	//#region src/features/ia/ui.ts
	var assistantStates = /* @__PURE__ */ new WeakMap();
	function setAssistantStatus(state, text, busy = false) {
		state.statusText.textContent = text;
		state.status.classList.toggle("busy", busy);
	}
	function getThinkingLabel(level) {
		return {
			auto: "Automático",
			minimal: "Mínimo",
			low: "Baixo",
			medium: "Médio",
			high: "Alto"
		}[level] ?? level;
	}
	function updateThinkingOptions(state) {
		const config = MODEL_CONFIG[state.modelSelect.value];
		if (!config) return;
		state.thinkingSelect.innerHTML = "";
		for (const level of config.thinking) {
			const option = document.createElement("option");
			option.value = level;
			option.textContent = getThinkingLabel(level);
			state.thinkingSelect.appendChild(option);
		}
		state.thinkingSelect.value = config.defaultThinking;
		state.modelDescription.textContent = config.description;
	}
	function autoResizePrompt(textarea) {
		textarea.style.height = "auto";
		textarea.style.height = Math.min(textarea.scrollHeight, 220) + "px";
	}
	function updateEditorLayout(contents) {
		const iframe = contents.querySelector(".cke_wysiwyg_frame");
		const sidebar = contents.querySelector(".trt14-sidebar");
		if (!iframe) return;
		const open = sidebar?.dataset.open === "true";
		iframe.style.width = open ? `calc(100% - 300px)` : "100%";
		iframe.style.boxSizing = "border-box";
	}
	function toggleSidebar(button) {
		const contents = getEditorContents(button);
		if (!contents) return;
		const sidebar = contents.querySelector(".trt14-sidebar");
		if (!sidebar) return;
		const isOpen = sidebar.dataset.open === "true";
		sidebar.dataset.open = String(!isOpen);
		sidebar.style.display = isOpen ? "none" : "block";
		updateEditorLayout(contents);
		button.classList.toggle("cke_button_on", !isOpen);
		button.classList.toggle("cke_button_off", isOpen);
		button.setAttribute("aria-pressed", String(!isOpen));
		button.setAttribute("aria-label", isOpen ? "Abrir assistente" : "Fechar assistente");
		button.setAttribute("title", isOpen ? "Abrir assistente" : "Fechar assistente");
	}
	async function restoreAssistantContext(state) {
		if (!state.proadReference) {
			loadContext(state, {});
			return;
		}
		try {
			loadContext(state, await loadProadContext(state.proadReference));
		} catch (error) {
			console.error("[TRT14 Assistente] Erro ao carregar contexto:", error);
			loadContext(state, {});
			state.contextStatusText.textContent = "Falha ao carregar";
			state.contextStatusDot.style.background = "#c5221f";
		}
	}
	async function generateAssistant(state) {
		if (state.generating) return;
		if (!state.prompt.value.trim()) {
			setAssistantStatus(state, "Digite uma solicitação.");
			state.prompt.focus();
			return;
		}
		const editor = getActiveEditor();
		if (!editor) {
			setAssistantStatus(state, "CKEditor não encontrado.");
			return;
		}
		let context = {};
		if (state.proadReference) try {
			context = await loadProadContext(state.proadReference);
			loadContext(state, context);
		} catch (error) {
			console.error("[TRT14 Assistente] Erro ao carregar contexto para geração:", error);
			context = {};
		}
		const contextKeys = Object.keys(context);
		state.generating = true;
		state.sendButton.disabled = true;
		state.sendButton.innerHTML = ICONS.stop;
		setAssistantStatus(state, "Preparando documento...", true);
		const controller = new AbortController();
		state.abortController = controller;
		let receivedText = "";
		let completed = false;
		const currentDocumentHtml = editor.getData();
		const delimitedRegion = findDelimitedRegion(editor);
		const isDelimited = delimitedRegion !== null;
		let authorizedDocument = "";
		if (delimitedRegion) authorizedDocument = htmlToPlainText(delimitedRegion.html);
		else authorizedDocument = htmlToPlainText(currentDocumentHtml);
		const input = buildPrompt(state, maskDocument(authorizedDocument, context), contextKeys, getProadNumber(), isDelimited);
		if (delimitedRegion) {
			const range = delimitedRegion.insertionRange;
			editor.focus();
			range.select();
			range.collapse(true);
			const selection = editor.getSelection();
			if (selection) selection.selectRanges([range]);
		} else {
			await new Promise((resolve) => {
				editor.setData("", () => resolve());
			});
			editor.focus();
			const range = editor.createRange();
			const editable = editor.editable();
			if (!editable) throw new Error("Área editável do CKEditor não encontrada.");
			range.moveToElementEditStart(editable);
			range.select();
			range.collapse(true);
			const selection = editor.getSelection();
			if (selection) selection.selectRanges([range]);
		}
		let generatedElement = null;
		function sanitizeGeneratedText(text) {
			return text.normalize("NFC").replace(/([\p{L}\p{N}])[ \t]*\p{Cf}+[ \t]*(?=[\p{L}\p{N}])/gu, "$1").replace(/\p{Cf}/gu, "").replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ").replace(/[^\S\r\n]+/gu, " ");
		}
		function buildGeneratedHtml(text) {
			const sanitizedText = sanitizeGeneratedText(text);
			if (!sanitizedText) return "";
			let html = escapeHtml$1(sanitizedText);
			html = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "<br>");
			html = unmaskDocument(html, context);
			return html;
		}
		function createGeneratedElement(html) {
			const selection = editor.getSelection();
			if (!selection) throw new Error("Seleção do CKEditor não encontrada.");
			const nativeSelection = selection.getNative();
			if (!nativeSelection || nativeSelection.rangeCount === 0) throw new Error("Seleção nativa do editor não encontrada.");
			const nativeRange = nativeSelection.getRangeAt(0).cloneRange();
			const span = editor.document.$.createElement("span");
			span.style.fontFamily = "Arial, sans-serif";
			span.style.fontSize = "16px";
			span.innerHTML = html;
			nativeRange.insertNode(span);
			nativeRange.setStartAfter(span);
			nativeRange.collapse(true);
			nativeSelection.removeAllRanges();
			nativeSelection.addRange(nativeRange);
			return span;
		}
		const renderGeneratedText = () => {
			const html = buildGeneratedHtml(receivedText);
			if (!html) return;
			if (!generatedElement) {
				generatedElement = createGeneratedElement(html);
				return;
			}
			generatedElement.innerHTML = html;
		};
		setAssistantStatus(state, "Gerando documento...", true);
		try {
			await streamGemini({
				input,
				model: state.modelSelect.value,
				thinking: state.thinkingSelect.value,
				signal: controller.signal,
				onText(text) {
					if (!text) return;
					receivedText += text;
					renderGeneratedText();
					setAssistantStatus(state, `Gerando... ${receivedText.length} caracteres`, true);
				},
				onComplete() {
					completed = true;
				}
			});
			if (!receivedText) {
				setAssistantStatus(state, "Nenhum texto foi recebido.");
				return;
			}
			renderGeneratedText();
			editor.updateElement();
			if (!isDelimited) collapseEditorToEnd(editor);
			setAssistantStatus(state, completed ? "Concluído." : "Geração finalizada.");
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				editor.updateElement();
				setAssistantStatus(state, "Geração interrompida.");
			} else {
				console.error("[TRT14 Assistente]", error);
				setAssistantStatus(state, `Erro: ${error instanceof Error ? error.message : String(error)}`);
			}
		} finally {
			state.generating = false;
			state.abortController = null;
			state.sendButton.disabled = false;
			state.sendButton.innerHTML = ICONS.send;
		}
	}
	function cancelGeneration(state) {
		if (!state.generating || !state.abortController) return;
		state.abortController.abort();
	}
	function createSidebar(contents) {
		if (!contents) return null;
		const existing = contents.querySelector(".trt14-sidebar");
		if (existing) return existing;
		if (getComputedStyle(contents).position === "static") contents.style.position = "relative";
		const sidebar = document.createElement("div");
		sidebar.className = "trt14-sidebar";
		sidebar.dataset.open = "false";
		Object.assign(sidebar.style, {
			position: "absolute",
			top: "0",
			right: "0",
			width: `300px`,
			height: "100%",
			background: "#fff",
			borderLeft: "1px solid #d0d0d0",
			display: "none",
			zIndex: "10",
			overflow: "hidden"
		});
		const app = document.createElement("div");
		app.className = "trt14-assistant-main";
		const scroll = document.createElement("div");
		scroll.className = "trt14-assistant-scroll";
		const contextPanel = document.createElement("section");
		contextPanel.className = "trt14-context-panel";
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
		const composer = document.createElement("div");
		composer.className = "trt14-composer";
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
		const workspace = document.createElement("div");
		workspace.className = "trt14-assistant-workspace";
		workspace.appendChild(contextPanel);
		workspace.appendChild(composer);
		scroll.appendChild(workspace);
		app.appendChild(scroll);
		sidebar.appendChild(app);
		contents.appendChild(sidebar);
		const proadReference = getProadNumber() ?? getProadTitle();
		const state = {
			sidebar,
			contextBody: contextPanel.querySelector("tbody"),
			contextStatusText: contextPanel.querySelector(".trt14-context-status span:last-child"),
			contextStatusDot: contextPanel.querySelector(".trt14-context-dot"),
			modelSelect: composer.querySelector(".trt14-model-select"),
			thinkingSelect: composer.querySelector(".trt14-thinking-select"),
			modelDescription: composer.querySelector(".trt14-model-description"),
			prompt: composer.querySelector(".trt14-prompt"),
			sendButton: composer.querySelector(".trt14-send"),
			status: composer.querySelector(".trt14-status"),
			statusText: composer.querySelector(".trt14-status span:last-child"),
			generating: false,
			abortController: null,
			proadReference
		};
		assistantStates.set(contents, state);
		restoreAssistantContext(state);
		updateThinkingOptions(state);
		contextPanel.querySelector("[data-action=\"add\"]")?.addEventListener("click", () => {
			createContextRow$1(state);
			const rows = state.contextBody.querySelectorAll("tr");
			(rows[rows.length - 1]?.querySelector(".trt14-context-input"))?.focus();
			setContextChanged(state);
		});
		contextPanel.querySelector("[data-action=\"clear\"]")?.addEventListener("click", () => {
			state.contextBody.innerHTML = "";
			renderEmptyContext(state);
			if (state.proadReference) clearProadContext(state.proadReference).catch((error) => {
				console.error("[TRT14 Assistente] Erro ao limpar contexto:", error);
			});
			state.contextStatusText.textContent = "Contexto limpo";
			state.contextStatusDot.style.background = "#1a73e8";
		});
		state.modelSelect.addEventListener("change", () => {
			updateThinkingOptions(state);
			setAssistantStatus(state, "Modelo alterado.");
		});
		state.thinkingSelect.addEventListener("change", () => {
			setAssistantStatus(state, `Raciocínio: ${getThinkingLabel(state.thinkingSelect.value)}.`);
		});
		state.prompt.addEventListener("input", () => {
			autoResizePrompt(state.prompt);
		});
		state.prompt.addEventListener("keydown", (event) => {
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				generateAssistant(state);
			}
		});
		state.sendButton.addEventListener("click", () => {
			if (state.generating) cancelGeneration(state);
			else generateAssistant(state);
		});
		autoResizePrompt(state.prompt);
		return sidebar;
	}
	function createAssistantToolbar(editorContainer) {
		if (editorContainer.querySelector(".trt14-assistant-toolbar")) return;
		const replaceButton = editorContainer.querySelector(".cke_button__replace");
		if (!replaceButton) return;
		const replaceToolbar = replaceButton.closest(".cke_toolbar");
		if (!(replaceToolbar instanceof Element)) return;
		const toolbar = document.createElement("span");
		toolbar.className = "cke_toolbar trt14-assistant-toolbar";
		toolbar.setAttribute("role", "toolbar");
		const voiceLabel = document.createElement("span");
		voiceLabel.className = "cke_voice_label";
		voiceLabel.textContent = "Assistente";
		toolbar.appendChild(voiceLabel);
		const toolbarStart = document.createElement("span");
		toolbarStart.className = "cke_toolbar_start";
		toolbar.appendChild(toolbarStart);
		const toolgroup = document.createElement("span");
		toolgroup.className = "cke_toolgroup";
		toolgroup.setAttribute("role", "presentation");
		const button = document.createElement("a");
		button.className = "cke_button cke_button_off";
		button.href = "javascript:void('Abrir assistente')";
		button.title = "Abrir assistente";
		button.setAttribute("tabindex", "-1");
		button.setAttribute("hidefocus", "true");
		button.setAttribute("role", "button");
		button.setAttribute("aria-label", "Abrir assistente");
		button.setAttribute("aria-pressed", "false");
		const icon = document.createElement("span");
		icon.className = "cke_button_icon";
		icon.textContent = "🤖";
		Object.assign(icon.style, {
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			width: "16px",
			height: "16px",
			fontSize: "15px",
			lineHeight: "16px",
			background: "none"
		});
		const label = document.createElement("span");
		label.className = "cke_button_label";
		label.textContent = "Assistente";
		label.style.display = "none";
		button.appendChild(icon);
		button.appendChild(label);
		button.addEventListener("mousedown", (event) => {
			event.preventDefault();
		});
		button.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			toggleSidebar(button);
		});
		const toolbarEnd = document.createElement("span");
		toolbarEnd.className = "cke_toolbar_end";
		toolgroup.appendChild(button);
		toolbar.appendChild(toolgroup);
		toolbar.appendChild(toolbarEnd);
		replaceToolbar.insertAdjacentElement("afterend", toolbar);
	}
	//#endregion
	//#region src/features/ia/styles.ts
	function injectAssistantStyles() {
		if (document.getElementById("trt14-assistant-styles")) return;
		const style = document.createElement("style");
		style.id = "trt14-assistant-styles";
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
	//#endregion
	//#region src/features/ia/index.ts
	function setupAssistant() {
		const editors = document.querySelectorAll(".cke");
		for (const editorContainer of editors) {
			const contents = editorContainer.querySelector(".cke_contents");
			if (!contents) continue;
			const iframe = contents.querySelector(".cke_wysiwyg_frame");
			if (!iframe) continue;
			iframe.style.boxSizing = "border-box";
			configureEditorTypography(iframe);
			createSidebar(contents);
			createAssistantToolbar(editorContainer);
			updateEditorLayout(contents);
		}
	}
	function setup() {
		injectAssistantStyles();
		const observer = new MutationObserver(() => {
			setupAssistant();
		});
		if (document.documentElement) observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		setupAssistant();
	}
	setup();
	//#endregion
	//#region src/features/estou-tratando/table.ts
	var TABLE_ID = "formProtocolos:tblEstouTratando";
	function getTableContainer() {
		return document.getElementById(TABLE_ID);
	}
	function getHtmlTable() {
		return getTableContainer()?.querySelector(".ui-datatable-tablewrapper > table") ?? null;
	}
	function getHeaderRow() {
		return getHtmlTable()?.querySelector("thead tr") ?? null;
	}
	function getRows() {
		const table = getHtmlTable();
		if (!table) return [];
		return Array.from(table.querySelectorAll("tbody > tr[data-rk]"));
	}
	function getProcessKey(row) {
		const match = (row.dataset.rk || "").match(/Protocolo\s+(\d+)\s+ano\s+(\d+)/i);
		if (match) return `${match[1]}/${match[2]}`;
		const link = row.querySelector("a[href*=\"fichadoprocesso.xhtml\"]");
		if (!link) return null;
		try {
			const url = new URL(link.href, location.origin);
			const protocolo = url.searchParams.get("numeroProtocolo");
			const ano = url.searchParams.get("numeroAno");
			if (protocolo && ano) return `${protocolo}/${ano}`;
		} catch {}
		return null;
	}
	function normalizeText(value) {
		return String(value ?? "").replace(/\s+/g, " ").trim();
	}
	function normalizeForSearch(value) {
		return normalizeText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
	}
	function escapeHtml(value) {
		return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#039;");
	}
	function slugify(value) {
		return normalizeForSearch(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	}
	//#endregion
	//#region src/features/estou-tratando/annotations.ts
	var DEFAULT_COLOR = "yellow";
	var COLORS = {
		red: {
			name: "Vermelho",
			background: "#fee2e2",
			border: "#fca5a5"
		},
		green: {
			name: "Verde",
			background: "#dcfce7",
			border: "#86efac"
		},
		yellow: {
			name: "Amarelo",
			background: "#fef3c7",
			border: "#fcd34d"
		}
	};
	var annotations = /* @__PURE__ */ new Map();
	var sortDirection = null;
	var annotationFilter = "";
	function emptyAnnotation(reference) {
		return {
			reference,
			text: "",
			color: DEFAULT_COLOR,
			updatedAt: ""
		};
	}
	async function initializeAnnotations() {
		const records = await loadAllAnnotations();
		annotations = new Map(records.map((annotation) => [normalizeProadReference(annotation.reference), annotation]));
	}
	function getAnnotation(processKey) {
		const reference = normalizeProadReference(processKey ?? "");
		if (!reference) return emptyAnnotation("");
		return annotations.get(reference) ?? emptyAnnotation(reference);
	}
	async function saveAnnotation(processKey, text, color) {
		const reference = normalizeProadReference(processKey);
		if (!reference) return;
		const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		const annotation = {
			reference,
			text,
			color: COLORS[color] ? color : DEFAULT_COLOR,
			updatedAt
		};
		annotations.set(reference, annotation);
		await saveAnnotation$1(reference, text, annotation.color);
	}
	function createAnnotationCell(row, onOpen) {
		if (row.querySelector("[data-proad-annotation-cell]")) return;
		const cell = document.createElement("td");
		cell.className = "proad-annotation-cell";
		cell.dataset.proadAnnotationCell = "true";
		row.appendChild(cell);
		renderAnnotationCell(cell, getProcessKey(row), onOpen);
	}
	function renderAnnotationCell(cell, processKey, onOpen) {
		const annotation = getAnnotation(processKey);
		const hasAnnotation = annotation.text.trim().length > 0;
		cell.innerHTML = "";
		cell.onclick = null;
		cell.ondblclick = null;
		if (!hasAnnotation) {
			cell.classList.add("is-empty");
			if (processKey) cell.onclick = (event) => {
				event.preventDefault();
				event.stopPropagation();
				onOpen(processKey);
			};
			const empty = document.createElement("div");
			empty.className = "proad-annotation-empty";
			empty.innerHTML = `
      <span class="proad-annotation-add-icon">+</span>
      <span>Adicionar anotação</span>
    `;
			cell.appendChild(empty);
			return;
		}
		cell.classList.remove("is-empty");
		cell.onclick = (event) => {
			event.preventDefault();
			event.stopPropagation();
		};
		if (processKey) cell.ondblclick = (event) => {
			event.preventDefault();
			event.stopPropagation();
			onOpen(processKey);
		};
		const preview = document.createElement("div");
		preview.className = "proad-annotation-preview";
		preview.textContent = annotation.text;
		preview.title = "Duplo clique para editar";
		applyAnnotationColor(preview, annotation.color);
		cell.appendChild(preview);
	}
	function refreshAnnotationCell(processKey, onOpen) {
		const reference = normalizeProadReference(processKey);
		for (const row of getRows()) {
			if (normalizeProadReference(getProcessKey(row) ?? "") !== reference) continue;
			const cell = row.querySelector("[data-proad-annotation-cell]");
			if (cell) renderAnnotationCell(cell, reference, onOpen);
			return;
		}
	}
	function applyAnnotationColor(element, color) {
		const config = COLORS[color] || COLORS["yellow"];
		element.style.backgroundColor = config.background;
		element.style.borderColor = config.border;
	}
	function createAnnotationHeader(onSort) {
		const headRow = getHeaderRow();
		if (!headRow) return;
		if (headRow.querySelector("[data-proad-annotations-header]")) return;
		const th = document.createElement("th");
		th.className = "ui-state-default proad-annotations-header";
		th.scope = "col";
		th.dataset.proadAnnotationsHeader = "true";
		th.innerHTML = `
    <span
      class="proad-annotations-header-content"
      title="Ordenar por anotação"
    >
      <span class="ui-column-title">Anotação</span>
      <span class="proad-annotations-sort">↕</span>
    </span>

    <div class="proad-annotations-filter-wrap">
      <input
        type="text"
        class="proad-annotations-filter"
        autocomplete="off"
        spellcheck="false"
      >
      <button
        type="button"
        class="proad-annotations-filter-clear"
        title="Limpar filtro"
        tabindex="-1"
      >×</button>
    </div>
  `;
		th.querySelector(".proad-annotations-header-content")?.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			onSort();
		});
		const input = th.querySelector(".proad-annotations-filter");
		const clear = th.querySelector(".proad-annotations-filter-clear");
		const wrap = th.querySelector(".proad-annotations-filter-wrap");
		if (!input || !clear || !wrap) return;
		const syncClear = () => {
			wrap.classList.toggle("has-value", input.value !== "");
		};
		input.value = annotationFilter;
		syncClear();
		input.addEventListener("input", () => {
			annotationFilter = input.value;
			syncClear();
			applyAnnotationFilter();
		});
		input.addEventListener("keydown", (event) => {
			event.stopPropagation();
			if (event.key === "Enter") {
				event.preventDefault();
				return;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				input.value = "";
				annotationFilter = "";
				syncClear();
				applyAnnotationFilter();
			}
		});
		input.addEventListener("keyup", (event) => event.stopPropagation());
		input.addEventListener("keypress", (event) => event.stopPropagation());
		input.addEventListener("click", (event) => event.stopPropagation());
		input.addEventListener("mousedown", (event) => event.stopPropagation());
		clear.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			input.value = "";
			annotationFilter = "";
			syncClear();
			applyAnnotationFilter();
			input.focus();
		});
		headRow.appendChild(th);
	}
	function applyAnnotationFilter() {
		const term = normalizeForSearch(annotationFilter);
		for (const row of getRows()) {
			let match = true;
			if (term) match = normalizeForSearch(getAnnotation(getProcessKey(row)).text).includes(term);
			row.classList.toggle("proad-row-filtered", !match);
			const expanded = row.nextElementSibling;
			if (expanded && !expanded.hasAttribute("data-rk") && expanded.classList.contains("ui-expanded-row-content")) expanded.classList.toggle("proad-row-filtered", !match);
		}
		updateZebra();
	}
	function preserveNativeRowColor(row) {
		const backgroundColor = getComputedStyle(row).backgroundColor;
		if (!backgroundColor || backgroundColor === "transparent" || backgroundColor === "rgba(0, 0, 0, 0)" || backgroundColor === "rgb(255, 255, 255)" || backgroundColor === "rgba(255, 255, 255, 1)") {
			row.removeAttribute("data-proad-native-color");
			row.style.removeProperty("--proad-native-row-background");
			return;
		}
		row.dataset.proadNativeColor = "true";
		row.style.setProperty("--proad-native-row-background", backgroundColor);
	}
	function updateZebra() {
		let index = 0;
		for (const row of getRows()) {
			preserveNativeRowColor(row);
			if (row.classList.contains("proad-row-filtered")) continue;
			row.dataset.proadZebra = index % 2 ? "odd" : "even";
			index++;
		}
	}
	function sortAnnotations() {
		const tbody = getHtmlTable()?.querySelector("tbody");
		if (!tbody) return;
		sortDirection = sortDirection === "asc" ? "desc" : "asc";
		const items = getRows().map((row) => ({
			row,
			extra: row.nextElementSibling && !row.nextElementSibling.hasAttribute("data-rk") && row.nextElementSibling.classList.contains("ui-expanded-row-content") ? row.nextElementSibling : null,
			text: getAnnotation(getProcessKey(row)).text.trim()
		}));
		items.sort((a, b) => {
			const emptyA = a.text === "";
			const emptyB = b.text === "";
			if (emptyA && !emptyB) return 1;
			if (!emptyA && emptyB) return -1;
			const result = a.text.localeCompare(b.text, "pt-BR", { sensitivity: "base" });
			return sortDirection === "asc" ? result : -result;
		});
		const fragment = document.createDocumentFragment();
		for (const item of items) {
			fragment.appendChild(item.row);
			if (item.extra) fragment.appendChild(item.extra);
		}
		tbody.appendChild(fragment);
		updateSortIndicator();
		updateZebra();
	}
	function updateSortIndicator() {
		const indicator = document.querySelector("[data-proad-annotations-header]")?.querySelector(".proad-annotations-sort");
		if (!indicator) return;
		indicator.textContent = sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "↕";
	}
	//#endregion
	//#region src/features/estou-tratando/columns.ts
	var COLUMN_BUTTON_ID = "proad-column-toggle";
	var COLUMN_PANEL_ID = "proad-column-panel";
	function getColumnHeaders() {
		const row = getHeaderRow();
		return row ? Array.from(row.children) : [];
	}
	function getColumnTitle(th) {
		return normalizeText(th.querySelector(".ui-column-title")?.textContent);
	}
	function getColumnKind(th, index) {
		if (th.matches("[data-proad-annotations-header]")) return "annotations";
		if (th.classList.contains("ui-selection-column")) return "selection";
		if (getColumnTitle(th)) return null;
		const cell = getRows().find((row) => row.children[index])?.children[index];
		if (cell?.querySelector(".ui-row-toggler")) return "expander";
		if (cell?.querySelector(".ui-chkbox, .ui-radiobutton, input[type=\"checkbox\"], input[type=\"radio\"]")) return "selection";
		return null;
	}
	function getColumnLabel(th, index) {
		const kind = getColumnKind(th, index);
		if (kind === "annotations") return "Anotações";
		if (kind === "selection") return "Seleção (caixa de marcação)";
		if (kind === "expander") return "Expandir detalhes";
		return getColumnTitle(th) || normalizeText(th.textContent) || `Coluna ${index + 1}`;
	}
	function getColumnKey(th, index) {
		const kind = getColumnKind(th, index);
		if (kind) return kind;
		const title = getColumnTitle(th) || normalizeText(th.textContent);
		if (!title) return `empty-column:${index}`;
		return `label:${slugify(title)}`;
	}
	function isColumnVisible(th) {
		return th.style.display !== "none" && getComputedStyle(th).display !== "none";
	}
	function setColumnHidden(index, hidden) {
		const table = getHtmlTable();
		if (!table) return;
		const display = hidden ? "none" : "";
		const header = table.querySelector("thead tr")?.children[index];
		if (header) header.style.display = display;
		for (const row of getRows()) {
			const cell = row.children[index];
			if (cell) cell.style.display = display;
		}
	}
	async function applyColumnVisibility() {
		const visibility = await loadColumnVisibility();
		getColumnHeaders().forEach((th, index) => {
			const key = getColumnKey(th, index);
			if (typeof visibility[key] === "boolean") setColumnHidden(index, !visibility[key]);
		});
	}
	function repositionColumnPanel() {
		const panel = document.getElementById(COLUMN_PANEL_ID);
		const button = document.getElementById(COLUMN_BUTTON_ID);
		if (!panel || !button) return;
		const rect = button.getBoundingClientRect();
		const panelWidth = panel.offsetWidth || 315;
		const panelHeight = panel.offsetHeight;
		let left = rect.right - panelWidth;
		left = Math.max(12, Math.min(left, window.innerWidth - panelWidth - 12));
		let top = rect.bottom + 8;
		if (top + panelHeight > window.innerHeight - 12) top = Math.max(12, rect.top - panelHeight - 8);
		panel.style.left = `${left}px`;
		panel.style.top = `${top}px`;
	}
	function closeColumnPanel() {
		document.getElementById(COLUMN_PANEL_ID)?.remove();
		window.removeEventListener("resize", repositionColumnPanel);
		window.removeEventListener("scroll", repositionColumnPanel, true);
	}
	async function openColumnPanel() {
		closeColumnPanel();
		if (!document.getElementById("proad-column-toggle")) return;
		const panel = document.createElement("div");
		panel.id = COLUMN_PANEL_ID;
		panel.innerHTML = `
    <div class="proad-column-panel-header">
      <div>
        <div class="proad-column-panel-title">Colunas</div>
        <div class="proad-column-panel-subtitle">Escolha o que deseja exibir</div>
      </div>
      <button type="button" class="proad-column-panel-close" title="Fechar">×</button>
    </div>
    <div class="proad-column-panel-list"></div>
    <div class="proad-column-panel-footer">
      <button type="button" class="proad-columns-show-all">Mostrar todas</button>
    </div>
  `;
		document.body.appendChild(panel);
		const list = panel.querySelector(".proad-column-panel-list");
		const headers = getColumnHeaders();
		const visibility = await loadColumnVisibility();
		if (!list) return;
		headers.forEach((th, index) => {
			const label = getColumnLabel(th, index);
			const key = getColumnKey(th, index);
			const saved = visibility[key];
			const visible = typeof saved === "boolean" ? saved : isColumnVisible(th);
			const item = document.createElement("label");
			item.className = "proad-column-item";
			item.innerHTML = `
      <input type="checkbox" ${visible ? "checked" : ""}>
      <span class="proad-column-check"></span>
      <span class="proad-column-item-label">${escapeHtml(label)}</span>
    `;
			const checkbox = item.querySelector("input");
			checkbox?.addEventListener("change", () => {
				const current = {
					...visibility,
					[key]: Boolean(checkbox.checked)
				};
				Object.assign(visibility, current);
				saveColumnVisibility(current);
				setColumnHidden(index, !checkbox.checked);
			});
			list.appendChild(item);
		});
		panel.querySelector(".proad-column-panel-close")?.addEventListener("click", closeColumnPanel);
		panel.querySelector(".proad-columns-show-all")?.addEventListener("click", () => {
			const current = { ...visibility };
			headers.forEach((th, index) => {
				current[getColumnKey(th, index)] = true;
				setColumnHidden(index, false);
			});
			saveColumnVisibility(current);
			openColumnPanel();
		});
		repositionColumnPanel();
		window.addEventListener("resize", repositionColumnPanel);
		window.addEventListener("scroll", repositionColumnPanel, true);
	}
	function createColumnButton() {
		const tableContainer = document.getElementById("formProtocolos:tblEstouTratando");
		if (!tableContainer || document.getElementById("proad-column-toggle")) return;
		const datatableHeader = tableContainer.querySelector(".ui-datatable-header");
		if (!datatableHeader) return;
		let rightGroup = datatableHeader.querySelector(".ui-toolbar-group-right");
		if (!rightGroup) {
			const toolbar = datatableHeader.querySelector(".ui-toolbar");
			if (!toolbar) return;
			rightGroup = document.createElement("div");
			rightGroup.className = "ui-toolbar-group-right";
			toolbar.appendChild(rightGroup);
		}
		const button = document.createElement("button");
		button.id = COLUMN_BUTTON_ID;
		button.type = "button";
		button.className = "proad-columns-button";
		button.title = "Ocultar ou mostrar colunas";
		button.innerHTML = `
    <span class="proad-columns-button-icon">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6h14"></path>
        <path d="M5 12h14"></path>
        <path d="M5 18h14"></path>
      </svg>
    </span>
    <span>Colunas</span>
  `;
		rightGroup.appendChild(button);
		button.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			if (document.getElementById("proad-column-panel")) closeColumnPanel();
			else openColumnPanel();
		});
	}
	//#endregion
	//#region src/features/estou-tratando/context.ts
	function renderContextEmpty(body) {
		body.innerHTML = `
    <tr class="proad-context-empty-row">
      <td colspan="3" class="proad-context-empty">
        Nenhum campo adicionado.
      </td>
    </tr>
  `;
	}
	function readContextTable(body) {
		const data = {};
		body.querySelectorAll("tr").forEach((row) => {
			const inputs = row.querySelectorAll(".proad-context-input");
			if (inputs.length !== 2) return;
			const key = inputs[0].value.trim();
			if (!key) return;
			data[key] = inputs[1].value;
		});
		return data;
	}
	function createContextRow(refs, key = "", value = "", onChanged) {
		refs.body.querySelector(".proad-context-empty-row")?.remove();
		const row = document.createElement("tr");
		const keyCell = document.createElement("td");
		const valueCell = document.createElement("td");
		const actionCell = document.createElement("td");
		const keyInput = document.createElement("input");
		const valueInput = document.createElement("input");
		const removeButton = document.createElement("button");
		keyInput.type = "text";
		keyInput.className = "proad-context-input";
		keyInput.placeholder = "Campo";
		keyInput.value = key;
		valueInput.type = "text";
		valueInput.className = "proad-context-input";
		valueInput.placeholder = "Valor";
		valueInput.value = value;
		removeButton.type = "button";
		removeButton.className = "proad-context-remove";
		removeButton.title = "Remover campo";
		removeButton.textContent = "×";
		removeButton.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			row.remove();
			if (!refs.body.querySelector("tr")) renderContextEmpty(refs.body);
			onChanged();
		});
		keyInput.addEventListener("input", onChanged);
		valueInput.addEventListener("input", onChanged);
		keyCell.appendChild(keyInput);
		valueCell.appendChild(valueInput);
		actionCell.appendChild(removeButton);
		row.appendChild(keyCell);
		row.appendChild(valueCell);
		row.appendChild(actionCell);
		refs.body.appendChild(row);
		return row;
	}
	function setupContextPanel(processKey, refs, initialContext) {
		let saveSequence = 0;
		const setStatus = (text, color) => {
			refs.statusText.textContent = text;
			refs.statusDot.style.background = color;
		};
		const persist = async () => {
			const sequence = ++saveSequence;
			setStatus("Salvando...", "#1a73e8");
			try {
				await saveProadContext(processKey, readContextTable(refs.body));
				if (sequence !== saveSequence) return;
				setStatus("Sincronizado", "#34a853");
			} catch (error) {
				console.error("[TRT14 Estou Tratando] Erro ao salvar contexto:", error);
				if (sequence === saveSequence) setStatus("Falha ao salvar", "#c5221f");
			}
		};
		const entries = Object.entries(initialContext);
		if (entries.length === 0) renderContextEmpty(refs.body);
		else for (const [key, value] of entries) createContextRow(refs, key, value, () => {
			persist();
		});
		document.querySelector("#proad-annotation-modal [data-action=\"add\"]")?.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			createContextRow(refs, "", "", () => {
				persist();
			}).querySelector(".proad-context-input")?.focus();
			persist();
		});
		document.querySelector("#proad-annotation-modal [data-action=\"clear\"]")?.addEventListener("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			refs.body.innerHTML = "";
			renderContextEmpty(refs.body);
			saveSequence += 1;
			setStatus("Limpando...", "#1a73e8");
			try {
				await clearProadContext(processKey);
				setStatus("Contexto limpo", "#1a73e8");
			} catch (error) {
				console.error("[TRT14 Estou Tratando] Erro ao limpar contexto:", error);
				setStatus("Falha ao limpar", "#c5221f");
			}
		});
		setStatus("Sincronizado", "#34a853");
	}
	//#endregion
	//#region src/features/estou-tratando/todos.ts
	function generateId() {
		return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
	}
	function setupTodoPanel(processKey, todoList, initialTodos) {
		const persistTodos = async () => {
			const data = [];
			todoList.querySelectorAll(".proad-todo-card").forEach((card) => {
				const id = card.dataset.todoId || generateId();
				const titleInput = card.querySelector(".proad-todo-title");
				const checkbox = card.querySelector(".proad-todo-checkbox");
				data.push({
					id,
					title: titleInput?.value ?? "",
					done: checkbox?.checked ?? false
				});
			});
			await saveTodos(processKey, data);
		};
		const renderEmpty = () => {
			todoList.innerHTML = `
      <div class="proad-todo-empty">
        Nenhuma tarefa. Clique em <strong>Adicionar tarefa</strong>.
      </div>
    `;
		};
		const refreshZebra = () => {
			todoList.querySelectorAll(".proad-todo-card").forEach((card, index) => {
				card.dataset.index = String(index);
			});
		};
		const createTodoCard = (todo = {
			id: generateId(),
			title: "",
			done: false
		}) => {
			todoList.querySelector(".proad-todo-empty")?.remove();
			const card = document.createElement("div");
			card.className = "proad-todo-card";
			card.dataset.todoId = todo.id;
			if (todo.done) card.classList.add("is-done");
			const checkLabel = document.createElement("label");
			checkLabel.className = "proad-todo-check-wrap";
			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.className = "proad-todo-checkbox";
			checkbox.checked = todo.done;
			const checkSpan = document.createElement("span");
			checkSpan.className = "proad-todo-check";
			checkLabel.appendChild(checkbox);
			checkLabel.appendChild(checkSpan);
			const titleInput = document.createElement("input");
			titleInput.type = "text";
			titleInput.className = "proad-todo-title";
			titleInput.placeholder = "Digite a tarefa...";
			titleInput.value = todo.title;
			const removeButton = document.createElement("button");
			removeButton.type = "button";
			removeButton.className = "proad-todo-remove";
			removeButton.title = "Remover tarefa";
			removeButton.textContent = "×";
			checkbox.addEventListener("change", () => {
				card.classList.toggle("is-done", checkbox.checked);
				persistTodos();
			});
			titleInput.addEventListener("input", () => {
				persistTodos();
			});
			titleInput.addEventListener("keydown", (event) => {
				event.stopPropagation();
				if (event.key !== "Enter") return;
				event.preventDefault();
				createTodoCard();
				persistTodos();
				const titles = todoList.querySelectorAll(".proad-todo-title");
				titles[titles.length - 1]?.focus();
			});
			titleInput.addEventListener("keyup", (event) => event.stopPropagation());
			titleInput.addEventListener("keypress", (event) => event.stopPropagation());
			removeButton.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				card.remove();
				if (!todoList.querySelector(".proad-todo-card")) renderEmpty();
				persistTodos();
				refreshZebra();
			});
			card.appendChild(checkLabel);
			card.appendChild(titleInput);
			card.appendChild(removeButton);
			todoList.appendChild(card);
			refreshZebra();
		};
		if (initialTodos.length === 0) renderEmpty();
		else initialTodos.forEach(createTodoCard);
		document.querySelector("#proad-annotation-modal .proad-todo-add")?.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			createTodoCard();
			persistTodos();
			const titles = todoList.querySelectorAll(".proad-todo-title");
			titles[titles.length - 1]?.focus();
		});
	}
	//#endregion
	//#region src/features/estou-tratando/modal.ts
	var MODAL_ID = "proad-annotation-modal";
	var activeModalState = null;
	function closeAnnotationModal() {
		document.getElementById(MODAL_ID)?.remove();
		activeModalState = null;
		document.removeEventListener("keydown", handleModalKeydown, true);
	}
	function handleModalKeydown(event) {
		if (!activeModalState) return;
		if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			closeAnnotationModal();
			return;
		}
		if (event.ctrlKey && event.key === "Enter") {
			event.preventDefault();
			event.stopPropagation();
			activeModalState.save();
		}
	}
	async function openAnnotationEditor(processKey) {
		if (!processKey) return;
		closeAnnotationModal();
		const [annotation, context, todos] = await Promise.all([
			Promise.resolve(getAnnotation(processKey)),
			loadProadContext(processKey),
			loadTodos(processKey)
		]);
		const overlay = document.createElement("div");
		overlay.id = MODAL_ID;
		overlay.innerHTML = `
    <div class="proad-annotation-backdrop"></div>

    <div class="proad-annotation-dialog" role="dialog" aria-modal="true">
      <div class="proad-annotation-header">
        <div>
          <div class="proad-annotation-title">Anotação</div>
          <div class="proad-annotation-process">
            PROAD ${escapeHtml(processKey)}
          </div>
        </div>

        <button type="button" class="proad-annotation-close" title="Fechar">×</button>
      </div>

      <div class="proad-annotation-tabs" role="tablist">
        <button
          type="button"
          class="proad-tab-button is-active"
          role="tab"
          data-tab="annotation"
          aria-selected="true"
        >Anotação</button>

        <button
          type="button"
          class="proad-tab-button"
          role="tab"
          data-tab="todo"
          aria-selected="false"
        >Tarefas</button>

        <button
          type="button"
          class="proad-tab-button"
          role="tab"
          data-tab="context"
          aria-selected="false"
        >Contexto</button>
      </div>

      <div class="proad-annotation-content">
        <div
          class="proad-tab-panel is-active"
          data-panel="annotation"
          role="tabpanel"
        >
          <textarea
            class="proad-annotation-textarea"
            placeholder="Digite uma anotação sobre este processo..."
          ></textarea>

          <div class="proad-annotation-color-block">
            <div class="proad-annotation-label">Cor da anotação</div>

            <div class="proad-annotation-color-options">
              ${Object.entries(COLORS).map(([key, config]) => `
                <label class="proad-color-option ${annotation.color === key ? "is-selected" : ""}">
                  <input
                    type="radio"
                    name="proad-annotation-color"
                    value="${key}"
                    ${annotation.color === key ? "checked" : ""}
                  >
                  <span
                    class="proad-color-circle"
                    style="background:${config.background};border-color:${config.border};"
                  ></span>
                  <span class="proad-color-name">${config.name}</span>
                </label>
              `).join("")}
            </div>
          </div>
        </div>

        <div
          class="proad-tab-panel"
          data-panel="todo"
          role="tabpanel"
          hidden
        >
          <div class="proad-todo-board">
            <div class="proad-todo-list"></div>

            <button type="button" class="proad-todo-add">
              <span class="proad-todo-add-icon">+</span>
              <span>Adicionar tarefa</span>
            </button>
          </div>
        </div>

        <div
          class="proad-tab-panel"
          data-panel="context"
          role="tabpanel"
          hidden
        >
          <div class="proad-context-table-wrap">
            <table class="proad-context-table">
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

          <div class="proad-context-footer">
            <div class="proad-context-status">
              <span class="proad-context-dot"></span>
              <span class="proad-context-status-text">Sincronizado</span>
            </div>

            <div class="proad-context-actions">
              <button type="button" class="proad-context-action" data-action="add">
                + Adicionar
              </button>
              <button type="button" class="proad-context-action" data-action="clear">
                Limpar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="proad-annotation-footer">
        <span class="proad-annotation-shortcut">Ctrl + Enter para salvar</span>

        <div class="proad-annotation-actions">
          <button type="button" class="proad-btn-secondary proad-annotation-cancel">
            Cancelar
          </button>
          <button type="button" class="proad-btn-primary proad-annotation-save">
            Salvar
          </button>
        </div>
      </div>
    </div>
  `;
		document.body.appendChild(overlay);
		const textarea = overlay.querySelector(".proad-annotation-textarea");
		const tabs = overlay.querySelectorAll(".proad-tab-button");
		const panels = overlay.querySelectorAll(".proad-tab-panel");
		const contextBody = overlay.querySelector(".proad-context-table tbody");
		const contextStatusText = overlay.querySelector(".proad-context-status-text");
		const contextStatusDot = overlay.querySelector(".proad-context-dot");
		const todoList = overlay.querySelector(".proad-todo-list");
		if (!textarea || !contextBody || !contextStatusText || !contextStatusDot || !todoList) {
			closeAnnotationModal();
			return;
		}
		const saveAnnotationAndClose = async () => {
			const saveButton = overlay.querySelector(".proad-annotation-save");
			const colorValue = overlay.querySelector("input[name=\"proad-annotation-color\"]:checked")?.value;
			const color = colorValue && COLORS[colorValue] ? colorValue : DEFAULT_COLOR;
			saveButton?.setAttribute("disabled", "true");
			try {
				await saveAnnotation(processKey, textarea.value, color);
				refreshAnnotationCell(processKey, openAnnotationEditor);
				applyAnnotationFilter();
				closeAnnotationModal();
			} finally {
				saveButton?.removeAttribute("disabled");
			}
		};
		activeModalState = { save: saveAnnotationAndClose };
		tabs.forEach((tab) => {
			tab.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				const target = tab.dataset.tab;
				tabs.forEach((item) => {
					const active = item === tab;
					item.classList.toggle("is-active", active);
					item.setAttribute("aria-selected", String(active));
				});
				panels.forEach((panel) => {
					const active = panel.dataset.panel === target;
					panel.classList.toggle("is-active", active);
					panel.hidden = !active;
				});
			});
		});
		textarea.value = annotation.text;
		overlay.querySelectorAll(".proad-color-option").forEach((option) => {
			const input = option.querySelector("input");
			input?.addEventListener("change", () => {
				overlay.querySelectorAll(".proad-color-option").forEach((item) => item.classList.remove("is-selected"));
				if (input.checked) option.classList.add("is-selected");
			});
		});
		overlay.querySelector(".proad-annotation-close")?.addEventListener("click", closeAnnotationModal);
		overlay.querySelector(".proad-annotation-cancel")?.addEventListener("click", closeAnnotationModal);
		overlay.querySelector(".proad-annotation-backdrop")?.addEventListener("click", closeAnnotationModal);
		overlay.querySelector(".proad-annotation-save")?.addEventListener("click", () => void saveAnnotationAndClose());
		setupContextPanel(processKey, {
			body: contextBody,
			statusText: contextStatusText,
			statusDot: contextStatusDot
		}, context);
		setupTodoPanel(processKey, todoList, todos);
		document.addEventListener("keydown", handleModalKeydown, true);
		requestAnimationFrame(() => textarea.focus());
	}
	//#endregion
	//#region src/features/estou-tratando/styles.ts
	var STYLE_ID = "proad-modern-style";
	function normalizeButtonText(value) {
		return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
	}
	function captureOriginalToolbarButtonColors() {
		const targetLabels = /* @__PURE__ */ new Set(["arquivar temporariamente", "organizar processos"]);
		const buttons = document.querySelectorAll("#formProtocolos .ui-button");
		const style = document.getElementById(STYLE_ID);
		const wasDisabled = style?.disabled ?? false;
		if (style) style.disabled = true;
		try {
			buttons.forEach((button) => {
				const text = normalizeButtonText(button.textContent ?? "");
				if (!targetLabels.has(text)) return;
				const computed = getComputedStyle(button);
				button.style.setProperty("--proad-original-button-background", computed.background);
				button.style.setProperty("--proad-original-button-color", computed.color);
				button.dataset.proadOriginalButton = "true";
			});
		} finally {
			if (style) style.disabled = wasDisabled;
		}
	}
	function injectEstouTratandoStyles() {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement("style");
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
	//#endregion
	//#region src/features/estou-tratando/index.ts
	var bodyObserver = null;
	var observerTimer = null;
	var isApplying = false;
	/**
	* Enquanto o PrimeFaces estiver tratando um clique de expansão,
	* nossa feature não deve reaplicar alterações na tabela.
	*/
	var expansionGuardUntil = 0;
	async function applyEnhancements() {
		if (isApplying || !getTableContainer()) return;
		isApplying = true;
		try {
			captureOriginalToolbarButtonColors();
			createColumnButton();
			createAnnotationHeader(() => sortAnnotations());
			for (const row of getRows()) createAnnotationCell(row, (processKey) => {
				openAnnotationEditor(processKey);
			});
			await applyColumnVisibility();
			applyAnnotationFilter();
		} finally {
			isApplying = false;
		}
	}
	function setupDocumentEvents() {
		if (document.documentElement.dataset.proadEstouTratandoEvents) return;
		document.documentElement.dataset.proadEstouTratandoEvents = "true";
		document.addEventListener("click", (event) => {
			const panel = document.getElementById("proad-column-panel");
			if (!panel) return;
			const button = document.getElementById("proad-column-toggle");
			const target = event.target;
			if (target instanceof Node && panel.contains(target)) return;
			if (button && target instanceof Node && button.contains(target)) return;
			panel.remove();
		});
	}
	function isRowToggleTarget(target) {
		return target instanceof Element && Boolean(target.closest("#formProtocolos\\:tblEstouTratando .ui-row-toggler"));
	}
	function setupExpansionGuard() {
		if (document.documentElement.dataset.proadExpansionGuard) return;
		document.documentElement.dataset.proadExpansionGuard = "true";
		document.addEventListener("click", (event) => {
			if (!isRowToggleTarget(event.target)) return;
			expansionGuardUntil = performance.now() + 800;
		}, true);
	}
	function isExpansionMutation(mutation) {
		const target = mutation.target;
		if (target instanceof Element && target.closest(".ui-expanded-row-content")) return true;
		const nodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
		if (nodes.length === 0) return false;
		return nodes.every((node) => {
			if (!(node instanceof Element)) return false;
			return node.classList.contains("ui-expanded-row-content") || Boolean(node.querySelector(".ui-expanded-row-content"));
		});
	}
	function isOwnMutation(mutation) {
		const target = mutation.target;
		if (target instanceof Element && (Boolean(target.closest("[data-proad-annotation-cell]")) || Boolean(target.closest("[data-proad-annotations-header]")) || Boolean(target.closest("#proad-column-panel")))) return true;
		const nodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
		if (nodes.length === 0) return false;
		return nodes.every((node) => {
			if (!(node instanceof Element)) return true;
			return node.id === "proad-column-toggle" || node.classList.contains("proad-annotations-header") || node.classList.contains("proad-annotation-cell");
		});
	}
	function isTableRelatedMutation(mutation) {
		const table = getTableContainer();
		if (table && mutation.target instanceof Element && (mutation.target === table || table.contains(mutation.target))) return true;
		return [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)].some((node) => {
			if (!(node instanceof Element)) return false;
			if (node.id === "formProtocolos:tblEstouTratando") return true;
			return Boolean(node.querySelector("#formProtocolos\\:tblEstouTratando"));
		});
	}
	function observePage() {
		if (bodyObserver || !document.body) return;
		bodyObserver = new MutationObserver((mutations) => {
			const childListMutations = mutations.filter((mutation) => mutation.type === "childList");
			if (childListMutations.length === 0) return;
			const relevantMutations = childListMutations.filter(isTableRelatedMutation);
			if (relevantMutations.length === 0) return;
			const externalMutations = relevantMutations.filter((mutation) => !isOwnMutation(mutation));
			if (externalMutations.length === 0) return;
			if (performance.now() < expansionGuardUntil) return;
			if (externalMutations.every(isExpansionMutation)) return;
			if (observerTimer !== null) window.clearTimeout(observerTimer);
			observerTimer = window.setTimeout(() => {
				observerTimer = null;
				applyEnhancements();
			}, 100);
		});
		bodyObserver.observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	async function init() {
		if (!location.pathname.endsWith("/estoutratando.xhtml")) return;
		injectEstouTratandoStyles();
		setupDocumentEvents();
		await initializeProadStorage();
		await initializeAnnotations();
		await applyEnhancements();
		setupExpansionGuard();
		observePage();
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void init(), { once: true });
	else init();
	//#endregion
})();
