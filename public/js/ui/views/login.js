import { authenticate } from '../../data/users.js';
import { navigate } from '../../router.js';
import { setSession } from '../../session.js';
import { showToast } from '../components.js';

const GENERIC_ERROR = 'E-mail ou senha inválidos.';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  container.innerHTML = `
    <section class="row justify-content-center">
      <div class="col-12 col-md-7 col-lg-5">
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <h1 class="h3 card-title mb-1">Entrar</h1>
            <p class="text-body-secondary mb-4">Acesse sua conta para alugar carros e acompanhar seus pedidos.</p>

            <div class="alert alert-danger d-none" role="alert" data-error></div>

            <form id="login-form" novalidate>
              <div class="mb-3">
                <label class="form-label" for="login-email">E-mail</label>
                <input
                  class="form-control"
                  id="login-email"
                  name="email"
                  type="email"
                  autocomplete="username"
                  required
                />
              </div>
              <div class="mb-4">
                <label class="form-label" for="login-password">Senha</label>
                <input
                  class="form-control"
                  id="login-password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  required
                />
              </div>
              <button class="btn btn-primary w-100" type="submit" data-submit>Entrar</button>
            </form>

            <p class="text-center small mt-4 mb-0">
              Ainda não tem conta? <a href="#/register">Cadastre-se</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  `;

  const form = container.querySelector('#login-form');
  const errorBox = container.querySelector('[data-error]');
  const emailInput = container.querySelector('#login-email');
  const passwordInput = container.querySelector('#login-password');
  const submitButton = container.querySelector('[data-submit]');
  if (!form || !emailInput || !passwordInput || !submitButton) return;

  // The guest-only guard redirects away, but keep the form focused for demos.
  emailInput.focus();

  /**
   * @param {string} message
   * @returns {void}
   */
  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.classList.remove('d-none');
  }

  function clearError() {
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.classList.add('d-none');
  }

  /**
   * @param {boolean} busy
   * @returns {void}
   */
  function setBusy(busy) {
    submitButton.disabled = busy;
    submitButton.textContent = busy ? 'Entrando…' : 'Entrar';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('Informe e-mail e senha.');
      return;
    }

    setBusy(true);
    try {
      const user = await authenticate(email, password);
      if (!user) {
        showError(GENERIC_ERROR);
        return;
      }

      setSession(user);
      showToast(`Bem-vindo(a), ${user.name}!`, 'success');
      navigate('/');
    } catch (error) {
      console.error(error);
      showError('Não foi possível entrar agora. Tente novamente.');
    } finally {
      setBusy(false);
    }
  });
}
