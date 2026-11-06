import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DomainError,
  REQUEST_STATUS,
  allowedTransitions,
  assertTransition,
  canTransition,
  isTerminal,
} from '../public/js/domain/request-state.js';

const S = REQUEST_STATUS;
const ALL_STATUSES = Object.values(S);
const ROLES = ['agent', 'client'];

const TRANSITION_TABLE = {
  [S.PENDING]: {
    [S.UNDER_REVIEW]: ['agent'],
    [S.CANCELLED]: ['client'],
  },
  [S.UNDER_REVIEW]: {
    [S.APPROVED]: ['agent'],
    [S.REJECTED]: ['agent'],
    [S.CANCELLED]: ['client'],
  },
  [S.APPROVED]: {
    [S.CONTRACTED]: ['client'],
    [S.CANCELLED]: ['client'],
  },
  [S.CONTRACTED]: {
    [S.ACTIVE]: ['agent'],
    [S.CANCELLED]: ['agent'],
  },
  [S.ACTIVE]: {
    [S.COMPLETED]: ['agent'],
    [S.CANCELLED]: ['agent'],
  },
  [S.REJECTED]: {},
  [S.COMPLETED]: {},
  [S.CANCELLED]: {},
};

test('REQUEST_STATUS exposes every state', () => {
  assert.deepEqual([...ALL_STATUSES].sort(), [
    'ACTIVE',
    'APPROVED',
    'CANCELLED',
    'COMPLETED',
    'CONTRACTED',
    'PENDING',
    'REJECTED',
    'UNDER_REVIEW',
  ]);
});

test('canTransition permits exactly the documented transitions per role', () => {
  for (const from of ALL_STATUSES) {
    for (const to of ALL_STATUSES) {
      for (const role of [...ROLES, 'admin', 'companyAgent', '']) {
        const expected = Boolean(TRANSITION_TABLE[from]?.[to]?.includes(role));
        assert.equal(
          canTransition(from, to, role),
          expected,
          `${from} -> ${to} as ${role}`,
        );
      }
    }
  }
});

test('allowedTransitions lists every target for a role', () => {
  assert.deepEqual(allowedTransitions(S.PENDING, 'agent'), [S.UNDER_REVIEW]);
  assert.deepEqual(allowedTransitions(S.PENDING, 'client'), [S.CANCELLED]);
  assert.deepEqual(allowedTransitions(S.UNDER_REVIEW, 'agent'), [S.APPROVED, S.REJECTED]);
  assert.deepEqual(allowedTransitions(S.UNDER_REVIEW, 'client'), [S.CANCELLED]);
  assert.deepEqual(allowedTransitions(S.APPROVED, 'client'), [S.CONTRACTED, S.CANCELLED]);
  assert.deepEqual(allowedTransitions(S.CONTRACTED, 'agent'), [S.ACTIVE, S.CANCELLED]);
  assert.deepEqual(allowedTransitions(S.ACTIVE, 'agent'), [S.COMPLETED, S.CANCELLED]);
  assert.deepEqual(allowedTransitions(S.PENDING, 'admin'), []);
});

test('terminal statuses have no outgoing transitions', () => {
  for (const status of [S.REJECTED, S.COMPLETED, S.CANCELLED]) {
    assert.equal(isTerminal(status), true, status);
    for (const role of ROLES) {
      assert.deepEqual(allowedTransitions(status, role), []);
    }
  }
  for (const status of [S.PENDING, S.UNDER_REVIEW, S.APPROVED, S.CONTRACTED, S.ACTIVE]) {
    assert.equal(isTerminal(status), false, status);
  }
  assert.equal(isTerminal('UNKNOWN'), false);
});

test('assertTransition accepts allowed transitions and throws DomainError otherwise', () => {
  assert.doesNotThrow(() => assertTransition(S.PENDING, S.UNDER_REVIEW, 'agent'));
  assert.doesNotThrow(() => assertTransition(S.APPROVED, S.CONTRACTED, 'client'));

  assert.throws(
    () => assertTransition(S.PENDING, S.APPROVED, 'agent'),
    (error) => error instanceof DomainError && error.name === 'DomainError',
  );
  assert.throws(
    () => assertTransition(S.PENDING, S.UNDER_REVIEW, 'client'),
    DomainError,
  );
  assert.throws(
    () => assertTransition(S.COMPLETED, S.ACTIVE, 'agent'),
    DomainError,
  );
});

test('terminal statuses reject every transition via assertTransition', () => {
  for (const from of [S.REJECTED, S.COMPLETED, S.CANCELLED]) {
    for (const to of ALL_STATUSES) {
      assert.throws(() => assertTransition(from, to, 'agent'), DomainError);
    }
  }
});
