import test from 'node:test';
import assert from 'node:assert/strict';

import {
  commitmentRatio,
  estimateTotal,
  rentalDays,
  round2,
} from '../public/js/domain/pricing.js';

test('rentalDays counts nights between date-only strings', () => {
  assert.equal(rentalDays('2026-11-10', '2026-11-15'), 5);
  assert.equal(rentalDays('2026-11-10', '2026-11-11'), 1);
  assert.equal(rentalDays('2026-11-10', '2026-11-10'), 0);
  assert.equal(rentalDays('2026-11-10', '2026-11-09'), -1);
});

test('rentalDays returns zero for invalid input', () => {
  assert.equal(rentalDays('', '2026-11-15'), 0);
  assert.equal(rentalDays('2026-11-10', 'not-a-date'), 0);
  assert.equal(rentalDays(null, undefined), 0);
});

test('estimateTotal multiplies the daily rate by the rental days', () => {
  assert.equal(estimateTotal(180, '2026-11-10', '2026-11-15'), 900);
  assert.equal(estimateTotal(220, '2026-11-12', '2026-11-18'), 1320);
  assert.equal(estimateTotal(120, '2026-11-20', '2026-11-23'), 360);
});

test('estimateTotal is zero for invalid values', () => {
  assert.equal(estimateTotal(NaN, '2026-11-10', '2026-11-15'), 0);
  assert.equal(estimateTotal(180, 'invalid', '2026-11-15'), 0);
});

test('round2 handles floating point noise', () => {
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(2.675), 2.68);
  assert.equal(round2(900), 900);
  assert.equal(round2('12.345'), 12.35);
  assert.equal(round2(Number.NaN), 0);
});

test('commitmentRatio returns the share of income committed', () => {
  assert.equal(commitmentRatio(6000, 1500), 0.25);
  assert.equal(commitmentRatio(5000, 1000), 0.2);
  assert.equal(commitmentRatio(0, 1000), 0);
  assert.equal(commitmentRatio(-10, 1000), 0);
  assert.equal(commitmentRatio(Number.NaN, 1000), 0);
});
