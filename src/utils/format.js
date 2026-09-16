/* ==========================================================================
   src/utils/format.js
   Normalización de datos y construcción de enlaces de contacto.
   ========================================================================== */
window.Bytes = window.Bytes || {};

(function (Bytes) {
  'use strict';

  /** Inicial(es) para el avatar del lead. */
  function initials(name) {
    return String(name || '')
      .replace(/[^\p{L}\p{N} ]/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (w) { return w[0].toUpperCase(); })
      .join('') || '?';
  }

  /** Deja solo dígitos: formato requerido por wa.me. */
  function digitsOnly(phone) { return String(phone || '').replace(/\D/g, ''); }

  /**
   * Mensaje con el que se abre la conversación de WhatsApp.
   * Si la investigación trajo un mensaje redactado para ese prospecto se usa
   * ese; si no, el genérico del sistema: "Hola! Hablo con [negocio]".
   */
  function waMessage(lead) {
    if (lead.message) return lead.message;
    return 'Hola! Hablo con ' + lead.name;
  }
  function waLink(lead) {
    var phone = digitsOnly(lead.phone);
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(waMessage(lead));
  }

  /** Enlace a Google Maps: usa la URL guardada o construye una búsqueda. */
  function mapsLink(lead) {
    if (lead.mapsUrl) return lead.mapsUrl;
    var query = [lead.name, lead.address, lead.city].filter(Boolean).join(', ');
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  }

  /** Enlace a Instagram desde un handle (@bytes.tech) o una URL completa. */
  function instagramLink(lead) {
    if (!lead.instagram) return null;
    if (/^https?:\/\//i.test(lead.instagram)) return lead.instagram;
    return 'https://instagram.com/' + String(lead.instagram).replace(/^@/, '');
  }

  /** Enlace al sitio web, o `null` si el lead no tiene página. */
  function websiteLink(lead) {
    if (!lead.website) return null;
    return /^https?:\/\//i.test(lead.website) ? lead.website : 'https://' + lead.website;
  }

  /** Dominio legible para mostrar bajo el botón "Sitio Web". */
  function prettyDomain(url) {
    return String(url || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  }

  /**
   * Handle legible de Instagram. Algunos registros del origen traen una ruta
   * (ej. `p/Ch3AB6rp0MY`, un post) en vez de un usuario: en ese caso se
   * muestra tal cual, sin el arroba.
   */
  function prettyHandle(instagram) {
    if (!instagram) return '';
    var raw = String(instagram).replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
    if (raw.indexOf('/') !== -1) return raw;
    return '@' + raw.replace(/^@/, '');
  }

  /** Fecha corta local (dd/mm/aaaa) a partir de un ISO. */
  function shortDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /** "hace 3 días" — contexto rápido de antigüedad del contacto. */
  function relativeDate(iso) {
    if (!iso) return 'sin actividad';
    var then = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
    if (isNaN(then)) return 'sin actividad';
    var days = Math.round((Date.now() - then.getTime()) / 86400000);
    if (days <= 0) return 'hoy';
    if (days === 1) return 'ayer';
    if (days < 30) return 'hace ' + days + ' días';
    var months = Math.round(days / 30);
    return 'hace ' + months + (months === 1 ? ' mes' : ' meses');
  }

  /** Porcentaje entero seguro (evita división por cero). */
  function percent(part, total) { return total > 0 ? Math.round((part / total) * 100) : 0; }

  /** Normaliza texto para búsquedas (sin acentos, minúsculas). */
  function normalize(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  Bytes.format = {
    initials: initials,
    digitsOnly: digitsOnly,
    waMessage: waMessage,
    waLink: waLink,
    mapsLink: mapsLink,
    instagramLink: instagramLink,
    websiteLink: websiteLink,
    prettyDomain: prettyDomain,
    prettyHandle: prettyHandle,
    shortDate: shortDate,
    relativeDate: relativeDate,
    percent: percent,
    normalize: normalize
  };
})(window.Bytes);
