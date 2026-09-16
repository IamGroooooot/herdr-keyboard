import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fit, layout, hitTest } from '../view.mjs';

test('buttons remain in bounds and do not overlap navigation on small and large screens', () => {
  for (const columns of [25, 32, 40, 55, 80, 120]) {
    for (const rows of [10, 12, 18, 24, 40]) {
      const view = layout(columns, rows, 20, 999);
      assert.ok(view.pageSize >= 1 && view.pageSize <= 9);
      assert.ok(view.page < view.pages);
      for (const button of view.buttons) {
        assert.ok(button.x + button.width <= columns);
        assert.ok(button.y + button.height <= rows);
        assert.equal(hitTest(view, button.x, button.y), button.action);
        if (typeof button.action === 'number') assert.ok(button.y + button.height <= rows - 4);
      }
    }
  }
  assert.equal(layout(20, 8, 20).compact, true);
});

test('labels cannot insert terminal control sequences or overflow CJK cell widths', () => {
  assert.equal(fit('가나다', 5), '가나 ');
  assert.equal(fit('abcdef', 3), 'abc');
  assert.ok(!fit('\x1b[2J', 10).includes('\x1b'));
});

test('composer controls and all base-key cells have disjoint touch targets', () => {
  for (const columns of [25, 32, 40, 41, 80]) {
    for (const rows of [14, 16, 22, 30]) {
      const view = layout(columns, rows, 15, 0, true);
      assert.equal(view.compact, false);
      const occupied = new Set();
      for (const button of view.buttons) {
        for (let x = button.x; x < button.x + button.width; x++) {
          for (let y = button.y; y < button.y + button.height; y++) {
            assert.ok(x >= 1 && x < columns && y >= 1 && y <= rows);
            assert.ok(!occupied.has(`${x},${y}`), `overlap at ${x},${y}`);
            occupied.add(`${x},${y}`);
            assert.equal(hitTest(view, x, y), button.action);
          }
        }
      }
    }
  }
});
