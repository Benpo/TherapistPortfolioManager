/**
 * license.js — Sessions Garden license key activation and validation
 *
 * Handles first-time activation via Lemon Squeezy License API (requires internet),
 * then stores credentials in localStorage for offline daily use.
 *
 * IMPORTANT: After activation, the app does NOT need internet to check the license.
 * The isLicensed() function is purely a localStorage check — no API call needed daily.
 */

// ---------------------------------------------------------------------------
// Product constants
// TODO: Replace with actual values from Lemon Squeezy dashboard after product creation
// Find these at: https://app.lemonsqueezy.com/products → select product → Overview
// ---------------------------------------------------------------------------
const STORE_ID = 0;   // TODO: e.g. 12345 — your Lemon Squeezy store numeric ID
const PRODUCT_ID = 0; // TODO: e.g. 67890 — your Sessions Garden product numeric ID

// ---------------------------------------------------------------------------
// i18n strings for the license page (4 languages)
// ---------------------------------------------------------------------------
const LICENSE_I18N = {
  en: {
    title: 'Activate Sessions Garden',
    subtitle: 'Enter your license key to unlock the app.',
    keyLabel: 'License Key',
    keyPlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    activateBtn: 'Activate',
    activatingBtn: 'Activating…',
    purchaseText: "Don't have a license key?",
    purchaseLink: 'Purchase Sessions Garden',
    successMsg: 'License activated successfully! Taking you to the app…',
    reactivateMsg: 'Your license needs to be re-activated. Please connect to the internet and click Activate.',
    errorNetwork: 'Activation requires an internet connection. Please connect and try again.',
    errorInvalid: 'Invalid license key. Please check your key and try again.',
    errorCrossProduct: 'This license key is not valid for Sessions Garden.',
    errorDeviceLimit: 'You have reached the device limit for this license. Contact contact@sessionsgarden.app to deactivate an existing device.',
    errorGeneric: 'Activation failed. Please try again.',
  },
  he: {
    title: 'הפעלת Sessions Garden',
    subtitle: 'הזן את מפתח הרישיון שלך כדי לפתוח את האפליקציה.',
    keyLabel: 'מפתח רישיון',
    keyPlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    activateBtn: 'הפעל',
    activatingBtn: 'מפעיל…',
    purchaseText: 'אין לך מפתח רישיון?',
    purchaseLink: 'רכוש את Sessions Garden',
    successMsg: 'הרישיון הופעל בהצלחה! מועבר לאפליקציה…',
    reactivateMsg: 'הרישיון שלך צריך הפעלה מחדש. התחבר לאינטרנט ולחץ על הפעל.',
    errorNetwork: 'ההפעלה דורשת חיבור לאינטרנט. התחבר ונסה שוב.',
    errorInvalid: 'מפתח רישיון שגוי. בדוק את המפתח ונסה שוב.',
    errorCrossProduct: 'מפתח רישיון זה אינו תקף עבור Sessions Garden.',
    errorDeviceLimit: 'הגעת למגבלת המכשירים עבור רישיון זה. צור קשר עם contact@sessionsgarden.app להסרת מכשיר קיים.',
    errorGeneric: 'ההפעלה נכשלה. נסה שוב.',
  },
  de: {
    title: 'Sessions Garden aktivieren',
    subtitle: 'Gib deinen Lizenzschlüssel ein, um die App freizuschalten.',
    keyLabel: 'Lizenzschlüssel',
    keyPlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    activateBtn: 'Aktivieren',
    activatingBtn: 'Aktiviere…',
    purchaseText: 'Du hast keinen Lizenzschlüssel?',
    purchaseLink: 'Sessions Garden kaufen',
    successMsg: 'Lizenz erfolgreich aktiviert! Weiterleitung zur App…',
    reactivateMsg: 'Deine Lizenz muss erneut aktiviert werden. Bitte verbinde dich mit dem Internet und klicke auf Aktivieren.',
    errorNetwork: 'Für die Aktivierung ist eine Internetverbindung erforderlich. Bitte verbinde dich und versuche es erneut.',
    errorInvalid: 'Ungültiger Lizenzschlüssel. Bitte überprüfe den Schlüssel und versuche es erneut.',
    errorCrossProduct: 'Dieser Lizenzschlüssel ist nicht für Sessions Garden gültig.',
    errorDeviceLimit: 'Du hast das Gerätelimit für diese Lizenz erreicht. Kontaktiere contact@sessionsgarden.app, um ein vorhandenes Gerät zu deaktivieren.',
    errorGeneric: 'Aktivierung fehlgeschlagen. Bitte versuche es erneut.',
  },
  cs: {
    title: 'Aktivovat Sessions Garden',
    subtitle: 'Zadej svůj licenční klíč pro odemknutí aplikace.',
    keyLabel: 'Licenční klíč',
    keyPlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    activateBtn: 'Aktivovat',
    activatingBtn: 'Aktivuji…',
    purchaseText: 'Nemáš licenční klíč?',
    purchaseLink: 'Zakoupit Sessions Garden',
    successMsg: 'Licence úspěšně aktivována! Přesměrování do aplikace…',
    reactivateMsg: 'Tvoje licence musí být znovu aktivována. Připoj se k internetu a klikni na Aktivovat.',
    errorNetwork: 'Aktivace vyžaduje připojení k internetu. Připoj se a zkus to znovu.',
    errorInvalid: 'Neplatný licenční klíč. Zkontroluj klíč a zkus to znovu.',
    errorCrossProduct: 'Tento licenční klíč není platný pro Sessions Garden.',
    errorDeviceLimit: 'Dosáhl/a jsi limitu zařízení pro tuto licenci. Kontaktuj contact@sessionsgarden.app pro deaktivaci stávajícího zařízení.',
    errorGeneric: 'Aktivace se nezdařila. Zkus to znovu.',
  }
};

