import * as loginView from './ui/views/login.js';
import * as registerView from './ui/views/register.js';
import * as dashboardView from './ui/views/dashboard.js';
import * as clientsView from './ui/views/clients.js';
import * as clientFormView from './ui/views/client-form.js';
import * as profileView from './ui/views/profile.js';
import * as carsView from './ui/views/cars.js';
import * as carFormView from './ui/views/car-form.js';
import * as requestsView from './ui/views/requests.js';
import * as requestFormView from './ui/views/request-form.js';
import * as requestDetailView from './ui/views/request-detail.js';
import * as contractsView from './ui/views/contracts.js';
import * as contractFormView from './ui/views/contract-form.js';
import * as creditContractsView from './ui/views/credit-contracts.js';
import * as creditContractFormView from './ui/views/credit-contract-form.js';
import * as notFoundView from './ui/views/not-found.js';

/**
 * @typedef {Object} Route
 * @property {string} path
 * @property {{ render: Function }} view
 * @property {boolean} [public]
 * @property {string[]} [roles]
 */

/** @type {Route[]} */
export const routes = [
  { path: '/', view: dashboardView },
  { path: '/login', view: loginView, public: true },
  { path: '/register', view: registerView, public: true },

  { path: '/clients', view: clientsView, roles: ['agent'] },
  { path: '/clients/new', view: clientFormView, roles: ['agent'] },
  { path: '/clients/:id/edit', view: clientFormView, roles: ['agent'] },
  { path: '/profile', view: profileView, roles: ['client'] },

  { path: '/cars', view: carsView },
  { path: '/cars/new', view: carFormView, roles: ['companyAgent'] },
  { path: '/cars/:id/edit', view: carFormView, roles: ['companyAgent'] },

  { path: '/requests', view: requestsView },
  { path: '/requests/new', view: requestFormView, roles: ['client'] },
  { path: '/requests/:id', view: requestDetailView },
  { path: '/requests/:id/edit', view: requestFormView, roles: ['client'] },

  { path: '/contracts', view: contractsView },
  { path: '/contracts/new', view: contractFormView, roles: ['client'] },
  { path: '/contracts/:id', view: contractsView },

  { path: '/credit-contracts', view: creditContractsView },
  { path: '/credit-contracts/new', view: creditContractFormView, roles: ['bankAgent'] },
  { path: '/credit-contracts/:id/edit', view: creditContractFormView, roles: ['bankAgent'] },

  { path: '*', view: notFoundView, public: true },
];
