import type {
  Annotation,
  AnnotationColor,
  ColumnVisibility,
  ProadContext,
  StoredContext,
  StoredTodos,
  TodoItem,
} from '../types/proad';

export type {
  Annotation,
  AnnotationColor,
  ColumnVisibility,
  ProadContext,
  StoredContext,
  StoredTodos,
  TodoItem,
} from '../types/proad';

const DB_NAME = 'trt14-proad';
const DB_VERSION = 1;

const CONTEXTS_STORE = 'contexts';
const ANNOTATIONS_STORE = 'annotations';
const TODOS_STORE = 'todos';
const SETTINGS_STORE = 'settings';

const LEGACY_CONTEXT_PREFIX = 'trt14-assistant-context:v1:';
const LEGACY_GM_CONTEXT_PREFIX = 'proad-context:';
const LEGACY_ANNOTATION_PREFIX = 'proad-annotation:';
const LEGACY_TODO_PREFIX = 'proad-todo:';
const LEGACY_COLUMN_VISIBILITY_KEY = 'proad-column-visibility:v2';
const MIGRATION_FLAG = 'migration:v2:indexeddb';

type StoreName =
  | typeof CONTEXTS_STORE
  | typeof ANNOTATIONS_STORE
  | typeof TODOS_STORE
  | typeof SETTINGS_STORE;

type SettingRecord = {
  key: string;
  value: unknown;
};

declare function GM_getValue(
  key: string,
  defaultValue?: unknown,
): unknown | Promise<unknown>;
declare function GM_listValues(): string[] | Promise<string[]>;

let dbPromise: Promise<IDBDatabase> | null = null;
let initializationPromise: Promise<void> | null = null;

export function normalizeProadReference(reference: string): string {
  const normalized = String(reference ?? '').trim();

  if (!normalized) {
    return '';
  }

  const match = normalized.match(/(\d+)\s*\/\s*(\d{4})/);

  if (match) {
    return `${match[1]}/${match[2]}`;
  }

  return normalized;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(CONTEXTS_STORE)) {
        db.createObjectStore(CONTEXTS_STORE, { keyPath: 'reference' });
      }

      if (!db.objectStoreNames.contains(ANNOTATIONS_STORE)) {
        db.createObjectStore(ANNOTATIONS_STORE, { keyPath: 'reference' });
      }

      if (!db.objectStoreNames.contains(TODOS_STORE)) {
        db.createObjectStore(TODOS_STORE, { keyPath: 'reference' });
      }

      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
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
      reject(request.error ?? new Error('Não foi possível abrir o IndexedDB.'));
    };

    request.onblocked = () => {
      console.warn(
        '[TRT14 Storage] Abertura do IndexedDB bloqueada por outra conexão.',
      );
    };
  });

  return dbPromise;
}

async function readOne<T>(
  storeName: StoreName,
  key: IDBValidKey,
): Promise<T | undefined> {
  const db = await openDatabase();
  const transaction = db.transaction(storeName, 'readonly');
  const request = transaction.objectStore(storeName).get(key) as IDBRequest<
    T | undefined
  >;
  return requestToPromise(request);
}

async function readAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase();
  const transaction = db.transaction(storeName, 'readonly');
  const request = transaction.objectStore(storeName).getAll() as IDBRequest<
    T[]
  >;
  return requestToPromise(request);
}

async function writeOne<T extends object>(
  storeName: StoreName,
  value: T,
): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).put(value);
  await transactionToPromise(transaction);
}

async function deleteOne(
  storeName: StoreName,
  key: IDBValidKey,
): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).delete(key);
  await transactionToPromise(transaction);
}

async function getSetting<T>(key: string): Promise<T | undefined> {
  const record = await readOne<SettingRecord>(SETTINGS_STORE, key);
  return record?.value as T | undefined;
}

async function setSetting(key: string, value: unknown): Promise<void> {
  await writeOne<SettingRecord>(SETTINGS_STORE, { key, value });
}

function extractContextPayload(value: unknown): {
  context: Record<string, string>;
  updatedAt: string;
} | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const nested = candidate.context;

  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const context = Object.fromEntries(
      Object.entries(nested).map(([key, item]) => [key, String(item ?? '')]),
    );

    return {
      context,
      updatedAt:
        typeof candidate.updatedAt === 'string'
          ? candidate.updatedAt
          : new Date().toISOString(),
    };
  }

  const context = Object.fromEntries(
    Object.entries(candidate)
      .filter(([key]) => key !== 'reference' && key !== 'updatedAt')
      .map(([key, item]) => [key, String(item ?? '')]),
  );

  return {
    context,
    updatedAt:
      typeof candidate.updatedAt === 'string'
        ? candidate.updatedAt
        : new Date().toISOString(),
  };
}

function normalizeAnnotationColor(value: unknown): AnnotationColor {
  return value === 'red' || value === 'green' || value === 'yellow'
    ? value
    : 'yellow';
}