// ---------------------------------------------------------------------------
// Language detection (reuse stored preference from terms acceptance)
// ---------------------------------------------------------------------------
function getLicenseLang() {
  try {
    var stored = localStorage.getItem('portfolioTermsLang') || localStorage.getItem('portfolioLang');
    if (stored && LICENSE_I18N[stored]) return stored;
    var nav = (navigator.language || '').toLowerCase().slice(0, 2);
    if (LICENSE_I18N[nav]) return nav;
  } catch (e) { /* ignore */ }
  return 'en';
}

// ---------------------------------------------------------------------------
// Offline daily validation — no internet required after first activation
// ---------------------------------------------------------------------------
function isLicensed() {
  try {
    return localStorage.getItem('portfolioLicenseActivated') === '1' &&
           !!localStorage.getItem('portfolioLicenseInstance');
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Classify Lemon Squeezy error messages into user-friendly categories
// ---------------------------------------------------------------------------
function classifyLSError(errorMsg, strings) {
  if (!errorMsg) return strings.errorGeneric;
  var lower = errorMsg.toLowerCase();
  if (lower.includes('activation limit') || lower.includes('too many activations')) {
    return strings.errorDeviceLimit;
  }
  if (lower.includes('not found') || lower.includes('does not exist') || lower.includes('invalid')) {
    return strings.errorInvalid;
  }
  return strings.errorInvalid; // default: assume invalid key for unknown LS errors
}

// ---------------------------------------------------------------------------
// Core activation function — calls Lemon Squeezy License API
// ---------------------------------------------------------------------------
async function activateLicenseKey(key) {
  const instanceName = 'sessions-garden-' + Date.now();

  let resp;
  try {
    resp = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        license_key: key,
        instance_name: instanceName
      })
    });
  } catch (networkErr) {
    throw { type: 'network', message: networkErr.message };
  }

  let data;
  try {
    data = await resp.json();
  } catch (parseErr) {
    throw { type: 'generic', message: 'Invalid response from server' };
  }

  if (!data.activated) {
    // Check for device limit error from Lemon Squeezy
    var errMsg = data.error || '';
    if (errMsg.toLowerCase().includes('activation limit') || errMsg.toLowerCase().includes('too many')) {
      throw { type: 'deviceLimit', message: errMsg };
    }
    throw { type: 'invalid', message: errMsg };
  }

  // Verify this key belongs to Sessions Garden (skip if constants are 0 — development mode)
  if (STORE_ID !== 0 && PRODUCT_ID !== 0) {
    if (data.meta.store_id !== STORE_ID || data.meta.product_id !== PRODUCT_ID) {
      throw { type: 'crossProduct', message: 'License key does not belong to Sessions Garden' };
    }
  }

  // Store credentials for offline daily use
  localStorage.setItem('portfolioLicenseKey', key);
  localStorage.setItem('portfolioLicenseInstance', data.instance.id);
  localStorage.setItem('portfolioLicenseActivated', '1');

  return data;
}

