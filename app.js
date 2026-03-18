'use strict';

// =============================================
// 상태 (State)
// =============================================

/** @type {Array<{id: number, text: string, completed: boolean, priority: string, deadline: string|null, createdAt: string}>} */
let todos = [];

/** @type {"all" | "active" | "completed"} */
let currentFilter = 'all';

// =============================================
// 유틸 (Utility)
// =============================================

/**
 * 로컬 시간 기준 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환합니다.
 * @returns {string}
 */
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * "YYYY-MM-DD" 날짜 문자열을 "M월 D일" 형식으로 변환합니다.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDeadline(dateStr) {
  const [, month, day] = dateStr.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

// =============================================
// 저장 / 로드 (Persistence)
// =============================================

/**
 * todos 배열을 localStorage에 저장합니다.
 */
function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

/**
 * localStorage에서 todos 배열을 로드합니다.
 * 저장된 데이터가 없으면 빈 배열을 반환합니다.
 * deadline 필드가 없는 기존 데이터는 null로 정규화합니다.
 */
function loadTodos() {
  const raw = localStorage.getItem('todos');
  const parsed = JSON.parse(raw) || [];
  // 기존 데이터 호환: deadline 필드 누락 시 null로 보정
  todos = parsed.map(function (t) {
    return {
      id: t.id,
      text: t.text,
      completed: t.completed,
      priority: t.priority || 'medium',
      deadline: t.deadline !== undefined ? t.deadline : null,
      createdAt: t.createdAt || new Date().toISOString(),
    };
  });
}

// =============================================
// CRUD
// =============================================

/**
 * 새로운 Todo 객체를 생성합니다.
 * @param {string} text
 * @param {string} priority
 * @param {string|null} deadline
 * @returns {{id: number, text: string, completed: boolean, priority: string, deadline: string|null, createdAt: string}}
 */
function createTodo(text, priority, deadline) {
  return {
    id: Date.now() + Math.random(),
    text: text,
    completed: false,
    priority: priority,
    deadline: deadline || null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 입력 필드 값을 읽어 Todo를 추가합니다.
 * 빈 입력 시 shake 애니메이션을 실행하고 추가를 차단합니다.
 */
function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();

  if (text === '') {
    triggerShake(input);
    return;
  }

  const priority = document.getElementById('prioritySelect').value;
  const deadline = document.getElementById('deadlineInput').value || null;

  const todo = createTodo(text, priority, deadline);
  todos.push(todo);
  saveTodos();
  renderTodos();

  // 입력 필드 초기화
  input.value = '';
  document.getElementById('deadlineInput').value = '';
  input.focus();
}

/**
 * 지정한 id의 Todo를 삭제합니다.
 * @param {number} id
 */
function deleteTodo(id) {
  todos = todos.filter(function (t) { return t.id !== id; });
  saveTodos();
  renderTodos();
}

/**
 * 지정한 id의 Todo 완료 상태를 반전합니다.
 * @param {number} id
 */
function toggleTodo(id) {
  todos = todos.map(function (t) {
    if (t.id === id) {
      return Object.assign({}, t, { completed: !t.completed });
    }
    return t;
  });
  saveTodos();
  renderTodos();
}

/**
 * 완료된 Todo를 모두 삭제합니다.
 */
function clearCompleted() {
  todos = todos.filter(function (t) { return !t.completed; });
  saveTodos();
  renderTodos();
}

// =============================================
// 렌더링 (Rendering)
// =============================================

/**
 * 마감일 뱃지 HTML 문자열을 반환합니다.
 * 완료된 항목은 초과 경고를 표시하지 않습니다.
 * @param {{completed: boolean, deadline: string|null}} todo
 * @returns {string}
 */
function buildDeadlineBadgeHTML(todo) {
  if (!todo.deadline) return '';

  const today = getTodayString();
  let badgeClass = 'deadline-badge';

  if (todo.deadline === today) {
    badgeClass += ' deadline-badge--today';
  } else if (!todo.completed && todo.deadline < today) {
    badgeClass += ' deadline-badge--overdue';
  }

  return `<span class="${badgeClass}">${formatDeadline(todo.deadline)}</span>`;
}

/**
 * Todo 항목 하나의 HTML 문자열을 반환합니다.
 * @param {{id: number, text: string, completed: boolean, priority: string, deadline: string|null}} todo
 * @returns {string}
 */
function buildTodoItemHTML(todo) {
  const completedClass = todo.completed ? ' completed' : '';
  const checkedAttr = todo.completed ? ' checked' : '';

  const priorityLabel = { high: '높음', medium: '보통', low: '낮음' }[todo.priority] || '보통';
  const priorityBadge = `<span class="priority-badge priority-badge--${todo.priority}">${priorityLabel}</span>`;
  const deadlineBadge = buildDeadlineBadgeHTML(todo);

  return `
    <li class="todo-item${completedClass}" data-id="${todo.id}">
      <input type="checkbox"${checkedAttr} aria-label="완료 토글">
      <div class="todo-content">
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <div class="todo-badges">
          ${priorityBadge}
          ${deadlineBadge}
        </div>
      </div>
      <button class="delete-btn" aria-label="삭제">×</button>
    </li>
  `.trim();
}

/**
 * 현재 필터에 맞게 목록을 렌더링하고 통계를 갱신합니다.
 */
function renderTodos() {
  const list = document.getElementById('todoList');

  const filtered = todos.filter(function (t) {
    if (currentFilter === 'active') return !t.completed;
    if (currentFilter === 'completed') return t.completed;
    return true;
  });

  if (filtered.length === 0) {
    const messages = {
      all: '할 일을 추가해보세요!',
      active: '미완료 항목이 없습니다.',
      completed: '완료된 항목이 없습니다.',
    };
    list.innerHTML = `<li class="empty-message">${messages[currentFilter]}</li>`;
  } else {
    list.innerHTML = filtered.map(buildTodoItemHTML).join('');
  }

  updateStats();
}

/**
 * 통계 텍스트와 "완료 삭제" 버튼 상태를 갱신합니다.
 */
function updateStats() {
  const total = todos.length;
  const completedCount = todos.filter(function (t) { return t.completed; }).length;

  document.getElementById('stats').textContent = `완료 ${completedCount} / 전체 ${total}`;

  const clearBtn = document.getElementById('clearCompleted');
  clearBtn.disabled = completedCount === 0;
}

// =============================================
// 필터 탭
// =============================================

/**
 * 필터 탭 버튼들의 active 클래스를 갱신합니다.
 * @param {string} filter
 */
function updateFilterTabs(filter) {
  document.querySelectorAll('.tab').forEach(function (tab) {
    if (tab.dataset.filter === filter) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

// =============================================
// 애니메이션 (Animation)
// =============================================

/**
 * 입력 필드에 shake 애니메이션을 적용합니다. (0.4s 후 자동 제거)
 * @param {HTMLElement} element
 */
function triggerShake(element) {
  element.classList.remove('shake');
  // reflow를 강제하여 애니메이션이 재실행되도록 합니다
  void element.offsetWidth;
  element.classList.add('shake');
  setTimeout(function () {
    element.classList.remove('shake');
  }, 400);
}

// =============================================
// HTML 이스케이프
// =============================================

/**
 * XSS 방지를 위해 특수문자를 HTML 엔티티로 변환합니다.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// =============================================
// 이벤트 바인딩 (Event Binding)
// =============================================

/**
 * 모든 이벤트 리스너를 등록합니다.
 */
function bindEvents() {
  // 추가 버튼
  document.getElementById('addBtn').addEventListener('click', addTodo);

  // Enter 키
  document.getElementById('todoInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addTodo();
  });

  // 완료 삭제 버튼
  document.getElementById('clearCompleted').addEventListener('click', clearCompleted);

  // 필터 탭 (이벤트 위임)
  document.querySelector('.filter-tabs').addEventListener('click', function (e) {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    currentFilter = tab.dataset.filter;
    updateFilterTabs(currentFilter);
    renderTodos();
  });

  // 목록 이벤트 위임: 체크박스 토글 + 삭제 버튼
  document.getElementById('todoList').addEventListener('click', function (e) {
    const item = e.target.closest('.todo-item');
    if (!item) return;

    const id = Number(item.dataset.id);

    if (e.target.matches('input[type="checkbox"]')) {
      toggleTodo(id);
      return;
    }

    if (e.target.closest('.delete-btn')) {
      deleteTodo(id);
      return;
    }
  });
}

// =============================================
// 초기화 (Initialization)
// =============================================

/**
 * 애플리케이션을 초기화합니다.
 */
function init() {
  loadTodos();
  bindEvents();
  renderTodos();
}

init();
