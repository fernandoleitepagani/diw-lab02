import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canCancelRequest,
  canEditRequest,
  canExecuteContract,
  canManageCars,
  canManageClients,
  canManageCreditContracts,
  canReviewRequests,
  canViewCreditContracts,
  canViewRequest,
  isAgent,
  isBankAgent,
  isClient,
  isCompanyAgent,
  ownsClient,
} from '../public/js/domain/permissions.js';

const ana = { id: 'u1', role: 'client', clientId: 'c1', agentType: null };
const bruno = { id: 'u2', role: 'client', clientId: 'c2', agentType: null };
const company = { id: 'u4', role: 'agent', agentType: 'COMPANY', clientId: null };
const bank = { id: 'u5', role: 'agent', agentType: 'BANK', clientId: null };

function request(overrides = {}) {
  return { clientId: 'c1', status: 'PENDING', ...overrides };
}

test('role predicates identify clients and each agent type', () => {
  assert.equal(isClient(ana), true);
  assert.equal(isClient(company), false);
  assert.equal(isAgent(company), true);
  assert.equal(isAgent(bank), true);
  assert.equal(isAgent(ana), false);
  assert.equal(isCompanyAgent(company), true);
  assert.equal(isCompanyAgent(bank), false);
  assert.equal(isBankAgent(bank), true);
  assert.equal(isBankAgent(company), false);
  assert.equal(isClient(null), false);
  assert.equal(isAgent(undefined), false);
});

test('clients cannot manage clients, cars, or credit contracts', () => {
  assert.equal(canManageClients(ana), false);
  assert.equal(canManageCars(ana), false);
  assert.equal(canReviewRequests(ana), false);
  assert.equal(canManageCreditContracts(ana), false);
});

test('company agents manage clients and cars but not credit contracts', () => {
  assert.equal(canManageClients(company), true);
  assert.equal(canReviewRequests(company), true);
  assert.equal(canManageCars(company), true);
  assert.equal(canManageCreditContracts(company), false);
  assert.equal(canViewCreditContracts(company), true);
});

test('bank agents manage clients and credit contracts but not cars', () => {
  assert.equal(canManageClients(bank), true);
  assert.equal(canReviewRequests(bank), true);
  assert.equal(canManageCars(bank), false);
  assert.equal(canManageCreditContracts(bank), true);
  assert.equal(canViewCreditContracts(bank), true);
});

test('canViewCreditContracts allows clients (own records) and agents', () => {
  assert.equal(canViewCreditContracts(ana), true);
  assert.equal(canViewCreditContracts(null), false);
});

test('ownsClient compares the session clientId', () => {
  assert.equal(ownsClient(ana, 'c1'), true);
  assert.equal(ownsClient(ana, 'c2'), false);
  assert.equal(ownsClient(company, 'c1'), false);
  assert.equal(ownsClient(ana, null), false);
});

test('clients can edit only their own pending requests', () => {
  assert.equal(canEditRequest(ana, request()), true);
  assert.equal(canEditRequest(ana, request({ status: 'UNDER_REVIEW' })), false);
  assert.equal(canEditRequest(ana, request({ status: 'APPROVED' })), false);
  assert.equal(canEditRequest(bruno, request()), false);
  assert.equal(canEditRequest(company, request()), false);
  assert.equal(canEditRequest(ana, null), false);
});

test('clients can cancel their own requests until a contract exists', () => {
  for (const status of ['PENDING', 'UNDER_REVIEW', 'APPROVED']) {
    assert.equal(canCancelRequest(ana, request({ status })), true, status);
  }
  for (const status of ['CONTRACTED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED']) {
    assert.equal(canCancelRequest(ana, request({ status })), false, status);
  }
  assert.equal(canCancelRequest(bruno, request()), false);
  assert.equal(canCancelRequest(company, request()), false);
});

test('only the owning client can execute an approved request', () => {
  assert.equal(canExecuteContract(ana, request({ status: 'APPROVED' })), true);
  assert.equal(canExecuteContract(ana, request({ status: 'UNDER_REVIEW' })), false);
  assert.equal(canExecuteContract(bruno, request({ status: 'APPROVED' })), false);
  assert.equal(canExecuteContract(company, request({ status: 'APPROVED' })), false);
});

test('agents view all requests while clients view only their own', () => {
  assert.equal(canViewRequest(company, request()), true);
  assert.equal(canViewRequest(bank, request()), true);
  assert.equal(canViewRequest(ana, request()), true);
  assert.equal(canViewRequest(bruno, request()), false);
  assert.equal(canViewRequest(null, request()), false);
});
