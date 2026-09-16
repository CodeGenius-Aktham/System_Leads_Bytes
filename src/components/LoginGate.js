/* ==========================================================================
   src/components/LoginGate.js
   Puerta de entrada: mientras no haya sesión, el sistema no se muestra.

   Sólo aparece si hay un proyecto de Firebase configurado. Sin configurar,
   el sistema abre directo (modo local) y este componente no se monta.
   ========================================================================== */
(function (Bytes) {
  'use strict';

  var h = Bytes.dom.h;
  var icon = Bytes.dom.icon;

  function create(root) {
    var emailInput = h('input', {
      class: 'login__input', type: 'email', id: 'login-email',
      autocomplete: 'username', required: true, placeholder: 'nombre@bytestechnology.com'
    });
    var passInput = h('input', {
      class: 'login__input', type: 'password', id: 'login-pass',
      autocomplete: 'current-password', required: true, placeholder: '••••••••'
    });
    var submit = h('button', { class: 'login__submit', type: 'submit' },
      h('span', { text: 'Entrar' }));
    var error = h('p', { class: 'login__error is-hidden', role: 'alert' });
    var hint = h('p', { class: 'login__hint' });

    var form = h('form', { class: 'login__form', novalidate: true },
      h('label', { class: 'login__label', for: 'login-email', text: 'Correo' }),
      emailInput,
      h('label', { class: 'login__label', for: 'login-pass', text: 'Contraseña' }),
      passInput,
      error,
      submit
    );

    var card = h('div', { class: 'login__card' },
      h('div', { class: 'login__brand' },
        h('img', { class: 'login__mark', src: 'assets/isotipo.svg', alt: '' }),
        h('span', { class: 'login__word', text: 'Bytes' })
      ),
      h('p', { class: 'login__intro', text: 'Sistema de leads — acceso del equipo comercial.' }),
      form,
      hint
    );

    var el = h('section', { class: 'login is-hidden', id: 'login-gate' }, card);
    root.appendChild(el);

    function showError(message) {
      error.textContent = message;
      error.classList.remove('is-hidden');
    }
    function clearError() {
      error.textContent = '';
      error.classList.add('is-hidden');
    }
    /**
     * @param {boolean} on     bloquear el formulario
     * @param {string} [label] texto del botón; por defecto "Entrando…"
     */
    function busy(on, label) {
      submit.disabled = on;
      emailInput.disabled = on;
      passInput.disabled = on;
      submit.firstChild.textContent = on ? (label || 'Entrando…') : 'Entrar';
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      clearError();
      if (!emailInput.value.trim() || !passInput.value) {
        return showError('Completá el correo y la contraseña.');
      }
      busy(true);
      Bytes.auth.signIn(emailInput.value, passInput.value)
        .then(function () {
          passInput.value = '';   // no dejar la contraseña en el DOM
        })
        .catch(function (err) { showError(err.message); })
        .then(function () { busy(false); });
    });

    /**
     * @param {Object} session  estado de Bytes.auth
     */
    function render(session) {
      var visible = !session.user;
      el.classList.toggle('is-hidden', !visible);
      if (!visible) return;

      // Si el SDK no cargó no se puede validar la sesión: se explica por qué.
      if (session.error) {
        showError('No se puede verificar el acceso: ' + session.error);
        busy(true, 'Sin conexión');
        hint.textContent = 'Revisá la conexión y recargá la página.';
        return;
      }
      busy(false);
      hint.textContent = 'Si no tenés cuenta, pedila a quien administra el sistema.';
      if (!session.ready) {
        hint.textContent = 'Verificando la sesión…';
        busy(true, 'Verificando…');
      }
    }

    return { el: el, render: render, focus: function () { emailInput.focus(); } };
  }

  Bytes.LoginGate = { create: create };
})(window.Bytes);
