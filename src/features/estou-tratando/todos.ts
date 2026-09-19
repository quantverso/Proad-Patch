import {
  loadTodos,
  saveTodos,
} from '../../utils/storage';

import type { TodoItem } from '../../types/proad';

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function setupTodoPanel(
  processKey: string,
  todoList: HTMLElement,
  initialTodos: TodoItem[],
): void {
  const persistTodos = async () => {
    const data: TodoItem[] = [];

    todoList.querySelectorAll<HTMLElement>('.proad-todo-card').forEach((card) => {
      const id = card.dataset.todoId || generateId();
      const titleInput = card.querySelector<HTMLInputElement>('.proad-todo-title');
      const checkbox = card.querySelector<HTMLInputElement>('.proad-todo-checkbox');

      data.push({
        id,
        title: titleInput?.value ?? '',
        done: checkbox?.checked ?? false,
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
    todoList
      .querySelectorAll<HTMLElement>('.proad-todo-card')
      .forEach((card, index) => {
        card.dataset.index = String(index);
      });
  };

  const createTodoCard = (todo: TodoItem = {
    id: generateId(),
    title: '',
    done: false,
  }) => {
    todoList.querySelector('.proad-todo-empty')?.remove();

    const card = document.createElement('div');
    card.className = 'proad-todo-card';
    card.dataset.todoId = todo.id;

    if (todo.done) {
      card.classList.add('is-done');
    }

    const checkLabel = document.createElement('label');
    checkLabel.className = 'proad-todo-check-wrap';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'proad-todo-checkbox';
    checkbox.checked = todo.done;

    const checkSpan = document.createElement('span');
    checkSpan.className = 'proad-todo-check';

    checkLabel.appendChild(checkbox);
    checkLabel.appendChild(checkSpan);

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'proad-todo-title';
    titleInput.placeholder = 'Digite a tarefa...';
    titleInput.value = todo.title;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'proad-todo-remove';
    removeButton.title = 'Remover tarefa';
    removeButton.textContent = '×';

    checkbox.addEventListener('change', () => {
      card.classList.toggle('is-done', checkbox.checked);
      void persistTodos();
    });

    titleInput.addEventListener('input', () => {
      void persistTodos();
    });

    titleInput.addEventListener('keydown', (event) => {
      event.stopPropagation();

      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault();
      createTodoCard();
      void persistTodos();

      const titles = todoList.querySelectorAll<HTMLInputElement>('.proad-todo-title');
      titles[titles.length - 1]?.focus();
    });

    titleInput.addEventListener('keyup', (event) => event.stopPropagation());
    titleInput.addEventListener('keypress', (event) => event.stopPropagation());

    removeButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      card.remove();

      if (!todoList.querySelector('.proad-todo-card')) {
        renderEmpty();
      }

      void persistTodos();
      refreshZebra();
    });

    card.appendChild(checkLabel);
    card.appendChild(titleInput);
    card.appendChild(removeButton);
    todoList.appendChild(card);

    refreshZebra();
  };

  if (initialTodos.length === 0) {
    renderEmpty();
  } else {
    initialTodos.forEach(createTodoCard);
  }

  const addButton = document.querySelector<HTMLButtonElement>(
    '#proad-annotation-modal .proad-todo-add',
  );

  addButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    createTodoCard();
    void persistTodos();

    const titles = todoList.querySelectorAll<HTMLInputElement>('.proad-todo-title');
    titles[titles.length - 1]?.focus();
  });
}

export { loadTodos };