async function migrateLegacyLocalStorage(db: IDBDatabase): Promise<number> {
  let migrated = 0;

  const keysToRemove: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);

      if (!key || !key.startsWith(LEGACY_CONTEXT_PREFIX)) {
        continue;
      }

      const raw = localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      let reference: string;

      try {
        reference = decodeURIComponent(key.slice(LEGACY_CONTEXT_PREFIX.length));
      } catch {
        reference = key.slice(LEGACY_CONTEXT_PREFIX.length);
      }

      const processReference = normalizeProadReference(reference);

      if (!processReference) {
        continue;
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        console.warn(
          '[TRT14 Storage] Contexto legado com JSON inválido:',
          key,
          error,
        );
        continue;
      }

      const payload = extractContextPayload(parsed);

      if (!payload) {
        continue;
      }

      const transaction = db.transaction(CONTEXTS_STORE, 'readwrite');
      const store = transaction.objectStore(CONTEXTS_STORE);
      const existing = await requestToPromise(
        store.get(processReference) as IDBRequest<StoredContext | undefined>,
      );

      if (!existing) {
        store.put({
          reference: processReference,
          context: payload.context,
          updatedAt: payload.updatedAt,
        });
        migrated += 1;
      }

      await transactionToPromise(transaction);
      keysToRemove.push(key);
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('[TRT14 Storage] Erro na migração do localStorage:', error);
  }

  return migrated;
}

