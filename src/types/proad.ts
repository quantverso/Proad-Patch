export interface ProadContext {
  [key: string]: string;
}

export type StoredContext = {
  reference: string;
  context: Record<string, string>;
  updatedAt: string;
};

export type AnnotationColor = 'red' | 'green' | 'yellow';

export interface Annotation {
  reference: string;
  text: string;
  color: AnnotationColor;
  updatedAt: string;
}

export interface TodoItem {
  id: string;
  title: string;
  done: boolean;
}

export interface StoredTodos {
  reference: string;
  todos: TodoItem[];
  updatedAt: string;
}

export type ColumnVisibility = Record<string, boolean>;
