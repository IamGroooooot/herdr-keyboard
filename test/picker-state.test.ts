import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig } from '../src/config.js';
import { initialState, updatePicker } from '../src/picker-state.js';
import { layout } from '../src/terminal/layout.js';

test('arrows follow the shortcut grid without wrapping rows, columns or pages', () => {
  // Arrange: wide pages have ten choices; a custom list can leave the last row incomplete.
  const oddConfig = { ...defaultConfig, shortcuts: [defaultConfig.shortcuts[0], ...defaultConfig.shortcuts.slice(1, -1)] as const };
  const cases = [
    { name: 'down in left column', width: 80, page: 0, from: 0, key: 'down', to: 2 },
    { name: 'down in right column', width: 80, page: 0, from: 1, key: 'down', to: 3 },
    { name: 'up in right column', width: 80, page: 0, from: 3, key: 'up', to: 1 },
    { name: 'right in row', width: 80, page: 0, from: 2, key: 'right', to: 3 },
    { name: 'left in row', width: 80, page: 0, from: 3, key: 'left', to: 2 },
    { name: 'top edge', width: 80, page: 0, from: 1, key: 'up', to: 1 },
    { name: 'left edge', width: 80, page: 0, from: 2, key: 'left', to: 2 },
    { name: 'right edge', width: 80, page: 0, from: 3, key: 'right', to: 3 },
    { name: 'down to tenth choice', width: 80, page: 0, from: 7, key: 'down', to: 9 },
    { name: 'right to tenth choice', width: 80, page: 0, from: 8, key: 'right', to: 9 },
    { name: 'empty cell below', width: 80, page: 1, from: 7, key: 'down', to: 7, config: oddConfig },
    { name: 'empty cell to right', width: 80, page: 1, from: 8, key: 'right', to: 8, config: oddConfig },
    { name: 'bottom edge', width: 80, page: 0, from: 8, key: 'down', to: 8 },
    { name: 'last page bottom edge', width: 80, page: 1, from: 9, key: 'down', to: 9 },
    { name: 'single column down', width: 40, page: 0, from: 0, key: 'down', to: 1 },
    { name: 'single column up', width: 40, page: 0, from: 1, key: 'up', to: 0 },
    { name: 'single column has no right neighbor', width: 40, page: 0, from: 0, key: 'right', to: 0 },
  ];

  // Act
  const results = cases.map((scenario) => {
    const config = scenario.config ?? defaultConfig;
    const state = { ...initialState(config), selected: scenario.from, page: scenario.page };
    const view = layout(scenario.width, 22, config.shortcuts.length, scenario.page);
    return { scenario, result: updatePicker(state, { type: 'key', key: scenario.key }, view, config) };
  });

  // Assert
  for (const { scenario, result } of results) {
    assert.ok(result._tag === 'Continue', scenario.name);
    assert.equal(result.state.selected, scenario.to, scenario.name);
    assert.equal(result.state.page, scenario.page, scenario.name);
  }
});

test('composer arrows choose a base key instead of navigating the shortcut grid', () => {
  // Arrange
  const state = { ...initialState(defaultConfig), mode: { _tag: 'Compose' } as const };
  const view = layout(80, 22, 15, 0, true);
  const arrows = ['up', 'down', 'left', 'right'];

  // Act
  const results = arrows.map((key) => updatePicker(state, { type: 'key', key }, view, defaultConfig));

  // Assert
  for (const [index, result] of results.entries()) {
    assert.ok(result._tag === 'Continue');
    assert.equal(result.state.composer.base, arrows[index]);
    assert.equal(result.state.selected, 0);
  }
});