// ---------------------------------------------------------------------------
// Page initialization — runs on DOMContentLoaded
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  var lang = getLicenseLang();
  var strings = LICENSE_I18N[lang] || LICENSE_I18N.en;
  var isRTL = lang === 'he';

  // Apply RTL direction for Hebrew
  if (isRTL) {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'he');
  } else {
    document.documentElement.removeAttribute('dir');
    document.documentElement.setAttribute('lang', lang);
  }

  // Populate i18n strings
  var el = function (id) { return document.getElementById(id); };
  el('license-title').textContent = strings.title;
  el('license-subtitle').textContent = strings.subtitle;
  el('license-key-label').textContent = strings.keyLabel;
  el('license-key-input').placeholder = strings.keyPlaceholder;
  el('license-activate-btn').textContent = strings.activateBtn;
  el('license-purchase-text').textContent = strings.purchaseText;
  el('license-purchase-link').textContent = strings.purchaseLink;

  // Check for re-activation scenario: key stored but not activated
  var storedKey = '';
  try {
    storedKey = localStorage.getItem('portfolioLicenseKey') || '';
  } catch (e) { /* ignore */ }

  if (storedKey && !isLicensed()) {
    el('license-key-input').value = storedKey;
    showMessage(strings.reactivateMsg, false);
  }

  // Activate button click handler
  el('license-activate-btn').addEventListener('click', handleActivate);

  // Allow Enter key submission
  el('license-key-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleActivate();
  });

  async function handleActivate() {
    var key = el('license-key-input').value.trim();
    if (!key) return;

    // Loading state
    var btn = el('license-activate-btn');
    btn.disabled = true;
    btn.textContent = strings.activatingBtn;
    clearMessage();

    try {
      await activateLicenseKey(key);

      // Success — show message and redirect
      showMessage(strings.successMsg, false);

      // Redirect to ?next param or default to index.html
      var params = new URLSearchParams(window.location.search);
      var next = params.get('next');
      var destination = (next && next.startsWith('/')) ? next : './index.html';

      setTimeout(function () {
        window.location.replace(destination);
      }, 1200);

    } catch (err) {
      // Map error type to user-friendly message
      var msg;
      if (err.type === 'network') {
        msg = strings.errorNetwork;
      } else if (err.type === 'crossProduct') {
        msg = strings.errorCrossProduct;
      } else if (err.type === 'deviceLimit') {
        msg = strings.errorDeviceLimit;
      } else if (err.type === 'invalid') {
        msg = strings.errorInvalid;
      } else {
        msg = strings.errorGeneric;
      }
      showMessage(msg, true);

      // Re-enable button
      btn.disabled = false;
      btn.textContent = strings.activateBtn;
    }
  }

  function showMessage(msg, isError) {
    var msgEl = el('license-message');
    msgEl.textContent = msg;
    msgEl.className = 'license-message' + (isError ? ' license-message--error' : ' license-message--success');
    msgEl.removeAttribute('hidden');
  }

  function clearMessage() {
    var msgEl = el('license-message');
    msgEl.textContent = '';
    msgEl.setAttribute('hidden', '');
  }
});
