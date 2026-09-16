import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fit, render } from '../src/terminal/view.js';
import { shortcuts } from '../src/config.js';
import { baseKeys } from '../src/domain/composer.js';
import { PaneId } from '../src/domain/keys.js';
import { layout, hitTest } from '../src/terminal/layout.js';
import type { Button } from '../src/terminal/layout.js';

test('shortcut and composer buttons stay visible, disjoint and clickable across terminal sizes', () => {
  // Arrange
  const modes = [{ composing: false, total: 20, minRows: 10 }, { composing: true, total: 15, minRows: 14 }];
  const scenarios = modes.flatMap((mode) => [25, 32, 40, 41, 55, 80, 120].flatMap((columns) =>
    [mode.minRows, 22, 40].flatMap((rows) => [0, 999].map((page) => ({ ...mode, columns, rows, page })))));

  // Act
  const results = scenarios.map((scenario) => {
    const view = layout(scenario.columns, scenario.rows, scenario.total, scenario.page, scenario.composing);
    const cells = view.buttons.flatMap((button) => buttonCells(button).map(([x, y]) => ({
      x, y, expected: button.action, actual: hitTest(view, x, y),
    })));
    return { scenario, view, cells };
  });

  // Assert
  for (const { scenario, view, cells } of results) {
    const context = JSON.stringify(scenario);
    assert.equal(view.compact, false, context);
    assert.ok(view.pageSize >= 1 && view.pageSize <= 9, context);
    assert.ok(view.page >= 0 && view.page < view.pages, context);
    for (const button of view.buttons.filter((button) => typeof button.action === 'number')) {
      assert.equal(button.height, 1, context);
      assert.ok(button.y + 1 < view.height - (scenario.composing ? 5 : 4), `${context}: choice needs space before footer`);
      assert.equal(hitTest(view, button.x, button.y + 1), undefined, `${context}: spacing is not a button`);
    }
    const occupied = new Set<string>();
    for (const { x, y, expected, actual } of cells) {
      assert.ok(x >= 1 && x < scenario.columns && y >= 1 && y <= scenario.rows, context);
      assert.ok(!occupied.has(`${x},${y}`), `${context}: overlap at ${x},${y}`);
      occupied.add(`${x},${y}`);
      assert.equal(actual, expected, `${context}: click at ${x},${y}`);
    }
  }
});

test('default shortcuts and composer keys use lowercase labels without a duplicate key line', () => {
  // Arrange
  const cases = [
    { composing: false, entries: shortcuts.slice(0, 3), expected: ['alt+up', 'shift+tab', 'shift+enter'] },
    { composing: true, entries: baseKeys.slice(0, 3), expected: ['up', 'down', 'left'] },
  ];

  // Act
  const screens = cases.map(({ composing, entries }) => render(layout(40, 22, entries.length, 0, composing), {
    entries, pane: PaneId.make('w1:p2'), selected: 0, closeAfterSend: true, status: '',
    composer: composing ? { ctrl: false, alt: false, shift: false, base: null, preview: null, typing: null } : null,
  }).replace(/\x1b\[[0-9;]*m/g, ''));

  // Assert
  for (const [index, scenario] of cases.entries()) {
    const screen = screens[index]!;
    for (const [choice, key] of scenario.expected.entries()) {
      assert.ok(screen.includes(` ${choice + 1} ${key}`));
      assert.equal(screen.split(key).length - 1, 1, `${key} should appear only once`);
    }
    if (scenario.composing) {
      for (const modifier of ['[c]ctrl', '[a]alt', '[s]shift', '[enter] Send']) {
        assert.ok(screen.includes(modifier), modifier);
      }
    }
  }
});

test('terminals below the minimum size expose no clickable controls', () => {
  // Arrange
  const scenarios = [
    { columns: 24, rows: 22, composing: false },
    { columns: 40, rows: 9, composing: false },
    { columns: 40, rows: 13, composing: true },
  ];

  // Act
  const views = scenarios.map(({ columns, rows, composing }) => layout(columns, rows, 20, 0, composing));

  // Assert
  for (const view of views) {
    assert.equal(view.compact, true);
    assert.deepEqual(view.buttons, []);
  }
});

test('labels fit terminal cells and cannot inject control sequences', () => {
  // Arrange
  const cases = [
    { input: '가나다', width: 5, expected: '가나 ' },
    { input: '\x1b[2J', width: 10, expected: ' [2J      ' },
  ];

  // Act
  const labels = cases.map(({ input, width }) => fit(input, width));

  // Assert
  assert.deepEqual(labels, cases.map(({ expected }) => expected));
});

function buttonCells(button: Button): ReadonlyArray<readonly [number, number]> {
  return Array.from({ length: button.width }, (_, column) =>
    Array.from({ length: button.height }, (_, row): readonly [number, number] =>
      [button.x + column, button.y + row])).flat();
}
