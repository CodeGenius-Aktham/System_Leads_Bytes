/* ==========================================================================
   src/utils/dom.js
   Micro-helpers de DOM. Evitamos frameworks: el prototipo se abre con doble
   clic (sin build, sin servidor). Los módulos se registran en `window.Bytes`.
   ========================================================================== */
window.Bytes = window.Bytes || {};

(function (Bytes) {
  'use strict';

  /** Namespace SVG para crear iconos inline. */
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /**
   * Hyperscript minimalista.
   * @param {string} tag            etiqueta ('div', 'button', ...)
   * @param {Object} [props]        atributos; claves especiales: class, text,
   *                                html, dataset, on (mapa de listeners), attrs
   * @param {...(Node|string|Array)} children
   * @returns {HTMLElement}
   */
  function h(tag, props, children) {
    var el = document.createElement(tag);
    props = props || {};

    Object.keys(props).forEach(function (key) {
      var value = props[key];
      if (value === null || value === undefined || value === false) return;

      if (key === 'class' || key === 'className') {
        el.className = value;
      } else if (key === 'text') {
        el.textContent = String(value);
      } else if (key === 'html') {
        el.innerHTML = value;
      } else if (key === 'dataset') {
        Object.keys(value).forEach(function (dataKey) {
          if (value[dataKey] === null || value[dataKey] === undefined) return;
          el.dataset[dataKey] = String(value[dataKey]);
        });
      } else if (key === 'style' && typeof value === 'object') {
        Object.keys(value).forEach(function (cssKey) { el.style[cssKey] = value[cssKey]; });
      } else if (key === 'on') {
        Object.keys(value).forEach(function (evt) { el.addEventListener(evt, value[evt]); });
      } else {
        el.setAttribute(key, value === true ? '' : String(value));
      }
    });

    appendAll(el, Array.prototype.slice.call(arguments, 2));
    return el;
  }

  function appendAll(parent, items) {
    items.forEach(function (item) {
      if (item === null || item === undefined || item === false) return;
      if (Array.isArray(item)) return appendAll(parent, item);
      parent.appendChild(item instanceof Node ? item : document.createTextNode(String(item)));
    });
  }

  /**
   * Crea un icono SVG a partir de un path (set propio, estilo line-icons 24x24).
   * @param {string} name  clave del set `ICONS`
   * @param {string} [extraClass]
   */
  function icon(name, extraClass) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'icon' + (extraClass ? ' ' + extraClass : ''));
    var def = ICONS[name] || ICONS.dot;
    if (def.fill) svg.classList.add('icon--fill');
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', def.d);
    svg.appendChild(path);
    return svg;
  }

  var ICONS = {
    folder:   { d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    folderOpen:{ d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 1.9-1.37L22.5 11H6.3a2 2 0 0 0-1.9 1.37z' },
    users:    { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
    phone:    { d: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.8a2 2 0 0 1 1.7 2z' },
    whatsapp: { fill: true, d: 'M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.97L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91A9.85 9.85 0 0 0 12.04 2m5.8 14.17c-.25.7-1.44 1.33-1.98 1.38-.55.05-1.06.25-3.56-.73-3.02-1.19-4.92-4.3-5.07-4.5-.15-.2-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.46.27-.3.58-.37.78-.37.2 0 .4 0 .58.01.19.01.44-.07.68.52.25.6.85 2.06.92 2.21.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.38-.44.51-.15.15-.3.31-.13.61.17.3.76 1.25 1.62 2.03 1.11 1 2.04 1.3 2.34 1.45.3.15.47.13.65-.08.17-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.72.81 2.02.96.3.15.5.22.57.35.08.12.08.72-.17 1.42' },
    mapPin:   { d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6' },
    instagram:{ d: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5m9.5 3.5h.01M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8' },
    globe:    { d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18' },
    globeOff: { d: 'M3 3l18 18M12 21a9 9 0 0 0 8.2-12.7M5.3 5.3A9 9 0 0 0 12 21M3.5 12h8M12 3a15 15 0 0 1 3.7 7' },
    copy:     { d: 'M9 9h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' },
    check:    { d: 'M20 6L9 17l-5-5' },
    chevron:  { d: 'M9 18l6-6-6-6' },
    arrowLeft:{ d: 'M19 12H5M12 19l-7-7 7-7' },
    search:   { d: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.35-4.35' },
    grid:     { d: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
    inbox:    { d: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11' },
    reset:    { d: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5' },
    dot:      { d: 'M12 12h.01' },
    trending: { d: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6' },
    clock:    { d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2' },
    award:    { d: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12M8.2 13.9L7 22l5-3 5 3-1.2-8.1' },
    x:        { d: 'M18 6L6 18M6 6l12 12' },
    logout:   { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9' },
    lock:     { d: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2M8 11V7a4 4 0 0 1 8 0v4' }
  };

  /** Vacía un contenedor. */
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  /** Reemplaza el contenido de un contenedor por los nodos dados. */
  function mount(container, nodes) {
    clear(container);
    appendAll(container, Array.isArray(nodes) ? nodes : [nodes]);
    return container;
  }

  /** Delegación de eventos: dispara handler con el ancestro que matchea. */
  function delegate(root, eventName, selector, handler) {
    root.addEventListener(eventName, function (ev) {
      var target = ev.target.closest(selector);
      if (target && root.contains(target)) handler(ev, target);
    });
  }

  /** Toast efímero de feedback. */
  function toast(message, iconName) {
    var stack = document.getElementById('toast-stack');
    if (!stack) return;
    var node = h('div', { class: 'toast', role: 'status' }, icon(iconName || 'check'), h('span', { text: message }));
    stack.appendChild(node);
    setTimeout(function () {
      node.classList.add('is-out');
      setTimeout(function () { node.remove(); }, 200);
    }, 2200);
  }

  Bytes.dom = { h: h, icon: icon, ICONS: ICONS, clear: clear, mount: mount, delegate: delegate, toast: toast };
})(window.Bytes);
