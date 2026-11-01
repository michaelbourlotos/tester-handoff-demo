import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPumpLog } from '../app/logging.js';

test('pump log describes the action and speed', () => {
  assert.equal(formatPumpLog('started', 25, new Date('2026-11-01T10:15:00Z')), '2026-11-01T10:15:00.000Z | Pump started at 25 mL/min');
});
test('stop events retain their own UTC time', () => {
  assert.equal(formatPumpLog('stopped', 25, new Date('2026-11-01T10:16:00Z')), '2026-11-01T10:16:00.000Z | Pump stopped at 25 mL/min');
});
test('invalid actions and speeds are rejected', () => {
  assert.throws(() => formatPumpLog('unknown', 25));
  assert.throws(() => formatPumpLog('started', -1));
});
