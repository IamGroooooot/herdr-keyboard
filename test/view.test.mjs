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