async function migrateLegacyGM(): Promise<{
  contexts: number;
  annotations: number;
  todos: number;
  columns: number;
}> {
  const result = {
    contexts: 0,
    annotations: 0,
    todos: 0,
    columns: 0,
  };

  if (typeof GM_listValues !== 'function') {
    return result;
  }

  const keys = await Promise.resolve(GM_listValues());

  for (const key of keys) {
    if (key === LEGACY_COLUMN_VISIBILITY_KEY) {
      if (typeof GM_getValue !== 'function') {
        continue;
      }

      const value = await Promise.resolve(GM_getValue(key, {}));

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const current = await getSetting<ColumnVisibility>('column-visibility');

        if (!current) {
          await setSetting('column-visibility', value as ColumnVisibility);
          result.columns += 1;
        }
      }

      continue;
    }

    if (
      !key.startsWith(LEGACY_GM_CONTEXT_PREFIX) &&
      !key.startsWith(LEGACY_ANNOTATION_PREFIX) &&
      !key.startsWith(LEGACY_TODO_PREFIX)
    ) {
      continue;
    }

    if (typeof GM_getValue !== 'function') {
      continue;
    }

    const raw = await Promise.resolve(GM_getValue(key, null));

    if (key.startsWith(LEGACY_GM_CONTEXT_PREFIX)) {
      const reference = normalizeProadReference(
        key.slice(LEGACY_GM_CONTEXT_PREFIX.length),
      );

      if (!reference) {
        continue;
      }

      const payload = extractContextPayload(raw);

      if (!payload) {
        continue;
      }

      const existing = await readOne<StoredContext>(CONTEXTS_STORE, reference);

      if (!existing) {
        await writeOne<StoredContext>(CONTEXTS_STORE, {
          reference,
          context: payload.context,
          updatedAt: payload.updatedAt,
        });
        result.contexts += 1;
      }

      continue;
    }

    if (key.startsWith(LEGACY_ANNOTATION_PREFIX)) {
      const reference = normalizeProadReference(
        key.slice(LEGACY_ANNOTATION_PREFIX.length),
      );

      if (!reference) {
        continue;
      }

      let annotation: Annotation;

      if (typeof raw === 'string') {
        annotation = {
          reference,
          text: raw,
          color: 'yellow',
          updatedAt: new Date().toISOString(),
        };
      } else if (raw && typeof raw === 'object') {
        const candidate = raw as Record<string, unknown>;

        annotation = {
          reference,
          text: typeof candidate.text === 'string' ? candidate.text : '',
          color: normalizeAnnotationColor(candidate.color),
          updatedAt:
            typeof candidate.updatedAt === 'string'
              ? candidate.updatedAt
              : new Date().toISOString(),
        };
      } else {
        continue;
      }

      const existing = await readOne<Annotation>(ANNOTATIONS_STORE, reference);

      if (!existing) {
        await writeOne<Annotation>(ANNOTATIONS_STORE, annotation);
        result.annotations += 1;
      }

      continue;
    }

    const reference = normalizeProadReference(
      key.slice(LEGACY_TODO_PREFIX.length),
    );

    if (!reference || !Array.isArray(raw)) {
      continue;
    }

    const todos: TodoItem[] = raw
      .filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === 'object',
      )
      .map((item) => ({
        id: String(
          item.id ||
            `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
        ),
        title: String(item.title || ''),
        done: Boolean(item.done),
      }));

    const existing = await readOne<StoredTodos>(TODOS_STORE, reference);

    if (!existing) {
      await writeOne<StoredTodos>(TODOS_STORE, {
        reference,
        todos,
        updatedAt: new Date().toISOString(),
      });
      result.todos += 1;
    }
  }

  return result;
}

async function migrateLegacyData(): Promise<void> {
  const done = await getSetting<boolean>(MIGRATION_FLAG);

  if (done) {
    return;
  }

  const localStorageMigrated = await migrateLegacyLocalStorage(
    await openDatabase(),
  );
  const gmMigrated = await migrateLegacyGM();

  await setSetting(MIGRATION_FLAG, true);

  console.info(
    `[TRT14 Storage] Migração concluída. localStorage: ${localStorageMigrated}; GM contexto: ${gmMigrated.contexts}; anotações: ${gmMigrated.annotations}; tarefas: ${gmMigrated.todos}; colunas: ${gmMigrated.columns}.`,
  );
}

export function initializeProadStorage(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = migrateLegacyData().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

export async function saveProadContext(
  reference: string,
  context: Record<string, string>,
): Promise<void> {
  const normalizedReference = normalizeProadReference(reference);

  if (!normalizedReference) {
    return;
  }

  await initializeProadStorage();

  const data: StoredContext = {
    reference: normalizedReference,
    context: { ...context },
    updatedAt: new Date().toISOString(),
  };

  try {
    await writeOne(CONTEXTS_STORE, data);
  } catch (error) {
    console.error('[TRT14 Storage] Erro ao salvar contexto:', error);
  }
}

export async function loadProadContext(
  reference: string,
): Promise<ProadContext> {
  const normalizedReference = normalizeProadReference(reference);

  if (!normalizedReference) {
    return {};
  }

  await initializeProadStorage();

  try {
    const stored = await readOne<StoredContext>(
      CONTEXTS_STORE,
      normalizedReference,
    );

    if (!stored || !stored.context || typeof stored.context !== 'object') {
      return {};
    }

    return { ...stored.context };
  } catch (error) {
    console.error('[TRT14 Storage] Erro ao carregar contexto:', error);
    return {};
  }
}

export async function clearProadContext(reference: string): Promise<void> {
  const normalizedReference = normalizeProadReference(reference);

  if (!normalizedReference) {
    return;
  }

  await initializeProadStorage();

  try {
    await deleteOne(CONTEXTS_STORE, normalizedReference);
  } catch (error) {
    console.error('[TRT14 Storage] Erro ao limpar contexto:', error);
  }
}

export async function loadAllAnnotations(): Promise<Annotation[]> {
  await initializeProadStorage();

  try {
    return await readAll<Annotation>(ANNOTATIONS_STORE);
  } catch (error) {
    console.error('[TRT14 Storage] Erro ao carregar anotações:', error);
    return [];
  }
}

export async function loadAnnotation(
  reference: string,
): Promise<Annotation | undefined> {
  const normalizedReference = normalizeProadReference(reference);

  if (!normalizedReference) {
    return undefined;
  }

  await initializeProadStorage();

  try {
    return await readOne<Annotation>(ANNOTATIONS_STORE, normalizedReference);
  } catch (error) {
    console.error('[TRT14 Storage] Erro ao carregar anotação:', error);
    return undefined;
  }
}

export async function saveAnnotation(
  reference: string,
  text: string,
  color: AnnotationColor,
): Promise<void> {
  const normalizedReference = normalizeProadReference(reference);

  if (!normalizedReference) {
    return;
  }

  await initializeProadStorage();

  try {
    await writeOne<Annotation>(ANNOTATIONS_STORE, {
      reference: normalizedReference,
      text,
      color: normalizeAnnotationColor(color),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[TRT14 Storage] Erro ao salvar anotação:', error);
  }
}

export async function loadTodos(reference: string): Promise<TodoItem[]> {
  const normalizedReference = normalizeProadReference(reference);

  if (!normalizedReference) {
    return [];
  }

  await initializeProadStorage();

  try {
    const stored = await readOne<StoredTodos>(TODOS_STORE, normalizedReference);

    if (!stored || !Array.isArray(stored.todos)) {
      return [];
    }

    return stored.todos.map((item) => ({
      id: String(item.id),
      title: String(item.title),
      done: Boolean(item.done),
    }));
  } catch (error) {
    console.error('[TRT14 Storage] Erro ao carregar tarefas:', error);
    return [];
  }
}

export async function saveTodos(
  reference: string,
  todos: TodoItem[],
): Promise<void> {
  const normalizedReference = normalizeProadReference(reference);

  if (!normalizedReference) {
    return;
  }

  await initializeProadStorage();

  try {
    await writeOne<StoredTodos>(TODOS_STORE, {
      reference: normalizedReference,
      todos: todos.map((item) => ({
        id: String(item.id),
        title: String(item.title),
        done: Boolean(item.done),
      })),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[TRT14 Storage] Erro ao salvar tarefas:', error);
  }
}

export async function loadColumnVisibility(): Promise<ColumnVisibility> {
  await initializeProadStorage();

  try {
    const value = await getSetting<ColumnVisibility>('column-visibility');

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return { ...value };
  } catch (error) {
    console.error(
      '[TRT14 Storage] Erro ao carregar visibilidade das colunas:',
      error,
    );
    return {};
  }
}

export async function saveColumnVisibility(
  value: ColumnVisibility,
): Promise<void> {
  await initializeProadStorage();

  try {
    await setSetting('column-visibility', { ...value });
  } catch (error) {
    console.error(
      '[TRT14 Storage] Erro ao salvar visibilidade das colunas:',
      error,
    );
  }
}
