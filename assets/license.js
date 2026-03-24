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
// Product constants (Sessions Garden @ Lemon Squeezy)
// ---------------------------------------------------------------------------
const STORE_ID = 324581;
const PRODUCT_ID = 915325;

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
    errorDeviceLimit: "You've reached the device limit. Deactivate a device from within the app on that device, or contact contact@sessionsgarden.app if you no longer have access to it.",
    errorGeneric: 'Activation failed. Please try again.',
    statusLicensed: 'Licensed',
    displayLabel: 'License Key',
    deactivateBtn: 'Deactivate This Device',
    deactivatingBtn: 'Deactivating...',
    deactivateInfo: 'Frees one of your 2 device slots.',
    deactivateConfirmTitle: 'Deactivate License?',
    deactivateConfirmMsg: "You will need to re-activate with an internet connection. This frees up one of your 2 device slots.",
    deactivateConfirmYes: 'Yes, Deactivate',
    deactivateConfirmNo: 'Cancel',
    deactivateSuccess: 'License deactivated. You can re-activate anytime.',
    deactivateErrorNetwork: 'Deactivation requires an internet connection. Please connect and try again.',
    deactivateErrorGeneric: 'Deactivation failed. Please try again.',
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
    errorDeviceLimit: 'הגעת למגבלת המכשירים. בטל הפעלה ממכשיר אחר מתוך האפליקציה באותו מכשיר, או פנה אל contact@sessionsgarden.app אם אין לך גישה אליו.',
    errorGeneric: 'ההפעלה נכשלה. נסה שוב.',
    statusLicensed: 'מורשה',
    displayLabel: 'מפתח רישיון',
    deactivateBtn: 'בטל הפעלה במכשיר זה',
    deactivatingBtn: 'מבטל...',
    deactivateInfo: 'משחרר מקום מתוך 2 המכשירים המורשים.',
    deactivateConfirmTitle: 'לבטל את הרישיון?',
    deactivateConfirmMsg: 'נדרשת הפעלה מחדש עם חיבור לאינטרנט. פעולה זו משחררת מקום מתוך 2 המכשירים המורשים.',
    deactivateConfirmYes: 'כן, בטל',
    deactivateConfirmNo: 'ביטול',
    deactivateSuccess: 'הרישיון בוטל. ניתן להפעיל מחדש בכל עת.',
    deactivateErrorNetwork: 'ביטול ההפעלה דורש חיבור לאינטרנט. התחבר ונסה שוב.',
    deactivateErrorGeneric: 'ביטול ההפעלה נכשל. נסה שוב.',
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
    errorDeviceLimit: 'Du hast das Gerätelimit erreicht. Deaktiviere ein Gerät direkt in der App auf diesem Gerät oder kontaktiere contact@sessionsgarden.app, falls du keinen Zugang mehr hast.',
    errorGeneric: 'Aktivierung fehlgeschlagen. Bitte versuche es erneut.',
    statusLicensed: 'Lizenziert',
    displayLabel: 'Lizenzschlüssel',
    deactivateBtn: 'Dieses Gerät deaktivieren',
    deactivatingBtn: 'Deaktiviere...',
    deactivateInfo: 'Gibt eine deiner 2 Geräte-Aktivierungen frei.',
    deactivateConfirmTitle: 'Lizenz deaktivieren?',
    deactivateConfirmMsg: 'Du musst das Gerät anschließend mit einer Internetverbindung erneut aktivieren. Dadurch wird eine deiner 2 Geräte-Aktivierungen freigegeben.',
    deactivateConfirmYes: 'Ja, deaktivieren',
    deactivateConfirmNo: 'Abbrechen',
    deactivateSuccess: 'Lizenz deaktiviert. Du kannst jederzeit erneut aktivieren.',
    deactivateErrorNetwork: 'Deaktivierung erfordert eine Internetverbindung. Bitte verbinde dich und versuche es erneut.',
    deactivateErrorGeneric: 'Deaktivierung fehlgeschlagen. Bitte versuche es erneut.',
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
    errorDeviceLimit: 'Dosáhl/a jsi limitu zařízení. Deaktivuj zařízení přímo v aplikaci na daném zařízení nebo kontaktuj contact@sessionsgarden.app, pokud k němu už nemáš přístup.',
    errorGeneric: 'Aktivace se nezdařila. Zkus to znovu.',
    statusLicensed: 'Licencováno',
    displayLabel: 'Licenční klíč',
    deactivateBtn: 'Deaktivovat toto zařízení',
    deactivatingBtn: 'Deaktivu ji...',
    deactivateInfo: 'Uvolní jedno z tvých 2 míst pro zařízení.',
    deactivateConfirmTitle: 'Deaktivovat licenci?',
    deactivateConfirmMsg: 'Budeš muset znovu aktivovat s připojením k internetu. Uvolní jedno z tvých 2 míst pro zařízení.',
    deactivateConfirmYes: 'Ano, deaktivovat',
    deactivateConfirmNo: 'Zrušit',
    deactivateSuccess: 'Licence deaktivována. Můžeš kdykoli znovu aktivovat.',
    deactivateErrorNetwork: 'Deaktivace vyžaduje připojení k internetu. Připoj se a zkus to znovu.',
    deactivateErrorGeneric: 'Deaktivace se nezdařila. Zkus to znovu.',
  }
};

