/**
 * tests/_helpers/base64-codec.js
 *
 * Phase 30 Plan 07 (Task 0 / G2) — a faithful, Buffer-backed base64 + Blob +
 * FileReader codec for the deterministic vm-sandbox option of the GAP-09 photo
 * optimize loop (settings.js:2451-2468 dataURLToBlob / blobToDataURL).
 *
 * NOTE: GAP-09 may alternatively run under real-page jsdom, which supplies
 * atob/btoa/Blob/FileReader natively. This module is the deterministic
 * vm-sandbox option — inject these onto the sandbox/window before evaling the
 * code under test:
 *
 *   const codec = require('./_helpers/base64-codec');
 *   sandbox.atob = codec.atob;
 *   sandbox.btoa = codec.btoa;
 *   sandbox.Blob = codec.Blob;
 *   sandbox.FileReader = codec.FileReader;
 *
 * The contract that matters: a round-trip
 *   blob(bytes) → readAsDataURL → dataURL → atob → bytes
 * preserves the EXACT byte length and content — readAsDataURL emits a REAL
 * base64 data URL computed from the blob's bytes, NOT a constant. That is the
 * property the GAP-09 mutation-kill asserts.
 */

'use strict';

// atob: base64 string → binary ("latin1") string, one char per byte (0-255).
function atob(b64) {
  return Buffer.from(String(b64), 'base64').toString('latin1');
}

// btoa: binary ("latin1") string → base64 string.
function btoa(bin) {
  return Buffer.from(String(bin), 'latin1').toString('base64');
}

// Normalize one Blob part into a Node Buffer of its raw bytes.
function partToBuffer(part) {
  if (part == null) return Buffer.alloc(0);
  if (Buffer.isBuffer(part)) return part;
  if (part instanceof Blob) return part._bytes;
  if (typeof part === 'string') return Buffer.from(part, 'utf8');
  if (part instanceof ArrayBuffer) return Buffer.from(new Uint8Array(part));
  if (ArrayBuffer.isView(part)) {
    // Uint8Array / typed array / DataView — copy the exact view window.
    return Buffer.from(part.buffer, part.byteOffset, part.byteLength);
  }
  // Fallback: stringify.
  return Buffer.from(String(part), 'utf8');
}

// Minimal Blob: `size` = total byteLength of its parts; `type` from options.
function Blob(parts, options) {
  if (!(this instanceof Blob)) { return new Blob(parts, options); }
  var buffers = (parts || []).map(partToBuffer);
  this._bytes = Buffer.concat(buffers);
  this.size = this._bytes.length;
  this.type = (options && options.type) || '';
}
Blob.prototype.arrayBuffer = function () {
  var bytes = this._bytes;
  return Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
};

// Minimal FileReader: readAsDataURL emits a REAL base64 data URL from the blob
// bytes. Mirrors the browser contract: async, fires onload with `result` set,
// also supports addEventListener('load'/'error').
function FileReader() {
  this.result = null;
  this.error = null;
  this.onload = null;
  this.onerror = null;
  this._listeners = { load: [], error: [] };
}
FileReader.prototype.addEventListener = function (type, fn) {
  if (this._listeners[type]) { this._listeners[type].push(fn); }
};
FileReader.prototype._fire = function (type) {
  var self = this;
  var ev = { target: self };
  if (type === 'load' && typeof self.onload === 'function') { self.onload(ev); }
  if (type === 'error' && typeof self.onerror === 'function') { self.onerror(ev); }
  (self._listeners[type] || []).forEach(function (fn) { fn(ev); });
};
FileReader.prototype.readAsDataURL = function (blob) {
  var self = this;
  setTimeout(function () {
    try {
      var bytes = (blob && blob._bytes) || partToBuffer(blob);
      var type = (blob && blob.type) || '';
      self.result = 'data:' + type + ';base64,' + bytes.toString('base64');
      self._fire('load');
    } catch (err) {
      self.error = err;
      self._fire('error');
    }
  }, 0);
};

module.exports = {
  atob: atob,
  btoa: btoa,
  Blob: Blob,
  FileReader: FileReader,
};
