import test from 'node:test';
import assert from 'node:assert/strict';

import { formatCpf, isValidCpf, stripCpf } from '../public/js/domain/cpf.js';

test('isValidCpf accepts the three demo CPFs', () => {
  for (const cpf of ['529.982.247-25', '111.444.777-35', '123.456.789-09']) {
    assert.equal(isValidCpf(cpf), true, cpf);
  }
});

test('isValidCpf accepts unformatted valid CPFs', () => {
  assert.equal(isValidCpf('52998224725'), true);
  assert.equal(isValidCpf('11144477735'), true);
  assert.equal(isValidCpf('12345678909'), true);
});

test('isValidCpf rejects repeated digits', () => {
  for (const cpf of [
    '111.111.111-11',
    '000.000.000-00',
    '999.999.999-99',
    '11111111111',
  ]) {
    assert.equal(isValidCpf(cpf), false, cpf);
  }
});

test('isValidCpf rejects wrong check digits', () => {
  for (const cpf of ['529.982.247-24', '111.444.777-36', '123.456.789-08']) {
    assert.equal(isValidCpf(cpf), false, cpf);
  }
});

test('isValidCpf rejects non-11-digit input', () => {
  for (const cpf of ['', null, undefined, '123', '1234567890', '123456789012', 'abcdefghijk']) {
    assert.equal(isValidCpf(cpf), false, String(cpf));
  }
});

test('stripCpf removes formatting and non-digits', () => {
  assert.equal(stripCpf('529.982.247-25'), '52998224725');
  assert.equal(stripCpf(' 123 abc 456 '), '123456');
  assert.equal(stripCpf(null), '');
});

test('formatCpf formats 11 digits and leaves other input trimmed', () => {
  assert.equal(formatCpf('52998224725'), '529.982.247-25');
  assert.equal(formatCpf('529.982.247-25'), '529.982.247-25');
  assert.equal(formatCpf('123'), '123');
  assert.equal(formatCpf(undefined), '');
});