// ---------------------------------------------------------------------------
// Base64 encoding helpers — cosmetic obfuscation of license credentials
// in localStorage (DEBT-01). Prevents casual DevTools inspection.
// Real security is Lemon Squeezy's 2-device activation limit.
// ---------------------------------------------------------------------------
function encodeLicenseValue(val) {
  try { return btoa(val); } catch (e) { return val; }
}

function decodeLicenseValue(encoded) {
  try { return atob(encoded); } catch (e) { return encoded; }
}

// ---------------------------------------------------------------------------
// Language detection (reuse stored preference from terms acceptance)
// ---------------------------------------------------------------------------
function getLicenseLang() {
  try {
    var params = new URLSearchParams(window.location.search);
    var urlLang = params.get('lang');
    if (urlLang && LICENSE_I18N[urlLang]) return urlLang;
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
           !!decodeLicenseValue(localStorage.getItem('portfolioLicenseInstance') || '');
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

  // Store credentials for offline daily use (Base64-encoded for cosmetic obfuscation)
  localStorage.setItem('portfolioLicenseKey', encodeLicenseValue(key));
  localStorage.setItem('portfolioLicenseInstance', encodeLicenseValue(data.instance.id));
  localStorage.setItem('portfolioLicenseActivated', '1');

  return data;
}

// ---------------------------------------------------------------------------
// Deactivation function — calls Lemon Squeezy License API
// ---------------------------------------------------------------------------
async function deactivateLicenseKey(key, instanceId) {
  let resp;
  try {
    resp = await fetch('https://api.lemonsqueezy.com/v1/licenses/deactivate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        license_key: key,
        instance_id: instanceId
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

  if (!data.deactivated) {
    throw { type: 'generic', message: data.error || 'Deactivation failed' };
  }

  return data;
}

// ---------------------------------------------------------------------------
// Custom confirmation dialog for deactivation
// (license.html does NOT load app.js — App.confirmDialog unavailable)
// ---------------------------------------------------------------------------
function showDeactivateConfirm(strings) {
  return new Promise(function(resolve) {
    var overlay = document.getElementById('license-confirm-overlay');
    var titleEl = document.getElementById('license-confirm-title');
    var msgEl = document.getElementById('license-confirm-msg');
    var yesBtn = document.getElementById('license-confirm-yes');
    var noBtn = document.getElementById('license-confirm-cancel');

    // Populate with i18n strings
    titleEl.textContent = strings.deactivateConfirmTitle;
    msgEl.textContent = strings.deactivateConfirmMsg;
    yesBtn.textContent = strings.deactivateConfirmYes;
    noBtn.textContent = strings.deactivateConfirmNo;

    // Show overlay
    overlay.removeAttribute('hidden');

    function close(result) {
      overlay.setAttribute('hidden', '');
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      overlay.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    }

    function onYes() { close(true); }
    function onNo() { close(false); }
    function onOverlay(e) { if (e.target === overlay) close(false); }
    function onKey(e) { if (e.key === 'Escape') close(false); }

    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);

    setTimeout(function() { noBtn.focus(); }, 0);
  });
}

// ---------------------------------------------------------------------------
// Page initialization — runs on DOMContentLoaded
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  // One-time migration: encode plain-text keys from pre-v18 installs
  (function migratePlainKeys() {
    try {
      ['portfolioLicenseKey', 'portfolioLicenseInstance'].forEach(function(k) {
        var raw = localStorage.getItem(k);
        if (!raw) return;
        try { atob(raw); } catch (e) {
          // Not valid Base64 — encode it
          localStorage.setItem(k, encodeLicenseValue(raw));
        }
      });
    } catch (e) { /* ignore */ }
  })();

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
    storedKey = decodeLicenseValue(localStorage.getItem('portfolioLicenseKey') || '');
  } catch (e) { /* ignore */ }

  if (storedKey && !isLicensed()) {
    el('license-key-input').value = storedKey;
    showMessage(strings.reactivateMsg, false);
  }

  // Auto-populate ?key= from URL (post-purchase redirect from Lemon Squeezy)
  var keyParams = new URLSearchParams(window.location.search);
  var keyFromUrl = keyParams.get('key');
  if (keyFromUrl && el('license-key-input')) {
    el('license-key-input').value = keyFromUrl.trim();
    // Focus the activate button for one-click activation
    var activateBtn = document.getElementById('activate-btn') || el('license-activate-btn');
    if (activateBtn) activateBtn.focus();
  }

  // Activate button click handler
  el('license-activate-btn').addEventListener('click', handleActivate);

  // Allow Enter key submission
  el('license-key-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleActivate();
  });

  // -------------------------------------------------------------------------
  // Mode switching: show activated view if already licensed
  // -------------------------------------------------------------------------
  var activatedView = document.getElementById('license-activated-view');

  // Elements to hide/show for mode switching
  var formElements = [
    document.querySelector('.license-heading'),
    document.querySelector('.license-form'),
    document.querySelector('.license-purchase')
  ];

  function showActivatedMode() {
    // Hide activation form elements
    formElements.forEach(function(e) { if (e) e.setAttribute('hidden', ''); });
    // Show activated view
    activatedView.removeAttribute('hidden');
    // Populate activated view strings
    document.getElementById('license-status-text').textContent = strings.statusLicensed;
    document.getElementById('license-display-label').textContent = strings.displayLabel;
    document.getElementById('license-deactivate-btn').textContent = strings.deactivateBtn;
    document.getElementById('license-deactivate-info').textContent = strings.deactivateInfo;
    // Mask the key: show first 4 and last 4 chars
    var fullKey = decodeLicenseValue(localStorage.getItem('portfolioLicenseKey') || '');
    var masked = fullKey.length > 8
      ? fullKey.slice(0, 4) + '-....-' + fullKey.slice(-4)
      : fullKey;
    document.getElementById('license-masked-key').textContent = masked;
  }

  function showActivationMode() {
    // Show activation form elements
    formElements.forEach(function(e) { if (e) e.removeAttribute('hidden'); });
    // Hide activated view
    activatedView.setAttribute('hidden', '');
  }

  if (isLicensed()) {
    showActivatedMode();
  }

  // Deactivate button handler — uses custom styled dialog per D-18 (bold red warning text)
  document.getElementById('license-deactivate-btn').addEventListener('click', async function() {
    var confirmed = await showDeactivateConfirm(strings);
    if (!confirmed) return;

    var btn = document.getElementById('license-deactivate-btn');
    btn.disabled = true;
    btn.textContent = strings.deactivatingBtn;
    clearMessage();

    try {
      var key = decodeLicenseValue(localStorage.getItem('portfolioLicenseKey') || '');
      var instanceId = decodeLicenseValue(localStorage.getItem('portfolioLicenseInstance') || '');

      await deactivateLicenseKey(key, instanceId);

      // Per D-19: Clear localStorage keys, drop back to Mode A
      localStorage.removeItem('portfolioLicenseKey');
      localStorage.removeItem('portfolioLicenseInstance');
      localStorage.removeItem('portfolioLicenseActivated');

      showMessage(strings.deactivateSuccess, false);
      showActivationMode();
    } catch (err) {
      var msg = err.type === 'network'
        ? strings.deactivateErrorNetwork
        : strings.deactivateErrorGeneric;
      showMessage(msg, true);
      // Per D-19: offline attempt shows error, does NOT clear local state
      btn.disabled = false;
      btn.textContent = strings.deactivateBtn;
    }
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
