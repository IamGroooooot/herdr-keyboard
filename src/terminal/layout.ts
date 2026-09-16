import type { Action } from '../domain/actions.js';
import { Modifier } from '../domain/keys.js';
import type { Direction } from '../domain/keys.js';

export interface Button {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly action: Exclude<Action, Direction | 'enter'>;
}
export interface View {
  readonly width: number;
  readonly height: number;
  readonly composing: boolean;
  readonly compact: boolean;
  readonly page: number;
  readonly pageSize: number;
  readonly pages: number;
  readonly buttons: ReadonlyArray<Button>;
}

export function layout(columns: number, rows: number, total: number, page = 0, composing = false): View {
  const width = Math.max(1, columns - 1);
  const height = Math.max(1, rows);
  const minHeight = composing ? 14 : 10;
  if (width < 24 || height < minHeight) return { width, height, composing, compact: true, page: 0, pageSize: 0, pages: 0, buttons: [] };
  const cols = composing ? (width >= 40 ? 3 : 2) : (width >= 54 ? 2 : 1);
  const buttonWidth = Math.floor((width - 3) / cols);
  const pageSize = Math.min(9, Math.floor((height - (composing ? 12 : 7)) / 2) * cols);
  const pages = Math.ceil(total / pageSize);
  const currentPage = Math.max(0, Math.min(page, pages - 1));
  const count = Math.min(pageSize, total - currentPage * pageSize);
  const choices: ReadonlyArray<Button> = Array.from({ length: count }, (_, index) => ({
    x: 2 + (index % cols) * buttonWidth,
    y: (composing ? 7 : 4) + Math.floor(index / cols) * 2,
    width: buttonWidth - 1, height: 2, action: index,
  }));
  return { width, height, composing, compact: false, page: currentPage, pageSize, pages,
    buttons: [...choices, ...controlButtons(height, composing)],
  };
}

export function hitTest(view: View, x: number, y: number): Action | undefined {
  return view.buttons.find((button) => x >= button.x && x < button.x + button.width && y >= button.y && y < button.y + button.height)?.action;
}

export function moveSelection(view: View, selected: number, direction: Direction): number {
  const current = view.buttons.find((button) => button.action === selected);
  if (!current) return selected;
  const distance = (button: Button) => Math.abs(button.x - current.x) + Math.abs(button.y - current.y);
  const neighbor = view.buttons.filter((button) => {
    if (typeof button.action !== 'number') return false;
    switch (direction) {
      case 'up': return button.x === current.x && button.y < current.y;
      case 'down': return button.x === current.x && button.y > current.y;
      case 'left': return button.y === current.y && button.x < current.x;
      case 'right': return button.y === current.y && button.x > current.x;
    }
  }).sort((a, b) => distance(a) - distance(b))[0];
  return typeof neighbor?.action === 'number' ? neighbor.action : selected;
}

function controlButtons(height: number, composing: boolean): ReadonlyArray<Button> {
  const footerRow = height - (composing ? 5 : 3);
  return [
    { x: 2, y: 2, width: 13, height: 1, action: 'compose' },
    { x: 2, y: footerRow, width: 8, height: 1, action: 'previous' },
    { x: 12, y: footerRow, width: 8, height: 1, action: 'next' },
    { x: 2, y: height - 1, width: 13, height: 1, action: 'repeat' },
    { x: 17, y: height - 1, width: 8, height: 1, action: 'close' },
    ...(composing ? composerButtons(height) : []),
  ];
}

function composerButtons(height: number): ReadonlyArray<Button> {
  return [
    ...Modifier.literals.map((action, index) => ({ x: 1 + index * 8, y: 4, width: 8, height: 1, action })),
    { x: 2, y: height - 3, width: 12, height: 1, action: 'send' },
    { x: 16, y: height - 3, width: 8, height: 1, action: 'type-key' },
  ];
}
