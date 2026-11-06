import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  MAX_EMPLOYERS,
  datesOverlap,
  validateCar,
  validateClient,
  validateContract,
  validateCreditContract,
  validateRentalRequest,
} from '../public/js/domain/validation.js';

const MIN_YEAR = 1900;
const MAX_YEAR = new Date().getFullYear() + 1;

function validClient(overrides = {}) {
  return {
    name: 'Ana Souza',
    cpf: '529.982.247-25',
    address: 'Rua das Flores, 100, Belo Horizonte/MG',
    employers: [
      { name: 'Empresa A', income: 4500 },
      { name: 'Empresa B', income: 1500 },
      { name: 'Empresa C', income: 800 },
    ],
    ...overrides,
  };
}

function validCar(overrides = {}) {
  return {
    registration: 'MAT-001',
    year: 2024,
    brand: 'Toyota',
    model: 'Corolla',
    plate: 'ABC1D23',
    dailyRate: 180,
    status: 'AVAILABLE',
    ownerType: 'COMPANY',
    ...overrides,
  };
}

function validRequest(overrides = {}) {
  return {
    clientId: 'c1',
    carId: 'car1',
    startDate: '2026-11-10',
    endDate: '2026-11-15',
    estimatedTotal: 900,
    notes: 'Viagem de trabalho',
    ...overrides,
  };
}

function validContract(overrides = {}) {
  return {
    rentalRequestId: 'r1',
    clientId: 'c1',
    carId: 'car1',
    startDate: '2026-11-10',
    endDate: '2026-11-15',
    total: 900,
    ownershipType: 'CLIENT',
    status: 'ACTIVE',
    ...overrides,
  };
}

function validCreditContract(overrides = {}) {
  return {
    bankId: 'u5',
    clientId: 'c1',
    amount: 5000,
    installments: 12,
    interestRate: 1.5,
    status: 'APPROVED',
    ...overrides,
  };
}

test('validateClient accepts a valid client with three employers', () => {
  assert.equal(MAX_EMPLOYERS, 3);
  const result = validateClient(validClient());
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('validateClient rejects more than three employers', () => {
  const result = validateClient(
    validClient({
      employers: [
        { name: 'A', income: 1000 },
        { name: 'B', income: 1000 },
        { name: 'C', income: 1000 },
        { name: 'D', income: 1000 },
      ],
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.field === 'employers'));
});

test('validateClient rejects an invalid CPF', () => {
  const result = validateClient(validClient({ cpf: '111.111.111-11' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.field === 'cpf'));
});

test('validateClient rejects empty name and address', () => {
  const result = validateClient(validClient({ name: '   ', address: '' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.field === 'name'));
  assert.ok(result.errors.some((error) => error.field === 'address'));
});

test('validateClient rejects a negative employer income', () => {
  const result = validateClient(
    validClient({ employers: [{ name: 'Empresa A', income: -1 }] }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.field === 'employers.0.income'));
});

test('validateClient allows a client without employers', () => {
  const result = validateClient(validClient({ employers: [] }));
  assert.equal(result.ok, true);
});

test('validateCar accepts a valid car', () => {
  const result = validateCar(validCar());
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('validateCar rejects a year outside 1900..current+1', () => {
  for (const year of [MIN_YEAR - 1, MAX_YEAR + 1]) {
    const result = validateCar(validCar({ year }));
    assert.equal(result.ok, false, String(year));
    assert.ok(result.errors.some((error) => error.field === 'year'));
  }
  assert.equal(validateCar(validCar({ year: MIN_YEAR })).ok, true);
  assert.equal(validateCar(validCar({ year: MAX_YEAR })).ok, true);
});

test('validateCar rejects empty registration, plate, brand, or model', () => {
  for (const field of ['registration', 'plate', 'brand', 'model']) {
    const result = validateCar(validCar({ [field]: '  ' }));
    assert.equal(result.ok, false, field);
    assert.ok(result.errors.some((error) => error.field === field));
  }
});

test('validateCar rejects a non-positive daily rate', () => {
  for (const dailyRate of [0, -10, null]) {
    const result = validateCar(validCar({ dailyRate }));
    assert.equal(result.ok, false, String(dailyRate));
    assert.ok(result.errors.some((error) => error.field === 'dailyRate'));
  }
});

test('validateRentalRequest accepts a valid request', () => {
  const result = validateRentalRequest(validRequest());
  assert.equal(result.ok, true);
});

test('validateRentalRequest rejects an end date on or before the start date', () => {
  for (const endDate of ['2026-11-10', '2026-11-09']) {
    const result = validateRentalRequest(validRequest({ endDate }));
    assert.equal(result.ok, false, endDate);
    assert.ok(result.errors.some((error) => error.field === 'endDate'));
  }
});

test('validateRentalRequest rejects missing car or client', () => {
  const withoutClient = validateRentalRequest(validRequest({ clientId: '' }));
  const withoutCar = validateRentalRequest(validRequest({ carId: null }));
  assert.ok(withoutClient.errors.some((error) => error.field === 'clientId'));
  assert.ok(withoutCar.errors.some((error) => error.field === 'carId'));
});

test('validateContract accepts a valid contract', () => {
  const result = validateContract(validContract());
  assert.equal(result.ok, true);
});

test('validateContract rejects an invalid ownership type', () => {
  const result = validateContract(validContract({ ownershipType: 'OTHER' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.field === 'ownershipType'));
});

test('validateContract rejects missing request, client, or car', () => {
  for (const field of ['rentalRequestId', 'clientId', 'carId']) {
    const result = validateContract(validContract({ [field]: '' }));
    assert.equal(result.ok, false, field);
    assert.ok(result.errors.some((error) => error.field === field));
  }
});

test('validateCreditContract accepts a valid credit contract', () => {
  const result = validateCreditContract(validCreditContract());
  assert.equal(result.ok, true);
});

test('validateCreditContract rejects a non-positive amount', () => {
  for (const amount of [0, -100]) {
    const result = validateCreditContract(validCreditContract({ amount }));
    assert.equal(result.ok, false, String(amount));
    assert.ok(result.errors.some((error) => error.field === 'amount'));
  }
});

test('validateCreditContract rejects installments outside 1..60', () => {
  for (const installments of [0, 61, 1.5, '12.5', 'abc']) {
    const result = validateCreditContract(validCreditContract({ installments }));
    assert.equal(result.ok, false, String(installments));
    assert.ok(result.errors.some((error) => error.field === 'installments'));
  }
  assert.equal(validateCreditContract(validCreditContract({ installments: 1 })).ok, true);
  assert.equal(validateCreditContract(validCreditContract({ installments: 60 })).ok, true);
  assert.equal(validateCreditContract(validCreditContract({ installments: '12' })).ok, true);
});

test('validateCreditContract rejects an invalid status', () => {
  const result = validateCreditContract(validCreditContract({ status: 'ACTIVE' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.field === 'status'));
});

test('validateCreditContract rejects a negative interest rate', () => {
  const result = validateCreditContract(validCreditContract({ interestRate: -0.1 }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.field === 'interestRate'));
});

test('datesOverlap is inclusive-exclusive', () => {
  assert.equal(datesOverlap('2026-11-10', '2026-11-15', '2026-11-15', '2026-11-20'), false);
  assert.equal(datesOverlap('2026-11-15', '2026-11-20', '2026-11-10', '2026-11-15'), false);
  assert.equal(datesOverlap('2026-11-10', '2026-11-15', '2026-11-14', '2026-11-16'), true);
  assert.equal(datesOverlap('2026-11-10', '2026-11-15', '2026-11-09', '2026-11-11'), true);
  assert.equal(datesOverlap('2026-11-10', '2026-11-15', '2026-11-16', '2026-11-20'), false);
});

test('seed data matches the delivery counts and validates', () => {
  const seedPath = fileURLToPath(new URL('../db.seed.json', import.meta.url));
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'));

  assert.equal(seed.users.length, 5);
  assert.equal(seed.clients.length, 3);
  assert.equal(seed.cars.length, 5);
  assert.equal(seed.rentalRequests.length, 4);
  assert.equal(seed.contracts.length, 2);
  assert.equal(seed.creditContracts.length, 3);

  assert.deepEqual(
    seed.users.map((user) => user.name),
    ['Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Locadora Move', 'Banco Aurora'],
  );
  assert.ok(seed.users.every((user) => user.password === '123456'));
  for (const agent of seed.users.filter((user) => user.role === 'agent')) {
    assert.equal(Object.hasOwn(agent, 'clientId'), false, agent.name);
  }

  // json-server@0.17.4 crashes on any null foreign key during DELETE.
  for (const records of Object.values(seed)) {
    for (const record of records) {
      for (const [key, value] of Object.entries(record)) {
        if (key.endsWith('Id')) {
          assert.notEqual(value, null, `${record.id} has a null ${key}`);
        }
      }
    }
  }

  for (const client of seed.clients) {
    assert.equal(validateClient(client).ok, true, client.name);
    assert.ok(client.employers.length >= 1 && client.employers.length <= MAX_EMPLOYERS);
  }

  assert.deepEqual(
    seed.cars.map((car) => car.model),
    ['Corolla', 'Civic', 'Onix', 'Compass', 'HB20'],
  );
  for (const car of seed.cars) {
    assert.equal(validateCar(car).ok, true, car.model);
  }
  assert.equal(seed.cars.find((car) => car.model === 'Compass').status, 'RENTED');
  assert.equal(seed.cars.find((car) => car.model === 'HB20').status, 'MAINTENANCE');

  assert.deepEqual(
    seed.rentalRequests.map((request) => request.status),
    ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE'],
  );
  for (const request of seed.rentalRequests) {
    assert.equal(validateRentalRequest(request).ok, true, request.id);
  }

  assert.deepEqual(
    seed.contracts.map((contract) => contract.status),
    ['ACTIVE', 'COMPLETED'],
  );
  const historicalContract = seed.contracts.find((contract) => contract.id === 'ct2');
  assert.equal(Object.hasOwn(historicalContract, 'creditContractId'), false);
  for (const contract of seed.contracts) {
    assert.equal(validateContract(contract).ok, true, contract.id);
  }

  assert.deepEqual(
    seed.creditContracts.map((contract) => contract.status),
    ['APPROVED', 'PENDING', 'APPROVED'],
  );
  for (const contract of seed.creditContracts) {
    assert.equal(validateCreditContract(contract).ok, true, contract.id);
  }
});
