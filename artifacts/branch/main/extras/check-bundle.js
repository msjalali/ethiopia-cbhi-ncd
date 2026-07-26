import * as worker_threads from "worker_threads";
import { EventEmitter } from "events";
import { cpus } from "os";
import * as path from "path";
import { fileURLToPath } from "url";
let __non_webpack_require__ = () => worker_threads;
const DefaultErrorSerializer = {
  deserialize(t) {
    return Object.assign(Error(t.message), {
      name: t.name,
      stack: t.stack
    });
  },
  serialize(t) {
    return {
      __error_marker: "$$error",
      message: t.message,
      name: t.name,
      stack: t.stack
    };
  }
}, isSerializedError = (t) => t && typeof t == "object" && "__error_marker" in t && t.__error_marker === "$$error", DefaultSerializer = {
  deserialize(t) {
    return isSerializedError(t) ? DefaultErrorSerializer.deserialize(t) : t;
  },
  serialize(t) {
    return t instanceof Error ? DefaultErrorSerializer.serialize(t) : t;
  }
};
let registeredSerializer = DefaultSerializer;
function deserialize(t) {
  return registeredSerializer.deserialize(t);
}
function serialize(t) {
  return registeredSerializer.serialize(t);
}
let bundleURL;
function getBundleURLCached() {
  return bundleURL || (bundleURL = getBundleURL()), bundleURL;
}
function getBundleURL() {
  try {
    throw new Error();
  } catch (t) {
    const e = ("" + t.stack).match(/(https?|file|ftp|chrome-extension|moz-extension):\/\/[^)\n]+/g);
    if (e)
      return getBaseURL(e[0]);
  }
  return "/";
}
function getBaseURL(t) {
  return ("" + t).replace(/^((?:https?|file|ftp|chrome-extension|moz-extension):\/\/.+)?\/[^/]+(?:\?.*)?$/, "$1") + "/";
}
const isAbsoluteURL = (t) => /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(t);
function createSourceBlobURL(t) {
  const e = new Blob([t], { type: "application/javascript" });
  return URL.createObjectURL(e);
}
function selectWorkerImplementation$1() {
  if (typeof Worker > "u")
    return class {
      constructor() {
        throw Error("No web worker implementation available. You might have tried to spawn a worker within a worker in a browser that doesn't support workers in workers.");
      }
    };
  class t extends Worker {
    constructor(r, i) {
      var a, s;
      typeof r == "string" && i && i._baseURL ? r = new URL(r, i._baseURL) : typeof r == "string" && !isAbsoluteURL(r) && getBundleURLCached().match(/^file:\/\//i) && (r = new URL(r, getBundleURLCached().replace(/\/[^\/]+$/, "/")), (!((a = i?.CORSWorkaround) !== null && a !== void 0) || a) && (r = createSourceBlobURL(`importScripts(${JSON.stringify(r)});`))), typeof r == "string" && isAbsoluteURL(r) && (!((s = i?.CORSWorkaround) !== null && s !== void 0) || s) && (r = createSourceBlobURL(`importScripts(${JSON.stringify(r)});`)), super(r, i);
    }
  }
  class e extends t {
    constructor(r, i) {
      const a = window.URL.createObjectURL(r);
      super(a, i);
    }
    static fromText(r, i) {
      const a = new window.Blob([r], { type: "text/javascript" });
      return new e(a, i);
    }
  }
  return {
    blob: e,
    default: t
  };
}
let implementation$3;
function getWorkerImplementation$2() {
  return implementation$3 || (implementation$3 = selectWorkerImplementation$1()), implementation$3;
}
const BrowserImplementation = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getWorkerImplementation: getWorkerImplementation$2
}, Symbol.toStringTag, { value: "Module" })), getCallsites = {};
let tsNodeAvailable;
cpus().length;
function detectTsNode() {
  if (typeof __non_webpack_require__ == "function")
    return !1;
  if (tsNodeAvailable)
    return tsNodeAvailable;
  try {
    eval("require").resolve("ts-node"), tsNodeAvailable = !0;
  } catch (t) {
    if (t && t.code === "MODULE_NOT_FOUND")
      tsNodeAvailable = !1;
    else
      throw t;
  }
  return tsNodeAvailable;
}
function createTsNodeModule(t) {
  return `
    require("ts-node/register/transpile-only");
    require(${JSON.stringify(t)});
  `;
}
function rebaseScriptPath(t, e) {
  const n = getCallsites().find((s) => {
    const _ = s.getFileName();
    return !!(_ && !_.match(e) && !_.match(/[\/\\]master[\/\\]implementation/) && !_.match(/^internal\/process/));
  }), r = n ? n.getFileName() : null;
  let i = r || null;
  return i && i.startsWith("file:") && (i = fileURLToPath(i)), i ? path.join(path.dirname(i), t) : t;
}
function resolveScriptPath(scriptPath, baseURL) {
  const makeRelative = (filePath) => path.isAbsolute(filePath) ? filePath : path.join(baseURL || eval("__dirname"), filePath), workerFilePath = typeof __non_webpack_require__ == "function" ? __non_webpack_require__.resolve(makeRelative(scriptPath)) : eval("require").resolve(makeRelative(rebaseScriptPath(scriptPath, /[\/\\]worker_threads[\/\\]/)));
  return workerFilePath;
}
function initWorkerThreadsWorker() {
  const NativeWorker = typeof __non_webpack_require__ == "function" ? __non_webpack_require__("worker_threads").Worker : eval("require")("worker_threads").Worker;
  let allWorkers = [];
  class Worker extends NativeWorker {
    constructor(e, n) {
      const r = n && n.fromSource ? null : resolveScriptPath(e, (n || {})._baseURL);
      if (r)
        r.match(/\.tsx?$/i) && detectTsNode() ? super(createTsNodeModule(r), Object.assign(Object.assign({}, n), { eval: !0 })) : r.match(/\.asar[\/\\]/) ? super(r.replace(/\.asar([\/\\])/, ".asar.unpacked$1"), n) : super(r, n);
      else {
        const i = e;
        super(i, Object.assign(Object.assign({}, n), { eval: !0 }));
      }
      this.mappedEventListeners = /* @__PURE__ */ new WeakMap(), allWorkers.push(this);
    }
    addEventListener(e, n) {
      const r = (i) => {
        n({ data: i });
      };
      this.mappedEventListeners.set(n, r), this.on(e, r);
    }
    removeEventListener(e, n) {
      const r = this.mappedEventListeners.get(n) || n;
      this.off(e, r);
    }
  }
  const terminateWorkersAndMaster = () => {
    Promise.all(allWorkers.map((t) => t.terminate())).then(() => process.exit(0), () => process.exit(1)), allWorkers = [];
  };
  process.on("SIGINT", () => terminateWorkersAndMaster()), process.on("SIGTERM", () => terminateWorkersAndMaster());
  class BlobWorker extends Worker {
    constructor(e, n) {
      super(Buffer.from(e).toString("utf-8"), Object.assign(Object.assign({}, n), { fromSource: !0 }));
    }
    static fromText(e, n) {
      return new Worker(e, Object.assign(Object.assign({}, n), { fromSource: !0 }));
    }
  }
  return {
    blob: BlobWorker,
    default: Worker
  };
}
function initTinyWorker() {
  const t = require("tiny-worker");
  let e = [];
  class n extends t {
    constructor(s, _) {
      const l = _ && _.fromSource ? null : process.platform === "win32" ? `file:///${resolveScriptPath(s).replace(/\\/g, "/")}` : resolveScriptPath(s);
      if (l)
        l.match(/\.tsx?$/i) && detectTsNode() ? super(new Function(createTsNodeModule(resolveScriptPath(s))), [], { esm: !0 }) : l.match(/\.asar[\/\\]/) ? super(l.replace(/\.asar([\/\\])/, ".asar.unpacked$1"), [], { esm: !0 }) : super(l, [], { esm: !0 });
      else {
        const o = s;
        super(new Function(o), [], { esm: !0 });
      }
      e.push(this), this.emitter = new EventEmitter(), this.onerror = (o) => this.emitter.emit("error", o), this.onmessage = (o) => this.emitter.emit("message", o);
    }
    addEventListener(s, _) {
      this.emitter.addListener(s, _);
    }
    removeEventListener(s, _) {
      this.emitter.removeListener(s, _);
    }
    terminate() {
      return e = e.filter((s) => s !== this), super.terminate();
    }
  }
  const r = () => {
    Promise.all(e.map((a) => a.terminate())).then(() => process.exit(0), () => process.exit(1)), e = [];
  };
  process.on("SIGINT", () => r()), process.on("SIGTERM", () => r());
  class i extends n {
    constructor(s, _) {
      super(Buffer.from(s).toString("utf-8"), Object.assign(Object.assign({}, _), { fromSource: !0 }));
    }
    static fromText(s, _) {
      return new n(s, Object.assign(Object.assign({}, _), { fromSource: !0 }));
    }
  }
  return {
    blob: i,
    default: n
  };
}
let implementation$2, isTinyWorker;
function selectWorkerImplementation() {
  try {
    return isTinyWorker = !1, initWorkerThreadsWorker();
  } catch {
    return console.debug("Node worker_threads not available. Trying to fall back to tiny-worker polyfill..."), isTinyWorker = !0, initTinyWorker();
  }
}
function getWorkerImplementation$1() {
  return implementation$2 || (implementation$2 = selectWorkerImplementation()), implementation$2;
}
const NodeImplementation = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getWorkerImplementation: getWorkerImplementation$1
}, Symbol.toStringTag, { value: "Module" })), runningInNode$1 = typeof process < "u" && process.arch !== "browser" && "pid" in process, implementation$1 = runningInNode$1 ? NodeImplementation : BrowserImplementation, getWorkerImplementation = implementation$1.getWorkerImplementation;
function getDefaultExportFromCjs(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var browser = { exports: {} }, ms, hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var t = 1e3, e = t * 60, n = e * 60, r = n * 24, i = r * 7, a = r * 365.25;
  ms = function(c, u) {
    u = u || {};
    var d = typeof c;
    if (d === "string" && c.length > 0)
      return s(c);
    if (d === "number" && isFinite(c))
      return u.long ? l(c) : _(c);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(c)
    );
  };
  function s(c) {
    if (c = String(c), !(c.length > 100)) {
      var u = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        c
      );
      if (u) {
        var d = parseFloat(u[1]), f = (u[2] || "ms").toLowerCase();
        switch (f) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return d * a;
          case "weeks":
          case "week":
          case "w":
            return d * i;
          case "days":
          case "day":
          case "d":
            return d * r;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return d * n;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return d * e;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return d * t;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return d;
          default:
            return;
        }
      }
    }
  }
  function _(c) {
    var u = Math.abs(c);
    return u >= r ? Math.round(c / r) + "d" : u >= n ? Math.round(c / n) + "h" : u >= e ? Math.round(c / e) + "m" : u >= t ? Math.round(c / t) + "s" : c + "ms";
  }
  function l(c) {
    var u = Math.abs(c);
    return u >= r ? o(c, u, r, "day") : u >= n ? o(c, u, n, "hour") : u >= e ? o(c, u, e, "minute") : u >= t ? o(c, u, t, "second") : c + " ms";
  }
  function o(c, u, d, f) {
    var h = u >= d * 1.5;
    return Math.round(c / d) + " " + f + (h ? "s" : "");
  }
  return ms;
}
var common, hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function t(e) {
    r.debug = r, r.default = r, r.coerce = o, r.disable = _, r.enable = a, r.enabled = l, r.humanize = requireMs(), r.destroy = c, Object.keys(e).forEach((u) => {
      r[u] = e[u];
    }), r.names = [], r.skips = [], r.formatters = {};
    function n(u) {
      let d = 0;
      for (let f = 0; f < u.length; f++)
        d = (d << 5) - d + u.charCodeAt(f), d |= 0;
      return r.colors[Math.abs(d) % r.colors.length];
    }
    r.selectColor = n;
    function r(u) {
      let d, f = null, h, p;
      function m(...v) {
        if (!m.enabled)
          return;
        const g = m, b = Number(/* @__PURE__ */ new Date()), I = b - (d || b);
        g.diff = I, g.prev = d, g.curr = b, d = b, v[0] = r.coerce(v[0]), typeof v[0] != "string" && v.unshift("%O");
        let w = 0;
        v[0] = v[0].replace(/%([a-zA-Z%])/g, (y, E) => {
          if (y === "%%")
            return "%";
          w++;
          const T = r.formatters[E];
          if (typeof T == "function") {
            const S = v[w];
            y = T.call(g, S), v.splice(w, 1), w--;
          }
          return y;
        }), r.formatArgs.call(g, v), (g.log || r.log).apply(g, v);
      }
      return m.namespace = u, m.useColors = r.useColors(), m.color = r.selectColor(u), m.extend = i, m.destroy = r.destroy, Object.defineProperty(m, "enabled", {
        enumerable: !0,
        configurable: !1,
        get: () => f !== null ? f : (h !== r.namespaces && (h = r.namespaces, p = r.enabled(u)), p),
        set: (v) => {
          f = v;
        }
      }), typeof r.init == "function" && r.init(m), m;
    }
    function i(u, d) {
      const f = r(this.namespace + (typeof d > "u" ? ":" : d) + u);
      return f.log = this.log, f;
    }
    function a(u) {
      r.save(u), r.namespaces = u, r.names = [], r.skips = [];
      const d = (typeof u == "string" ? u : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const f of d)
        f[0] === "-" ? r.skips.push(f.slice(1)) : r.names.push(f);
    }
    function s(u, d) {
      let f = 0, h = 0, p = -1, m = 0;
      for (; f < u.length; )
        if (h < d.length && (d[h] === u[f] || d[h] === "*"))
          d[h] === "*" ? (p = h, m = f, h++) : (f++, h++);
        else if (p !== -1)
          h = p + 1, m++, f = m;
        else
          return !1;
      for (; h < d.length && d[h] === "*"; )
        h++;
      return h === d.length;
    }
    function _() {
      const u = [
        ...r.names,
        ...r.skips.map((d) => "-" + d)
      ].join(",");
      return r.enable(""), u;
    }
    function l(u) {
      for (const d of r.skips)
        if (s(u, d))
          return !1;
      for (const d of r.names)
        if (s(u, d))
          return !0;
      return !1;
    }
    function o(u) {
      return u instanceof Error ? u.stack || u.message : u;
    }
    function c() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    return r.enable(r.load()), r;
  }
  return common = t, common;
}
var hasRequiredBrowser;
function requireBrowser() {
  return hasRequiredBrowser || (hasRequiredBrowser = 1, (function(t, e) {
    e.formatArgs = r, e.save = i, e.load = a, e.useColors = n, e.storage = s(), e.destroy = /* @__PURE__ */ (() => {
      let l = !1;
      return () => {
        l || (l = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
      };
    })(), e.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function n() {
      if (typeof window < "u" && window.process && (window.process.type === "renderer" || window.process.__nwjs))
        return !0;
      if (typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))
        return !1;
      let l;
      return typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator < "u" && navigator.userAgent && (l = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(l[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function r(l) {
      if (l[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + l[0] + (this.useColors ? "%c " : " ") + "+" + t.exports.humanize(this.diff), !this.useColors)
        return;
      const o = "color: " + this.color;
      l.splice(1, 0, o, "color: inherit");
      let c = 0, u = 0;
      l[0].replace(/%[a-zA-Z%]/g, (d) => {
        d !== "%%" && (c++, d === "%c" && (u = c));
      }), l.splice(u, 0, o);
    }
    e.log = console.debug || console.log || (() => {
    });
    function i(l) {
      try {
        l ? e.storage.setItem("debug", l) : e.storage.removeItem("debug");
      } catch {
      }
    }
    function a() {
      let l;
      try {
        l = e.storage.getItem("debug") || e.storage.getItem("DEBUG");
      } catch {
      }
      return !l && typeof process < "u" && "env" in process && (l = process.env.DEBUG), l;
    }
    function s() {
      try {
        return localStorage;
      } catch {
      }
    }
    t.exports = requireCommon()(e);
    const { formatters: _ } = t.exports;
    _.j = function(l) {
      try {
        return JSON.stringify(l);
      } catch (o) {
        return "[UnexpectedJSONParseError]: " + o.message;
      }
    };
  })(browser, browser.exports)), browser.exports;
}
var browserExports = requireBrowser();
const DebugLogger = /* @__PURE__ */ getDefaultExportFromCjs(browserExports), hasSymbols = () => typeof Symbol == "function", hasSymbol = (t) => hasSymbols() && !!Symbol[t], getSymbol = (t) => hasSymbol(t) ? Symbol[t] : "@@" + t;
hasSymbol("asyncIterator") || (Symbol.asyncIterator = Symbol.asyncIterator || /* @__PURE__ */ Symbol.for("Symbol.asyncIterator"));
const SymbolIterator = getSymbol("iterator"), SymbolObservable = getSymbol("observable"), SymbolSpecies = getSymbol("species");
function getMethod(t, e) {
  const n = t[e];
  if (n != null) {
    if (typeof n != "function")
      throw new TypeError(n + " is not a function");
    return n;
  }
}
function getSpecies(t) {
  let e = t.constructor;
  return e !== void 0 && (e = e[SymbolSpecies], e === null && (e = void 0)), e !== void 0 ? e : Observable;
}
function isObservable(t) {
  return t instanceof Observable;
}
function hostReportError(t) {
  hostReportError.log ? hostReportError.log(t) : setTimeout(() => {
    throw t;
  }, 0);
}
function enqueue(t) {
  Promise.resolve().then(() => {
    try {
      t();
    } catch (e) {
      hostReportError(e);
    }
  });
}
function cleanupSubscription(t) {
  const e = t._cleanup;
  if (e !== void 0 && (t._cleanup = void 0, !!e))
    try {
      if (typeof e == "function")
        e();
      else {
        const n = getMethod(e, "unsubscribe");
        n && n.call(e);
      }
    } catch (n) {
      hostReportError(n);
    }
}
function closeSubscription(t) {
  t._observer = void 0, t._queue = void 0, t._state = "closed";
}
function flushSubscription(t) {
  const e = t._queue;
  if (e) {
    t._queue = void 0, t._state = "ready";
    for (const n of e)
      if (notifySubscription(t, n.type, n.value), t._state === "closed")
        break;
  }
}
function notifySubscription(t, e, n) {
  t._state = "running";
  const r = t._observer;
  try {
    const i = r ? getMethod(r, e) : void 0;
    switch (e) {
      case "next":
        i && i.call(r, n);
        break;
      case "error":
        if (closeSubscription(t), i)
          i.call(r, n);
        else
          throw n;
        break;
      case "complete":
        closeSubscription(t), i && i.call(r);
        break;
    }
  } catch (i) {
    hostReportError(i);
  }
  t._state === "closed" ? cleanupSubscription(t) : t._state === "running" && (t._state = "ready");
}
function onNotify(t, e, n) {
  if (t._state !== "closed") {
    if (t._state === "buffering") {
      t._queue = t._queue || [], t._queue.push({ type: e, value: n });
      return;
    }
    if (t._state !== "ready") {
      t._state = "buffering", t._queue = [{ type: e, value: n }], enqueue(() => flushSubscription(t));
      return;
    }
    notifySubscription(t, e, n);
  }
}
class Subscription {
  constructor(e, n) {
    this._cleanup = void 0, this._observer = e, this._queue = void 0, this._state = "initializing";
    const r = new SubscriptionObserver(this);
    try {
      this._cleanup = n.call(void 0, r);
    } catch (i) {
      r.error(i);
    }
    this._state === "initializing" && (this._state = "ready");
  }
  get closed() {
    return this._state === "closed";
  }
  unsubscribe() {
    this._state !== "closed" && (closeSubscription(this), cleanupSubscription(this));
  }
}
class SubscriptionObserver {
  constructor(e) {
    this._subscription = e;
  }
  get closed() {
    return this._subscription._state === "closed";
  }
  next(e) {
    onNotify(this._subscription, "next", e);
  }
  error(e) {
    onNotify(this._subscription, "error", e);
  }
  complete() {
    onNotify(this._subscription, "complete");
  }
}
class Observable {
  constructor(e) {
    if (!(this instanceof Observable))
      throw new TypeError("Observable cannot be called as a function");
    if (typeof e != "function")
      throw new TypeError("Observable initializer must be a function");
    this._subscriber = e;
  }
  subscribe(e, n, r) {
    return (typeof e != "object" || e === null) && (e = {
      next: e,
      error: n,
      complete: r
    }), new Subscription(e, this._subscriber);
  }
  pipe(e, ...n) {
    let r = this;
    for (const i of [e, ...n])
      r = i(r);
    return r;
  }
  tap(e, n, r) {
    const i = typeof e != "object" || e === null ? {
      next: e,
      error: n,
      complete: r
    } : e;
    return new Observable((a) => this.subscribe({
      next(s) {
        i.next && i.next(s), a.next(s);
      },
      error(s) {
        i.error && i.error(s), a.error(s);
      },
      complete() {
        i.complete && i.complete(), a.complete();
      },
      start(s) {
        i.start && i.start(s);
      }
    }));
  }
  forEach(e) {
    return new Promise((n, r) => {
      if (typeof e != "function") {
        r(new TypeError(e + " is not a function"));
        return;
      }
      function i() {
        a.unsubscribe(), n(void 0);
      }
      const a = this.subscribe({
        next(s) {
          try {
            e(s, i);
          } catch (_) {
            r(_), a.unsubscribe();
          }
        },
        error(s) {
          r(s);
        },
        complete() {
          n(void 0);
        }
      });
    });
  }
  map(e) {
    if (typeof e != "function")
      throw new TypeError(e + " is not a function");
    const n = getSpecies(this);
    return new n((r) => this.subscribe({
      next(i) {
        let a = i;
        try {
          a = e(i);
        } catch (s) {
          return r.error(s);
        }
        r.next(a);
      },
      error(i) {
        r.error(i);
      },
      complete() {
        r.complete();
      }
    }));
  }
  filter(e) {
    if (typeof e != "function")
      throw new TypeError(e + " is not a function");
    const n = getSpecies(this);
    return new n((r) => this.subscribe({
      next(i) {
        try {
          if (!e(i))
            return;
        } catch (a) {
          return r.error(a);
        }
        r.next(i);
      },
      error(i) {
        r.error(i);
      },
      complete() {
        r.complete();
      }
    }));
  }
  reduce(e, n) {
    if (typeof e != "function")
      throw new TypeError(e + " is not a function");
    const r = getSpecies(this), i = arguments.length > 1;
    let a = !1, s = n;
    return new r((_) => this.subscribe({
      next(l) {
        const o = !a;
        if (a = !0, !o || i)
          try {
            s = e(s, l);
          } catch (c) {
            return _.error(c);
          }
        else
          s = l;
      },
      error(l) {
        _.error(l);
      },
      complete() {
        if (!a && !i)
          return _.error(new TypeError("Cannot reduce an empty sequence"));
        _.next(s), _.complete();
      }
    }));
  }
  concat(...e) {
    const n = getSpecies(this);
    return new n((r) => {
      let i, a = 0;
      function s(_) {
        i = _.subscribe({
          next(l) {
            r.next(l);
          },
          error(l) {
            r.error(l);
          },
          complete() {
            a === e.length ? (i = void 0, r.complete()) : s(n.from(e[a++]));
          }
        });
      }
      return s(this), () => {
        i && (i.unsubscribe(), i = void 0);
      };
    });
  }
  flatMap(e) {
    if (typeof e != "function")
      throw new TypeError(e + " is not a function");
    const n = getSpecies(this);
    return new n((r) => {
      const i = [], a = this.subscribe({
        next(_) {
          let l;
          if (e)
            try {
              l = e(_);
            } catch (c) {
              return r.error(c);
            }
          else
            l = _;
          const o = n.from(l).subscribe({
            next(c) {
              r.next(c);
            },
            error(c) {
              r.error(c);
            },
            complete() {
              const c = i.indexOf(o);
              c >= 0 && i.splice(c, 1), s();
            }
          });
          i.push(o);
        },
        error(_) {
          r.error(_);
        },
        complete() {
          s();
        }
      });
      function s() {
        a.closed && i.length === 0 && r.complete();
      }
      return () => {
        i.forEach((_) => _.unsubscribe()), a.unsubscribe();
      };
    });
  }
  [SymbolObservable]() {
    return this;
  }
  static from(e) {
    const n = typeof this == "function" ? this : Observable;
    if (e == null)
      throw new TypeError(e + " is not an object");
    const r = getMethod(e, SymbolObservable);
    if (r) {
      const i = r.call(e);
      if (Object(i) !== i)
        throw new TypeError(i + " is not an object");
      return isObservable(i) && i.constructor === n ? i : new n((a) => i.subscribe(a));
    }
    if (hasSymbol("iterator")) {
      const i = getMethod(e, SymbolIterator);
      if (i)
        return new n((a) => {
          enqueue(() => {
            if (!a.closed) {
              for (const s of i.call(e))
                if (a.next(s), a.closed)
                  return;
              a.complete();
            }
          });
        });
    }
    if (Array.isArray(e))
      return new n((i) => {
        enqueue(() => {
          if (!i.closed) {
            for (const a of e)
              if (i.next(a), i.closed)
                return;
            i.complete();
          }
        });
      });
    throw new TypeError(e + " is not observable");
  }
  static of(...e) {
    const n = typeof this == "function" ? this : Observable;
    return new n((r) => {
      enqueue(() => {
        if (!r.closed) {
          for (const i of e)
            if (r.next(i), r.closed)
              return;
          r.complete();
        }
      });
    });
  }
  static get [SymbolSpecies]() {
    return this;
  }
}
hasSymbols() && Object.defineProperty(Observable, /* @__PURE__ */ Symbol("extensions"), {
  value: {
    symbol: SymbolObservable,
    hostReportError
  },
  configurable: !0
});
function unsubscribe(t) {
  typeof t == "function" ? t() : t && typeof t.unsubscribe == "function" && t.unsubscribe();
}
class MulticastSubject extends Observable {
  constructor() {
    super((e) => (this._observers.add(e), () => this._observers.delete(e))), this._observers = /* @__PURE__ */ new Set();
  }
  next(e) {
    for (const n of this._observers)
      n.next(e);
  }
  error(e) {
    for (const n of this._observers)
      n.error(e);
  }
  complete() {
    for (const e of this._observers)
      e.complete();
  }
}
function multicast(t) {
  const e = new MulticastSubject();
  let n, r = 0;
  return new Observable((i) => {
    n || (n = t.subscribe(e));
    const a = e.subscribe(i);
    return r++, () => {
      r--, a.unsubscribe(), r === 0 && (unsubscribe(n), n = void 0);
    };
  });
}
const $errors = /* @__PURE__ */ Symbol("thread.errors"), $events = /* @__PURE__ */ Symbol("thread.events"), $terminate = /* @__PURE__ */ Symbol("thread.terminate"), $transferable = /* @__PURE__ */ Symbol("thread.transferable"), $worker = /* @__PURE__ */ Symbol("thread.worker");
function fail$1(t) {
  throw Error(t);
}
const Thread = {
  /** Return an observable that can be used to subscribe to all errors happening in the thread. */
  errors(t) {
    return t[$errors] || fail$1("Error observable not found. Make sure to pass a thread instance as returned by the spawn() promise.");
  },
  /** Return an observable that can be used to subscribe to internal events happening in the thread. Useful for debugging. */
  events(t) {
    return t[$events] || fail$1("Events observable not found. Make sure to pass a thread instance as returned by the spawn() promise.");
  },
  /** Terminate a thread. Remember to terminate every thread when you are done using it. */
  terminate(t) {
    return t[$terminate]();
  }
}, doNothing$1 = () => {
};
function createPromiseWithResolver() {
  let t = !1, e, n = doNothing$1;
  return [new Promise((a) => {
    t ? a(e) : n = a;
  }), (a) => {
    t = !0, e = a, n(e);
  }];
}
var WorkerEventType;
(function(t) {
  t.internalError = "internalError", t.message = "message", t.termination = "termination";
})(WorkerEventType || (WorkerEventType = {}));
const doNothing = () => {
}, returnInput = (t) => t, runDeferred = (t) => Promise.resolve().then(t);
function fail(t) {
  throw t;
}
function isThenable(t) {
  return t && typeof t.then == "function";
}
class ObservablePromise extends Observable {
  constructor(e) {
    super((n) => {
      const r = this, i = Object.assign(Object.assign({}, n), {
        complete() {
          n.complete(), r.onCompletion();
        },
        error(a) {
          n.error(a), r.onError(a);
        },
        next(a) {
          n.next(a), r.onNext(a);
        }
      });
      try {
        return this.initHasRun = !0, e(i);
      } catch (a) {
        i.error(a);
      }
    }), this.initHasRun = !1, this.fulfillmentCallbacks = [], this.rejectionCallbacks = [], this.firstValueSet = !1, this.state = "pending";
  }
  onNext(e) {
    this.firstValueSet || (this.firstValue = e, this.firstValueSet = !0);
  }
  onError(e) {
    this.state = "rejected", this.rejection = e;
    for (const n of this.rejectionCallbacks)
      runDeferred(() => n(e));
  }
  onCompletion() {
    this.state = "fulfilled";
    for (const e of this.fulfillmentCallbacks)
      runDeferred(() => e(this.firstValue));
  }
  then(e, n) {
    const r = e || returnInput, i = n || fail;
    let a = !1;
    return new Promise((s, _) => {
      const l = (c) => {
        if (!a) {
          a = !0;
          try {
            s(i(c));
          } catch (u) {
            _(u);
          }
        }
      }, o = (c) => {
        try {
          s(r(c));
        } catch (u) {
          l(u);
        }
      };
      if (this.initHasRun || this.subscribe({ error: l }), this.state === "fulfilled")
        return s(r(this.firstValue));
      if (this.state === "rejected")
        return a = !0, s(i(this.rejection));
      this.fulfillmentCallbacks.push(o), this.rejectionCallbacks.push(l);
    });
  }
  catch(e) {
    return this.then(void 0, e);
  }
  finally(e) {
    const n = e || doNothing;
    return this.then((r) => (n(), r), () => n());
  }
  static from(e) {
    return isThenable(e) ? new ObservablePromise((n) => {
      const r = (a) => {
        n.next(a), n.complete();
      }, i = (a) => {
        n.error(a);
      };
      e.then(r, i);
    }) : super.from(e);
  }
}
function isTransferable(t) {
  return !(!t || typeof t != "object");
}
function isTransferDescriptor(t) {
  return t && typeof t == "object" && t[$transferable];
}
function Transfer(t, e) {
  if (!e) {
    if (!isTransferable(t))
      throw Error();
    e = [t];
  }
  return {
    [$transferable]: !0,
    send: t,
    transferables: e
  };
}
var MasterMessageType;
(function(t) {
  t.cancel = "cancel", t.run = "run";
})(MasterMessageType || (MasterMessageType = {}));
var WorkerMessageType;
(function(t) {
  t.error = "error", t.init = "init", t.result = "result", t.running = "running", t.uncaughtError = "uncaughtError";
})(WorkerMessageType || (WorkerMessageType = {}));
const debugMessages$1 = DebugLogger("threads:master:messages");
let nextJobUID = 1;
const dedupe = (t) => Array.from(new Set(t)), isJobErrorMessage = (t) => t && t.type === WorkerMessageType.error, isJobResultMessage = (t) => t && t.type === WorkerMessageType.result, isJobStartMessage = (t) => t && t.type === WorkerMessageType.running;
function createObservableForJob(t, e) {
  return new Observable((n) => {
    let r;
    const i = ((a) => {
      if (debugMessages$1("Message from worker:", a.data), !(!a.data || a.data.uid !== e)) {
        if (isJobStartMessage(a.data))
          r = a.data.resultType;
        else if (isJobResultMessage(a.data))
          r === "promise" ? (typeof a.data.payload < "u" && n.next(deserialize(a.data.payload)), n.complete(), t.removeEventListener("message", i)) : (a.data.payload && n.next(deserialize(a.data.payload)), a.data.complete && (n.complete(), t.removeEventListener("message", i)));
        else if (isJobErrorMessage(a.data)) {
          const s = deserialize(a.data.error);
          n.error(s), t.removeEventListener("message", i);
        }
      }
    });
    return t.addEventListener("message", i), () => {
      if (r === "observable" || !r) {
        const a = {
          type: MasterMessageType.cancel,
          uid: e
        };
        t.postMessage(a);
      }
      t.removeEventListener("message", i);
    };
  });
}
function prepareArguments(t) {
  if (t.length === 0)
    return {
      args: [],
      transferables: []
    };
  const e = [], n = [];
  for (const r of t)
    isTransferDescriptor(r) ? (e.push(serialize(r.send)), n.push(...r.transferables)) : e.push(serialize(r));
  return {
    args: e,
    transferables: n.length === 0 ? n : dedupe(n)
  };
}
function createProxyFunction(t, e) {
  return ((...n) => {
    const r = nextJobUID++, { args: i, transferables: a } = prepareArguments(n), s = {
      type: MasterMessageType.run,
      uid: r,
      method: e,
      args: i
    };
    debugMessages$1("Sending command to run function to worker:", s);
    try {
      t.postMessage(s, a);
    } catch (_) {
      return ObservablePromise.from(Promise.reject(_));
    }
    return ObservablePromise.from(multicast(createObservableForJob(t, r)));
  });
}
function createProxyModule(t, e) {
  const n = {};
  for (const r of e)
    n[r] = createProxyFunction(t, r);
  return n;
}
var __awaiter$2 = function(t, e, n, r) {
  function i(a) {
    return a instanceof n ? a : new n(function(s) {
      s(a);
    });
  }
  return new (n || (n = Promise))(function(a, s) {
    function _(c) {
      try {
        o(r.next(c));
      } catch (u) {
        s(u);
      }
    }
    function l(c) {
      try {
        o(r.throw(c));
      } catch (u) {
        s(u);
      }
    }
    function o(c) {
      c.done ? a(c.value) : i(c.value).then(_, l);
    }
    o((r = r.apply(t, e || [])).next());
  });
};
const debugMessages = DebugLogger("threads:master:messages"), debugSpawn = DebugLogger("threads:master:spawn"), debugThreadUtils = DebugLogger("threads:master:thread-utils"), isInitMessage = (t) => t && t.type === "init", isUncaughtErrorMessage = (t) => t && t.type === "uncaughtError", initMessageTimeout = typeof process < "u" && process.env.THREADS_WORKER_INIT_TIMEOUT ? Number.parseInt(process.env.THREADS_WORKER_INIT_TIMEOUT, 10) : 1e4;
function withTimeout(t, e, n) {
  return __awaiter$2(this, void 0, void 0, function* () {
    let r;
    const i = new Promise((s, _) => {
      r = setTimeout(() => _(Error(n)), e);
    }), a = yield Promise.race([
      t,
      i
    ]);
    return clearTimeout(r), a;
  });
}
function receiveInitMessage(t) {
  return new Promise((e, n) => {
    const r = ((i) => {
      debugMessages("Message from worker before finishing initialization:", i.data), isInitMessage(i.data) ? (t.removeEventListener("message", r), e(i.data)) : isUncaughtErrorMessage(i.data) && (t.removeEventListener("message", r), n(deserialize(i.data.error)));
    });
    t.addEventListener("message", r);
  });
}
function createEventObservable(t, e) {
  return new Observable((n) => {
    const r = ((a) => {
      const s = {
        type: WorkerEventType.message,
        data: a.data
      };
      n.next(s);
    }), i = ((a) => {
      debugThreadUtils("Unhandled promise rejection event in thread:", a);
      const s = {
        type: WorkerEventType.internalError,
        error: Error(a.reason)
      };
      n.next(s);
    });
    t.addEventListener("message", r), t.addEventListener("unhandledrejection", i), e.then(() => {
      const a = {
        type: WorkerEventType.termination
      };
      t.removeEventListener("message", r), t.removeEventListener("unhandledrejection", i), n.next(a), n.complete();
    });
  });
}
function createTerminator(t) {
  const [e, n] = createPromiseWithResolver();
  return { terminate: () => __awaiter$2(this, void 0, void 0, function* () {
    debugThreadUtils("Terminating worker"), yield t.terminate(), n();
  }), termination: e };
}
function setPrivateThreadProps(t, e, n, r) {
  const i = n.filter((a) => a.type === WorkerEventType.internalError).map((a) => a.error);
  return Object.assign(t, {
    [$errors]: i,
    [$events]: n,
    [$terminate]: r,
    [$worker]: e
  });
}
function spawn(t, e) {
  return __awaiter$2(this, void 0, void 0, function* () {
    debugSpawn("Initializing new thread");
    const n = initMessageTimeout, i = (yield withTimeout(receiveInitMessage(t), n, `Timeout: Did not receive an init message from worker after ${n}ms. Make sure the worker calls expose().`)).exposed, { termination: a, terminate: s } = createTerminator(t), _ = createEventObservable(t, a);
    if (i.type === "function") {
      const l = createProxyFunction(t);
      return setPrivateThreadProps(l, t, _, s);
    } else if (i.type === "module") {
      const l = createProxyModule(t, i.methods);
      return setPrivateThreadProps(l, t, _, s);
    } else {
      const l = i.type;
      throw Error(`Worker init message states unexpected type of expose(): ${l}`);
    }
  });
}
const BlobWorker = getWorkerImplementation().blob, Worker$1 = getWorkerImplementation().default, isWorkerRuntime$2 = function t() {
  const e = typeof self < "u" && typeof Window < "u" && self instanceof Window;
  return !!(typeof self < "u" && self.postMessage && !e);
}, postMessageToMaster$2 = function t(e, n) {
  self.postMessage(e, n);
}, subscribeToMasterMessages$2 = function t(e) {
  const n = (i) => {
    e(i.data);
  }, r = () => {
    self.removeEventListener("message", n);
  };
  return self.addEventListener("message", n), r;
}, WebWorkerImplementation = {
  isWorkerRuntime: isWorkerRuntime$2,
  postMessageToMaster: postMessageToMaster$2,
  subscribeToMasterMessages: subscribeToMasterMessages$2
};
typeof self > "u" && (global.self = global);
const isWorkerRuntime$1 = function t() {
  return !!(typeof self < "u" && self.postMessage);
}, postMessageToMaster$1 = function t(e) {
  self.postMessage(e);
};
let muxingHandlerSetUp = !1;
const messageHandlers = /* @__PURE__ */ new Set(), subscribeToMasterMessages$1 = function t(e) {
  return muxingHandlerSetUp || (self.addEventListener("message", ((r) => {
    messageHandlers.forEach((i) => i(r.data));
  })), muxingHandlerSetUp = !0), messageHandlers.add(e), () => messageHandlers.delete(e);
}, TinyWorkerImplementation = {
  isWorkerRuntime: isWorkerRuntime$1,
  postMessageToMaster: postMessageToMaster$1,
  subscribeToMasterMessages: subscribeToMasterMessages$1
};
let implementation;
function selectImplementation() {
  return typeof __non_webpack_require__ == "function" ? __non_webpack_require__("worker_threads") : eval("require")("worker_threads");
}
function getImplementation() {
  return implementation || (implementation = selectImplementation()), implementation;
}
function assertMessagePort(t) {
  if (!t)
    throw Error("Invariant violation: MessagePort to parent is not available.");
  return t;
}
const isWorkerRuntime = function t() {
  return !getImplementation().isMainThread;
}, postMessageToMaster = function t(e, n) {
  assertMessagePort(getImplementation().parentPort).postMessage(e, n);
}, subscribeToMasterMessages = function t(e) {
  const n = getImplementation().parentPort;
  if (!n)
    throw Error("Invariant violation: MessagePort to parent is not available.");
  const r = (a) => {
    e(a);
  }, i = () => {
    assertMessagePort(n).off("message", r);
  };
  return assertMessagePort(n).on("message", r), i;
};
function testImplementation() {
  getImplementation();
}
const WorkerThreadsImplementation = {
  isWorkerRuntime,
  postMessageToMaster,
  subscribeToMasterMessages,
  testImplementation
}, runningInNode = typeof process < "u" && process.arch !== "browser" && "pid" in process;
function selectNodeImplementation() {
  try {
    return WorkerThreadsImplementation.testImplementation(), WorkerThreadsImplementation;
  } catch {
    return TinyWorkerImplementation;
  }
}
const Implementation = runningInNode ? selectNodeImplementation() : WebWorkerImplementation;
Implementation.isWorkerRuntime;
function postUncaughtErrorMessage(t) {
  try {
    const e = {
      type: WorkerMessageType.uncaughtError,
      error: serialize(t)
    };
    Implementation.postMessageToMaster(e);
  } catch (e) {
    console.error(`Not reporting uncaught error back to master thread as it occured while reporting an uncaught error already.
Latest error:`, e, `
Original error:`, t);
  }
}
typeof self < "u" && typeof self.addEventListener == "function" && Implementation.isWorkerRuntime() && (self.addEventListener("error", (t) => {
  setTimeout(() => postUncaughtErrorMessage(t.error || t), 250);
}), self.addEventListener("unhandledrejection", (t) => {
  const e = t.reason;
  e && typeof e.message == "string" && setTimeout(() => postUncaughtErrorMessage(e), 250);
}));
typeof process < "u" && typeof process.on == "function" && Implementation.isWorkerRuntime() && (process.on("uncaughtException", (t) => {
  setTimeout(() => postUncaughtErrorMessage(t), 250);
}), process.on("unhandledRejection", (t) => {
  t && typeof t.message == "string" && setTimeout(() => postUncaughtErrorMessage(t), 250);
}));
var ok$1 = function(t) {
  return new Ok$1(t);
}, err$1 = function(t) {
  return new Err$1(t);
}, Ok$1 = (
  /** @class */
  (function() {
    function t(e) {
      var n = this;
      this.value = e, this.match = function(r, i) {
        return r(n.value);
      };
    }
    return t.prototype.isOk = function() {
      return !0;
    }, t.prototype.isErr = function() {
      return !this.isOk();
    }, t.prototype.map = function(e) {
      return ok$1(e(this.value));
    }, t.prototype.mapErr = function(e) {
      return ok$1(this.value);
    }, t.prototype.andThen = function(e) {
      return e(this.value);
    }, t.prototype.asyncAndThen = function(e) {
      return e(this.value);
    }, t.prototype.asyncMap = function(e) {
      return ResultAsync$1.fromPromise(e(this.value));
    }, t.prototype.unwrapOr = function(e) {
      return this.value;
    }, t.prototype._unsafeUnwrap = function() {
      return this.value;
    }, t.prototype._unsafeUnwrapErr = function() {
      throw new Error("Called `_unsafeUnwrapErr` on an Ok");
    }, t;
  })()
), Err$1 = (
  /** @class */
  (function() {
    function t(e) {
      var n = this;
      this.error = e, this.match = function(r, i) {
        return i(n.error);
      };
    }
    return t.prototype.isOk = function() {
      return !1;
    }, t.prototype.isErr = function() {
      return !this.isOk();
    }, t.prototype.map = function(e) {
      return err$1(this.error);
    }, t.prototype.mapErr = function(e) {
      return err$1(e(this.error));
    }, t.prototype.andThen = function(e) {
      return err$1(this.error);
    }, t.prototype.asyncAndThen = function(e) {
      return errAsync$1(this.error);
    }, t.prototype.asyncMap = function(e) {
      return errAsync$1(this.error);
    }, t.prototype.unwrapOr = function(e) {
      return e;
    }, t.prototype._unsafeUnwrap = function() {
      throw new Error("Called `_unsafeUnwrap` on an Err");
    }, t.prototype._unsafeUnwrapErr = function() {
      return this.error;
    }, t;
  })()
);
function __awaiter$1(t, e, n, r) {
  function i(a) {
    return a instanceof n ? a : new n(function(s) {
      s(a);
    });
  }
  return new (n || (n = Promise))(function(a, s) {
    function _(c) {
      try {
        o(r.next(c));
      } catch (u) {
        s(u);
      }
    }
    function l(c) {
      try {
        o(r.throw(c));
      } catch (u) {
        s(u);
      }
    }
    function o(c) {
      c.done ? a(c.value) : i(c.value).then(_, l);
    }
    o((r = r.apply(t, [])).next());
  });
}
function __generator$1(t, e) {
  var n = { label: 0, sent: function() {
    if (a[0] & 1) throw a[1];
    return a[1];
  }, trys: [], ops: [] }, r, i, a, s;
  return s = { next: _(0), throw: _(1), return: _(2) }, typeof Symbol == "function" && (s[Symbol.iterator] = function() {
    return this;
  }), s;
  function _(o) {
    return function(c) {
      return l([o, c]);
    };
  }
  function l(o) {
    if (r) throw new TypeError("Generator is already executing.");
    for (; n; ) try {
      if (r = 1, i && (a = o[0] & 2 ? i.return : o[0] ? i.throw || ((a = i.return) && a.call(i), 0) : i.next) && !(a = a.call(i, o[1])).done) return a;
      switch (i = 0, a && (o = [o[0] & 2, a.value]), o[0]) {
        case 0:
        case 1:
          a = o;
          break;
        case 4:
          return n.label++, { value: o[1], done: !1 };
        case 5:
          n.label++, i = o[1], o = [0];
          continue;
        case 7:
          o = n.ops.pop(), n.trys.pop();
          continue;
        default:
          if (a = n.trys, !(a = a.length > 0 && a[a.length - 1]) && (o[0] === 6 || o[0] === 2)) {
            n = 0;
            continue;
          }
          if (o[0] === 3 && (!a || o[1] > a[0] && o[1] < a[3])) {
            n.label = o[1];
            break;
          }
          if (o[0] === 6 && n.label < a[1]) {
            n.label = a[1], a = o;
            break;
          }
          if (a && n.label < a[2]) {
            n.label = a[2], n.ops.push(o);
            break;
          }
          a[2] && n.ops.pop(), n.trys.pop();
          continue;
      }
      o = e.call(t, n);
    } catch (c) {
      o = [6, c], i = 0;
    } finally {
      r = a = 0;
    }
    if (o[0] & 5) throw o[1];
    return { value: o[0] ? o[1] : void 0, done: !0 };
  }
}
var logWarning = function(t) {
  if (typeof process != "object" || process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "production") {
    var e = "\x1B[33m%s\x1B[0m", n = ["[neverthrow]", t].join(" - ");
    console.warn(e, n);
  }
}, ResultAsync$1 = (
  /** @class */
  (function() {
    function t(e) {
      this._promise = e;
    }
    return t.fromPromise = function(e, n) {
      var r = e.then(function(a) {
        return new Ok$1(a);
      });
      if (n)
        r = r.catch(function(a) {
          return new Err$1(n(a));
        });
      else {
        var i = [
          "`fromPromise` called without a promise rejection handler",
          "Ensure that you are catching promise rejections yourself, or pass a second argument to `fromPromise` to convert a caught exception into an `Err` instance"
        ].join(" - ");
        logWarning(i);
      }
      return new t(r);
    }, t.prototype.map = function(e) {
      var n = this;
      return new t(this._promise.then(function(r) {
        return __awaiter$1(n, void 0, void 0, function() {
          var i;
          return __generator$1(this, function(a) {
            switch (a.label) {
              case 0:
                return r.isErr() ? [2, new Err$1(r.error)] : (i = Ok$1.bind, [4, e(r.value)]);
              case 1:
                return [2, new (i.apply(Ok$1, [void 0, a.sent()]))()];
            }
          });
        });
      }));
    }, t.prototype.mapErr = function(e) {
      var n = this;
      return new t(this._promise.then(function(r) {
        return __awaiter$1(n, void 0, void 0, function() {
          var i;
          return __generator$1(this, function(a) {
            switch (a.label) {
              case 0:
                return r.isOk() ? [2, new Ok$1(r.value)] : (i = Err$1.bind, [4, e(r.error)]);
              case 1:
                return [2, new (i.apply(Err$1, [void 0, a.sent()]))()];
            }
          });
        });
      }));
    }, t.prototype.andThen = function(e) {
      return new t(this._promise.then(function(n) {
        if (n.isErr())
          return new Err$1(n.error);
        var r = e(n.value);
        return r instanceof t ? r._promise : r;
      }));
    }, t.prototype.match = function(e, n) {
      return this._promise.then(function(r) {
        return r.match(e, n);
      });
    }, t.prototype.unwrapOr = function(e) {
      return this._promise.then(function(n) {
        return n.unwrapOr(e);
      });
    }, t.prototype.then = function(e) {
      return this._promise.then(e);
    }, t;
  })()
), errAsync$1 = function(t) {
  return new ResultAsync$1(Promise.resolve(new Err$1(t)));
}, __defProp = Object.defineProperty, __getOwnPropSymbols = Object.getOwnPropertySymbols, __hasOwnProp = Object.prototype.hasOwnProperty, __propIsEnum = Object.prototype.propertyIsEnumerable, __defNormalProp = (t, e, n) => e in t ? __defProp(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : t[e] = n, __spreadValues = (t, e) => {
  for (var n in e || (e = {}))
    __hasOwnProp.call(e, n) && __defNormalProp(t, n, e[n]);
  if (__getOwnPropSymbols)
    for (var n of __getOwnPropSymbols(e))
      __propIsEnum.call(e, n) && __defNormalProp(t, n, e[n]);
  return t;
};
function createInputValue(t, e, n) {
  let r = e;
  const i = {}, a = () => r, s = (l) => {
    var o;
    l !== r && (r = l, (o = i.onSet) == null || o.call(i));
  };
  return { varId: t, get: a, set: s, reset: () => {
    s(e);
  }, callbacks: i };
}
var Series = class L {
  /**
   * @param varId The ID for the output variable (as used by SDEverywhere).
   * @param points The data points for the variable, one point per time increment.
   */
  constructor(e, n) {
    this.varId = e, this.points = n;
  }
  /**
   * Return the Y value at the given time.  Note that this does not attempt to interpolate
   * if there is no data point defined for the given time and will return undefined in
   * that case.
   *
   * @param time The x (time) value.
   * @return The y value for the given time, or undefined if there is no data point defined
   * for the given time.
   */
  getValueAtTime(e) {
    var n;
    return (n = this.points.find((r) => r.x === e)) == null ? void 0 : n.y;
  }
  /**
   * Create a new `Series` instance that is a copy of this one.
   */
  copy() {
    const e = this.points.map((n) => __spreadValues({}, n));
    return new L(this.varId, e);
  }
}, Outputs = class {
  /**
   * @param varIds The output variable identifiers.
   * @param startTime The start time for the model.
   * @param endTime The end time for the model.
   * @param saveFreq The frequency with which output values are saved (aka `SAVEPER`).
   */
  constructor(t, e, n, r = 1) {
    this.varIds = t, this.startTime = e, this.endTime = n, this.saveFreq = r, this.seriesLength = Math.round((n - e) / r) + 1, this.varSeries = new Array(t.length);
    for (let i = 0; i < t.length; i++) {
      const a = new Array(this.seriesLength);
      for (let _ = 0; _ < this.seriesLength; _++)
        a[_] = { x: e + _ * r, y: 0 };
      const s = t[i];
      this.varSeries[i] = new Series(s, a);
    }
  }
  /**
   * The optional set of specs that dictate which variables from the model will be
   * stored in this `Outputs` instance.  If undefined, the default set of outputs
   * will be stored (as configured in `varIds`).
   * @hidden This is not yet part of the public API; it is exposed here for use
   * in experimental testing tools.
   */
  setVarSpecs(t) {
    if (t.length !== this.varIds.length)
      throw new Error("Length of output varSpecs must match that of varIds");
    this.varSpecs = t;
  }
  /**
   * Parse the given raw float buffer (produced by the model) and store the values
   * into this `Outputs` instance.
   *
   * Note that the length of `outputsBuffer` must be greater than or equal to
   * the capacity of this `Outputs` instance.  The `Outputs` instance is allowed
   * to be smaller to support the case where you want to extract a subset of
   * the time range in the buffer produced by the model.
   *
   * @param outputsBuffer The raw outputs buffer produced by the model.
   * @param rowLength The number of elements per row (one element per save point).
   * @return An `ok` result if the buffer is valid, otherwise an `err` result.
   */
  updateFromBuffer(t, e) {
    const n = parseOutputsBuffer(t, e, this);
    return n.isOk() ? ok$1(void 0) : err$1(n.error);
  }
  /**
   * Return the series for the given output variable.
   *
   * @param varId The ID of the output variable (as used by SDEverywhere).
   */
  getSeriesForVar(t) {
    const e = this.varIds.indexOf(t);
    if (e >= 0)
      return this.varSeries[e];
  }
};
function parseOutputsBuffer(t, e, n) {
  const r = n.varIds.length, i = n.seriesLength;
  if (e < i || t.length < r * i)
    return err$1("invalid-point-count");
  for (let a = 0; a < r; a++) {
    const s = n.varSeries[a];
    let _ = e * a;
    for (let l = 0; l < i; l++)
      s.points[l].y = validateNumber(t[_]), _++;
  }
  return ok$1(n);
}
function validateNumber(t) {
  if (!isNaN(t) && t > -1e32)
    return t;
}
function getEncodedVarIndicesLength(t) {
  var e;
  let n = 1;
  for (const r of t) {
    n += 2;
    const i = ((e = r.subscriptIndices) == null ? void 0 : e.length) || 0;
    n += i;
  }
  return n;
}
function encodeVarIndices(t, e) {
  let n = 0;
  e[n++] = t.length;
  for (const r of t) {
    e[n++] = r.varIndex;
    const i = r.subscriptIndices, a = i?.length || 0;
    e[n++] = a;
    for (let s = 0; s < a; s++)
      e[n++] = i[s];
  }
}
function getEncodedConstantBufferLengths(t) {
  var e;
  let n = 1, r = 0;
  for (const i of t) {
    const a = i.varRef.varSpec;
    if (a === void 0)
      throw new Error("Cannot compute constant buffer lengths until all constant var specs are defined");
    n += 2;
    const s = ((e = a.subscriptIndices) == null ? void 0 : e.length) || 0;
    n += s, r += 1;
  }
  return {
    constantIndicesLength: n,
    constantsLength: r
  };
}
function encodeConstants(t, e, n) {
  let r = 0;
  e[r++] = t.length;
  let i = 0;
  for (const a of t) {
    const s = a.varRef.varSpec;
    e[r++] = s.varIndex;
    const _ = s.subscriptIndices, l = _?.length || 0;
    e[r++] = l;
    for (let o = 0; o < l; o++)
      e[r++] = _[o];
    n[i++] = a.value;
  }
}
function decodeConstants(t, e) {
  const n = [];
  let r = 0;
  const i = t[r++];
  for (let a = 0; a < i; a++) {
    const s = t[r++], _ = t[r++], l = _ > 0 ? Array(_) : void 0;
    for (let u = 0; u < _; u++)
      l[u] = t[r++];
    const o = {
      varIndex: s,
      subscriptIndices: l
    }, c = e[a];
    n.push({
      varRef: {
        varSpec: o
      },
      value: c
    });
  }
  return n;
}
function getEncodedLookupBufferLengths(t) {
  var e, n;
  let r = 1, i = 0;
  for (const a of t) {
    const s = a.varRef.varSpec;
    if (s === void 0)
      throw new Error("Cannot compute lookup buffer lengths until all lookup var specs are defined");
    r += 2;
    const _ = ((e = s.subscriptIndices) == null ? void 0 : e.length) || 0;
    r += _, r += 2, i += ((n = a.points) == null ? void 0 : n.length) || 0;
  }
  return {
    lookupIndicesLength: r,
    lookupsLength: i
  };
}
function encodeLookups(t, e, n) {
  let r = 0;
  e[r++] = t.length;
  let i = 0;
  for (const a of t) {
    const s = a.varRef.varSpec;
    e[r++] = s.varIndex;
    const _ = s.subscriptIndices, l = _?.length || 0;
    e[r++] = l;
    for (let o = 0; o < l; o++)
      e[r++] = _[o];
    a.points !== void 0 ? (e[r++] = i, e[r++] = a.points.length, n?.set(a.points, i), i += a.points.length) : (e[r++] = -1, e[r++] = 0);
  }
}
function decodeLookups(t, e) {
  const n = [];
  let r = 0;
  const i = t[r++];
  for (let a = 0; a < i; a++) {
    const s = t[r++], _ = t[r++], l = _ > 0 ? Array(_) : void 0;
    for (let f = 0; f < _; f++)
      l[f] = t[r++];
    const o = t[r++], c = t[r++], u = {
      varIndex: s,
      subscriptIndices: l
    };
    let d;
    o >= 0 ? e ? d = e.slice(o, o + c) : d = new Float64Array(0) : d = void 0, n.push({
      varRef: {
        varSpec: u
      },
      points: d
    });
  }
  return n;
}
var ModelListing = class {
  constructor(t) {
    this.varSpecs = /* @__PURE__ */ new Map();
    const e = /* @__PURE__ */ new Map();
    for (const i of t.dimensions) {
      const a = i.id, s = [];
      for (let _ = 0; _ < i.subIds.length; _++)
        s.push({
          id: i.subIds[_],
          index: _
        });
      e.set(a, {
        id: a,
        subscripts: s
      });
    }
    function n(i) {
      const a = e.get(i);
      if (a === void 0)
        throw new Error(`No dimension info found for id=${i}`);
      return a;
    }
    const r = /* @__PURE__ */ new Set();
    for (const i of t.variables) {
      const a = varIdWithoutSubscripts(i.id);
      if (!r.has(a)) {
        const _ = (i.dimIds || []).map(n);
        if (_.length > 0) {
          const l = [];
          for (const c of _)
            l.push(c.subscripts);
          const o = cartesianProductOf(l);
          for (const c of o) {
            const u = c.map((h) => h.id).join(","), d = c.map((h) => h.index), f = `${a}[${u}]`;
            this.varSpecs.set(f, {
              varIndex: i.index,
              subscriptIndices: d
            });
          }
        } else
          this.varSpecs.set(a, {
            varIndex: i.index
          });
        r.add(a);
      }
    }
  }
  /**
   * Return the `VarSpec` for the given variable ID, or undefined if there is no spec defined
   * in the listing for that variable.
   */
  getSpecForVarId(t) {
    return this.varSpecs.get(t);
  }
  /**
   * Return the `VarSpec` for the given variable name, or undefined if there is no spec defined
   * in the listing for that variable.
   */
  getSpecForVarName(t) {
    const e = sdeVarIdForVensimVarName(t);
    return this.varSpecs.get(e);
  }
  /**
   * Create a new `Outputs` instance that uses the same start/end years as the given "normal"
   * `Outputs` instance but is prepared for reading the specified internal variables from the model.
   *
   * @param normalOutputs The `Outputs` that is used to access normal output variables from the model.
   * @param varIds The variable IDs to include with the new `Outputs` instance.
   */
  deriveOutputs(t, e) {
    const n = [];
    for (const i of e) {
      const a = this.varSpecs.get(i);
      a !== void 0 ? n.push(a) : console.warn(`WARNING: No output var spec found for id=${i}`);
    }
    const r = new Outputs(e, t.startTime, t.endTime, t.saveFreq);
    return r.varSpecs = n, r;
  }
};
function varIdWithoutSubscripts(t) {
  const e = t.indexOf("[");
  return e >= 0 ? t.substring(0, e) : t;
}
function cartesianProductOf(t) {
  return t.reduce(
    (e, n) => e.map((r) => n.map((i) => r.concat([i]))).reduce((r, i) => r.concat(i), []),
    [[]]
  );
}
function sdeVarIdForVensimName(t) {
  return "_" + t.trim().replace(/"/g, "_").replace(/\s+!$/g, "!").replace(/\s/g, "_").replace(/,/g, "_").replace(/-/g, "_").replace(/\./g, "_").replace(/\$/g, "_").replace(/'/g, "_").replace(/&/g, "_").replace(/%/g, "_").replace(/\//g, "_").replace(/\|/g, "_").toLowerCase();
}
function sdeVarIdForVensimVarName(t) {
  const e = t.match(/([^[]+)(?:\[([^\]]+)\])?/);
  if (!e)
    throw new Error(`Invalid Vensim name: ${t}`);
  let n = sdeVarIdForVensimName(e[1]);
  if (e[2]) {
    const r = e[2].split(",").map((i) => sdeVarIdForVensimName(i));
    n += `[${r.join(",")}]`;
  }
  return n;
}
function resolveVarRef(t, e, n) {
  if (!e.varSpec) {
    if (t === void 0)
      throw new Error(
        `Unable to resolve ${n} variable references by name or identifier when model listing is unavailable`
      );
    if (e.varId) {
      const r = t?.getSpecForVarId(e.varId);
      if (r)
        e.varSpec = r;
      else
        throw new Error(`Failed to resolve ${n} variable reference for varId=${e.varId}`);
    } else {
      const r = t?.getSpecForVarName(e.varName);
      if (r)
        e.varSpec = r;
      else
        throw new Error(`Failed to resolve ${n} variable reference for varName='${e.varId}'`);
    }
  }
}
var headerLengthInElements = 20, extrasLengthInElements = 1, Int32Section = class {
  constructor() {
    this.offsetInBytes = 0, this.lengthInElements = 0;
  }
  update(t, e, n) {
    this.view = n > 0 ? new Int32Array(t, e, n) : void 0, this.offsetInBytes = e, this.lengthInElements = n;
  }
}, Float64Section = class {
  constructor() {
    this.offsetInBytes = 0, this.lengthInElements = 0;
  }
  update(t, e, n) {
    this.view = n > 0 ? new Float64Array(t, e, n) : void 0, this.offsetInBytes = e, this.lengthInElements = n;
  }
}, BufferedRunModelParams = class {
  /**
   * @param listing The model listing that is used to locate a variable that is referenced by
   * name or identifier.  If undefined, variables cannot be referenced by name or identifier,
   * and can only be referenced using a valid `VarSpec`.
   */
  constructor(t) {
    this.listing = t, this.header = new Int32Section(), this.extras = new Float64Section(), this.inputs = new Float64Section(), this.outputs = new Float64Section(), this.outputIndices = new Int32Section(), this.constants = new Float64Section(), this.constantIndices = new Int32Section(), this.lookups = new Float64Section(), this.lookupIndices = new Int32Section();
  }
  /**
   * Return the encoded buffer from this instance, which can be passed to `updateFromEncodedBuffer`.
   */
  getEncodedBuffer() {
    return this.encoded;
  }
  // from RunModelParams interface
  getInputs() {
    return this.inputs.view;
  }
  // from RunModelParams interface
  copyInputs(t, e) {
    this.inputs.lengthInElements !== 0 && ((t === void 0 || t.length < this.inputs.lengthInElements) && (t = e(this.inputs.lengthInElements)), t.set(this.inputs.view));
  }
  // from RunModelParams interface
  getOutputIndicesLength() {
    return this.outputIndices.lengthInElements;
  }
  // from RunModelParams interface
  getOutputIndices() {
    return this.outputIndices.view;
  }
  // from RunModelParams interface
  copyOutputIndices(t, e) {
    this.outputIndices.lengthInElements !== 0 && ((t === void 0 || t.length < this.outputIndices.lengthInElements) && (t = e(this.outputIndices.lengthInElements)), t.set(this.outputIndices.view));
  }
  // from RunModelParams interface
  getOutputsLength() {
    return this.outputs.lengthInElements;
  }
  // from RunModelParams interface
  getOutputs() {
    return this.outputs.view;
  }
  // from RunModelParams interface
  getOutputsObject() {
  }
  // from RunModelParams interface
  storeOutputs(t) {
    this.outputs.view !== void 0 && (t.length > this.outputs.view.length ? this.outputs.view.set(t.subarray(0, this.outputs.view.length)) : this.outputs.view.set(t));
  }
  // from RunModelParams interface
  getConstants() {
    if (this.constantIndices.lengthInElements !== 0)
      return decodeConstants(this.constantIndices.view, this.constants.view);
  }
  // from RunModelParams interface
  getLookups() {
    if (this.lookupIndices.lengthInElements !== 0)
      return decodeLookups(this.lookupIndices.view, this.lookups.view);
  }
  // from RunModelParams interface
  getElapsedTime() {
    return this.extras.view[0];
  }
  // from RunModelParams interface
  storeElapsedTime(t) {
    this.extras.view[0] = t;
  }
  /**
   * Copy the outputs buffer to the given `Outputs` instance.  This should be called
   * after the `runModel` call has completed so that the output values are copied from
   * the internal buffer to the `Outputs` instance that was passed to `runModel`.
   *
   * @param outputs The `Outputs` instance into which the output values will be copied.
   */
  finalizeOutputs(t) {
    this.outputs.view && t.updateFromBuffer(this.outputs.view, t.seriesLength), t.runTimeInMillis = this.getElapsedTime();
  }
  /**
   * Update this instance using the parameters that are passed to a `runModel` call.
   *
   * @param inputs The model input values (must be in the same order as in the spec file).
   * @param outputs The structure into which the model outputs will be stored.
   * @param options Additional options that influence the model run.
   */
  updateFromParams(t, e, n) {
    const r = t.length, i = e.varIds.length * e.seriesLength;
    let a;
    const s = e.varSpecs;
    s !== void 0 && s.length > 0 ? a = getEncodedVarIndicesLength(s) : a = 0;
    let _, l;
    if (n?.constants !== void 0 && n.constants.length > 0) {
      for (const M of n.constants)
        resolveVarRef(this.listing, M.varRef, "constant");
      const S = getEncodedConstantBufferLengths(n.constants);
      _ = S.constantsLength, l = S.constantIndicesLength;
    } else
      _ = 0, l = 0;
    let o, c;
    if (n?.lookups !== void 0 && n.lookups.length > 0) {
      for (const M of n.lookups)
        resolveVarRef(this.listing, M.varRef, "lookup");
      const S = getEncodedLookupBufferLengths(n.lookups);
      o = S.lookupsLength, c = S.lookupIndicesLength;
    } else
      o = 0, c = 0;
    let u = 0;
    function d(S, M) {
      const O = u, N = S === "float64" ? Float64Array.BYTES_PER_ELEMENT : Int32Array.BYTES_PER_ELEMENT, C = Math.round(M * N), x = Math.ceil(C / 8) * 8;
      return u += x, O;
    }
    const f = d("int32", headerLengthInElements), h = d("float64", extrasLengthInElements), p = d("float64", r), m = d("float64", i), v = d("int32", a), g = d("float64", _), b = d("int32", l), I = d("float64", o), w = d("int32", c), k = u;
    if (this.encoded === void 0 || this.encoded.byteLength < k) {
      const S = Math.ceil(k * 1.2);
      this.encoded = new ArrayBuffer(S), this.header.update(this.encoded, f, headerLengthInElements);
    }
    const y = this.header.view;
    let E = 0;
    y[E++] = h, y[E++] = extrasLengthInElements, y[E++] = p, y[E++] = r, y[E++] = m, y[E++] = i, y[E++] = v, y[E++] = a, y[E++] = g, y[E++] = _, y[E++] = b, y[E++] = l, y[E++] = I, y[E++] = o, y[E++] = w, y[E++] = c, this.inputs.update(this.encoded, p, r), this.extras.update(this.encoded, h, extrasLengthInElements), this.outputs.update(this.encoded, m, i), this.outputIndices.update(this.encoded, v, a), this.constants.update(this.encoded, g, _), this.constantIndices.update(this.encoded, b, l), this.lookups.update(this.encoded, I, o), this.lookupIndices.update(this.encoded, w, c);
    const T = this.inputs.view;
    for (let S = 0; S < t.length; S++) {
      const M = t[S];
      typeof M == "number" ? T[S] = M : T[S] = M.get();
    }
    this.outputIndices.view && encodeVarIndices(s, this.outputIndices.view), l > 0 && encodeConstants(n.constants, this.constantIndices.view, this.constants.view), c > 0 && encodeLookups(n.lookups, this.lookupIndices.view, this.lookups.view);
  }
  /**
   * Update this instance using the values contained in the encoded buffer from another
   * `BufferedRunModelParams` instance.
   *
   * @param buffer An encoded buffer returned by `getEncodedBuffer`.
   */
  updateFromEncodedBuffer(t) {
    const e = headerLengthInElements * Int32Array.BYTES_PER_ELEMENT;
    if (t.byteLength < e)
      throw new Error("Buffer must be long enough to contain header section");
    this.encoded = t, this.header.update(this.encoded, 0, headerLengthInElements);
    const r = this.header.view;
    let i = 0;
    const a = r[i++], s = r[i++], _ = r[i++], l = r[i++], o = r[i++], c = r[i++], u = r[i++], d = r[i++], f = r[i++], h = r[i++], p = r[i++], m = r[i++], v = r[i++], g = r[i++], b = r[i++], I = r[i++], w = s * Float64Array.BYTES_PER_ELEMENT, k = l * Float64Array.BYTES_PER_ELEMENT, y = c * Float64Array.BYTES_PER_ELEMENT, E = d * Int32Array.BYTES_PER_ELEMENT, T = h * Float64Array.BYTES_PER_ELEMENT, S = m * Int32Array.BYTES_PER_ELEMENT, M = g * Float64Array.BYTES_PER_ELEMENT, O = I * Int32Array.BYTES_PER_ELEMENT, N = e + w + k + y + E + T + S + M + O;
    if (t.byteLength < N)
      throw new Error("Buffer must be long enough to contain sections declared in header");
    this.extras.update(this.encoded, a, s), this.inputs.update(this.encoded, _, l), this.outputs.update(this.encoded, o, c), this.outputIndices.update(this.encoded, u, d), this.constants.update(this.encoded, f, h), this.constantIndices.update(this.encoded, p, m), this.lookups.update(this.encoded, v, g), this.lookupIndices.update(this.encoded, b, I);
  }
};
async function spawnAsyncModelRunner(t) {
  return t.path ? spawnAsyncModelRunnerWithWorker(new Worker$1(t.path)) : spawnAsyncModelRunnerWithWorker(BlobWorker.fromText(t.source));
}
async function spawnAsyncModelRunnerWithWorker(t) {
  const e = await spawn(t), n = await e.initModel(), r = n.modelListing ? new ModelListing(n.modelListing) : void 0, i = new BufferedRunModelParams(r);
  let a = !1, s = !1;
  return {
    createOutputs: () => new Outputs(n.outputVarIds, n.startTime, n.endTime, n.saveFreq),
    runModel: async (_, l, o) => {
      if (s)
        throw new Error("Async model runner has already been terminated");
      if (a)
        throw new Error("Async model runner only supports one `runModel` call at a time");
      a = !0, i.updateFromParams(_, l, o);
      let c;
      try {
        c = await e.runModel(Transfer(i.getEncodedBuffer()));
      } finally {
        a = !1;
      }
      return i.updateFromEncodedBuffer(c), i.finalizeOutputs(l), l;
    },
    terminate: () => s ? Promise.resolve() : (s = !0, Thread.terminate(e))
  };
}
var assertNever = {}, hasRequiredAssertNever;
function requireAssertNever() {
  if (hasRequiredAssertNever) return assertNever;
  hasRequiredAssertNever = 1, Object.defineProperty(assertNever, "__esModule", { value: !0 }), assertNever.assertNever = t;
  function t(e, n) {
    if (typeof n == "string")
      throw new Error(n);
    if (typeof n == "function")
      throw new Error(n(e));
    if (n)
      return e;
    throw new Error("Unhandled discriminated union member: ".concat(JSON.stringify(e)));
  }
  return assertNever.default = t, assertNever;
}
var assertNeverExports = requireAssertNever();
function __awaiter(t, e, n, r) {
  function i(a) {
    return a instanceof n ? a : new n(function(s) {
      s(a);
    });
  }
  return new (n || (n = Promise))(function(a, s) {
    function _(c) {
      try {
        o(r.next(c));
      } catch (u) {
        s(u);
      }
    }
    function l(c) {
      try {
        o(r.throw(c));
      } catch (u) {
        s(u);
      }
    }
    function o(c) {
      c.done ? a(c.value) : i(c.value).then(_, l);
    }
    o((r = r.apply(t, [])).next());
  });
}
function __generator(t, e) {
  var n = { label: 0, sent: function() {
    if (a[0] & 1) throw a[1];
    return a[1];
  }, trys: [], ops: [] }, r, i, a, s;
  return s = { next: _(0), throw: _(1), return: _(2) }, typeof Symbol == "function" && (s[Symbol.iterator] = function() {
    return this;
  }), s;
  function _(o) {
    return function(c) {
      return l([o, c]);
    };
  }
  function l(o) {
    if (r) throw new TypeError("Generator is already executing.");
    for (; n; ) try {
      if (r = 1, i && (a = o[0] & 2 ? i.return : o[0] ? i.throw || ((a = i.return) && a.call(i), 0) : i.next) && !(a = a.call(i, o[1])).done) return a;
      switch (i = 0, a && (o = [o[0] & 2, a.value]), o[0]) {
        case 0:
        case 1:
          a = o;
          break;
        case 4:
          return n.label++, { value: o[1], done: !1 };
        case 5:
          n.label++, i = o[1], o = [0];
          continue;
        case 7:
          o = n.ops.pop(), n.trys.pop();
          continue;
        default:
          if (a = n.trys, !(a = a.length > 0 && a[a.length - 1]) && (o[0] === 6 || o[0] === 2)) {
            n = 0;
            continue;
          }
          if (o[0] === 3 && (!a || o[1] > a[0] && o[1] < a[3])) {
            n.label = o[1];
            break;
          }
          if (o[0] === 6 && n.label < a[1]) {
            n.label = a[1], a = o;
            break;
          }
          if (a && n.label < a[2]) {
            n.label = a[2], n.ops.push(o);
            break;
          }
          a[2] && n.ops.pop(), n.trys.pop();
          continue;
      }
      o = e.call(t, n);
    } catch (c) {
      o = [6, c], i = 0;
    } finally {
      r = a = 0;
    }
    if (o[0] & 5) throw o[1];
    return { value: o[0] ? o[1] : void 0, done: !0 };
  }
}
function __read(t, e) {
  var n = typeof Symbol == "function" && t[Symbol.iterator];
  if (!n) return t;
  var r = n.call(t), i, a = [], s;
  try {
    for (; (e === void 0 || e-- > 0) && !(i = r.next()).done; ) a.push(i.value);
  } catch (_) {
    s = { error: _ };
  } finally {
    try {
      i && !i.done && (n = r.return) && n.call(r);
    } finally {
      if (s) throw s.error;
    }
  }
  return a;
}
function __spreadArray(t, e, n) {
  if (arguments.length === 2) for (var r = 0, i = e.length, a; r < i; r++)
    (a || !(r in e)) && (a || (a = Array.prototype.slice.call(e, 0, r)), a[r] = e[r]);
  return t.concat(a || Array.prototype.slice.call(e));
}
var defaultErrorConfig = {
  withStackTrace: !1
}, createNeverThrowError = function(t, e, n) {
  n === void 0 && (n = defaultErrorConfig);
  var r = e.isOk() ? { type: "Ok", value: e.value } : { type: "Err", value: e.error }, i = n.withStackTrace ? new Error().stack : void 0;
  return {
    data: r,
    message: t,
    stack: i
  };
}, Result;
(function(t) {
  function e(n, r) {
    return function() {
      for (var i = [], a = 0; a < arguments.length; a++)
        i[a] = arguments[a];
      try {
        var s = n.apply(void 0, __spreadArray([], __read(i), !1));
        return ok(s);
      } catch (_) {
        return err(r ? r(_) : _);
      }
    };
  }
  t.fromThrowable = e;
})(Result || (Result = {}));
var ok = function(t) {
  return new Ok(t);
}, err = function(t) {
  return new Err(t);
}, Ok = (
  /** @class */
  (function() {
    function t(e) {
      this.value = e;
    }
    return t.prototype.isOk = function() {
      return !0;
    }, t.prototype.isErr = function() {
      return !this.isOk();
    }, t.prototype.map = function(e) {
      return ok(e(this.value));
    }, t.prototype.mapErr = function(e) {
      return ok(this.value);
    }, t.prototype.andThen = function(e) {
      return e(this.value);
    }, t.prototype.orElse = function(e) {
      return ok(this.value);
    }, t.prototype.asyncAndThen = function(e) {
      return e(this.value);
    }, t.prototype.asyncMap = function(e) {
      return ResultAsync.fromSafePromise(e(this.value));
    }, t.prototype.unwrapOr = function(e) {
      return this.value;
    }, t.prototype.match = function(e, n) {
      return e(this.value);
    }, t.prototype._unsafeUnwrap = function(e) {
      return this.value;
    }, t.prototype._unsafeUnwrapErr = function(e) {
      throw createNeverThrowError("Called `_unsafeUnwrapErr` on an Ok", this, e);
    }, t;
  })()
), Err = (
  /** @class */
  (function() {
    function t(e) {
      this.error = e;
    }
    return t.prototype.isOk = function() {
      return !1;
    }, t.prototype.isErr = function() {
      return !this.isOk();
    }, t.prototype.map = function(e) {
      return err(this.error);
    }, t.prototype.mapErr = function(e) {
      return err(e(this.error));
    }, t.prototype.andThen = function(e) {
      return err(this.error);
    }, t.prototype.orElse = function(e) {
      return e(this.error);
    }, t.prototype.asyncAndThen = function(e) {
      return errAsync(this.error);
    }, t.prototype.asyncMap = function(e) {
      return errAsync(this.error);
    }, t.prototype.unwrapOr = function(e) {
      return e;
    }, t.prototype.match = function(e, n) {
      return n(this.error);
    }, t.prototype._unsafeUnwrap = function(e) {
      throw createNeverThrowError("Called `_unsafeUnwrap` on an Err", this, e);
    }, t.prototype._unsafeUnwrapErr = function(e) {
      return this.error;
    }, t;
  })()
);
Result.fromThrowable;
var ResultAsync = (
  /** @class */
  (function() {
    function t(e) {
      this._promise = e;
    }
    return t.fromSafePromise = function(e) {
      var n = e.then(function(r) {
        return new Ok(r);
      });
      return new t(n);
    }, t.fromPromise = function(e, n) {
      var r = e.then(function(i) {
        return new Ok(i);
      }).catch(function(i) {
        return new Err(n(i));
      });
      return new t(r);
    }, t.prototype.map = function(e) {
      var n = this;
      return new t(this._promise.then(function(r) {
        return __awaiter(n, void 0, void 0, function() {
          var i;
          return __generator(this, function(a) {
            switch (a.label) {
              case 0:
                return r.isErr() ? [2, new Err(r.error)] : (i = Ok.bind, [4, e(r.value)]);
              case 1:
                return [2, new (i.apply(Ok, [void 0, a.sent()]))()];
            }
          });
        });
      }));
    }, t.prototype.mapErr = function(e) {
      var n = this;
      return new t(this._promise.then(function(r) {
        return __awaiter(n, void 0, void 0, function() {
          var i;
          return __generator(this, function(a) {
            switch (a.label) {
              case 0:
                return r.isOk() ? [2, new Ok(r.value)] : (i = Err.bind, [4, e(r.error)]);
              case 1:
                return [2, new (i.apply(Err, [void 0, a.sent()]))()];
            }
          });
        });
      }));
    }, t.prototype.andThen = function(e) {
      return new t(this._promise.then(function(n) {
        if (n.isErr())
          return new Err(n.error);
        var r = e(n.value);
        return r instanceof t ? r._promise : r;
      }));
    }, t.prototype.orElse = function(e) {
      var n = this;
      return new t(this._promise.then(function(r) {
        return __awaiter(n, void 0, void 0, function() {
          return __generator(this, function(i) {
            return r.isErr() ? [2, e(r.error)] : [2, new Ok(r.value)];
          });
        });
      }));
    }, t.prototype.match = function(e, n) {
      return this._promise.then(function(r) {
        return r.match(e, n);
      });
    }, t.prototype.unwrapOr = function(e) {
      return this._promise.then(function(n) {
        return n.unwrapOr(e);
      });
    }, t.prototype.then = function(e, n) {
      return this._promise.then(e, n);
    }, t;
  })()
), errAsync = function(t) {
  return new ResultAsync(Promise.resolve(new Err(t)));
};
ResultAsync.fromPromise;
ResultAsync.fromSafePromise;
const ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias"), DOC = /* @__PURE__ */ Symbol.for("yaml.document"), MAP = /* @__PURE__ */ Symbol.for("yaml.map"), PAIR = /* @__PURE__ */ Symbol.for("yaml.pair"), SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar"), SEQ = /* @__PURE__ */ Symbol.for("yaml.seq"), NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type"), isAlias = (t) => !!t && typeof t == "object" && t[NODE_TYPE] === ALIAS, isDocument = (t) => !!t && typeof t == "object" && t[NODE_TYPE] === DOC, isMap = (t) => !!t && typeof t == "object" && t[NODE_TYPE] === MAP, isPair = (t) => !!t && typeof t == "object" && t[NODE_TYPE] === PAIR, isScalar = (t) => !!t && typeof t == "object" && t[NODE_TYPE] === SCALAR, isSeq = (t) => !!t && typeof t == "object" && t[NODE_TYPE] === SEQ;
function isCollection(t) {
  if (t && typeof t == "object")
    switch (t[NODE_TYPE]) {
      case MAP:
      case SEQ:
        return !0;
    }
  return !1;
}
function isNode(t) {
  if (t && typeof t == "object")
    switch (t[NODE_TYPE]) {
      case ALIAS:
      case MAP:
      case SCALAR:
      case SEQ:
        return !0;
    }
  return !1;
}
const hasAnchor = (t) => (isScalar(t) || isCollection(t)) && !!t.anchor, BREAK = /* @__PURE__ */ Symbol("break visit"), SKIP = /* @__PURE__ */ Symbol("skip children"), REMOVE = /* @__PURE__ */ Symbol("remove node");
function visit(t, e) {
  const n = initVisitor(e);
  isDocument(t) ? visit_(null, t.contents, n, Object.freeze([t])) === REMOVE && (t.contents = null) : visit_(null, t, n, Object.freeze([]));
}
visit.BREAK = BREAK;
visit.SKIP = SKIP;
visit.REMOVE = REMOVE;
function visit_(t, e, n, r) {
  const i = callVisitor(t, e, n, r);
  if (isNode(i) || isPair(i))
    return replaceNode(t, r, i), visit_(t, i, n, r);
  if (typeof i != "symbol") {
    if (isCollection(e)) {
      r = Object.freeze(r.concat(e));
      for (let a = 0; a < e.items.length; ++a) {
        const s = visit_(a, e.items[a], n, r);
        if (typeof s == "number")
          a = s - 1;
        else {
          if (s === BREAK)
            return BREAK;
          s === REMOVE && (e.items.splice(a, 1), a -= 1);
        }
      }
    } else if (isPair(e)) {
      r = Object.freeze(r.concat(e));
      const a = visit_("key", e.key, n, r);
      if (a === BREAK)
        return BREAK;
      a === REMOVE && (e.key = null);
      const s = visit_("value", e.value, n, r);
      if (s === BREAK)
        return BREAK;
      s === REMOVE && (e.value = null);
    }
  }
  return i;
}
function initVisitor(t) {
  return typeof t == "object" && (t.Collection || t.Node || t.Value) ? Object.assign({
    Alias: t.Node,
    Map: t.Node,
    Scalar: t.Node,
    Seq: t.Node
  }, t.Value && {
    Map: t.Value,
    Scalar: t.Value,
    Seq: t.Value
  }, t.Collection && {
    Map: t.Collection,
    Seq: t.Collection
  }, t) : t;
}
function callVisitor(t, e, n, r) {
  if (typeof n == "function")
    return n(t, e, r);
  if (isMap(e))
    return n.Map?.(t, e, r);
  if (isSeq(e))
    return n.Seq?.(t, e, r);
  if (isPair(e))
    return n.Pair?.(t, e, r);
  if (isScalar(e))
    return n.Scalar?.(t, e, r);
  if (isAlias(e))
    return n.Alias?.(t, e, r);
}
function replaceNode(t, e, n) {
  const r = e[e.length - 1];
  if (isCollection(r))
    r.items[t] = n;
  else if (isPair(r))
    t === "key" ? r.key = n : r.value = n;
  else if (isDocument(r))
    r.contents = n;
  else {
    const i = isAlias(r) ? "alias" : "scalar";
    throw new Error(`Cannot replace node with ${i} parent`);
  }
}
function anchorIsValid(t) {
  if (/[\x00-\x19\s,[\]{}]/.test(t)) {
    const n = `Anchor must not contain whitespace or control characters: ${JSON.stringify(t)}`;
    throw new Error(n);
  }
  return !0;
}
function applyReviver(t, e, n, r) {
  if (r && typeof r == "object")
    if (Array.isArray(r))
      for (let i = 0, a = r.length; i < a; ++i) {
        const s = r[i], _ = applyReviver(t, r, String(i), s);
        _ === void 0 ? delete r[i] : _ !== s && (r[i] = _);
      }
    else if (r instanceof Map)
      for (const i of Array.from(r.keys())) {
        const a = r.get(i), s = applyReviver(t, r, i, a);
        s === void 0 ? r.delete(i) : s !== a && r.set(i, s);
      }
    else if (r instanceof Set)
      for (const i of Array.from(r)) {
        const a = applyReviver(t, r, i, i);
        a === void 0 ? r.delete(i) : a !== i && (r.delete(i), r.add(a));
      }
    else
      for (const [i, a] of Object.entries(r)) {
        const s = applyReviver(t, r, i, a);
        s === void 0 ? delete r[i] : s !== a && (r[i] = s);
      }
  return t.call(e, n, r);
}
function toJS(t, e, n) {
  if (Array.isArray(t))
    return t.map((r, i) => toJS(r, String(i), n));
  if (t && typeof t.toJSON == "function") {
    if (!n || !hasAnchor(t))
      return t.toJSON(e, n);
    const r = { aliasCount: 0, count: 1, res: void 0 };
    n.anchors.set(t, r), n.onCreate = (a) => {
      r.res = a, delete n.onCreate;
    };
    const i = t.toJSON(e, n);
    return n.onCreate && n.onCreate(i), i;
  }
  return typeof t == "bigint" && !n?.keep ? Number(t) : t;
}
class NodeBase {
  constructor(e) {
    Object.defineProperty(this, NODE_TYPE, { value: e });
  }
  /** Create a copy of this node.  */
  clone() {
    const e = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    return this.range && (e.range = this.range.slice()), e;
  }
  /** A plain JavaScript representation of this node. */
  toJS(e, { mapAsMap: n, maxAliasCount: r, onAnchor: i, reviver: a } = {}) {
    if (!isDocument(e))
      throw new TypeError("A document argument is required");
    const s = {
      anchors: /* @__PURE__ */ new Map(),
      doc: e,
      keep: !0,
      mapAsMap: n === !0,
      mapKeyWarned: !1,
      maxAliasCount: typeof r == "number" ? r : 100
    }, _ = toJS(this, "", s);
    if (typeof i == "function")
      for (const { count: l, res: o } of s.anchors.values())
        i(o, l);
    return typeof a == "function" ? applyReviver(a, { "": _ }, "", _) : _;
  }
}
class Alias extends NodeBase {
  constructor(e) {
    super(ALIAS), this.source = e, Object.defineProperty(this, "tag", {
      set() {
        throw new Error("Alias nodes cannot have tags");
      }
    });
  }
  /**
   * Resolve the value of this alias within `doc`, finding the last
   * instance of the `source` anchor before this node.
   */
  resolve(e, n) {
    if (n?.maxAliasCount === 0)
      throw new ReferenceError("Alias resolution is disabled");
    let r;
    n?.aliasResolveCache ? r = n.aliasResolveCache : (r = [], visit(e, {
      Node: (a, s) => {
        (isAlias(s) || hasAnchor(s)) && r.push(s);
      }
    }), n && (n.aliasResolveCache = r));
    let i;
    for (const a of r) {
      if (a === this)
        break;
      a.anchor === this.source && (i = a);
    }
    return i;
  }
  toJSON(e, n) {
    if (!n)
      return { source: this.source };
    const { anchors: r, doc: i, maxAliasCount: a } = n, s = this.resolve(i, n);
    if (!s) {
      const l = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
      throw new ReferenceError(l);
    }
    let _ = r.get(s);
    if (_ || (toJS(s, null, n), _ = r.get(s)), _?.res === void 0) {
      const l = "This should not happen: Alias anchor was not resolved?";
      throw new ReferenceError(l);
    }
    if (a >= 0 && (_.count += 1, _.aliasCount === 0 && (_.aliasCount = getAliasCount(i, s, r)), _.count * _.aliasCount > a)) {
      const l = "Excessive alias count indicates a resource exhaustion attack";
      throw new ReferenceError(l);
    }
    return _.res;
  }
  toString(e, n, r) {
    const i = `*${this.source}`;
    if (e) {
      if (anchorIsValid(this.source), e.options.verifyAliasOrder && !e.anchors.has(this.source)) {
        const a = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new Error(a);
      }
      if (e.implicitKey)
        return `${i} `;
    }
    return i;
  }
}
function getAliasCount(t, e, n) {
  if (isAlias(e)) {
    const r = e.resolve(t), i = n && r && n.get(r);
    return i ? i.count * i.aliasCount : 0;
  } else if (isCollection(e)) {
    let r = 0;
    for (const i of e.items) {
      const a = getAliasCount(t, i, n);
      a > r && (r = a);
    }
    return r;
  } else if (isPair(e)) {
    const r = getAliasCount(t, e.key, n), i = getAliasCount(t, e.value, n);
    return Math.max(r, i);
  }
  return 1;
}
const isScalarValue = (t) => !t || typeof t != "function" && typeof t != "object";
class Scalar extends NodeBase {
  constructor(e) {
    super(SCALAR), this.value = e;
  }
  toJSON(e, n) {
    return n?.keep ? this.value : toJS(this.value, e, n);
  }
  toString() {
    return String(this.value);
  }
}
Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
Scalar.PLAIN = "PLAIN";
Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
function findTagObject(t, e, n) {
  return n.find((r) => r.identify?.(t) && !r.format);
}
function createNode(t, e, n) {
  if (isDocument(t) && (t = t.contents), isNode(t))
    return t;
  if (isPair(t)) {
    const u = n.schema[MAP].createNode?.(n.schema, null, n);
    return u.items.push(t), u;
  }
  (t instanceof String || t instanceof Number || t instanceof Boolean || typeof BigInt < "u" && t instanceof BigInt) && (t = t.valueOf());
  const { aliasDuplicateObjects: r, onAnchor: i, onTagObj: a, schema: s, sourceObjects: _ } = n;
  let l;
  if (r && t && typeof t == "object") {
    if (l = _.get(t), l)
      return l.anchor ?? (l.anchor = i(t)), new Alias(l.anchor);
    l = { anchor: null, node: null }, _.set(t, l);
  }
  let o = findTagObject(t, e, s.tags);
  if (!o) {
    if (t && typeof t.toJSON == "function" && (t = t.toJSON()), !t || typeof t != "object") {
      const u = new Scalar(t);
      return l && (l.node = u), u;
    }
    o = t instanceof Map ? s[MAP] : Symbol.iterator in Object(t) ? s[SEQ] : s[MAP];
  }
  a && (a(o), delete n.onTagObj);
  const c = o?.createNode ? o.createNode(n.schema, t, n) : typeof o?.nodeClass?.from == "function" ? o.nodeClass.from(n.schema, t, n) : new Scalar(t);
  return o.default || (c.tag = o.tag), l && (l.node = c), c;
}
function collectionFromPath(t, e, n) {
  let r = n;
  for (let i = e.length - 1; i >= 0; --i) {
    const a = e[i];
    if (typeof a == "number" && Number.isInteger(a) && a >= 0) {
      const s = [];
      s[a] = r, r = s;
    } else
      r = /* @__PURE__ */ new Map([[a, r]]);
  }
  return createNode(r, void 0, {
    aliasDuplicateObjects: !1,
    keepUndefined: !1,
    onAnchor: () => {
      throw new Error("This should not happen, please report a bug.");
    },
    schema: t,
    sourceObjects: /* @__PURE__ */ new Map()
  });
}
const isEmptyPath = (t) => t == null || typeof t == "object" && !!t[Symbol.iterator]().next().done;
class Collection extends NodeBase {
  constructor(e, n) {
    super(e), Object.defineProperty(this, "schema", {
      value: n,
      configurable: !0,
      enumerable: !1,
      writable: !0
    });
  }
  /**
   * Create a copy of this collection.
   *
   * @param schema - If defined, overwrites the original's schema
   */
  clone(e) {
    const n = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    return e && (n.schema = e), n.items = n.items.map((r) => isNode(r) || isPair(r) ? r.clone(e) : r), this.range && (n.range = this.range.slice()), n;
  }
  /**
   * Adds a value to the collection. For `!!map` and `!!omap` the value must
   * be a Pair instance or a `{ key, value }` object, which may not have a key
   * that already exists in the map.
   */
  addIn(e, n) {
    if (isEmptyPath(e))
      this.add(n);
    else {
      const [r, ...i] = e, a = this.get(r, !0);
      if (isCollection(a))
        a.addIn(i, n);
      else if (a === void 0 && this.schema)
        this.set(r, collectionFromPath(this.schema, i, n));
      else
        throw new Error(`Expected YAML collection at ${r}. Remaining path: ${i}`);
    }
  }
  /**
   * Removes a value from the collection.
   * @returns `true` if the item was found and removed.
   */
  deleteIn(e) {
    const [n, ...r] = e;
    if (r.length === 0)
      return this.delete(n);
    const i = this.get(n, !0);
    if (isCollection(i))
      return i.deleteIn(r);
    throw new Error(`Expected YAML collection at ${n}. Remaining path: ${r}`);
  }
  /**
   * Returns item at `key`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  getIn(e, n) {
    const [r, ...i] = e, a = this.get(r, !0);
    return i.length === 0 ? !n && isScalar(a) ? a.value : a : isCollection(a) ? a.getIn(i, n) : void 0;
  }
  hasAllNullValues(e) {
    return this.items.every((n) => {
      if (!isPair(n))
        return !1;
      const r = n.value;
      return r == null || e && isScalar(r) && r.value == null && !r.commentBefore && !r.comment && !r.tag;
    });
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   */
  hasIn(e) {
    const [n, ...r] = e;
    if (r.length === 0)
      return this.has(n);
    const i = this.get(n, !0);
    return isCollection(i) ? i.hasIn(r) : !1;
  }
  /**
   * Sets a value in this collection. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  setIn(e, n) {
    const [r, ...i] = e;
    if (i.length === 0)
      this.set(r, n);
    else {
      const a = this.get(r, !0);
      if (isCollection(a))
        a.setIn(i, n);
      else if (a === void 0 && this.schema)
        this.set(r, collectionFromPath(this.schema, i, n));
      else
        throw new Error(`Expected YAML collection at ${r}. Remaining path: ${i}`);
    }
  }
}
const stringifyComment = (t) => t.replace(/^(?!$)(?: $)?/gm, "#");
function indentComment(t, e) {
  return /^\n+$/.test(t) ? t.substring(1) : e ? t.replace(/^(?! *$)/gm, e) : t;
}
const lineComment = (t, e, n) => t.endsWith(`
`) ? indentComment(n, e) : n.includes(`
`) ? `
` + indentComment(n, e) : (t.endsWith(" ") ? "" : " ") + n, FOLD_FLOW = "flow", FOLD_BLOCK = "block", FOLD_QUOTED = "quoted";
function foldFlowLines(t, e, n = "flow", { indentAtStart: r, lineWidth: i = 80, minContentWidth: a = 20, onFold: s, onOverflow: _ } = {}) {
  if (!i || i < 0)
    return t;
  i < a && (a = 0);
  const l = Math.max(1 + a, 1 + i - e.length);
  if (t.length <= l)
    return t;
  const o = [], c = {};
  let u = i - e.length;
  typeof r == "number" && (r > i - Math.max(2, a) ? o.push(0) : u = i - r);
  let d, f, h = !1, p = -1, m = -1, v = -1;
  n === FOLD_BLOCK && (p = consumeMoreIndentedLines(t, p, e.length), p !== -1 && (u = p + l));
  for (let b; b = t[p += 1]; ) {
    if (n === FOLD_QUOTED && b === "\\") {
      switch (m = p, t[p + 1]) {
        case "x":
          p += 3;
          break;
        case "u":
          p += 5;
          break;
        case "U":
          p += 9;
          break;
        default:
          p += 1;
      }
      v = p;
    }
    if (b === `
`)
      n === FOLD_BLOCK && (p = consumeMoreIndentedLines(t, p, e.length)), u = p + e.length + l, d = void 0;
    else {
      if (b === " " && f && f !== " " && f !== `
` && f !== "	") {
        const I = t[p + 1];
        I && I !== " " && I !== `
` && I !== "	" && (d = p);
      }
      if (p >= u)
        if (d)
          o.push(d), u = d + l, d = void 0;
        else if (n === FOLD_QUOTED) {
          for (; f === " " || f === "	"; )
            f = b, b = t[p += 1], h = !0;
          const I = p > v + 1 ? p - 2 : m - 1;
          if (c[I])
            return t;
          o.push(I), c[I] = !0, u = I + l, d = void 0;
        } else
          h = !0;
    }
    f = b;
  }
  if (h && _ && _(), o.length === 0)
    return t;
  s && s();
  let g = t.slice(0, o[0]);
  for (let b = 0; b < o.length; ++b) {
    const I = o[b], w = o[b + 1] || t.length;
    I === 0 ? g = `
${e}${t.slice(0, w)}` : (n === FOLD_QUOTED && c[I] && (g += `${t[I]}\\`), g += `
${e}${t.slice(I + 1, w)}`);
  }
  return g;
}
function consumeMoreIndentedLines(t, e, n) {
  let r = e, i = e + 1, a = t[i];
  for (; a === " " || a === "	"; )
    if (e < i + n)
      a = t[++e];
    else {
      do
        a = t[++e];
      while (a && a !== `
`);
      r = e, i = e + 1, a = t[i];
    }
  return r;
}
const getFoldOptions = (t, e) => ({
  indentAtStart: e ? t.indent.length : t.indentAtStart,
  lineWidth: t.options.lineWidth,
  minContentWidth: t.options.minContentWidth
}), containsDocumentMarker = (t) => /^(%|---|\.\.\.)/m.test(t);
function lineLengthOverLimit(t, e, n) {
  if (!e || e < 0)
    return !1;
  const r = e - n, i = t.length;
  if (i <= r)
    return !1;
  for (let a = 0, s = 0; a < i; ++a)
    if (t[a] === `
`) {
      if (a - s > r)
        return !0;
      if (s = a + 1, i - s <= r)
        return !1;
    }
  return !0;
}
function doubleQuotedString(t, e) {
  const n = JSON.stringify(t);
  if (e.options.doubleQuotedAsJSON)
    return n;
  const { implicitKey: r } = e, i = e.options.doubleQuotedMinMultiLineLength, a = e.indent || (containsDocumentMarker(t) ? "  " : "");
  let s = "", _ = 0;
  for (let l = 0, o = n[l]; o; o = n[++l])
    if (o === " " && n[l + 1] === "\\" && n[l + 2] === "n" && (s += n.slice(_, l) + "\\ ", l += 1, _ = l, o = "\\"), o === "\\")
      switch (n[l + 1]) {
        case "u":
          {
            s += n.slice(_, l);
            const c = n.substr(l + 2, 4);
            switch (c) {
              case "0000":
                s += "\\0";
                break;
              case "0007":
                s += "\\a";
                break;
              case "000b":
                s += "\\v";
                break;
              case "001b":
                s += "\\e";
                break;
              case "0085":
                s += "\\N";
                break;
              case "00a0":
                s += "\\_";
                break;
              case "2028":
                s += "\\L";
                break;
              case "2029":
                s += "\\P";
                break;
              default:
                c.substr(0, 2) === "00" ? s += "\\x" + c.substr(2) : s += n.substr(l, 6);
            }
            l += 5, _ = l + 1;
          }
          break;
        case "n":
          if (r || n[l + 2] === '"' || n.length < i)
            l += 1;
          else {
            for (s += n.slice(_, l) + `

`; n[l + 2] === "\\" && n[l + 3] === "n" && n[l + 4] !== '"'; )
              s += `
`, l += 2;
            s += a, n[l + 2] === " " && (s += "\\"), l += 1, _ = l + 1;
          }
          break;
        default:
          l += 1;
      }
  return s = _ ? s + n.slice(_) : n, r ? s : foldFlowLines(s, a, FOLD_QUOTED, getFoldOptions(e, !1));
}
function singleQuotedString(t, e) {
  if (e.options.singleQuote === !1 || e.implicitKey && t.includes(`
`) || /[ \t]\n|\n[ \t]/.test(t))
    return doubleQuotedString(t, e);
  const n = e.indent || (containsDocumentMarker(t) ? "  " : ""), r = "'" + t.replace(/'/g, "''").replace(/\n+/g, `$&
${n}`) + "'";
  return e.implicitKey ? r : foldFlowLines(r, n, FOLD_FLOW, getFoldOptions(e, !1));
}
function quotedString(t, e) {
  const { singleQuote: n } = e.options;
  let r;
  if (n === !1)
    r = doubleQuotedString;
  else {
    const i = t.includes('"'), a = t.includes("'");
    i && !a ? r = singleQuotedString : a && !i ? r = doubleQuotedString : r = n ? singleQuotedString : doubleQuotedString;
  }
  return r(t, e);
}
let blockEndNewlines;
try {
  blockEndNewlines = new RegExp(`(^|(?<!
))
+(?!
|$)`, "g");
} catch {
  blockEndNewlines = /\n+(?!\n|$)/g;
}
function blockString({ comment: t, type: e, value: n }, r, i, a) {
  const { blockQuote: s, commentString: _, lineWidth: l } = r.options;
  if (!s || /\n[\t ]+$/.test(n))
    return quotedString(n, r);
  const o = r.indent || (r.forceBlockIndent || containsDocumentMarker(n) ? "  " : ""), c = s === "literal" ? !0 : s === "folded" || e === Scalar.BLOCK_FOLDED ? !1 : e === Scalar.BLOCK_LITERAL ? !0 : !lineLengthOverLimit(n, l, o.length);
  if (!n)
    return c ? `|
` : `>
`;
  let u, d;
  for (d = n.length; d > 0; --d) {
    const w = n[d - 1];
    if (w !== `
` && w !== "	" && w !== " ")
      break;
  }
  let f = n.substring(d);
  const h = f.indexOf(`
`);
  h === -1 ? u = "-" : n === f || h !== f.length - 1 ? (u = "+", a && a()) : u = "", f && (n = n.slice(0, -f.length), f[f.length - 1] === `
` && (f = f.slice(0, -1)), f = f.replace(blockEndNewlines, `$&${o}`));
  let p = !1, m, v = -1;
  for (m = 0; m < n.length; ++m) {
    const w = n[m];
    if (w === " ")
      p = !0;
    else if (w === `
`)
      v = m;
    else
      break;
  }
  let g = n.substring(0, v < m ? v + 1 : m);
  g && (n = n.substring(g.length), g = g.replace(/\n+/g, `$&${o}`));
  let I = (p ? o ? "2" : "1" : "") + u;
  if (t && (I += " " + _(t.replace(/ ?[\r\n]+/g, " ")), i && i()), !c) {
    const w = n.replace(/\n+/g, `
$&`).replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${o}`);
    let k = !1;
    const y = getFoldOptions(r, !0);
    s !== "folded" && e !== Scalar.BLOCK_FOLDED && (y.onOverflow = () => {
      k = !0;
    });
    const E = foldFlowLines(`${g}${w}${f}`, o, FOLD_BLOCK, y);
    if (!k)
      return `>${I}
${o}${E}`;
  }
  return n = n.replace(/\n+/g, `$&${o}`), `|${I}
${o}${g}${n}${f}`;
}
function plainString(t, e, n, r) {
  const { type: i, value: a } = t, { actualString: s, implicitKey: _, indent: l, indentStep: o, inFlow: c } = e;
  if (_ && a.includes(`
`) || c && /[[\]{},]/.test(a))
    return quotedString(a, e);
  if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(a))
    return _ || c || !a.includes(`
`) ? quotedString(a, e) : blockString(t, e, n, r);
  if (!_ && !c && i !== Scalar.PLAIN && a.includes(`
`))
    return blockString(t, e, n, r);
  if (containsDocumentMarker(a)) {
    if (l === "")
      return e.forceBlockIndent = !0, blockString(t, e, n, r);
    if (_ && l === o)
      return quotedString(a, e);
  }
  const u = a.replace(/\n+/g, `$&
${l}`);
  if (s) {
    const d = (p) => p.default && p.tag !== "tag:yaml.org,2002:str" && p.test?.test(u), { compat: f, tags: h } = e.doc.schema;
    if (h.some(d) || f?.some(d))
      return quotedString(a, e);
  }
  return _ ? u : foldFlowLines(u, l, FOLD_FLOW, getFoldOptions(e, !1));
}
function stringifyString(t, e, n, r) {
  const { implicitKey: i, inFlow: a } = e, s = typeof t.value == "string" ? t : Object.assign({}, t, { value: String(t.value) });
  let { type: _ } = t;
  _ !== Scalar.QUOTE_DOUBLE && /[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(s.value) && (_ = Scalar.QUOTE_DOUBLE);
  const l = (c) => {
    switch (c) {
      case Scalar.BLOCK_FOLDED:
      case Scalar.BLOCK_LITERAL:
        return i || a ? quotedString(s.value, e) : blockString(s, e, n, r);
      case Scalar.QUOTE_DOUBLE:
        return doubleQuotedString(s.value, e);
      case Scalar.QUOTE_SINGLE:
        return singleQuotedString(s.value, e);
      case Scalar.PLAIN:
        return plainString(s, e, n, r);
      default:
        return null;
    }
  };
  let o = l(_);
  if (o === null) {
    const { defaultKeyType: c, defaultStringType: u } = e.options, d = i && c || u;
    if (o = l(d), o === null)
      throw new Error(`Unsupported default string type ${d}`);
  }
  return o;
}
function createStringifyContext(t, e) {
  const n = Object.assign({
    blockQuote: !0,
    commentString: stringifyComment,
    defaultKeyType: null,
    defaultStringType: "PLAIN",
    directives: null,
    doubleQuotedAsJSON: !1,
    doubleQuotedMinMultiLineLength: 40,
    falseStr: "false",
    flowCollectionPadding: !0,
    indentSeq: !0,
    lineWidth: 80,
    minContentWidth: 20,
    nullStr: "null",
    simpleKeys: !1,
    singleQuote: null,
    trailingComma: !1,
    trueStr: "true",
    verifyAliasOrder: !0
  }, t.schema.toStringOptions, e);
  let r;
  switch (n.collectionStyle) {
    case "block":
      r = !1;
      break;
    case "flow":
      r = !0;
      break;
    default:
      r = null;
  }
  return {
    anchors: /* @__PURE__ */ new Set(),
    doc: t,
    flowCollectionPadding: n.flowCollectionPadding ? " " : "",
    indent: "",
    indentStep: typeof n.indent == "number" ? " ".repeat(n.indent) : "  ",
    inFlow: r,
    options: n
  };
}
function getTagObject(t, e) {
  if (e.tag) {
    const i = t.filter((a) => a.tag === e.tag);
    if (i.length > 0)
      return i.find((a) => a.format === e.format) ?? i[0];
  }
  let n, r;
  if (isScalar(e)) {
    r = e.value;
    let i = t.filter((a) => a.identify?.(r));
    if (i.length > 1) {
      const a = i.filter((s) => s.test);
      a.length > 0 && (i = a);
    }
    n = i.find((a) => a.format === e.format) ?? i.find((a) => !a.format);
  } else
    r = e, n = t.find((i) => i.nodeClass && r instanceof i.nodeClass);
  if (!n) {
    const i = r?.constructor?.name ?? (r === null ? "null" : typeof r);
    throw new Error(`Tag not resolved for ${i} value`);
  }
  return n;
}
function stringifyProps(t, e, { anchors: n, doc: r }) {
  if (!r.directives)
    return "";
  const i = [], a = (isScalar(t) || isCollection(t)) && t.anchor;
  a && anchorIsValid(a) && (n.add(a), i.push(`&${a}`));
  const s = t.tag ?? (e.default ? null : e.tag);
  return s && i.push(r.directives.tagString(s)), i.join(" ");
}
function stringify(t, e, n, r) {
  if (isPair(t))
    return t.toString(e, n, r);
  if (isAlias(t)) {
    if (e.doc.directives)
      return t.toString(e);
    if (e.resolvedAliases?.has(t))
      throw new TypeError("Cannot stringify circular structure without alias nodes");
    e.resolvedAliases ? e.resolvedAliases.add(t) : e.resolvedAliases = /* @__PURE__ */ new Set([t]), t = t.resolve(e.doc);
  }
  let i;
  const a = isNode(t) ? t : e.doc.createNode(t, { onTagObj: (l) => i = l });
  i ?? (i = getTagObject(e.doc.schema.tags, a));
  const s = stringifyProps(a, i, e);
  s.length > 0 && (e.indentAtStart = (e.indentAtStart ?? 0) + s.length + 1);
  const _ = typeof i.stringify == "function" ? i.stringify(a, e, n, r) : isScalar(a) ? stringifyString(a, e, n, r) : a.toString(e, n, r);
  return s ? isScalar(a) || _[0] === "{" || _[0] === "[" ? `${s} ${_}` : `${s}
${e.indent}${_}` : _;
}
function stringifyPair({ key: t, value: e }, n, r, i) {
  const { allNullValues: a, doc: s, indent: _, indentStep: l, options: { commentString: o, indentSeq: c, simpleKeys: u } } = n;
  let d = isNode(t) && t.comment || null;
  if (u) {
    if (d)
      throw new Error("With simple keys, key nodes cannot have comments");
    if (isCollection(t) || !isNode(t) && typeof t == "object") {
      const y = "With simple keys, collection cannot be used as a key value";
      throw new Error(y);
    }
  }
  let f = !u && (!t || d && e == null && !n.inFlow || isCollection(t) || (isScalar(t) ? t.type === Scalar.BLOCK_FOLDED || t.type === Scalar.BLOCK_LITERAL : typeof t == "object"));
  n = Object.assign({}, n, {
    allNullValues: !1,
    implicitKey: !f && (u || !a),
    indent: _ + l
  });
  let h = !1, p = !1, m = stringify(t, n, () => h = !0, () => p = !0);
  if (!f && !n.inFlow && m.length > 1024) {
    if (u)
      throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
    f = !0;
  }
  if (n.inFlow) {
    if (a || e == null)
      return h && r && r(), m === "" ? "?" : f ? `? ${m}` : m;
  } else if (a && !u || e == null && f)
    return m = `? ${m}`, d && !h ? m += lineComment(m, n.indent, o(d)) : p && i && i(), m;
  h && (d = null), f ? (d && (m += lineComment(m, n.indent, o(d))), m = `? ${m}
${_}:`) : (m = `${m}:`, d && (m += lineComment(m, n.indent, o(d))));
  let v, g, b;
  isNode(e) ? (v = !!e.spaceBefore, g = e.commentBefore, b = e.comment) : (v = !1, g = null, b = null, e && typeof e == "object" && (e = s.createNode(e))), n.implicitKey = !1, !f && !d && isScalar(e) && (n.indentAtStart = m.length + 1), p = !1, !c && l.length >= 2 && !n.inFlow && !f && isSeq(e) && !e.flow && !e.tag && !e.anchor && (n.indent = n.indent.substring(2));
  let I = !1;
  const w = stringify(e, n, () => I = !0, () => p = !0);
  let k = " ";
  if (d || v || g) {
    if (k = v ? `
` : "", g) {
      const y = o(g);
      k += `
${indentComment(y, n.indent)}`;
    }
    w === "" && !n.inFlow ? k === `
` && b && (k = `

`) : k += `
${n.indent}`;
  } else if (!f && isCollection(e)) {
    const y = w[0], E = w.indexOf(`
`), T = E !== -1, S = n.inFlow ?? e.flow ?? e.items.length === 0;
    if (T || !S) {
      let M = !1;
      if (T && (y === "&" || y === "!")) {
        let O = w.indexOf(" ");
        y === "&" && O !== -1 && O < E && w[O + 1] === "!" && (O = w.indexOf(" ", O + 1)), (O === -1 || E < O) && (M = !0);
      }
      M || (k = `
${n.indent}`);
    }
  } else (w === "" || w[0] === `
`) && (k = "");
  return m += k + w, n.inFlow ? I && r && r() : b && !I ? m += lineComment(m, n.indent, o(b)) : p && i && i(), m;
}
function warn(t, e) {
  (t === "debug" || t === "warn") && console.warn(e);
}
const MERGE_KEY = "<<", merge = {
  identify: (t) => t === MERGE_KEY || typeof t == "symbol" && t.description === MERGE_KEY,
  default: "key",
  tag: "tag:yaml.org,2002:merge",
  test: /^<<$/,
  resolve: () => Object.assign(new Scalar(Symbol(MERGE_KEY)), {
    addToJSMap: addMergeToJSMap
  }),
  stringify: () => MERGE_KEY
}, isMergeKey = (t, e) => (merge.identify(e) || isScalar(e) && (!e.type || e.type === Scalar.PLAIN) && merge.identify(e.value)) && t?.doc.schema.tags.some((n) => n.tag === merge.tag && n.default);
function addMergeToJSMap(t, e, n) {
  const r = resolveAliasValue(t, n);
  if (isSeq(r))
    for (const i of r.items)
      mergeValue(t, e, i);
  else if (Array.isArray(r))
    for (const i of r)
      mergeValue(t, e, i);
  else
    mergeValue(t, e, r);
}
function mergeValue(t, e, n) {
  const r = resolveAliasValue(t, n);
  if (!isMap(r))
    throw new Error("Merge sources must be maps or map aliases");
  const i = r.toJSON(null, t, Map);
  for (const [a, s] of i)
    e instanceof Map ? e.has(a) || e.set(a, s) : e instanceof Set ? e.add(a) : Object.prototype.hasOwnProperty.call(e, a) || Object.defineProperty(e, a, {
      value: s,
      writable: !0,
      enumerable: !0,
      configurable: !0
    });
  return e;
}
function resolveAliasValue(t, e) {
  return t && isAlias(e) ? e.resolve(t.doc, t) : e;
}
function addPairToJSMap(t, e, { key: n, value: r }) {
  if (isNode(n) && n.addToJSMap)
    n.addToJSMap(t, e, r);
  else if (isMergeKey(t, n))
    addMergeToJSMap(t, e, r);
  else {
    const i = toJS(n, "", t);
    if (e instanceof Map)
      e.set(i, toJS(r, i, t));
    else if (e instanceof Set)
      e.add(i);
    else {
      const a = stringifyKey(n, i, t), s = toJS(r, a, t);
      a in e ? Object.defineProperty(e, a, {
        value: s,
        writable: !0,
        enumerable: !0,
        configurable: !0
      }) : e[a] = s;
    }
  }
  return e;
}
function stringifyKey(t, e, n) {
  if (e === null)
    return "";
  if (typeof e != "object")
    return String(e);
  if (isNode(t) && n?.doc) {
    const r = createStringifyContext(n.doc, {});
    r.anchors = /* @__PURE__ */ new Set();
    for (const a of n.anchors.keys())
      r.anchors.add(a.anchor);
    r.inFlow = !0, r.inStringifyKey = !0;
    const i = t.toString(r);
    if (!n.mapKeyWarned) {
      let a = JSON.stringify(i);
      a.length > 40 && (a = a.substring(0, 36) + '..."'), warn(n.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${a}. Set mapAsMap: true to use object keys.`), n.mapKeyWarned = !0;
    }
    return i;
  }
  return JSON.stringify(e);
}
function createPair(t, e, n) {
  const r = createNode(t, void 0, n), i = createNode(e, void 0, n);
  return new Pair(r, i);
}
class Pair {
  constructor(e, n = null) {
    Object.defineProperty(this, NODE_TYPE, { value: PAIR }), this.key = e, this.value = n;
  }
  clone(e) {
    let { key: n, value: r } = this;
    return isNode(n) && (n = n.clone(e)), isNode(r) && (r = r.clone(e)), new Pair(n, r);
  }
  toJSON(e, n) {
    const r = n?.mapAsMap ? /* @__PURE__ */ new Map() : {};
    return addPairToJSMap(n, r, this);
  }
  toString(e, n, r) {
    return e?.doc ? stringifyPair(this, e, n, r) : JSON.stringify(this);
  }
}
function stringifyCollection(t, e, n) {
  return (e.inFlow ?? t.flow ? stringifyFlowCollection : stringifyBlockCollection)(t, e, n);
}
function stringifyBlockCollection({ comment: t, items: e }, n, { blockItemPrefix: r, flowChars: i, itemIndent: a, onChompKeep: s, onComment: _ }) {
  const { indent: l, options: { commentString: o } } = n, c = Object.assign({}, n, { indent: a, type: null });
  let u = !1;
  const d = [];
  for (let h = 0; h < e.length; ++h) {
    const p = e[h];
    let m = null;
    if (isNode(p))
      !u && p.spaceBefore && d.push(""), addCommentBefore(n, d, p.commentBefore, u), p.comment && (m = p.comment);
    else if (isPair(p)) {
      const g = isNode(p.key) ? p.key : null;
      g && (!u && g.spaceBefore && d.push(""), addCommentBefore(n, d, g.commentBefore, u));
    }
    u = !1;
    let v = stringify(p, c, () => m = null, () => u = !0);
    m && (v += lineComment(v, a, o(m))), u && m && (u = !1), d.push(r + v);
  }
  let f;
  if (d.length === 0)
    f = i.start + i.end;
  else {
    f = d[0];
    for (let h = 1; h < d.length; ++h) {
      const p = d[h];
      f += p ? `
${l}${p}` : `
`;
    }
  }
  return t ? (f += `
` + indentComment(o(t), l), _ && _()) : u && s && s(), f;
}
function stringifyFlowCollection({ items: t }, e, { flowChars: n, itemIndent: r }) {
  const { indent: i, indentStep: a, flowCollectionPadding: s, options: { commentString: _ } } = e;
  r += a;
  const l = Object.assign({}, e, {
    indent: r,
    inFlow: !0,
    type: null
  });
  let o = !1, c = 0;
  const u = [];
  for (let h = 0; h < t.length; ++h) {
    const p = t[h];
    let m = null;
    if (isNode(p))
      p.spaceBefore && u.push(""), addCommentBefore(e, u, p.commentBefore, !1), p.comment && (m = p.comment);
    else if (isPair(p)) {
      const g = isNode(p.key) ? p.key : null;
      g && (g.spaceBefore && u.push(""), addCommentBefore(e, u, g.commentBefore, !1), g.comment && (o = !0));
      const b = isNode(p.value) ? p.value : null;
      b ? (b.comment && (m = b.comment), b.commentBefore && (o = !0)) : p.value == null && g?.comment && (m = g.comment);
    }
    m && (o = !0);
    let v = stringify(p, l, () => m = null);
    o || (o = u.length > c || v.includes(`
`)), h < t.length - 1 ? v += "," : e.options.trailingComma && (e.options.lineWidth > 0 && (o || (o = u.reduce((g, b) => g + b.length + 2, 2) + (v.length + 2) > e.options.lineWidth)), o && (v += ",")), m && (v += lineComment(v, r, _(m))), u.push(v), c = u.length;
  }
  const { start: d, end: f } = n;
  if (u.length === 0)
    return d + f;
  if (!o) {
    const h = u.reduce((p, m) => p + m.length + 2, 2);
    o = e.options.lineWidth > 0 && h > e.options.lineWidth;
  }
  if (o) {
    let h = d;
    for (const p of u)
      h += p ? `
${a}${i}${p}` : `
`;
    return `${h}
${i}${f}`;
  } else
    return `${d}${s}${u.join(" ")}${s}${f}`;
}
function addCommentBefore({ indent: t, options: { commentString: e } }, n, r, i) {
  if (r && i && (r = r.replace(/^\n+/, "")), r) {
    const a = indentComment(e(r), t);
    n.push(a.trimStart());
  }
}
function findPair(t, e) {
  const n = isScalar(e) ? e.value : e;
  for (const r of t)
    if (isPair(r) && (r.key === e || r.key === n || isScalar(r.key) && r.key.value === n))
      return r;
}
class YAMLMap extends Collection {
  static get tagName() {
    return "tag:yaml.org,2002:map";
  }
  constructor(e) {
    super(MAP, e), this.items = [];
  }
  /**
   * A generic collection parsing method that can be extended
   * to other node classes that inherit from YAMLMap
   */
  static from(e, n, r) {
    const { keepUndefined: i, replacer: a } = r, s = new this(e), _ = (l, o) => {
      if (typeof a == "function")
        o = a.call(n, l, o);
      else if (Array.isArray(a) && !a.includes(l))
        return;
      (o !== void 0 || i) && s.items.push(createPair(l, o, r));
    };
    if (n instanceof Map)
      for (const [l, o] of n)
        _(l, o);
    else if (n && typeof n == "object")
      for (const l of Object.keys(n))
        _(l, n[l]);
    return typeof e.sortMapEntries == "function" && s.items.sort(e.sortMapEntries), s;
  }
  /**
   * Adds a value to the collection.
   *
   * @param overwrite - If not set `true`, using a key that is already in the
   *   collection will throw. Otherwise, overwrites the previous value.
   */
  add(e, n) {
    let r;
    isPair(e) ? r = e : !e || typeof e != "object" || !("key" in e) ? r = new Pair(e, e?.value) : r = new Pair(e.key, e.value);
    const i = findPair(this.items, r.key), a = this.schema?.sortMapEntries;
    if (i) {
      if (!n)
        throw new Error(`Key ${r.key} already set`);
      isScalar(i.value) && isScalarValue(r.value) ? i.value.value = r.value : i.value = r.value;
    } else if (a) {
      const s = this.items.findIndex((_) => a(r, _) < 0);
      s === -1 ? this.items.push(r) : this.items.splice(s, 0, r);
    } else
      this.items.push(r);
  }
  delete(e) {
    const n = findPair(this.items, e);
    return n ? this.items.splice(this.items.indexOf(n), 1).length > 0 : !1;
  }
  get(e, n) {
    const i = findPair(this.items, e)?.value;
    return (!n && isScalar(i) ? i.value : i) ?? void 0;
  }
  has(e) {
    return !!findPair(this.items, e);
  }
  set(e, n) {
    this.add(new Pair(e, n), !0);
  }
  /**
   * @param ctx - Conversion context, originally set in Document#toJS()
   * @param {Class} Type - If set, forces the returned collection type
   * @returns Instance of Type, Map, or Object
   */
  toJSON(e, n, r) {
    const i = r ? new r() : n?.mapAsMap ? /* @__PURE__ */ new Map() : {};
    n?.onCreate && n.onCreate(i);
    for (const a of this.items)
      addPairToJSMap(n, i, a);
    return i;
  }
  toString(e, n, r) {
    if (!e)
      return JSON.stringify(this);
    for (const i of this.items)
      if (!isPair(i))
        throw new Error(`Map items must all be pairs; found ${JSON.stringify(i)} instead`);
    return !e.allNullValues && this.hasAllNullValues(!1) && (e = Object.assign({}, e, { allNullValues: !0 })), stringifyCollection(this, e, {
      blockItemPrefix: "",
      flowChars: { start: "{", end: "}" },
      itemIndent: e.indent || "",
      onChompKeep: r,
      onComment: n
    });
  }
}
class YAMLSeq extends Collection {
  static get tagName() {
    return "tag:yaml.org,2002:seq";
  }
  constructor(e) {
    super(SEQ, e), this.items = [];
  }
  add(e) {
    this.items.push(e);
  }
  /**
   * Removes a value from the collection.
   *
   * `key` must contain a representation of an integer for this to succeed.
   * It may be wrapped in a `Scalar`.
   *
   * @returns `true` if the item was found and removed.
   */
  delete(e) {
    const n = asItemIndex(e);
    return typeof n != "number" ? !1 : this.items.splice(n, 1).length > 0;
  }
  get(e, n) {
    const r = asItemIndex(e);
    if (typeof r != "number")
      return;
    const i = this.items[r];
    return !n && isScalar(i) ? i.value : i;
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   *
   * `key` must contain a representation of an integer for this to succeed.
   * It may be wrapped in a `Scalar`.
   */
  has(e) {
    const n = asItemIndex(e);
    return typeof n == "number" && n < this.items.length;
  }
  /**
   * Sets a value in this collection. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   *
   * If `key` does not contain a representation of an integer, this will throw.
   * It may be wrapped in a `Scalar`.
   */
  set(e, n) {
    const r = asItemIndex(e);
    if (typeof r != "number")
      throw new Error(`Expected a valid index, not ${e}.`);
    const i = this.items[r];
    isScalar(i) && isScalarValue(n) ? i.value = n : this.items[r] = n;
  }
  toJSON(e, n) {
    const r = [];
    n?.onCreate && n.onCreate(r);
    let i = 0;
    for (const a of this.items)
      r.push(toJS(a, String(i++), n));
    return r;
  }
  toString(e, n, r) {
    return e ? stringifyCollection(this, e, {
      blockItemPrefix: "- ",
      flowChars: { start: "[", end: "]" },
      itemIndent: (e.indent || "") + "  ",
      onChompKeep: r,
      onComment: n
    }) : JSON.stringify(this);
  }
  static from(e, n, r) {
    const { replacer: i } = r, a = new this(e);
    if (n && Symbol.iterator in Object(n)) {
      let s = 0;
      for (let _ of n) {
        if (typeof i == "function") {
          const l = n instanceof Set ? _ : String(s++);
          _ = i.call(n, l, _);
        }
        a.items.push(createNode(_, void 0, r));
      }
    }
    return a;
  }
}
function asItemIndex(t) {
  let e = isScalar(t) ? t.value : t;
  return e && typeof e == "string" && (e = Number(e)), typeof e == "number" && Number.isInteger(e) && e >= 0 ? e : null;
}
function createPairs(t, e, n) {
  const { replacer: r } = n, i = new YAMLSeq(t);
  i.tag = "tag:yaml.org,2002:pairs";
  let a = 0;
  if (e && Symbol.iterator in Object(e))
    for (let s of e) {
      typeof r == "function" && (s = r.call(e, String(a++), s));
      let _, l;
      if (Array.isArray(s))
        if (s.length === 2)
          _ = s[0], l = s[1];
        else
          throw new TypeError(`Expected [key, value] tuple: ${s}`);
      else if (s && s instanceof Object) {
        const o = Object.keys(s);
        if (o.length === 1)
          _ = o[0], l = s[_];
        else
          throw new TypeError(`Expected tuple with one key, not ${o.length} keys`);
      } else
        _ = s;
      i.items.push(createPair(_, l, n));
    }
  return i;
}
class YAMLOMap extends YAMLSeq {
  constructor() {
    super(), this.add = YAMLMap.prototype.add.bind(this), this.delete = YAMLMap.prototype.delete.bind(this), this.get = YAMLMap.prototype.get.bind(this), this.has = YAMLMap.prototype.has.bind(this), this.set = YAMLMap.prototype.set.bind(this), this.tag = YAMLOMap.tag;
  }
  /**
   * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
   * but TypeScript won't allow widening the signature of a child method.
   */
  toJSON(e, n) {
    if (!n)
      return super.toJSON(e);
    const r = /* @__PURE__ */ new Map();
    n?.onCreate && n.onCreate(r);
    for (const i of this.items) {
      let a, s;
      if (isPair(i) ? (a = toJS(i.key, "", n), s = toJS(i.value, a, n)) : a = toJS(i, "", n), r.has(a))
        throw new Error("Ordered maps must not include duplicate keys");
      r.set(a, s);
    }
    return r;
  }
  static from(e, n, r) {
    const i = createPairs(e, n, r), a = new this();
    return a.items = i.items, a;
  }
}
YAMLOMap.tag = "tag:yaml.org,2002:omap";
class YAMLSet extends YAMLMap {
  constructor(e) {
    super(e), this.tag = YAMLSet.tag;
  }
  add(e) {
    let n;
    isPair(e) ? n = e : e && typeof e == "object" && "key" in e && "value" in e && e.value === null ? n = new Pair(e.key, null) : n = new Pair(e, null), findPair(this.items, n.key) || this.items.push(n);
  }
  /**
   * If `keepPair` is `true`, returns the Pair matching `key`.
   * Otherwise, returns the value of that Pair's key.
   */
  get(e, n) {
    const r = findPair(this.items, e);
    return !n && isPair(r) ? isScalar(r.key) ? r.key.value : r.key : r;
  }
  set(e, n) {
    if (typeof n != "boolean")
      throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof n}`);
    const r = findPair(this.items, e);
    r && !n ? this.items.splice(this.items.indexOf(r), 1) : !r && n && this.items.push(new Pair(e));
  }
  toJSON(e, n) {
    return super.toJSON(e, n, Set);
  }
  toString(e, n, r) {
    if (!e)
      return JSON.stringify(this);
    if (this.hasAllNullValues(!0))
      return super.toString(Object.assign({}, e, { allNullValues: !0 }), n, r);
    throw new Error("Set items must all have null values");
  }
  static from(e, n, r) {
    const { replacer: i } = r, a = new this(e);
    if (n && Symbol.iterator in Object(n))
      for (let s of n)
        typeof i == "function" && (s = i.call(n, s, s)), a.items.push(createPair(s, null, r));
    return a;
  }
}
YAMLSet.tag = "tag:yaml.org,2002:set";
new Set("0123456789ABCDEFabcdef");
new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
new Set(",[]{}");
new Set(` ,[]{}
\r	`);
function decodeImplVars(t) {
  const e = {};
  for (const [n, r] of Object.entries(t.varInstances)) {
    const i = [];
    for (const a of r) {
      const s = t.varTypes[a[0]], _ = t.variables[a[1]];
      let l = _.i, o = _.n;
      if (a.length > 2) {
        const u = [], d = [], f = (a.length - 2) / 2, h = a.slice(2, 2 + f);
        for (const p of h) {
          const m = t.subscripts[p];
          u.push(m.i), d.push(m.n);
        }
        l += `[${u.join(",")}]`, o += `[${d.join(",")}]`;
      }
      const c = {
        varId: l,
        varName: o,
        varType: s,
        varIndex: _.x,
        subscriptIndices: a.length > 2 ? a.slice(2 + (a.length - 2) / 2) : void 0
      };
      i.push(c);
    }
    e[n] = i;
  }
  return e;
}
function getImplVars(t) {
  const e = decodeImplVars(t), n = /* @__PURE__ */ new Map(), r = [];
  function i(a, s) {
    const _ = [];
    for (const l of s) {
      if (l.varType === "lookup" || l.varType === "data")
        continue;
      const c = `ModelImpl_${l.varId}`;
      n.set(c, l), _.push(c);
    }
    r.push({
      title: a,
      fn: a,
      datasetKeys: _
    });
  }
  return i("initConstants", e.constants || []), i("initLevels", e.initVars || []), i("evalLevels", e.levelVars || []), i("evalAux", e.auxVars || []), {
    implVars: n,
    implVarGroups: r
  };
}
function getInputVars(t) {
  const e = /* @__PURE__ */ new Map();
  for (const n of t) {
    const r = n.varId, i = {
      kind: "slider",
      inputId: n.inputId,
      varId: r,
      varName: n.varName,
      defaultValue: n.defaultValue,
      minValue: n.minValue,
      maxValue: n.maxValue,
      value: createInputValue(r, n.defaultValue)
    };
    e.set(r, i);
  }
  return e;
}
function setInputsForScenario(t, e) {
  function n(o, c) {
    c < o.minValue ? (console.warn(
      `WARNING: Scenario input value ${c} is < min value (${o.minValue}) for input '${o.varName}'`
    ), c = o.minValue) : c > o.maxValue && (console.warn(
      `WARNING: Scenario input value ${c} is > max value (${o.maxValue}) for input '${o.varName}'`
    ), c = o.maxValue), o.value.set(c);
  }
  function r(o) {
    o.value.reset();
  }
  function i(o) {
    o.value.set(o.minValue);
  }
  function a(o) {
    o.value.set(o.maxValue);
  }
  function s() {
    t.forEach(r);
  }
  function _() {
    t.forEach(i);
  }
  function l() {
    t.forEach(a);
  }
  switch (e.kind) {
    case "all-inputs": {
      switch (e.position) {
        case "at-default":
          s();
          break;
        case "at-minimum":
          _();
          break;
        case "at-maximum":
          l();
          break;
      }
      break;
    }
    case "input-settings": {
      s();
      for (const o of e.settings) {
        const c = t.get(o.inputVarId);
        if (c)
          switch (o.kind) {
            case "position":
              switch (o.position) {
                case "at-default":
                  r(c);
                  break;
                case "at-minimum":
                  i(c);
                  break;
                case "at-maximum":
                  a(c);
                  break;
                default:
                  assertNeverExports.assertNever(o.position);
              }
              break;
            case "value":
              n(c, o.value);
              break;
            default:
              assertNeverExports.assertNever(o);
          }
        else
          console.log(`No model input for scenario input ${o.inputVarId}`);
      }
      break;
    }
    default:
      assertNeverExports.assertNever(e);
  }
}
function getOutputVars(t) {
  const e = /* @__PURE__ */ new Map();
  for (const n of t) {
    const r = n.varId, i = datasetKeyForOutputVar(void 0, r);
    e.set(i, {
      datasetKey: i,
      sourceName: void 0,
      varId: r,
      varName: n.varName
    });
  }
  return e;
}
function datasetKeyForOutputVar(t, e) {
  return `Model_${e}`;
}
const inputSpecs = [{ inputId: "1", varId: "_enrollment_strategy_strength", varName: "enrollment strategy strength", defaultValue: 0, minValue: -1, maxValue: 8 }, { inputId: "2", varId: "_fee_waiver_strategy_strength", varName: "fee waiver strategy strength", defaultValue: 0, minValue: -1, maxValue: 8 }, { inputId: "3", varId: "_delay_reduction_strategy_strength", varName: "delay reduction strategy strength", defaultValue: 0, minValue: -0.5, maxValue: 0.5 }, { inputId: "4", varId: "_reimbursement_strategy_strength", varName: "reimbursement strategy strength", defaultValue: 0, minValue: -1, maxValue: 1 }, { inputId: "5", varId: "_provider_strategy_strength", varName: "provider strategy strength", defaultValue: 0, minValue: -1, maxValue: 1 }, { inputId: "6", varId: "_restock_strategy_strength", varName: "restock strategy strength", defaultValue: 0, minValue: -1, maxValue: 1 }, { inputId: "7", varId: "_screen_strategy_strength", varName: "screen strategy strength", defaultValue: 0, minValue: -0.5, maxValue: 1 }, { inputId: "8", varId: "_dropout_rate", varName: "dropout rate", defaultValue: 0.178522, minValue: 1e-4, maxValue: 1 }, { inputId: "9", varId: "_base_enrollment_rate", varName: "base enrollment rate", defaultValue: 0.754865, minValue: 1e-4, maxValue: 1 }, { inputId: "10", varId: "_new_fee_waiver_rate", varName: "new fee waiver rate", defaultValue: 0.0173221, minValue: 1e-4, maxValue: 1 }, { inputId: "11", varId: "_fee_waiver_adjustment_rate", varName: "fee waiver adjustment rate", defaultValue: 1e-5, minValue: 1e-5, maxValue: 1 }, { inputId: "12", varId: "_strength_of_perceived_benefit", varName: "strength of perceived benefit", defaultValue: 0.606183, minValue: 1e-3, maxValue: 5 }, { inputId: "13", varId: "_initial_fee_waivered_population", varName: "initial fee waivered population", defaultValue: 428123, minValue: 100, maxValue: 1e6 }, { inputId: "14", varId: "_population_adjustment", varName: "population adjustment", defaultValue: 282704, minValue: 1e3, maxValue: 5e8 }, { inputId: "15", varId: "_initial_population_at_risk_of_developing_ncd[_htn]", varName: "initial population at risk of developing NCD[HTN]", defaultValue: 5590110, minValue: 1e6, maxValue: 1e8 }, { inputId: "16", varId: "_initial_population_at_risk_of_developing_ncd[_dia]", varName: "initial population at risk of developing NCD[DIA]", defaultValue: 6368150, minValue: 1e6, maxValue: 1e8 }, { inputId: "17", varId: "_initial_undiagnosed_uncontrolled_ncd[_htn]", varName: "initial undiagnosed uncontrolled NCD[HTN]", defaultValue: 929744, minValue: 1e4, maxValue: 1e7 }, { inputId: "18", varId: "_initial_diagnosed_not_controlled_ncd[_htn]", varName: "initial diagnosed not controlled NCD[HTN]", defaultValue: 432632, minValue: 1e3, maxValue: 1e7 }, { inputId: "19", varId: "_ncd_development_rate[_htn]", varName: "NCD development rate[HTN]", defaultValue: 0.01, minValue: 0.01, maxValue: 0.1 }, { inputId: "20", varId: "_base_ncd_screen_rate[_htn]", varName: "base NCD screen rate[HTN]", defaultValue: 0.0999998, minValue: 1e-4, maxValue: 0.1 }, { inputId: "21", varId: "_treated_ncd_death_risk_relative_to_untreated[_htn]", varName: "treated NCD death risk relative to untreated[HTN]", defaultValue: 0.173641, minValue: 1e-4, maxValue: 1 }, { inputId: "22", varId: "_discontinuation_rate[_htn]", varName: "discontinuation rate[HTN]", defaultValue: 39173e-7, minValue: 1e-4, maxValue: 0.1 }, { inputId: "23", varId: "_strength_coverage_on_screen[_htn]", varName: "strength coverage on screen[HTN]", defaultValue: 0.948448, minValue: 1e-4, maxValue: 10 }, { inputId: "24", varId: "_initial_undiagnosed_uncontrolled_ncd[_dia]", varName: "initial undiagnosed uncontrolled NCD[DIA]", defaultValue: 462284, minValue: 1e3, maxValue: 1e7 }, { inputId: "25", varId: "_initial_diagnosed_not_controlled_ncd[_dia]", varName: "initial diagnosed not controlled NCD[DIA]", defaultValue: 126541, minValue: 100, maxValue: 1e7 }, { inputId: "26", varId: "_ncd_development_rate[_dia]", varName: "NCD development rate[DIA]", defaultValue: 117882e-8, minValue: 1e-3, maxValue: 0.1 }, { inputId: "27", varId: "_base_tx_enrollment_rate_post_screening[_dia]", varName: "base tx enrollment rate post screening[DIA]", defaultValue: 0.807486, minValue: 1e-4, maxValue: 1 }, { inputId: "28", varId: "_base_tx_enrollment_rate_post_screening[_htn]", varName: "base tx enrollment rate post screening[HTN]", defaultValue: 0.282093, minValue: 1e-4, maxValue: 1 }, { inputId: "29", varId: "_relative_death_risk_for_ncd[_dia]", varName: "relative death risk for NCD[DIA]", defaultValue: 9.71689, minValue: 1, maxValue: 10 }, { inputId: "30", varId: "_relative_death_risk_for_ncd[_htn]", varName: "relative death risk for NCD[HTN]", defaultValue: 2.20501, minValue: 1, maxValue: 10 }, { inputId: "31", varId: "_treated_ncd_death_risk_relative_to_untreated[_dia]", varName: "treated NCD death risk relative to untreated[DIA]", defaultValue: 0.0824849, minValue: 1e-3, maxValue: 1 }, { inputId: "32", varId: "_discontinuation_rate[_dia]", varName: "discontinuation rate[DIA]", defaultValue: 419194e-8, minValue: 1e-4, maxValue: 0.5 }, { inputId: "33", varId: "_base_death_rate", varName: "base death rate", defaultValue: 351553e-9, minValue: 1e-5, maxValue: 1e-3 }, { inputId: "34", varId: "_strength_coverage_on_screen[_dia]", varName: "strength coverage on screen[DIA]", defaultValue: 0.883231, minValue: 1e-3, maxValue: 10 }, { inputId: "35", varId: "_base_positive_ncd_fraction_for_screened_people[_htn]", varName: "base positive NCD fraction for screened people[HTN]", defaultValue: 0.152582, minValue: 1e-3, maxValue: 0.4 }, { inputId: "36", varId: "_base_positive_ncd_fraction_for_screened_people[_dia]", varName: "base positive NCD fraction for screened people[DIA]", defaultValue: 0.193613, minValue: 1e-3, maxValue: 0.2 }, { inputId: "37", varId: "_reference_utilization_per_capita", varName: "reference utilization per capita", defaultValue: 0.105323, minValue: 1e-3, maxValue: 10 }, { inputId: "38", varId: "_strength_access_on_utilization", varName: "strength access on utilization", defaultValue: 1.27166, minValue: 1e-3, maxValue: 10 }, { inputId: "39", varId: "_base_average_fee_per_person", varName: "base average fee per person", defaultValue: 875.87, minValue: 1, maxValue: 2e3 }, { inputId: "40", varId: "_base_average_reimbursement_per_person", varName: "base average reimbursement per person", defaultValue: 536.314, minValue: 1, maxValue: 2e3 }, { inputId: "41", varId: "_base_average_care_cost_per_person", varName: "base average care cost per person", defaultValue: 314.986, minValue: 1, maxValue: 2e3 }, { inputId: "42", varId: "_other_public_funding_rate", varName: "other public funding rate", defaultValue: 870185e4, minValue: 1e3, maxValue: 1e10 }, { inputId: "43", varId: "_initial_average_annual_ir", varName: "initial average annual IR", defaultValue: 843404e4, minValue: 1e6, maxValue: 1e10 }, { inputId: "44", varId: "_initial_cbhi_revenue", varName: "initial CBHI revenue", defaultValue: 5364e6, minValue: 1e3, maxValue: 1e10 }, { inputId: "45", varId: "_provider_adjustment_rate", varName: "provider adjustment rate", defaultValue: 1238.55, minValue: 10, maxValue: 1e4 }, { inputId: "46", varId: "_initial_providers", varName: "initial providers", defaultValue: 975.801, minValue: 100, maxValue: 1e5 }, { inputId: "47", varId: "_base_medication_utilization_rate", varName: "base medication utilization rate", defaultValue: 0.23385, minValue: 0.1, maxValue: 1 }, { inputId: "48", varId: "_base_medication_restocking_rate", varName: "base medication restocking rate", defaultValue: 0.198254, minValue: 0.1, maxValue: 1 }, { inputId: "49", varId: "_cbhi_reimbursement_approval_fraction", varName: "CBHI reimbursement approval fraction", defaultValue: 1, minValue: 0.1, maxValue: 1 }, { inputId: "50", varId: "_subsidy_fraction", varName: "subsidy fraction", defaultValue: 0.123424, minValue: 0.01, maxValue: 1 }], outputSpecs = [{ varId: "_cbhi_beneficiaries", varName: "CBHI beneficiaries" }, { varId: "_fee_waivered_population_with_health_coverage", varName: "Fee waivered population with health coverage" }, { varId: "_fraction_in_treatment[_dia]", varName: "Fraction in treatment[DIA]" }, { varId: "_fraction_in_treatment[_htn]", varName: "Fraction in treatment[HTN]" }, { varId: "_essential_medication_availability", varName: "essential medication availability" }, { varId: "_frac_adult_of_pop_with_coverage", varName: "frac adult of pop with coverage" }, { varId: "_new_enrollment_into_care[_dia]", varName: "new enrollment into care[DIA]" }, { varId: "_new_enrollment_into_care[_htn]", varName: "new enrollment into care[HTN]" }, { varId: "_people_screened_for_ncd[_dia]", varName: "people screened for NCD[DIA]" }, { varId: "_people_screened_for_ncd[_htn]", varName: "people screened for NCD[HTN]" }, { varId: "_total_service_utilization_per_capita", varName: "total service utilization per capita" }], encodedImplVars = { subscripts: [{ n: "DIA", i: "_dia" }, { n: "HTN", i: "_htn" }], variables: [{ n: "CBHI reimbursement approval fraction", i: "_cbhi_reimbursement_approval_fraction", x: 1 }, { n: "FINAL TIME", i: "_final_time", x: 2 }, { n: "INITIAL TIME", i: "_initial_time", x: 3 }, { n: "NCD development rate", i: "_ncd_development_rate", x: 4 }, { n: "OneYear", i: "_oneyear", x: 5 }, { n: "TIME STEP", i: "_time_step", x: 6 }, { n: "alpha", i: "_alpha", x: 7 }, { n: "annual health service utilization per NCD patient", i: "_annual_health_service_utilization_per_ncd_patient", x: 8 }, { n: "annual inflation rate", i: "_annual_inflation_rate", x: 9 }, { n: "average reimbursement delay", i: "_average_reimbursement_delay", x: 10 }, { n: "avg adult pop per household", i: "_avg_adult_pop_per_household", x: 11 }, { n: "base NCD screen rate", i: "_base_ncd_screen_rate", x: 12 }, { n: "base average care cost per person", i: "_base_average_care_cost_per_person", x: 13 }, { n: "base average fee per person", i: "_base_average_fee_per_person", x: 14 }, { n: "base average reimbursement per person", i: "_base_average_reimbursement_per_person", x: 15 }, { n: "base death rate", i: "_base_death_rate", x: 16 }, { n: "base enrollment rate", i: "_base_enrollment_rate", x: 17 }, { n: "base medication restocking rate", i: "_base_medication_restocking_rate", x: 18 }, { n: "base medication utilization rate", i: "_base_medication_utilization_rate", x: 19 }, { n: "base positive NCD fraction for screened people", i: "_base_positive_ncd_fraction_for_screened_people", x: 20 }, { n: "base provider per facility", i: "_base_provider_per_facility", x: 21 }, { n: "base tx enrollment rate post screening", i: "_base_tx_enrollment_rate_post_screening", x: 22 }, { n: "beta", i: "_beta", x: 23 }, { n: "change time", i: "_change_time", x: 24 }, { n: "delay reduction strategy start year", i: "_delay_reduction_strategy_start_year", x: 25 }, { n: "delay reduction strategy strength", i: "_delay_reduction_strategy_strength", x: 26 }, { n: "discontinuation rate", i: "_discontinuation_rate", x: 27 }, { n: "dropout rate", i: "_dropout_rate", x: 28 }, { n: "eff of coverage on service utilization", i: "_eff_of_coverage_on_service_utilization", x: 29 }, { n: "enrollment strategy start year", i: "_enrollment_strategy_start_year", x: 30 }, { n: "enrollment strategy strength", i: "_enrollment_strategy_strength", x: 31 }, { n: "facilities in Amhara", i: "_facilities_in_amhara", x: 32 }, { n: "facility stock adjustment time", i: "_facility_stock_adjustment_time", x: 33 }, { n: "fee waiver adjustment rate", i: "_fee_waiver_adjustment_rate", x: 34 }, { n: "fee waiver strategy start year", i: "_fee_waiver_strategy_start_year", x: 35 }, { n: "fee waiver strategy strength", i: "_fee_waiver_strategy_strength", x: 36 }, { n: "fraction allocated to RDF", i: "_fraction_allocated_to_rdf", x: 37 }, { n: "fraction of day in clinic time", i: "_fraction_of_day_in_clinic_time", x: 38 }, { n: "household adjustment time", i: "_household_adjustment_time", x: 39 }, { n: "household size adj for fees", i: "_household_size_adj_for_fees", x: 40 }, { n: "initial CBHI revenue", i: "_initial_cbhi_revenue", x: 41 }, { n: "initial average annual IR", i: "_initial_average_annual_ir", x: 42 }, { n: "initial diagnosed not controlled NCD", i: "_initial_diagnosed_not_controlled_ncd", x: 43 }, { n: "initial fee waivered population", i: "_initial_fee_waivered_population", x: 44 }, { n: "initial population at risk of developing NCD", i: "_initial_population_at_risk_of_developing_ncd", x: 45 }, { n: "initial providers", i: "_initial_providers", x: 46 }, { n: "initial tot demand min ratio", i: "_initial_tot_demand_min_ratio", x: 47 }, { n: "initial undiagnosed uncontrolled NCD", i: "_initial_undiagnosed_uncontrolled_ncd", x: 48 }, { n: "minutes per screen", i: "_minutes_per_screen", x: 49 }, { n: "minutes per visit", i: "_minutes_per_visit", x: 50 }, { n: "net enrollment rate in 2007", i: "_net_enrollment_rate_in_2007", x: 51 }, { n: "new fee waiver rate", i: "_new_fee_waiver_rate", x: 52 }, { n: "other public funding rate", i: "_other_public_funding_rate", x: 53 }, { n: "population adjustment", i: "_population_adjustment", x: 54 }, { n: "procurement responsiveness", i: "_procurement_responsiveness", x: 55 }, { n: "provider adjustment rate", i: "_provider_adjustment_rate", x: 56 }, { n: "provider strategy start year", i: "_provider_strategy_start_year", x: 57 }, { n: "provider strategy strength", i: "_provider_strategy_strength", x: 58 }, { n: "reference utilization per capita", i: "_reference_utilization_per_capita", x: 59 }, { n: "reimbursement strategy start year", i: "_reimbursement_strategy_start_year", x: 60 }, { n: "reimbursement strategy strength", i: "_reimbursement_strategy_strength", x: 61 }, { n: "relative death risk for NCD", i: "_relative_death_risk_for_ncd", x: 62 }, { n: "restock strategy start year", i: "_restock_strategy_start_year", x: 63 }, { n: "restock strategy strength", i: "_restock_strategy_strength", x: 64 }, { n: "revenue utilization time", i: "_revenue_utilization_time", x: 65 }, { n: "screen strategy start year", i: "_screen_strategy_start_year", x: 66 }, { n: "screen strategy strength", i: "_screen_strategy_strength", x: 67 }, { n: "strength access on utilization", i: "_strength_access_on_utilization", x: 68 }, { n: "strength coverage on screen", i: "_strength_coverage_on_screen", x: 69 }, { n: "strength of perceived benefit", i: "_strength_of_perceived_benefit", x: 70 }, { n: "subsidy fraction", i: "_subsidy_fraction", x: 71 }, { n: "time to enroll", i: "_time_to_enroll", x: 72 }, { n: "total annual clinical minutes per provider", i: "_total_annual_clinical_minutes_per_provider", x: 73 }, { n: "transition time", i: "_transition_time", x: 74 }, { n: "treated NCD death risk relative to untreated", i: "_treated_ncd_death_risk_relative_to_untreated", x: 75 }, { n: "workforce availability factor", i: "_workforce_availability_factor", x: 76 }, { n: "DATA Amhara total population 30 yo plus", i: "_data_amhara_total_population_30_yo_plus", x: 77 }, { n: "DATA CBHI membership cost per household", i: "_data_cbhi_membership_cost_per_household", x: 78 }, { n: "DATA CBHI targeted households", i: "_data_cbhi_targeted_households", x: 79 }, { n: "DATA Essential medication availability DIA", i: "_data_essential_medication_availability_dia", x: 80 }, { n: "DATA Essential medication availability HTN", i: "_data_essential_medication_availability_htn", x: 81 }, { n: "DATA inflation conversion multiplier for 2017 birr value", i: "_data_inflation_conversion_multiplier_for_2017_birr_value", x: 82 }, { n: "DATA total revolving drug funds", i: "_data_total_revolving_drug_funds", x: 83 }, { n: "initial CBHI beneficiaries", i: "_initial_cbhi_beneficiaries", x: 84 }, { n: "DATA Essential medication availability avg", i: "_data_essential_medication_availability_avg", x: 85 }, { n: "initial essential medicine availability", i: "_initial_essential_medicine_availability", x: 86 }, { n: "initial facilities with medication", i: "_initial_facilities_with_medication", x: 87 }, { n: "Facilities with medication", i: "_facilities_with_medication", x: 88 }, { n: "initial facilities without medication", i: "_initial_facilities_without_medication", x: 89 }, { n: "Facilities without medication", i: "_facilities_without_medication", x: 90 }, { n: "DATA adjusted total revolving drug funds", i: "_data_adjusted_total_revolving_drug_funds", x: 91 }, { n: "annual clinical minutes per provider", i: "_annual_clinical_minutes_per_provider", x: 92 }, { n: "Total Providers", i: "_total_providers", x: 93 }, { n: "total provider minutes", i: "_total_provider_minutes", x: 94 }, { n: "initial total demand minutes", i: "_initial_total_demand_minutes", x: 95 }, { n: "total demand minutes", i: "_total_demand_minutes", x: 96 }, { n: "demand fulfilment ratio", i: "_demand_fulfilment_ratio", x: 97 }, { n: "Population at risk of developing NCD", i: "_population_at_risk_of_developing_ncd", x: 98 }, { n: "Untreated NCD", i: "_untreated_ncd", x: 99 }, { n: "Fee waivered population with health coverage", i: "_fee_waivered_population_with_health_coverage", x: 100 }, { n: "CBHI beneficiaries", i: "_cbhi_beneficiaries", x: 101 }, { n: "total adult population with coverage", i: "_total_adult_population_with_coverage", x: 102 }, { n: "frac adult of pop with coverage", i: "_frac_adult_of_pop_with_coverage", x: 103 }, { n: "initial health insurance coverage rate", i: "_initial_health_insurance_coverage_rate", x: 104 }, { n: "relative coverage rate", i: "_relative_coverage_rate", x: 105 }, { n: "eff of health coverage on screening", i: "_eff_of_health_coverage_on_screening", x: 106 }, { n: "strategy to increase screen", i: "_strategy_to_increase_screen", x: 107 }, { n: "implied screen rate", i: "_implied_screen_rate", x: 108 }, { n: "NCD screen rate", i: "_ncd_screen_rate", x: 109 }, { n: "people screened for NCD", i: "_people_screened_for_ncd", x: 110 }, { n: "new utilization for HTN screen", i: "_new_utilization_for_htn_screen", x: 111 }, { n: "new utilization for DIA screen", i: "_new_utilization_for_dia_screen", x: 112 }, { n: "NCD screening related service utilization", i: "_ncd_screening_related_service_utilization", x: 113 }, { n: "Treated NCD", i: "_treated_ncd", x: 114 }, { n: "population in HTN treatment", i: "_population_in_htn_treatment", x: 115 }, { n: "population in DIA treatment", i: "_population_in_dia_treatment", x: 116 }, { n: "active patient NCD related service utilization", i: "_active_patient_ncd_related_service_utilization", x: 117 }, { n: "NCD related service utilization", i: "_ncd_related_service_utilization", x: 118 }, { n: "NCD related service utilization per capita", i: "_ncd_related_service_utilization_per_capita", x: 119 }, { n: "care capacity per capita", i: "_care_capacity_per_capita", x: 120 }, { n: "initial care capacity per capita", i: "_initial_care_capacity_per_capita", x: 121 }, { n: "access multiplier", i: "_access_multiplier", x: 122 }, { n: "other health service utilization", i: "_other_health_service_utilization", x: 123 }, { n: "uninsured service utilization per capita", i: "_uninsured_service_utilization_per_capita", x: 124 }, { n: "uninsured patient visits", i: "_uninsured_patient_visits", x: 125 }, { n: "strategy to decrease reimbursement delay", i: "_strategy_to_decrease_reimbursement_delay", x: 126 }, { n: "implied delay", i: "_implied_delay", x: 127 }, { n: "CBHI revenue", i: "_cbhi_revenue", x: 128 }, { n: "strategy to increase reimbursement", i: "_strategy_to_increase_reimbursement", x: 129 }, { n: "implied CBHI reimbursement approval fraction", i: "_implied_cbhi_reimbursement_approval_fraction", x: 130 }, { n: "adult pop with coverage", i: "_adult_pop_with_coverage", x: 131 }, { n: "insured service utilization per capita", i: "_insured_service_utilization_per_capita", x: 132 }, { n: "CBHI or fee waivered patient visits", i: "_cbhi_or_fee_waivered_patient_visits", x: 133 }, { n: "reimbursement requests from CBHIs", i: "_reimbursement_requests_from_cbhis", x: 134 }, { n: "CBHI reimbursements approved", i: "_cbhi_reimbursements_approved", x: 135 }, { n: "CBHI paid", i: "_cbhi_paid", x: 136 }, { n: "reimbursements", i: "_reimbursements", x: 137 }, { n: "revenue from user fees", i: "_revenue_from_user_fees", x: 138 }, { n: "avg adjusted total revolving drug funds", i: "_avg_adjusted_total_revolving_drug_funds", x: 139 }, { n: "adjusted annual average RDF", i: "_adjusted_annual_average_rdf", x: 140 }, { n: "initial avg adjusted total revolving drug funds", i: "_initial_avg_adjusted_total_revolving_drug_funds", x: 141 }, { n: "total NCD care demand pop", i: "_total_ncd_care_demand_pop", x: 142 }, { n: "initial demand for medications", i: "_initial_demand_for_medications", x: 143 }, { n: "Fraction in treatment", i: "_fraction_in_treatment", x: 144 }, { n: "fraction not in treatment", i: "_fraction_not_in_treatment", x: 145 }, { n: "initial fraction not in treatment", i: "_initial_fraction_not_in_treatment", x: 146 }, { n: "initial CBHI eligible not enrolled", i: "_initial_cbhi_eligible_not_enrolled", x: 147 }, { n: "People in informal sector not enrolled to CBHI", i: "_people_in_informal_sector_not_enrolled_to_cbhi", x: 148 }, { n: "percent enrolled among eligible households", i: "_percent_enrolled_among_eligible_households", x: 149 }, { n: "initial perceived benefit", i: "_initial_perceived_benefit", x: 150 }, { n: "SAVEPER", i: "_saveper", x: 151 }, { n: "death of at risk population", i: "_death_of_at_risk_population", x: 152 }, { n: "developing NCD", i: "_developing_ncd", x: 153 }, { n: "dropout", i: "_dropout", x: 154 }, { n: "fee waiver enrollment change", i: "_fee_waiver_enrollment_change", x: 155 }, { n: "new people joining at risk population", i: "_new_people_joining_at_risk_population", x: 156 }, { n: "total visits", i: "_total_visits", x: 157 }, { n: "total service utilization per capita", i: "_total_service_utilization_per_capita", x: 158 }, { n: "change in demand for medications", i: "_change_in_demand_for_medications", x: 159 }, { n: "implied medication utilization rate", i: "_implied_medication_utilization_rate", x: 160 }, { n: "stock out rate", i: "_stock_out_rate", x: 161 }, { n: "strategy to increase restocking", i: "_strategy_to_increase_restocking", x: 162 }, { n: "relative avg adjusted total revolving drug funds", i: "_relative_avg_adjusted_total_revolving_drug_funds", x: 163 }, { n: "implied medication restocking", i: "_implied_medication_restocking", x: 164 }, { n: "restocking rate", i: "_restocking_rate", x: 165 }, { n: "essential medication availability", i: "_essential_medication_availability", x: 166 }, { n: "relative essential medicine availability", i: "_relative_essential_medicine_availability", x: 167 }, { n: "provider per facility", i: "_provider_per_facility", x: 168 }, { n: "strategy to increase enrollments", i: "_strategy_to_increase_enrollments", x: 169 }, { n: "relative benefit", i: "_relative_benefit", x: 170 }, { n: "eff of perceived benefit on enrollment", i: "_eff_of_perceived_benefit_on_enrollment", x: 171 }, { n: "implied enrollment rate", i: "_implied_enrollment_rate", x: 172 }, { n: "new enrollments", i: "_new_enrollments", x: 173 }, { n: "relative untreated NCD", i: "_relative_untreated_ncd", x: 174 }, { n: "implied positive screening rate", i: "_implied_positive_screening_rate", x: 175 }, { n: "people screened positive for NCD", i: "_people_screened_positive_for_ncd", x: 176 }, { n: "new enrollment into care", i: "_new_enrollment_into_care", x: 177 }, { n: "strategy to increase provider capacity", i: "_strategy_to_increase_provider_capacity", x: 178 }, { n: "relative NCD care service availability", i: "_relative_ncd_care_service_availability", x: 179 }, { n: "strategy to increase fee waivers", i: "_strategy_to_increase_fee_waivers", x: 180 }, { n: "fee waivered insurance coverage", i: "_fee_waivered_insurance_coverage", x: 181 }, { n: "implied eligible households not enrolled", i: "_implied_eligible_households_not_enrolled", x: 182 }, { n: "eligible population adjustment", i: "_eligible_population_adjustment", x: 183 }, { n: "implied discontinuation rate", i: "_implied_discontinuation_rate", x: 184 }, { n: "discontinuation from care", i: "_discontinuation_from_care", x: 185 }, { n: "minutes per non NCD visit", i: "_minutes_per_non_ncd_visit", x: 186 }, { n: "non NCD visits", i: "_non_ncd_visits", x: 187 }, { n: "demand minutes for non NCD", i: "_demand_minutes_for_non_ncd", x: 188 }, { n: "demand minutes for NCD screening", i: "_demand_minutes_for_ncd_screening", x: 189 }, { n: "minutes per NCD patient year", i: "_minutes_per_ncd_patient_year", x: 190 }, { n: "demand minutes for NCD", i: "_demand_minutes_for_ncd", x: 191 }, { n: "death rate for untreated NCD", i: "_death_rate_for_untreated_ncd", x: 192 }, { n: "death of untreated NCD patients", i: "_death_of_untreated_ncd_patients", x: 193 }, { n: "ocm rate for treated", i: "_ocm_rate_for_treated", x: 194 }, { n: "death of treated NCD patients", i: "_death_of_treated_ncd_patients", x: 195 }, { n: "DATA adjusted membership cost per household", i: "_data_adjusted_membership_cost_per_household", x: 196 }, { n: "adjusted total CBHI collected fees", i: "_adjusted_total_cbhi_collected_fees", x: 197 }, { n: "adjusted subsidies", i: "_adjusted_subsidies", x: 198 }, { n: "collected fees and subsidies", i: "_collected_fees_and_subsidies", x: 199 }, { n: "max provider per facility", i: "_max_provider_per_facility", x: 200 }, { n: "provider gap", i: "_provider_gap", x: 201 }, { n: "change in provider availability", i: "_change_in_provider_availability", x: 202 }], varTypes: ["const", "data", "aux", "level", "initial"], varInstances: { constants: [[0, 0], [0, 1], [0, 2], [0, 3, 0, 1], [0, 3, 1, 0], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11, 0, 1], [0, 11, 1, 0], [0, 12], [0, 13], [0, 14], [0, 15], [0, 16], [0, 17], [0, 18], [0, 19, 0, 1], [0, 19, 1, 0], [0, 20], [0, 21, 0, 1], [0, 21, 1, 0], [0, 22], [0, 23], [0, 24], [0, 25], [0, 26, 0, 1], [0, 26, 1, 0], [0, 27], [0, 28], [0, 29], [0, 30], [0, 31], [0, 32], [0, 33], [0, 34], [0, 35], [0, 36], [0, 37], [0, 38], [0, 39], [0, 40], [0, 41], [0, 42, 0, 1], [0, 42, 1, 0], [0, 43], [0, 44, 0, 1], [0, 44, 1, 0], [0, 45], [0, 46], [0, 47, 0, 1], [0, 47, 1, 0], [0, 48], [0, 49], [0, 50], [0, 51], [0, 52], [0, 53], [0, 54], [0, 55], [0, 56], [0, 57], [0, 58], [0, 59], [0, 60], [0, 61, 0, 1], [0, 61, 1, 0], [0, 62], [0, 63], [0, 64], [0, 65], [0, 66], [0, 67], [0, 68, 0, 1], [0, 68, 1, 0], [0, 69], [0, 70], [0, 71], [0, 72], [0, 73], [0, 74, 0, 1], [0, 74, 1, 0], [0, 75]], lookupVars: [], dataVars: [[1, 76], [1, 77], [1, 78], [1, 79], [1, 80], [1, 81], [1, 82]], initVars: [[2, 83], [2, 84], [2, 85], [2, 86], [3, 87], [2, 88], [3, 89], [2, 90], [2, 91], [3, 92], [2, 93], [2, 94], [2, 95], [2, 96], [3, 97, 1, 0], [3, 98, 1, 0], [3, 99], [3, 100], [2, 101], [2, 102], [4, 103], [2, 104], [2, 105, 1, 0], [2, 106], [2, 107, 1, 0], [2, 108, 1, 0], [2, 109, 1, 0], [2, 110], [3, 97, 0, 1], [3, 98, 0, 1], [2, 105, 0, 1], [2, 107, 0, 1], [2, 108, 0, 1], [2, 109, 0, 1], [2, 111], [2, 112], [3, 113, 1, 0], [2, 114], [3, 113, 0, 1], [2, 115], [2, 116], [2, 117], [2, 118], [2, 119], [4, 120], [2, 121], [2, 122], [2, 123], [2, 124], [2, 125], [2, 126], [3, 127], [2, 128], [2, 129], [2, 130], [2, 131], [2, 132], [2, 133], [2, 134], [2, 135], [2, 136], [2, 137], [2, 138], [2, 139], [4, 140], [2, 141], [4, 142], [2, 143, 0, 1], [2, 144, 0, 1], [4, 145, 0, 1], [2, 143, 1, 0], [2, 144, 1, 0], [4, 145, 1, 0], [2, 146], [3, 147], [2, 148], [4, 149]], levelVars: [[3, 100], [3, 127], [3, 87], [3, 89], [3, 99], [3, 147], [3, 97, 0, 1], [3, 97, 1, 0], [3, 92], [3, 113, 0, 1], [3, 113, 1, 0], [3, 98, 0, 1], [3, 98, 1, 0]], auxVars: [[2, 150], [2, 151, 0, 1], [2, 151, 1, 0], [2, 152, 0, 1], [2, 152, 1, 0], [2, 153], [2, 154], [2, 83], [2, 146], [2, 155], [2, 95], [2, 91], [2, 93], [2, 96], [2, 101], [2, 102], [2, 104], [2, 105, 1, 0], [2, 106], [2, 107, 1, 0], [2, 108, 1, 0], [2, 109, 1, 0], [2, 110], [2, 105, 0, 1], [2, 107, 0, 1], [2, 108, 0, 1], [2, 109, 0, 1], [2, 111], [2, 112], [2, 114], [2, 115], [2, 116], [2, 117], [2, 118], [2, 119], [2, 121], [2, 122], [2, 123], [2, 124], [2, 130], [2, 131], [2, 132], [2, 156], [2, 157], [2, 141], [2, 158], [2, 159], [2, 160], [2, 161], [2, 125], [2, 126], [2, 135], [2, 136], [2, 137], [2, 90], [2, 138], [2, 139], [2, 162], [2, 163], [2, 164], [2, 165], [2, 84], [2, 85], [2, 166], [2, 148], [2, 167], [2, 168], [2, 169], [2, 170], [2, 171], [2, 172], [2, 143, 1, 0], [2, 144, 1, 0], [2, 173, 1, 0], [2, 174, 1, 0], [2, 175, 1, 0], [2, 176, 1, 0], [2, 143, 0, 1], [2, 144, 0, 1], [2, 173, 0, 1], [2, 174, 0, 1], [2, 175, 0, 1], [2, 176, 0, 1], [2, 177], [2, 94], [2, 88], [2, 86], [2, 178], [2, 128], [2, 179], [2, 180], [2, 181], [2, 182], [2, 183, 1, 0], [2, 184, 1, 0], [2, 183, 0, 1], [2, 184, 0, 1], [2, 185], [2, 186], [2, 187], [2, 188], [2, 189], [2, 190], [2, 191, 1, 0], [2, 192, 1, 0], [2, 191, 0, 1], [2, 192, 0, 1], [2, 193, 1, 0], [2, 194, 1, 0], [2, 193, 0, 1], [2, 194, 0, 1], [2, 195], [2, 196], [2, 197], [2, 198], [2, 199], [2, 200], [2, 201], [2, 129], [2, 133], [2, 134]] } }, modelSizeInBytes = 78062, dataSizeInBytes = 0, modelWorkerJs = '(function(){"use strict";var commonjsGlobal=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function getDefaultExportFromCjs(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var worker={},isObservable,hasRequiredIsObservable;function requireIsObservable(){return hasRequiredIsObservable||(hasRequiredIsObservable=1,isObservable=e=>e?typeof Symbol.observable=="symbol"&&typeof e[Symbol.observable]=="function"?e===e[Symbol.observable]():typeof e["@@observable"]=="function"?e===e["@@observable"]():!1:!1),isObservable}var common={},serializers={},hasRequiredSerializers;function requireSerializers(){if(hasRequiredSerializers)return serializers;hasRequiredSerializers=1,Object.defineProperty(serializers,"__esModule",{value:!0}),serializers.DefaultSerializer=serializers.extendSerializer=void 0;function e(t,_){const r=t.deserialize.bind(t),a=t.serialize.bind(t);return{deserialize(s){return _.deserialize(s,r)},serialize(s){return _.serialize(s,a)}}}serializers.extendSerializer=e;const i={deserialize(t){return Object.assign(Error(t.message),{name:t.name,stack:t.stack})},serialize(t){return{__error_marker:"$$error",message:t.message,name:t.name,stack:t.stack}}},n=t=>t&&typeof t=="object"&&"__error_marker"in t&&t.__error_marker==="$$error";return serializers.DefaultSerializer={deserialize(t){return n(t)?i.deserialize(t):t},serialize(t){return t instanceof Error?i.serialize(t):t}},serializers}var hasRequiredCommon;function requireCommon(){if(hasRequiredCommon)return common;hasRequiredCommon=1,Object.defineProperty(common,"__esModule",{value:!0}),common.serialize=common.deserialize=common.registerSerializer=void 0;const e=requireSerializers();let i=e.DefaultSerializer;function n(r){i=e.extendSerializer(i,r)}common.registerSerializer=n;function t(r){return i.deserialize(r)}common.deserialize=t;function _(r){return i.serialize(r)}return common.serialize=_,common}var transferable={},symbols={},hasRequiredSymbols;function requireSymbols(){return hasRequiredSymbols||(hasRequiredSymbols=1,Object.defineProperty(symbols,"__esModule",{value:!0}),symbols.$worker=symbols.$transferable=symbols.$terminate=symbols.$events=symbols.$errors=void 0,symbols.$errors=Symbol("thread.errors"),symbols.$events=Symbol("thread.events"),symbols.$terminate=Symbol("thread.terminate"),symbols.$transferable=Symbol("thread.transferable"),symbols.$worker=Symbol("thread.worker")),symbols}var hasRequiredTransferable;function requireTransferable(){if(hasRequiredTransferable)return transferable;hasRequiredTransferable=1,Object.defineProperty(transferable,"__esModule",{value:!0}),transferable.Transfer=transferable.isTransferDescriptor=void 0;const e=requireSymbols();function i(_){return!(!_||typeof _!="object")}function n(_){return _&&typeof _=="object"&&_[e.$transferable]}transferable.isTransferDescriptor=n;function t(_,r){if(!r){if(!i(_))throw Error();r=[_]}return{[e.$transferable]:!0,send:_,transferables:r}}return transferable.Transfer=t,transferable}var messages={},hasRequiredMessages;function requireMessages(){return hasRequiredMessages||(hasRequiredMessages=1,(function(e){Object.defineProperty(e,"__esModule",{value:!0}),e.WorkerMessageType=e.MasterMessageType=void 0,(function(i){i.cancel="cancel",i.run="run"})(e.MasterMessageType||(e.MasterMessageType={})),(function(i){i.error="error",i.init="init",i.result="result",i.running="running",i.uncaughtError="uncaughtError"})(e.WorkerMessageType||(e.WorkerMessageType={}))})(messages)),messages}var implementation={},implementation_browser={},hasRequiredImplementation_browser;function requireImplementation_browser(){if(hasRequiredImplementation_browser)return implementation_browser;hasRequiredImplementation_browser=1,Object.defineProperty(implementation_browser,"__esModule",{value:!0});const e=function(){const _=typeof self<"u"&&typeof Window<"u"&&self instanceof Window;return!!(typeof self<"u"&&self.postMessage&&!_)},i=function(_,r){self.postMessage(_,r)},n=function(_){const r=s=>{_(s.data)},a=()=>{self.removeEventListener("message",r)};return self.addEventListener("message",r),a};return implementation_browser.default={isWorkerRuntime:e,postMessageToMaster:i,subscribeToMasterMessages:n},implementation_browser}var implementation_tinyWorker={},hasRequiredImplementation_tinyWorker;function requireImplementation_tinyWorker(){if(hasRequiredImplementation_tinyWorker)return implementation_tinyWorker;hasRequiredImplementation_tinyWorker=1,Object.defineProperty(implementation_tinyWorker,"__esModule",{value:!0}),typeof self>"u"&&(commonjsGlobal.self=commonjsGlobal);const e=function(){return!!(typeof self<"u"&&self.postMessage)},i=function(a){self.postMessage(a)};let n=!1;const t=new Set,_=function(a){return n||(self.addEventListener("message",(c=>{t.forEach(l=>l(c.data))})),n=!0),t.add(a),()=>t.delete(a)};return implementation_tinyWorker.default={isWorkerRuntime:e,postMessageToMaster:i,subscribeToMasterMessages:_},implementation_tinyWorker}var implementation_worker_threads={},worker_threads={},hasRequiredWorker_threads;function requireWorker_threads(){if(hasRequiredWorker_threads)return worker_threads;hasRequiredWorker_threads=1,Object.defineProperty(worker_threads,"__esModule",{value:!0});let implementation;function selectImplementation(){return typeof __non_webpack_require__=="function"?__non_webpack_require__("worker_threads"):eval("require")("worker_threads")}function getImplementation(){return implementation||(implementation=selectImplementation()),implementation}return worker_threads.default=getImplementation,worker_threads}var hasRequiredImplementation_worker_threads;function requireImplementation_worker_threads(){if(hasRequiredImplementation_worker_threads)return implementation_worker_threads;hasRequiredImplementation_worker_threads=1;var e=implementation_worker_threads&&implementation_worker_threads.__importDefault||function(s){return s&&s.__esModule?s:{default:s}};Object.defineProperty(implementation_worker_threads,"__esModule",{value:!0});const i=e(requireWorker_threads());function n(s){if(!s)throw Error("Invariant violation: MessagePort to parent is not available.");return s}const t=function(){return!i.default().isMainThread},_=function(c,l){n(i.default().parentPort).postMessage(c,l)},r=function(c){const l=i.default().parentPort;if(!l)throw Error("Invariant violation: MessagePort to parent is not available.");const p=f=>{c(f)},v=()=>{n(l).off("message",p)};return n(l).on("message",p),v};function a(){i.default()}return implementation_worker_threads.default={isWorkerRuntime:t,postMessageToMaster:_,subscribeToMasterMessages:r,testImplementation:a},implementation_worker_threads}var hasRequiredImplementation;function requireImplementation(){if(hasRequiredImplementation)return implementation;hasRequiredImplementation=1;var e=implementation&&implementation.__importDefault||function(a){return a&&a.__esModule?a:{default:a}};Object.defineProperty(implementation,"__esModule",{value:!0});const i=e(requireImplementation_browser()),n=e(requireImplementation_tinyWorker()),t=e(requireImplementation_worker_threads()),_=typeof process<"u"&&process.arch!=="browser"&&"pid"in process;function r(){try{return t.default.testImplementation(),t.default}catch{return n.default}}return implementation.default=_?r():i.default,implementation}var hasRequiredWorker;function requireWorker(){return hasRequiredWorker||(hasRequiredWorker=1,(function(e){var i=worker&&worker.__awaiter||function(o,d,u,b){function L(E){return E instanceof u?E:new u(function(B){B(E)})}return new(u||(u=Promise))(function(E,B){function D(P){try{R(b.next(P))}catch(N){B(N)}}function W(P){try{R(b.throw(P))}catch(N){B(N)}}function R(P){P.done?E(P.value):L(P.value).then(D,W)}R((b=b.apply(o,d||[])).next())})},n=worker&&worker.__importDefault||function(o){return o&&o.__esModule?o:{default:o}};Object.defineProperty(e,"__esModule",{value:!0}),e.expose=e.isWorkerRuntime=e.Transfer=e.registerSerializer=void 0;const t=n(requireIsObservable()),_=requireCommon(),r=requireTransferable(),a=requireMessages(),s=n(requireImplementation());var c=requireCommon();Object.defineProperty(e,"registerSerializer",{enumerable:!0,get:function(){return c.registerSerializer}});var l=requireTransferable();Object.defineProperty(e,"Transfer",{enumerable:!0,get:function(){return l.Transfer}}),e.isWorkerRuntime=s.default.isWorkerRuntime;let p=!1;const v=new Map,f=o=>o&&o.type===a.MasterMessageType.cancel,k=o=>o&&o.type===a.MasterMessageType.run,T=o=>t.default(o)||O(o);function O(o){return o&&typeof o=="object"&&typeof o.subscribe=="function"}function M(o){return r.isTransferDescriptor(o)?{payload:o.send,transferables:o.transferables}:{payload:o,transferables:void 0}}function z(){const o={type:a.WorkerMessageType.init,exposed:{type:"function"}};s.default.postMessageToMaster(o)}function S(o){const d={type:a.WorkerMessageType.init,exposed:{type:"module",methods:o}};s.default.postMessageToMaster(d)}function w(o,d){const{payload:u,transferables:b}=M(d),L={type:a.WorkerMessageType.error,uid:o,error:_.serialize(u)};s.default.postMessageToMaster(L,b)}function h(o,d,u){const{payload:b,transferables:L}=M(u),E={type:a.WorkerMessageType.result,uid:o,complete:d?!0:void 0,payload:b};s.default.postMessageToMaster(E,L)}function y(o,d){const u={type:a.WorkerMessageType.running,uid:o,resultType:d};s.default.postMessageToMaster(u)}function I(o){try{const d={type:a.WorkerMessageType.uncaughtError,error:_.serialize(o)};s.default.postMessageToMaster(d)}catch(d){console.error(`Not reporting uncaught error back to master thread as it occured while reporting an uncaught error already.\nLatest error:`,d,`\nOriginal error:`,o)}}function g(o,d,u){return i(this,void 0,void 0,function*(){let b;try{b=d(...u)}catch(E){return w(o,E)}const L=T(b)?"observable":"promise";if(y(o,L),T(b)){const E=b.subscribe(B=>h(o,!1,_.serialize(B)),B=>{w(o,_.serialize(B)),v.delete(o)},()=>{h(o,!0),v.delete(o)});v.set(o,E)}else try{const E=yield b;h(o,!0,_.serialize(E))}catch(E){w(o,_.serialize(E))}})}function m(o){if(!s.default.isWorkerRuntime())throw Error("expose() called in the master thread.");if(p)throw Error("expose() called more than once. This is not possible. Pass an object to expose() if you want to expose multiple functions.");if(p=!0,typeof o=="function")s.default.subscribeToMasterMessages(d=>{k(d)&&!d.method&&g(d.uid,o,d.args.map(_.deserialize))}),z();else if(typeof o=="object"&&o){s.default.subscribeToMasterMessages(u=>{k(u)&&u.method&&g(u.uid,o[u.method],u.args.map(_.deserialize))});const d=Object.keys(o).filter(u=>typeof o[u]=="function");S(d)}else throw Error(`Invalid argument passed to expose(). Expected a function or an object, got: ${o}`);s.default.subscribeToMasterMessages(d=>{if(f(d)){const u=d.uid,b=v.get(u);b&&(b.unsubscribe(),v.delete(u))}})}e.expose=m,typeof self<"u"&&typeof self.addEventListener=="function"&&s.default.isWorkerRuntime()&&(self.addEventListener("error",o=>{setTimeout(()=>I(o.error||o),250)}),self.addEventListener("unhandledrejection",o=>{const d=o.reason;d&&typeof d.message=="string"&&setTimeout(()=>I(d),250)})),typeof process<"u"&&typeof process.on=="function"&&s.default.isWorkerRuntime()&&(process.on("uncaughtException",o=>{setTimeout(()=>I(o),250)}),process.on("unhandledRejection",o=>{o&&typeof o.message=="string"&&setTimeout(()=>I(o),250)}))})(worker)),worker}var workerExports=requireWorker();const WorkerContext=getDefaultExportFromCjs(workerExports),expose=WorkerContext.expose;WorkerContext.registerSerializer;const Transfer=WorkerContext.Transfer;function getEncodedVarIndicesLength(e){var i;let n=1;for(const t of e){n+=2;const _=((i=t.subscriptIndices)==null?void 0:i.length)||0;n+=_}return n}function encodeVarIndices(e,i){let n=0;i[n++]=e.length;for(const t of e){i[n++]=t.varIndex;const _=t.subscriptIndices,r=_?.length||0;i[n++]=r;for(let a=0;a<r;a++)i[n++]=_[a]}}function getEncodedConstantBufferLengths(e){var i;let n=1,t=0;for(const _ of e){const r=_.varRef.varSpec;if(r===void 0)throw new Error("Cannot compute constant buffer lengths until all constant var specs are defined");n+=2;const a=((i=r.subscriptIndices)==null?void 0:i.length)||0;n+=a,t+=1}return{constantIndicesLength:n,constantsLength:t}}function encodeConstants(e,i,n){let t=0;i[t++]=e.length;let _=0;for(const r of e){const a=r.varRef.varSpec;i[t++]=a.varIndex;const s=a.subscriptIndices,c=s?.length||0;i[t++]=c;for(let l=0;l<c;l++)i[t++]=s[l];n[_++]=r.value}}function decodeConstants(e,i){const n=[];let t=0;const _=e[t++];for(let r=0;r<_;r++){const a=e[t++],s=e[t++],c=s>0?Array(s):void 0;for(let v=0;v<s;v++)c[v]=e[t++];const l={varIndex:a,subscriptIndices:c},p=i[r];n.push({varRef:{varSpec:l},value:p})}return n}function getEncodedLookupBufferLengths(e){var i,n;let t=1,_=0;for(const r of e){const a=r.varRef.varSpec;if(a===void 0)throw new Error("Cannot compute lookup buffer lengths until all lookup var specs are defined");t+=2;const s=((i=a.subscriptIndices)==null?void 0:i.length)||0;t+=s,t+=2,_+=((n=r.points)==null?void 0:n.length)||0}return{lookupIndicesLength:t,lookupsLength:_}}function encodeLookups(e,i,n){let t=0;i[t++]=e.length;let _=0;for(const r of e){const a=r.varRef.varSpec;i[t++]=a.varIndex;const s=a.subscriptIndices,c=s?.length||0;i[t++]=c;for(let l=0;l<c;l++)i[t++]=s[l];r.points!==void 0?(i[t++]=_,i[t++]=r.points.length,n?.set(r.points,_),_+=r.points.length):(i[t++]=-1,i[t++]=0)}}function decodeLookups(e,i){const n=[];let t=0;const _=e[t++];for(let r=0;r<_;r++){const a=e[t++],s=e[t++],c=s>0?Array(s):void 0;for(let k=0;k<s;k++)c[k]=e[t++];const l=e[t++],p=e[t++],v={varIndex:a,subscriptIndices:c};let f;l>=0?i?f=i.slice(l,l+p):f=new Float64Array(0):f=void 0,n.push({varRef:{varSpec:v},points:f})}return n}function resolveVarRef(e,i,n){if(!i.varSpec){if(e===void 0)throw new Error(`Unable to resolve ${n} variable references by name or identifier when model listing is unavailable`);if(i.varId){const t=e?.getSpecForVarId(i.varId);if(t)i.varSpec=t;else throw new Error(`Failed to resolve ${n} variable reference for varId=${i.varId}`)}else{const t=e?.getSpecForVarName(i.varName);if(t)i.varSpec=t;else throw new Error(`Failed to resolve ${n} variable reference for varName=\'${i.varId}\'`)}}}var headerLengthInElements=20,extrasLengthInElements=1,Int32Section=class{constructor(){this.offsetInBytes=0,this.lengthInElements=0}update(e,i,n){this.view=n>0?new Int32Array(e,i,n):void 0,this.offsetInBytes=i,this.lengthInElements=n}},Float64Section=class{constructor(){this.offsetInBytes=0,this.lengthInElements=0}update(e,i,n){this.view=n>0?new Float64Array(e,i,n):void 0,this.offsetInBytes=i,this.lengthInElements=n}},BufferedRunModelParams=class{constructor(e){this.listing=e,this.header=new Int32Section,this.extras=new Float64Section,this.inputs=new Float64Section,this.outputs=new Float64Section,this.outputIndices=new Int32Section,this.constants=new Float64Section,this.constantIndices=new Int32Section,this.lookups=new Float64Section,this.lookupIndices=new Int32Section}getEncodedBuffer(){return this.encoded}getInputs(){return this.inputs.view}copyInputs(e,i){this.inputs.lengthInElements!==0&&((e===void 0||e.length<this.inputs.lengthInElements)&&(e=i(this.inputs.lengthInElements)),e.set(this.inputs.view))}getOutputIndicesLength(){return this.outputIndices.lengthInElements}getOutputIndices(){return this.outputIndices.view}copyOutputIndices(e,i){this.outputIndices.lengthInElements!==0&&((e===void 0||e.length<this.outputIndices.lengthInElements)&&(e=i(this.outputIndices.lengthInElements)),e.set(this.outputIndices.view))}getOutputsLength(){return this.outputs.lengthInElements}getOutputs(){return this.outputs.view}getOutputsObject(){}storeOutputs(e){this.outputs.view!==void 0&&(e.length>this.outputs.view.length?this.outputs.view.set(e.subarray(0,this.outputs.view.length)):this.outputs.view.set(e))}getConstants(){if(this.constantIndices.lengthInElements!==0)return decodeConstants(this.constantIndices.view,this.constants.view)}getLookups(){if(this.lookupIndices.lengthInElements!==0)return decodeLookups(this.lookupIndices.view,this.lookups.view)}getElapsedTime(){return this.extras.view[0]}storeElapsedTime(e){this.extras.view[0]=e}finalizeOutputs(e){this.outputs.view&&e.updateFromBuffer(this.outputs.view,e.seriesLength),e.runTimeInMillis=this.getElapsedTime()}updateFromParams(e,i,n){const t=e.length,_=i.varIds.length*i.seriesLength;let r;const a=i.varSpecs;a!==void 0&&a.length>0?r=getEncodedVarIndicesLength(a):r=0;let s,c;if(n?.constants!==void 0&&n.constants.length>0){for(const u of n.constants)resolveVarRef(this.listing,u.varRef,"constant");const d=getEncodedConstantBufferLengths(n.constants);s=d.constantsLength,c=d.constantIndicesLength}else s=0,c=0;let l,p;if(n?.lookups!==void 0&&n.lookups.length>0){for(const u of n.lookups)resolveVarRef(this.listing,u.varRef,"lookup");const d=getEncodedLookupBufferLengths(n.lookups);l=d.lookupsLength,p=d.lookupIndicesLength}else l=0,p=0;let v=0;function f(d,u){const b=v,L=d==="float64"?Float64Array.BYTES_PER_ELEMENT:Int32Array.BYTES_PER_ELEMENT,E=Math.round(u*L),B=Math.ceil(E/8)*8;return v+=B,b}const k=f("int32",headerLengthInElements),T=f("float64",extrasLengthInElements),O=f("float64",t),M=f("float64",_),z=f("int32",r),S=f("float64",s),w=f("int32",c),h=f("float64",l),y=f("int32",p),I=v;if(this.encoded===void 0||this.encoded.byteLength<I){const d=Math.ceil(I*1.2);this.encoded=new ArrayBuffer(d),this.header.update(this.encoded,k,headerLengthInElements)}const g=this.header.view;let m=0;g[m++]=T,g[m++]=extrasLengthInElements,g[m++]=O,g[m++]=t,g[m++]=M,g[m++]=_,g[m++]=z,g[m++]=r,g[m++]=S,g[m++]=s,g[m++]=w,g[m++]=c,g[m++]=h,g[m++]=l,g[m++]=y,g[m++]=p,this.inputs.update(this.encoded,O,t),this.extras.update(this.encoded,T,extrasLengthInElements),this.outputs.update(this.encoded,M,_),this.outputIndices.update(this.encoded,z,r),this.constants.update(this.encoded,S,s),this.constantIndices.update(this.encoded,w,c),this.lookups.update(this.encoded,h,l),this.lookupIndices.update(this.encoded,y,p);const o=this.inputs.view;for(let d=0;d<e.length;d++){const u=e[d];typeof u=="number"?o[d]=u:o[d]=u.get()}this.outputIndices.view&&encodeVarIndices(a,this.outputIndices.view),c>0&&encodeConstants(n.constants,this.constantIndices.view,this.constants.view),p>0&&encodeLookups(n.lookups,this.lookupIndices.view,this.lookups.view)}updateFromEncodedBuffer(e){const i=headerLengthInElements*Int32Array.BYTES_PER_ELEMENT;if(e.byteLength<i)throw new Error("Buffer must be long enough to contain header section");this.encoded=e,this.header.update(this.encoded,0,headerLengthInElements);const t=this.header.view;let _=0;const r=t[_++],a=t[_++],s=t[_++],c=t[_++],l=t[_++],p=t[_++],v=t[_++],f=t[_++],k=t[_++],T=t[_++],O=t[_++],M=t[_++],z=t[_++],S=t[_++],w=t[_++],h=t[_++],y=a*Float64Array.BYTES_PER_ELEMENT,I=c*Float64Array.BYTES_PER_ELEMENT,g=p*Float64Array.BYTES_PER_ELEMENT,m=f*Int32Array.BYTES_PER_ELEMENT,o=T*Float64Array.BYTES_PER_ELEMENT,d=M*Int32Array.BYTES_PER_ELEMENT,u=S*Float64Array.BYTES_PER_ELEMENT,b=h*Int32Array.BYTES_PER_ELEMENT,L=i+y+I+g+m+o+d+u+b;if(e.byteLength<L)throw new Error("Buffer must be long enough to contain sections declared in header");this.extras.update(this.encoded,r,a),this.inputs.update(this.encoded,s,c),this.outputs.update(this.encoded,l,p),this.outputIndices.update(this.encoded,v,f),this.constants.update(this.encoded,k,T),this.constantIndices.update(this.encoded,O,M),this.lookups.update(this.encoded,z,S),this.lookupIndices.update(this.encoded,w,h)}},_NA_=-Number.MAX_VALUE,JsModelLookup=class{constructor(e,i){if(i&&i.length<e*2)throw new Error(`Lookup data array length must be >= 2*size (length=${i.length} size=${e}`);this.originalData=i,this.originalSize=e,this.dynamicData=void 0,this.dynamicSize=0,this.activeData=this.originalData,this.activeSize=this.originalSize,this.lastInput=Number.MAX_VALUE,this.lastHitIndex=0}setData(e,i){if(i){if(i.length<e*2)throw new Error(`Lookup data array length must be >= 2*size (length=${i.length} size=${e}`);const n=e*2;if((this.dynamicData===void 0||n>this.dynamicData.length)&&(this.dynamicData=new Float64Array(n)),this.dynamicSize=e,e>0){const t=i.subarray(0,n);this.dynamicData.set(t)}this.activeData=this.dynamicData,this.activeSize=this.dynamicSize}else this.activeData=this.originalData,this.activeSize=this.originalSize;this.invertedData=void 0,this.lastInput=Number.MAX_VALUE,this.lastHitIndex=0}getValueForX(e,i){return this.getValue(e,!1,i)}getValueForY(e){if(this.invertedData===void 0){const i=this.activeSize*2,n=this.activeData,t=Array(i);for(let _=0;_<i;_+=2)t[_]=n[_+1],t[_+1]=n[_];this.invertedData=t}return this.getValue(e,!0,"interpolate")}getValue(e,i,n){if(this.activeSize===0)return _NA_;const t=i?this.invertedData:this.activeData,_=this.activeSize*2,r=!i;let a;r&&e>=this.lastInput?a=this.lastHitIndex:a=0;for(let s=a;s<_;s+=2){const c=t[s];if(c>=e){if(r&&(this.lastInput=e,this.lastHitIndex=s),s===0||c===e)return t[s+1];switch(n){default:case"interpolate":{const l=t[s-2],p=t[s-1],v=t[s+1],f=c-l,k=v-p;return p+k/f*(e-l)}case"forward":return t[s+1];case"backward":return t[s-1]}}}return r&&(this.lastInput=e,this.lastHitIndex=_),t[_-1]}getValueForGameTime(e,i){if(this.activeSize<=0)return i;const n=this.activeData[0];return e<n?i:this.getValue(e,!1,"backward")}getValueBetweenTimes(e,i){if(this.activeSize===0)return _NA_;const n=this.activeData,t=this.activeSize*2;switch(i){case"forward":{e=Math.floor(e);for(let _=0;_<t;_+=2)if(n[_]>=e)return n[_+1];return n[t-1]}case"backward":{e=Math.floor(e);for(let _=2;_<t;_+=2)if(n[_]>=e)return n[_-1];return t>=4?n[t-3]:n[1]}default:{if(e-Math.floor(e)>0){let _=`GET DATA BETWEEN TIMES was called with an input value (${e}) that has a fractional part. `;throw _+="When mode is 0 (interpolate) and the input value is not a whole number, Vensim produces unexpected ",_+="results that may differ from those produced by SDEverywhere.",new Error(_)}for(let _=2;_<t;_+=2){const r=n[_];if(r>=e){const a=n[_-2],s=n[_-1],c=n[_+1],l=r-a,p=c-s;return s+p/l*(e-a)}}return n[t-1]}}}},EPSILON=1e-6;function getJsModelFunctions(){let e;const i=new Map,n=new Map;return{setContext(t){e=t},ABS(t){return Math.abs(t)},ARCCOS(t){return Math.acos(t)},ARCSIN(t){return Math.asin(t)},ARCTAN(t){return Math.atan(t)},COS(t){return Math.cos(t)},EXP(t){return Math.exp(t)},GAME(t,_){return t?t.getValueForGameTime(e.currentTime,_):_},INTEG(t,_){return t+_*e.timeStep},INTEGER(t){return Math.trunc(t)},LN(t){return Math.log(t)},MAX(t,_){return Math.max(t,_)},MIN(t,_){return Math.min(t,_)},MODULO(t,_){return t%_},POW(t,_){return Math.pow(t,_)},POWER(t,_){return Math.pow(t,_)},PULSE(t,_){return pulse(e,t,_)},PULSE_TRAIN(t,_,r,a){const s=Math.floor((a-t)/r);for(let c=0;c<=s;c++)if(e.currentTime<=a&&pulse(e,t+c*r,_))return 1;return 0},QUANTUM(t,_){return _<=0?t:_*Math.trunc(t/_)},RAMP(t,_,r){return e.currentTime>_?e.currentTime<r||_>r?t*(e.currentTime-_):t*(r-_):0},SIN(t){return Math.sin(t)},SQRT(t){return Math.sqrt(t)},STEP(t,_){return e.currentTime+e.timeStep/2>_?t:0},TAN(t){return Math.tan(t)},VECTOR_SORT_ORDER(t,_,r){if(_>t.length)throw new Error(`VECTOR SORT ORDER input vector length (${t.length}) must be >= size (${_})`);let a=n.get(_);if(a===void 0){a=Array(_);for(let l=0;l<_;l++)a[l]={x:0,ind:0};n.set(_,a)}let s=i.get(_);s===void 0&&(s=Array(_),i.set(_,s));for(let l=0;l<_;l++)a[l].x=t[l],a[l].ind=l;const c=r>0?1:-1;a.sort((l,p)=>{let v;return l.x<p.x?v=-1:l.x>p.x?v=1:v=0,v*c});for(let l=0;l<_;l++)s[l]=a[l].ind;return s},XIDZ(t,_,r){return Math.abs(_)<EPSILON?r:t/_},ZIDZ(t,_){return Math.abs(_)<EPSILON?0:t/_},createLookup(t,_){return new JsModelLookup(t,_)},LOOKUP(t,_){return t?t.getValueForX(_,"interpolate"):_NA_},LOOKUP_FORWARD(t,_){return t?t.getValueForX(_,"forward"):_NA_},LOOKUP_BACKWARD(t,_){return t?t.getValueForX(_,"backward"):_NA_},LOOKUP_INVERT(t,_){return t?t.getValueForY(_):_NA_},WITH_LOOKUP(t,_){return _?_.getValueForX(t,"interpolate"):_NA_},GET_DATA_BETWEEN_TIMES(t,_,r){let a;return r>=1?a="forward":r<=-1?a="backward":a="interpolate",t?t.getValueBetweenTimes(_,a):_NA_}}}function pulse(e,i,n){const t=e.currentTime+e.timeStep/2;return n===0&&(n=e.timeStep),t>i&&t<i+n?1:0}var isWeb;function perfNow(){return isWeb===void 0&&(isWeb=typeof self<"u"&&self?.performance!==void 0),isWeb?self.performance.now():process==null?void 0:process.hrtime()}function perfElapsed(e){if(isWeb)return self.performance.now()-e;{const i=process.hrtime(e);return(i[0]*1e9+i[1])/1e6}}var BaseRunnableModel=class{constructor(e){this.startTime=e.startTime,this.endTime=e.endTime,this.saveFreq=e.saveFreq,this.numSavePoints=e.numSavePoints,this.outputVarIds=e.outputVarIds,this.modelListing=e.modelListing,this.onRunModel=e.onRunModel}runModel(e){var i;let n=e.getInputs();n===void 0&&(e.copyInputs(this.inputs,c=>(this.inputs=new Float64Array(c),this.inputs)),n=this.inputs);let t=e.getOutputIndices();t===void 0&&e.getOutputIndicesLength()>0&&(e.copyOutputIndices(this.outputIndices,c=>(this.outputIndices=new Int32Array(c),this.outputIndices)),t=this.outputIndices);const _=e.getOutputsLength();(this.outputs===void 0||this.outputs.length<_)&&(this.outputs=new Float64Array(_));const r=this.outputs,a=perfNow();(i=this.onRunModel)==null||i.call(this,n,r,{outputIndices:t,constants:e.getConstants(),lookups:e.getLookups()});const s=perfElapsed(a);e.storeOutputs(r),e.storeElapsedTime(s)}terminate(){}};function initJsModel(e){let i=e.getModelFunctions();i===void 0&&(i=getJsModelFunctions(),e.setModelFunctions(i));const n=e.getInitialTime(),t=e.getFinalTime(),_=e.getTimeStep(),r=e.getSaveFreq(),a=Math.round((t-n)/r)+1;return new BaseRunnableModel({startTime:n,endTime:t,saveFreq:r,numSavePoints:a,outputVarIds:e.outputVarIds,modelListing:e.modelListing,onRunModel:(s,c,l)=>{runJsModel(e,n,t,_,r,a,s,c,l?.outputIndices,l?.constants,l?.lookups)}})}function runJsModel(e,i,n,t,_,r,a,s,c,l,p,v){let f=i;e.setTime(f);const k={timeStep:t,currentTime:f};if(e.getModelFunctions().setContext(k),e.initConstants(),l!==void 0)for(const w of l)e.setConstant(w.varRef.varSpec,w.value);if(p!==void 0)for(const w of p)e.setLookup(w.varRef.varSpec,w.points);a?.length>0&&e.setInputs(w=>a[w]),e.initLevels();const T=Math.round((n-i)/t),O=n;let M=0,z=0,S=0;for(;M<=T;){if(e.evalAux(),f%_<1e-6){S=0;const w=h=>{const y=S*r+z;s[y]=f<=O?h:void 0,S++};if(c!==void 0){let h=0;const y=c[h++];for(let I=0;I<y;I++){const g=c[h++],m=c[h++];let o;m>0&&(o=c.subarray(h,h+m),h+=m);const d={varIndex:g,subscriptIndices:o};e.storeOutput(d,w)}}else e.storeOutputs(w);z++}if(M===T)break;e.evalLevels(),f+=t,e.setTime(f),k.currentTime=f,M++}}var WasmBuffer=class{constructor(e,i,n,t){this.wasmModule=e,this.numElements=i,this.byteOffset=n,this.heapArray=t}getArrayView(){return this.heapArray}getAddress(){return this.byteOffset}dispose(){var e,i;this.heapArray&&((i=(e=this.wasmModule)._free)==null||i.call(e,this.byteOffset),this.numElements=void 0,this.heapArray=void 0,this.byteOffset=void 0)}};function createInt32WasmBuffer(e,i){const t=i*4,_=e._malloc(t),r=_/4,a=e.HEAP32.subarray(r,r+i);return new WasmBuffer(e,i,_,a)}function createFloat64WasmBuffer(e,i){const t=i*8,_=e._malloc(t),r=_/8,a=e.HEAPF64.subarray(r,r+i);return new WasmBuffer(e,i,_,a)}var WasmModel=class{constructor(e){this.wasmModule=e;function i(n){return e.cwrap(n,"number",[])()}this.startTime=i("getInitialTime"),this.endTime=i("getFinalTime"),this.saveFreq=i("getSaveper"),this.numSavePoints=Math.round((this.endTime-this.startTime)/this.saveFreq)+1,this.outputVarIds=e.outputVarIds,this.modelListing=e.modelListing,this.wasmSetLookup=e.cwrap("setLookup",null,["number","number","number","number"]),this.wasmRunModel=e.cwrap("runModelWithBuffers",null,["number","number","number","number","number","number"])}runModel(e){var i,n,t,_,r,a,s,c,l,p,v;const f=e.getLookups();if(f!==void 0)for(const h of f){const y=h.varRef.varSpec,I=((i=y.subscriptIndices)==null?void 0:i.length)||0;let g;I>0?((this.lookupSubIndicesBuffer===void 0||this.lookupSubIndicesBuffer.numElements<I)&&((n=this.lookupSubIndicesBuffer)==null||n.dispose(),this.lookupSubIndicesBuffer=createInt32WasmBuffer(this.wasmModule,I)),this.lookupSubIndicesBuffer.getArrayView().set(y.subscriptIndices),g=this.lookupSubIndicesBuffer.getAddress()):g=0;let m,o;if(h.points){const u=h.points.length;(this.lookupDataBuffer===void 0||this.lookupDataBuffer.numElements<u)&&((t=this.lookupDataBuffer)==null||t.dispose(),this.lookupDataBuffer=createFloat64WasmBuffer(this.wasmModule,u)),this.lookupDataBuffer.getArrayView().set(h.points),m=this.lookupDataBuffer.getAddress(),o=u/2}else m=0,o=0;const d=y.varIndex;this.wasmSetLookup(d,g,m,o)}let k,T;const O=e.getConstants();if(O!==void 0&&O.length>0){let h=1;for(const d of O){const u=((_=d.varRef.varSpec.subscriptIndices)==null?void 0:_.length)||0;h+=2+u}(this.constantIndicesBuffer===void 0||this.constantIndicesBuffer.numElements<h)&&((r=this.constantIndicesBuffer)==null||r.dispose(),this.constantIndicesBuffer=createInt32WasmBuffer(this.wasmModule,h));const y=O.length;(this.constantValuesBuffer===void 0||this.constantValuesBuffer.numElements<y)&&((a=this.constantValuesBuffer)==null||a.dispose(),this.constantValuesBuffer=createFloat64WasmBuffer(this.wasmModule,y));const I=this.constantIndicesBuffer.getArrayView(),g=this.constantValuesBuffer.getArrayView();let m=0,o=0;I[m++]=y;for(const d of O){const u=d.varRef.varSpec,b=((s=u.subscriptIndices)==null?void 0:s.length)||0;if(I[m++]=u.varIndex,I[m++]=b,b>0)for(let L=0;L<b;L++)I[m++]=u.subscriptIndices[L];g[o++]=d.value}k=this.constantIndicesBuffer,T=this.constantValuesBuffer}else k=void 0,T=void 0;e.copyInputs((c=this.inputsBuffer)==null?void 0:c.getArrayView(),h=>{var y;return(y=this.inputsBuffer)==null||y.dispose(),this.inputsBuffer=createFloat64WasmBuffer(this.wasmModule,h),this.inputsBuffer.getArrayView()});let M;e.getOutputIndicesLength()>0?(e.copyOutputIndices((l=this.outputIndicesBuffer)==null?void 0:l.getArrayView(),h=>{var y;return(y=this.outputIndicesBuffer)==null||y.dispose(),this.outputIndicesBuffer=createInt32WasmBuffer(this.wasmModule,h),this.outputIndicesBuffer.getArrayView()}),M=this.outputIndicesBuffer):M=void 0;const z=e.getOutputsLength();(this.outputsBuffer===void 0||this.outputsBuffer.numElements<z)&&((p=this.outputsBuffer)==null||p.dispose(),this.outputsBuffer=createFloat64WasmBuffer(this.wasmModule,z));const S=perfNow();this.wasmRunModel(((v=this.inputsBuffer)==null?void 0:v.getAddress())||0,0,this.outputsBuffer.getAddress(),M?.getAddress()||0,T?.getAddress()||0,k?.getAddress()||0);const w=perfElapsed(S);e.storeOutputs(this.outputsBuffer.getArrayView()),e.storeElapsedTime(w)}terminate(){var e,i,n,t,_;(e=this.inputsBuffer)==null||e.dispose(),this.inputsBuffer=void 0,(i=this.outputsBuffer)==null||i.dispose(),this.outputsBuffer=void 0,(n=this.outputIndicesBuffer)==null||n.dispose(),this.outputIndicesBuffer=void 0,(t=this.constantValuesBuffer)==null||t.dispose(),this.constantValuesBuffer=void 0,(_=this.constantIndicesBuffer)==null||_.dispose(),this.constantIndicesBuffer=void 0}};function initWasmModel(e){return new WasmModel(e)}function createRunnableModel(e){switch(e.kind){case"js":return initJsModel(e);case"wasm":return initWasmModel(e);default:throw new Error("Unable to identify generated model kind")}}var initGeneratedModel,runnableModel,params=new BufferedRunModelParams,modelWorker={async initModel(){if(runnableModel)throw new Error("RunnableModel was already initialized");const e=await initGeneratedModel();return runnableModel=createRunnableModel(e),{outputVarIds:runnableModel.outputVarIds,modelListing:runnableModel.modelListing,startTime:runnableModel.startTime,endTime:runnableModel.endTime,saveFreq:runnableModel.saveFreq,outputRowLength:runnableModel.numSavePoints}},runModel(e){if(!runnableModel)throw new Error("RunnableModel must be initialized before running the model in worker");return params.updateFromEncodedBuffer(e),runnableModel.runModel(params),Transfer(e)}};function exposeModelWorker(e){initGeneratedModel=e,expose(modelWorker)}let __aux1,__aux3,__level1,__level3,_access_multiplier,_active_patient_ncd_related_service_utilization,_adjusted_annual_average_rdf,_adjusted_subsidies,_adjusted_total_cbhi_collected_fees,_adult_pop_with_coverage,_alpha,_annual_clinical_minutes_per_provider,_annual_health_service_utilization_per_ncd_patient,_annual_inflation_rate,_average_reimbursement_delay,_avg_adjusted_total_revolving_drug_funds,_avg_adult_pop_per_household,_base_average_fee_per_person,_base_average_reimbursement_per_person,_base_death_rate,_base_enrollment_rate,_base_medication_restocking_rate,_base_medication_utilization_rate,_base_ncd_screen_rate=multiDimArray([2]),_base_positive_ncd_fraction_for_screened_people=multiDimArray([2]),_base_provider_per_facility,_base_tx_enrollment_rate_post_screening=multiDimArray([2]),_beta,_care_capacity_per_capita,_cbhi_beneficiaries,_cbhi_or_fee_waivered_patient_visits,_cbhi_paid,_cbhi_reimbursement_approval_fraction,_cbhi_reimbursements_approved,_cbhi_revenue,_change_in_demand_for_medications,_change_in_provider_availability,_change_time,_collected_fees_and_subsidies,_data_adjusted_membership_cost_per_household,_data_adjusted_total_revolving_drug_funds,_data_amhara_total_population_30_yo_plus,_data_cbhi_membership_cost_per_household,_data_cbhi_targeted_households,_data_essential_medication_availability_avg,_data_essential_medication_availability_dia,_data_essential_medication_availability_htn,_data_inflation_conversion_multiplier_for_2017_birr_value,_data_total_revolving_drug_funds,_death_of_at_risk_population=multiDimArray([2]),_death_of_treated_ncd_patients=multiDimArray([2]),_death_of_untreated_ncd_patients=multiDimArray([2]),_death_rate_for_untreated_ncd=multiDimArray([2]),_delay_reduction_strategy_start_year,_delay_reduction_strategy_strength,_demand_fulfilment_ratio,_demand_minutes_for_ncd,_demand_minutes_for_ncd_screening,_demand_minutes_for_non_ncd,_developing_ncd=multiDimArray([2]),_discontinuation_from_care=multiDimArray([2]),_discontinuation_rate=multiDimArray([2]),_dropout,_dropout_rate,_eff_of_coverage_on_service_utilization,_eff_of_health_coverage_on_screening=multiDimArray([2]),_eff_of_perceived_benefit_on_enrollment,_eligible_population_adjustment,_enrollment_strategy_start_year,_enrollment_strategy_strength,_essential_medication_availability,_facilities_in_amhara,_facilities_with_medication,_facilities_without_medication,_facility_stock_adjustment_time,_fee_waiver_adjustment_rate,_fee_waiver_enrollment_change,_fee_waiver_strategy_start_year,_fee_waiver_strategy_strength,_fee_waivered_insurance_coverage,_fee_waivered_population_with_health_coverage,_final_time,_frac_adult_of_pop_with_coverage,_fraction_allocated_to_rdf,_fraction_in_treatment=multiDimArray([2]),_fraction_not_in_treatment=multiDimArray([2]),_fraction_of_day_in_clinic_time,_household_adjustment_time,_household_size_adj_for_fees,_implied_cbhi_reimbursement_approval_fraction,_implied_delay,_implied_discontinuation_rate=multiDimArray([2]),_implied_eligible_households_not_enrolled,_implied_enrollment_rate,_implied_medication_restocking,_implied_medication_utilization_rate,_implied_positive_screening_rate=multiDimArray([2]),_implied_screen_rate=multiDimArray([2]),_initial_avg_adjusted_total_revolving_drug_funds,_initial_care_capacity_per_capita,_initial_cbhi_beneficiaries,_initial_cbhi_eligible_not_enrolled,_initial_cbhi_revenue,_initial_demand_for_medications,_initial_diagnosed_not_controlled_ncd=multiDimArray([2]),_initial_essential_medicine_availability,_initial_facilities_with_medication,_initial_facilities_without_medication,_initial_fee_waivered_population,_initial_fraction_not_in_treatment=multiDimArray([2]),_initial_health_insurance_coverage_rate,_initial_perceived_benefit,_initial_population_at_risk_of_developing_ncd=multiDimArray([2]),_initial_providers,_initial_time,_initial_tot_demand_min_ratio,_initial_total_demand_minutes,_initial_undiagnosed_uncontrolled_ncd=multiDimArray([2]),_insured_service_utilization_per_capita,_max_provider_per_facility,_minutes_per_ncd_patient_year,_minutes_per_non_ncd_visit,_minutes_per_screen,_minutes_per_visit,_ncd_development_rate=multiDimArray([2]),_ncd_related_service_utilization,_ncd_related_service_utilization_per_capita,_ncd_screen_rate=multiDimArray([2]),_ncd_screening_related_service_utilization,_net_enrollment_rate_in_2007,_new_enrollment_into_care=multiDimArray([2]),_new_enrollments,_new_fee_waiver_rate,_new_people_joining_at_risk_population,_new_utilization_for_dia_screen,_new_utilization_for_htn_screen,_non_ncd_visits,_ocm_rate_for_treated=multiDimArray([2]),_oneyear,_other_health_service_utilization,_people_in_informal_sector_not_enrolled_to_cbhi,_people_screened_for_ncd=multiDimArray([2]),_people_screened_positive_for_ncd=multiDimArray([2]),_percent_enrolled_among_eligible_households,_population_adjustment,_population_at_risk_of_developing_ncd=multiDimArray([2]),_population_in_dia_treatment,_population_in_htn_treatment,_procurement_responsiveness,_provider_adjustment_rate,_provider_gap,_provider_per_facility,_provider_strategy_start_year,_provider_strategy_strength,_reference_utilization_per_capita,_reimbursement_requests_from_cbhis,_reimbursement_strategy_start_year,_reimbursement_strategy_strength,_reimbursements,_relative_avg_adjusted_total_revolving_drug_funds,_relative_benefit,_relative_coverage_rate,_relative_death_risk_for_ncd=multiDimArray([2]),_relative_essential_medicine_availability,_relative_ncd_care_service_availability,_relative_untreated_ncd=multiDimArray([2]),_restock_strategy_start_year,_restock_strategy_strength,_restocking_rate,_revenue_from_user_fees,_revenue_utilization_time,_saveper,_screen_strategy_start_year,_screen_strategy_strength,_stock_out_rate,_strategy_to_decrease_reimbursement_delay,_strategy_to_increase_enrollments,_strategy_to_increase_fee_waivers,_strategy_to_increase_provider_capacity,_strategy_to_increase_reimbursement,_strategy_to_increase_restocking,_strategy_to_increase_screen,_strength_access_on_utilization,_strength_coverage_on_screen=multiDimArray([2]),_strength_of_perceived_benefit,_subsidy_fraction,_time_step,_time_to_enroll,_total_adult_population_with_coverage,_total_annual_clinical_minutes_per_provider,_total_demand_minutes,_total_ncd_care_demand_pop,_total_provider_minutes,_total_providers,_total_service_utilization_per_capita,_total_visits,_transition_time,_treated_ncd=multiDimArray([2]),_treated_ncd_death_risk_relative_to_untreated=multiDimArray([2]),_uninsured_patient_visits,_uninsured_service_utilization_per_capita,_untreated_ncd=multiDimArray([2]),_workforce_availability_factor;const _data_amhara_total_population_30_yo_plus_data_=[2006,72e5,2007,69e5,2008,72e5,2009,75e5,2010,78e5,2011,81e5,2012,84e5,2013,87e5,2014,89e5,2015,92e5,2016,94e5,2017,97e5,2018,9910870,2019,10126300,2020,10346500,2021,10571400,2022,10801200,2023,11036e3,2024,11275900,2025,11521e3,2026,11771500,2027,12027400,2028,12288900],_data_cbhi_membership_cost_per_household_data_=[2005,106,2006,106,2007,144,2008,144,2009,170,2010,240,2011,240,2012,350,2013,450,2014,450,2015,750,2016,800,2017,1e3,2018,1133.79,2019,1269.64,2020,1384.56,2021,1496.82,2022,1618.18,2023,1749.39,2024,1891.23,2025,2044.57,2026,2210.35,2027,2389.56,2028,2583.31],_data_cbhi_targeted_households_data_=[2005,54212,2009,2684980,2010,3759270,2011,4341040,2012,4388960,2013,4020450,2014,4072840,2015,4122930,2016,4476440,2017,4573750,2018,4673180,2019,4774770,2020,4878570,2021,4984630,2022,5092990,2023,5203700,2024,5316830,2025,5432410,2026,5550510,2027,5671170,2028,5794460],_data_essential_medication_availability_dia_data_=[2007,.37,2009,.53,2011,.48],_data_essential_medication_availability_htn_data_=[2007,.36,2009,.41,2011,.42],_data_inflation_conversion_multiplier_for_2017_birr_value_data_=[2005,9.99513,2006,9.24909,2007,8.61183,2008,7.78777,2009,7.27159,2010,6.49446,2011,5.59608,2012,4.71136,2013,3.7523,2014,2.7452,2015,1.81486,2016,1.26643,2017,1,2018,.882,2019,.787626,2020,.722253,2021,.668084,2022,.617978,2023,.571629,2024,.528757,2025,.4891,2026,.452418,2027,.418487,2028,.3871],_data_total_revolving_drug_funds_data_=[2005,143e6,2006,14418e4,2007,15e7,2008,174e6,2009,15e7,2010,1511e5,2011,183299e3,2012,187e6,2013,18964e4,2014,20933e4,2015,2616e5,2016,3285e5,2017,4615e5,2018,523243e3,2019,585938e3,2020,638973e3,2021,690781e3,2022,746791e3,2023,807341e3,2024,872801e3,2025,943569e3,2026,102007e4,2027,110278e4,2028,11922e5];let _time;function setTime(e){_time=e}let controlParamsInitialized=!1;function initControlParamsIfNeeded(){if(!controlParamsInitialized){if(fns===void 0)throw new Error("Must call setModelFunctions() before running the model");if(initConstants(),_initial_time===void 0)throw new Error("INITIAL TIME must be defined as a constant value");if(_time_step===void 0)throw new Error("TIME STEP must be defined as a constant value");if(_final_time===void 0||_saveper===void 0){if(setTime(_initial_time),fns.setContext({timeStep:_time_step,currentTime:_time}),initLevels(),evalAux(),_final_time===void 0)throw new Error("FINAL TIME must be defined");if(_saveper===void 0)throw new Error("SAVEPER must be defined")}controlParamsInitialized=!0}}function getInitialTime(){return initControlParamsIfNeeded(),_initial_time}function getFinalTime(){return initControlParamsIfNeeded(),_final_time}function getTimeStep(){return initControlParamsIfNeeded(),_time_step}function getSaveFreq(){return initControlParamsIfNeeded(),_saveper}let fns;function getModelFunctions(){return fns}function setModelFunctions(e){fns=e}function multiDimArray(e){if(e.length>0){const i=e[0],n=new Array(i);for(let t=0;t<i;t++)n[t]=multiDimArray(e.slice(1));return n}else return 0}let data_initialized=!1;function initData0(){_data_amhara_total_population_30_yo_plus=fns.createLookup(23,_data_amhara_total_population_30_yo_plus_data_),_data_cbhi_membership_cost_per_household=fns.createLookup(24,_data_cbhi_membership_cost_per_household_data_),_data_cbhi_targeted_households=fns.createLookup(21,_data_cbhi_targeted_households_data_),_data_essential_medication_availability_dia=fns.createLookup(3,_data_essential_medication_availability_dia_data_),_data_essential_medication_availability_htn=fns.createLookup(3,_data_essential_medication_availability_htn_data_),_data_inflation_conversion_multiplier_for_2017_birr_value=fns.createLookup(24,_data_inflation_conversion_multiplier_for_2017_birr_value_data_),_data_total_revolving_drug_funds=fns.createLookup(24,_data_total_revolving_drug_funds_data_)}function initData(){data_initialized||(initData0(),data_initialized=!0)}function initConstants0(){_cbhi_reimbursement_approval_fraction=.5,_final_time=2028,_initial_time=2007,_ncd_development_rate[1]=.01,_ncd_development_rate[0]=.02,_oneyear=1,_time_step=.125,_alpha=1,_annual_health_service_utilization_per_ncd_patient=2,_annual_inflation_rate=.25,_average_reimbursement_delay=1,_avg_adult_pop_per_household=2,_base_ncd_screen_rate[1]=.005,_base_ncd_screen_rate[0]=.01,_base_average_fee_per_person=3,_base_average_reimbursement_per_person=3,_base_death_rate=1e-4,_base_enrollment_rate=.05,_base_medication_restocking_rate=.2,_base_medication_utilization_rate=.6,_base_positive_ncd_fraction_for_screened_people[1]=.1,_base_positive_ncd_fraction_for_screened_people[0]=.2,_base_provider_per_facility=10,_base_tx_enrollment_rate_post_screening[1]=.5,_base_tx_enrollment_rate_post_screening[0]=.5,_beta=1,_change_time=1,_delay_reduction_strategy_start_year=2018,_delay_reduction_strategy_strength=0}function initConstants1(){_discontinuation_rate[1]=.25,_discontinuation_rate[0]=.2,_dropout_rate=.01,_eff_of_coverage_on_service_utilization=1.35,_enrollment_strategy_start_year=2018,_enrollment_strategy_strength=0,_facilities_in_amhara=1051,_facility_stock_adjustment_time=.25,_fee_waiver_adjustment_rate=.001,_fee_waiver_strategy_start_year=2018,_fee_waiver_strategy_strength=0,_fraction_allocated_to_rdf=.6,_fraction_of_day_in_clinic_time=.6,_household_adjustment_time=1,_household_size_adj_for_fees=1,_initial_cbhi_revenue=1e5,_initial_diagnosed_not_controlled_ncd[1]=1e5,_initial_diagnosed_not_controlled_ncd[0]=1e5,_initial_fee_waivered_population=26422,_initial_population_at_risk_of_developing_ncd[1]=2e6,_initial_population_at_risk_of_developing_ncd[0]=2e6,_initial_providers=50,_initial_tot_demand_min_ratio=1,_initial_undiagnosed_uncontrolled_ncd[1]=6e6,_initial_undiagnosed_uncontrolled_ncd[0]=6e6,_minutes_per_screen=5,_minutes_per_visit=20,_net_enrollment_rate_in_2007=.53,_new_fee_waiver_rate=.001}function initConstants2(){_population_adjustment=4e5,_procurement_responsiveness=.5,_provider_adjustment_rate=10,_provider_strategy_start_year=2018,_provider_strategy_strength=0,_reference_utilization_per_capita=.1,_reimbursement_strategy_start_year=2018,_reimbursement_strategy_strength=0,_relative_death_risk_for_ncd[1]=2,_relative_death_risk_for_ncd[0]=2,_restock_strategy_start_year=2018,_restock_strategy_strength=0,_revenue_utilization_time=1,_screen_strategy_start_year=2018,_screen_strategy_strength=0,_strength_access_on_utilization=1,_strength_coverage_on_screen[1]=1,_strength_coverage_on_screen[0]=1,_strength_of_perceived_benefit=1,_subsidy_fraction=.1,_time_to_enroll=1,_total_annual_clinical_minutes_per_provider=1760*60,_transition_time=1,_treated_ncd_death_risk_relative_to_untreated[1]=.5,_treated_ncd_death_risk_relative_to_untreated[0]=.5,_workforce_availability_factor=.6}function initConstants(){initConstants0(),initConstants1(),initConstants2(),initData()}function initLevels0(){_initial_cbhi_beneficiaries=_net_enrollment_rate_in_2007*fns.LOOKUP(_data_cbhi_targeted_households,_time),_data_essential_medication_availability_avg=(fns.LOOKUP(_data_essential_medication_availability_dia,_time)+fns.LOOKUP(_data_essential_medication_availability_htn,_time))/2,_initial_essential_medicine_availability=_data_essential_medication_availability_avg,_initial_facilities_with_medication=_initial_essential_medicine_availability*_facilities_in_amhara,_facilities_with_medication=_initial_facilities_with_medication,_initial_facilities_without_medication=(1-_initial_essential_medicine_availability)*_facilities_in_amhara,_facilities_without_medication=_initial_facilities_without_medication,_data_adjusted_total_revolving_drug_funds=fns.LOOKUP(_data_total_revolving_drug_funds,_time)*fns.LOOKUP(_data_inflation_conversion_multiplier_for_2017_birr_value,_time),__aux3=_time_step,_annual_clinical_minutes_per_provider=_total_annual_clinical_minutes_per_provider*_fraction_of_day_in_clinic_time,_total_providers=_initial_providers,_total_provider_minutes=_total_providers*_annual_clinical_minutes_per_provider*_workforce_availability_factor,_initial_total_demand_minutes=_total_provider_minutes*_initial_tot_demand_min_ratio,__level3=_initial_total_demand_minutes*_time_step,_total_demand_minutes=__level3/__aux3,_demand_fulfilment_ratio=fns.MIN(1,fns.ZIDZ(_total_provider_minutes,_total_demand_minutes)),_population_at_risk_of_developing_ncd[0]=_initial_population_at_risk_of_developing_ncd[0],_untreated_ncd[0]=_initial_undiagnosed_uncontrolled_ncd[0],_fee_waivered_population_with_health_coverage=_initial_fee_waivered_population,_cbhi_beneficiaries=_initial_cbhi_beneficiaries,_total_adult_population_with_coverage=(_cbhi_beneficiaries+_fee_waivered_population_with_health_coverage)*_avg_adult_pop_per_household,_frac_adult_of_pop_with_coverage=fns.MIN(_total_adult_population_with_coverage/fns.LOOKUP(_data_amhara_total_population_30_yo_plus,_time),1),_initial_health_insurance_coverage_rate=_frac_adult_of_pop_with_coverage,_relative_coverage_rate=fns.ZIDZ(_frac_adult_of_pop_with_coverage,_initial_health_insurance_coverage_rate),_eff_of_health_coverage_on_screening[0]=fns.POW(_relative_coverage_rate,_strength_coverage_on_screen[0]),_strategy_to_increase_screen=fns.STEP(_screen_strategy_strength*_beta,_screen_strategy_start_year)+1,_implied_screen_rate[0]=_base_ncd_screen_rate[0]*_strategy_to_increase_screen,_ncd_screen_rate[0]=_implied_screen_rate[0]*_eff_of_health_coverage_on_screening[0],_people_screened_for_ncd[0]=fns.MAX(_ncd_screen_rate[0]*(_untreated_ncd[0]+_population_at_risk_of_developing_ncd[0]),0)*_demand_fulfilment_ratio,_new_utilization_for_htn_screen=_people_screened_for_ncd[0]}function initLevels1(){_population_at_risk_of_developing_ncd[1]=_initial_population_at_risk_of_developing_ncd[1],_untreated_ncd[1]=_initial_undiagnosed_uncontrolled_ncd[1],_eff_of_health_coverage_on_screening[1]=fns.POW(_relative_coverage_rate,_strength_coverage_on_screen[1]),_implied_screen_rate[1]=_base_ncd_screen_rate[1]*_strategy_to_increase_screen,_ncd_screen_rate[1]=_implied_screen_rate[1]*_eff_of_health_coverage_on_screening[1],_people_screened_for_ncd[1]=fns.MAX(_ncd_screen_rate[1]*(_untreated_ncd[1]+_population_at_risk_of_developing_ncd[1]),0)*_demand_fulfilment_ratio,_new_utilization_for_dia_screen=_people_screened_for_ncd[1],_ncd_screening_related_service_utilization=_new_utilization_for_dia_screen+_new_utilization_for_htn_screen,_treated_ncd[0]=_initial_diagnosed_not_controlled_ncd[0],_population_in_htn_treatment=_treated_ncd[0],_treated_ncd[1]=_initial_diagnosed_not_controlled_ncd[1],_population_in_dia_treatment=_treated_ncd[1],_active_patient_ncd_related_service_utilization=(_population_in_dia_treatment+_population_in_htn_treatment)*_annual_health_service_utilization_per_ncd_patient,_ncd_related_service_utilization=_active_patient_ncd_related_service_utilization+_ncd_screening_related_service_utilization,_ncd_related_service_utilization_per_capita=_ncd_related_service_utilization/fns.LOOKUP(_data_amhara_total_population_30_yo_plus,_time),_care_capacity_per_capita=_total_providers/fns.LOOKUP(_data_amhara_total_population_30_yo_plus,_time),_initial_care_capacity_per_capita=_care_capacity_per_capita,_access_multiplier=fns.POW(_care_capacity_per_capita/_initial_care_capacity_per_capita,_strength_access_on_utilization),_other_health_service_utilization=_reference_utilization_per_capita*_access_multiplier,_uninsured_service_utilization_per_capita=_other_health_service_utilization+_ncd_related_service_utilization_per_capita,_uninsured_patient_visits=_uninsured_service_utilization_per_capita*fns.LOOKUP(_data_amhara_total_population_30_yo_plus,_time)*(1-_frac_adult_of_pop_with_coverage),_strategy_to_decrease_reimbursement_delay=1-fns.STEP(_delay_reduction_strategy_strength*_beta,_delay_reduction_strategy_start_year),_implied_delay=_average_reimbursement_delay*_strategy_to_decrease_reimbursement_delay,__aux1=_implied_delay,_cbhi_revenue=_initial_cbhi_revenue,_strategy_to_increase_reimbursement=fns.STEP(_reimbursement_strategy_strength*_beta,_reimbursement_strategy_start_year)+1,_implied_cbhi_reimbursement_approval_fraction=fns.MIN(_cbhi_reimbursement_approval_fraction*_strategy_to_increase_reimbursement,1),_adult_pop_with_coverage=fns.LOOKUP(_data_amhara_total_population_30_yo_plus,_time)*_frac_adult_of_pop_with_coverage,_insured_service_utilization_per_capita=(_other_health_service_utilization+_ncd_related_service_utilization_per_capita)*_eff_of_coverage_on_service_utilization,_cbhi_or_fee_waivered_patient_visits=_insured_service_utilization_per_capita*_adult_pop_with_coverage}function initLevels2(){_reimbursement_requests_from_cbhis=_cbhi_or_fee_waivered_patient_visits*_base_average_reimbursement_per_person,_cbhi_reimbursements_approved=fns.MIN(_reimbursement_requests_from_cbhis*_implied_cbhi_reimbursement_approval_fraction,_cbhi_revenue/_revenue_utilization_time),__level1=_cbhi_reimbursements_approved*_implied_delay,_cbhi_paid=__level1/__aux1/fns.POW(1+_annual_inflation_rate*_oneyear,_implied_delay/_oneyear),_reimbursements=_cbhi_paid/_facilities_in_amhara,_revenue_from_user_fees=_uninsured_patient_visits*_base_average_fee_per_person/_facilities_in_amhara,_avg_adjusted_total_revolving_drug_funds=_data_adjusted_total_revolving_drug_funds/_facilities_in_amhara,_adjusted_annual_average_rdf=_avg_adjusted_total_revolving_drug_funds+(_revenue_from_user_fees+_reimbursements)*_fraction_allocated_to_rdf,_initial_avg_adjusted_total_revolving_drug_funds=_adjusted_annual_average_rdf;let e=0;for(let i=0;i<2;i++)e+=_treated_ncd[i];_total_ncd_care_demand_pop=e,_initial_demand_for_medications=_total_ncd_care_demand_pop,_fraction_in_treatment[1]=_treated_ncd[1]/(_untreated_ncd[1]+_treated_ncd[1]),_fraction_not_in_treatment[1]=1-_fraction_in_treatment[1],_initial_fraction_not_in_treatment[1]=_fraction_not_in_treatment[1],_fraction_in_treatment[0]=_treated_ncd[0]/(_untreated_ncd[0]+_treated_ncd[0]),_fraction_not_in_treatment[0]=1-_fraction_in_treatment[0],_initial_fraction_not_in_treatment[0]=_fraction_not_in_treatment[0],_initial_cbhi_eligible_not_enrolled=(1-_net_enrollment_rate_in_2007)*fns.LOOKUP(_data_cbhi_targeted_households,_time),_people_in_informal_sector_not_enrolled_to_cbhi=_initial_cbhi_eligible_not_enrolled,_percent_enrolled_among_eligible_households=_cbhi_beneficiaries/(_cbhi_beneficiaries+_people_in_informal_sector_not_enrolled_to_cbhi),_initial_perceived_benefit=_percent_enrolled_among_eligible_households}function initLevels(){initLevels0(),initLevels1(),initLevels2()}function evalAux0(){_saveper=_time_step,_death_of_at_risk_population[1]=fns.MIN(_base_death_rate*_population_at_risk_of_developing_ncd[1],_population_at_risk_of_developing_ncd[1]/_transition_time),_death_of_at_risk_population[0]=fns.MIN(_base_death_rate*_population_at_risk_of_developing_ncd[0],_population_at_risk_of_developing_ncd[0]/_transition_time),_developing_ncd[1]=fns.MIN(_population_at_risk_of_developing_ncd[1]*_ncd_development_rate[1],_population_at_risk_of_developing_ncd[1]/_transition_time),_developing_ncd[0]=fns.MIN(_population_at_risk_of_developing_ncd[0]*_ncd_development_rate[0],_population_at_risk_of_developing_ncd[0]/_transition_time),_dropout=fns.MAX(fns.MIN(_cbhi_beneficiaries*_dropout_rate,_cbhi_beneficiaries/_change_time),0),_fee_waiver_enrollment_change=fns.MIN(_fee_waivered_population_with_health_coverage*_fee_waiver_adjustment_rate,_fee_waivered_population_with_health_coverage/_change_time),_initial_cbhi_beneficiaries=_net_enrollment_rate_in_2007*fns.LOOKUP(_data_cbhi_targeted_households,_time),_initial_cbhi_eligible_not_enrolled=(1-_net_enrollment_rate_in_2007)*fns.LOOKUP(_data_cbhi_targeted_households,_time),_new_people_joining_at_risk_population=_population_adjustment,__aux3=_time_step,_total_demand_minutes=__level3/__aux3,_annual_clinical_minutes_per_provider=_total_annual_clinical_minutes_per_provider*_fraction_of_day_in_clinic_time,_total_provider_minutes=_total_providers*_annual_clinical_minutes_per_provider*_workforce_availability_factor,_demand_fulfilment_ratio=fns.MIN(1,fns.ZIDZ(_total_provider_minutes,_total_demand_minutes)),_total_adult_population_with_coverage=(_cbhi_beneficiaries+_fee_waivered_population_with_health_coverage)*_avg_adult_pop_per_household,_frac_adult_of_pop_with_coverage=fns.MIN(_total_adult_population_with_coverage/fns.LOOKUP(_data_amhara_total_population_30_yo_plus,_time),1),_relative_coverage_rate=fns.ZIDZ(_frac_adult_of_pop_with_coverage,_initial_health_insurance_coverage_rate),_eff_of_health_coverage_on_screening[0]=fns.POW(_relative_coverage_rate,_strength_coverage_on_screen[0]),_strategy_to_increase_screen=fns.STEP(_screen_strategy_strength*_beta,_screen_strategy_start_year)+1,_implied_screen_rate[0]=_base_ncd_screen_rate[0]*_strategy_to_increase_screen,_ncd_screen_rate[0]=_implied_screen_rate[0]*_eff_of_health_coverage_on_screening[0],_people_screened_for_ncd[0]=fns.MAX(_ncd_screen_rate[0]*(_untreated_ncd[0]+_population_at_risk_of_developing_ncd[0]),0)*_demand_fulfilment_ratio,_new_utilization_for_htn_screen=_people_screened_for_ncd[0],_eff_of_health_coverage_on_screening[1]=fns.POW(_relative_coverage_rate,_strength_coverage_on_screen[1]),_implied_screen_rate[1]=_base_ncd_screen_rate[1]*_strategy_to_increase_screen,_ncd_screen_rate[1]=_implied_screen_rate[1]*_eff_of_health_coverage_on_screening[1],_people_screened_for_ncd[1]=fns.MAX(_ncd_screen_rate[1]*(_untreated_ncd[1]+_population_at_risk_of_developing_ncd[1]),0)*_demand_fulfilment_ratio,_new_utilization_for_dia_screen=_people_screened_for_ncd[1],_ncd_screening_related_service_utilization=_new_utilization_for_dia_screen+_new_utilization_for_htn_screen}function evalAux1(){_population_in_htn_treatment=_treated_ncd[0],_population_in_dia_treatment=_treated_ncd[1],_active_patient_ncd_related_service_utilization=(_population_in_dia_treatment+_population_in_htn_treatment)*_annual_health_service_utilization_per_ncd_patient,_ncd_related_service_utilization=_active_patient_ncd_related_service_utilization+_ncd_screening_related_service_utilization,_ncd_related_service_utilization_per_capita=_ncd_related_service_utilization/fns.LOOKUP(_data_amhara_total_population_30_yo_plus,_time),_care_capacity_per_capita=_total_providers/fns.LOOKUP(_data_amhara_total_population_30_yo_plus,_time),_access_multiplier=fns.POW(_care_capacity_per_capita/_initial_care_capacity_per_capita,_strength_access_on_utilization),_other_health_service_utilization=_reference_utilization_per_capita*_access_multiplier,_uninsured_service_utilization_per_capita=_other_health_service_utilization+_ncd_related_service_utilization_per_capita,_uninsured_patient_visits=_uninsured_service_utilization_per_capita*fns.LOOKUP(_data_amhara_total_population_30_yo_plus,_time)*(1-_frac_adult_of_pop_with_coverage),_adult_pop_with_coverage=fns.LOOKUP(_data_amhara_total_population_30_yo_plus,_time)*_frac_adult_of_pop_with_coverage,_insured_service_utilization_per_capita=(_other_health_service_utilization+_ncd_related_service_utilization_per_capita)*_eff_of_coverage_on_service_utilization,_cbhi_or_fee_waivered_patient_visits=_insured_service_utilization_per_capita*_adult_pop_with_coverage,_total_visits=_cbhi_or_fee_waivered_patient_visits+_uninsured_patient_visits,_total_service_utilization_per_capita=_total_visits/fns.LOOKUP(_data_amhara_total_population_30_yo_plus,_time);let e=0;for(let i=0;i<2;i++)e+=_treated_ncd[i];_total_ncd_care_demand_pop=e,_change_in_demand_for_medications=_total_ncd_care_demand_pop/_initial_demand_for_medications,_implied_medication_utilization_rate=_base_medication_utilization_rate*_change_in_demand_for_medications,_stock_out_rate=fns.MIN(_facilities_with_medication*_implied_medication_utilization_rate,_facilities_with_medication/_facility_stock_adjustment_time),_strategy_to_increase_restocking=fns.STEP(_restock_strategy_strength*_beta,_restock_strategy_start_year)+1,_strategy_to_decrease_reimbursement_delay=1-fns.STEP(_delay_reduction_strategy_strength*_beta,_delay_reduction_strategy_start_year),_implied_delay=_average_reimbursement_delay*_strategy_to_decrease_reimbursement_delay,__aux1=_implied_delay,_cbhi_paid=__level1/__aux1/fns.POW(1+_annual_inflation_rate*_oneyear,_implied_delay/_oneyear),_reimbursements=_cbhi_paid/_facilities_in_amhara,_revenue_from_user_fees=_uninsured_patient_visits*_base_average_fee_per_person/_facilities_in_amhara,_data_adjusted_total_revolving_drug_funds=fns.LOOKUP(_data_total_revolving_drug_funds,_time)*fns.LOOKUP(_data_inflation_conversion_multiplier_for_2017_birr_value,_time),_avg_adjusted_total_revolving_drug_funds=_data_adjusted_total_revolving_drug_funds/_facilities_in_amhara,_adjusted_annual_average_rdf=_avg_adjusted_total_revolving_drug_funds+(_revenue_from_user_fees+_reimbursements)*_fraction_allocated_to_rdf,_relative_avg_adjusted_total_revolving_drug_funds=_adjusted_annual_average_rdf/_initial_avg_adjusted_total_revolving_drug_funds}function evalAux2(){_implied_medication_restocking=_base_medication_restocking_rate*_relative_avg_adjusted_total_revolving_drug_funds*fns.POW(_change_in_demand_for_medications,_procurement_responsiveness)*_strategy_to_increase_restocking,_restocking_rate=fns.MIN(_facilities_without_medication*_implied_medication_restocking,_facilities_without_medication/_facility_stock_adjustment_time),_essential_medication_availability=_facilities_with_medication/(_facilities_with_medication+_facilities_without_medication),_data_essential_medication_availability_avg=(fns.LOOKUP(_data_essential_medication_availability_dia,_time)+fns.LOOKUP(_data_essential_medication_availability_htn,_time))/2,_initial_essential_medicine_availability=_data_essential_medication_availability_avg,_relative_essential_medicine_availability=fns.ZIDZ(_essential_medication_availability,_initial_essential_medicine_availability),_percent_enrolled_among_eligible_households=_cbhi_beneficiaries/(_cbhi_beneficiaries+_people_in_informal_sector_not_enrolled_to_cbhi),_provider_per_facility=_total_providers/_facilities_in_amhara,_strategy_to_increase_enrollments=fns.STEP(_enrollment_strategy_strength*_alpha,_enrollment_strategy_start_year)+1,_relative_benefit=fns.ZIDZ(_percent_enrolled_among_eligible_households,_initial_perceived_benefit),_eff_of_perceived_benefit_on_enrollment=fns.POW(_relative_benefit,_strength_of_perceived_benefit),_implied_enrollment_rate=_base_enrollment_rate*_eff_of_perceived_benefit_on_enrollment,_new_enrollments=fns.MIN(_people_in_informal_sector_not_enrolled_to_cbhi*_implied_enrollment_rate*_strategy_to_increase_enrollments,_people_in_informal_sector_not_enrolled_to_cbhi*_strategy_to_increase_enrollments/_time_to_enroll),_fraction_in_treatment[0]=_treated_ncd[0]/(_untreated_ncd[0]+_treated_ncd[0]),_fraction_not_in_treatment[0]=1-_fraction_in_treatment[0],_relative_untreated_ncd[0]=_fraction_not_in_treatment[0]/_initial_fraction_not_in_treatment[0],_implied_positive_screening_rate[0]=_base_positive_ncd_fraction_for_screened_people[0]*_relative_untreated_ncd[0],_people_screened_positive_for_ncd[0]=_people_screened_for_ncd[0]*_implied_positive_screening_rate[0],_new_enrollment_into_care[0]=fns.MIN(_people_screened_positive_for_ncd[0]*_base_tx_enrollment_rate_post_screening[0]*(2*_demand_fulfilment_ratio/(1+_demand_fulfilment_ratio)),_untreated_ncd[0]/_transition_time),_fraction_in_treatment[1]=_treated_ncd[1]/(_untreated_ncd[1]+_treated_ncd[1]),_fraction_not_in_treatment[1]=1-_fraction_in_treatment[1],_relative_untreated_ncd[1]=_fraction_not_in_treatment[1]/_initial_fraction_not_in_treatment[1],_implied_positive_screening_rate[1]=_base_positive_ncd_fraction_for_screened_people[1]*_relative_untreated_ncd[1],_people_screened_positive_for_ncd[1]=_people_screened_for_ncd[1]*_implied_positive_screening_rate[1],_new_enrollment_into_care[1]=fns.MIN(_people_screened_positive_for_ncd[1]*_base_tx_enrollment_rate_post_screening[1]*(2*_demand_fulfilment_ratio/(1+_demand_fulfilment_ratio)),_untreated_ncd[1]/_transition_time),_strategy_to_increase_provider_capacity=fns.STEP(_provider_strategy_strength*_beta,_provider_strategy_start_year)+1,_initial_total_demand_minutes=_total_provider_minutes*_initial_tot_demand_min_ratio,_initial_facilities_without_medication=(1-_initial_essential_medicine_availability)*_facilities_in_amhara,_initial_facilities_with_medication=_initial_essential_medicine_availability*_facilities_in_amhara,_relative_ncd_care_service_availability=_relative_essential_medicine_availability*_demand_fulfilment_ratio}function evalAux3(){_strategy_to_increase_reimbursement=fns.STEP(_reimbursement_strategy_strength*_beta,_reimbursement_strategy_start_year)+1,_strategy_to_increase_fee_waivers=fns.STEP(_fee_waiver_strategy_strength,_fee_waiver_strategy_start_year)+1,_fee_waivered_insurance_coverage=fns.MIN(_people_in_informal_sector_not_enrolled_to_cbhi*_new_fee_waiver_rate*_strategy_to_increase_fee_waivers,_people_in_informal_sector_not_enrolled_to_cbhi*_strategy_to_increase_fee_waivers/_time_to_enroll),_implied_eligible_households_not_enrolled=fns.LOOKUP(_data_cbhi_targeted_households,_time)-(_cbhi_beneficiaries+_fee_waivered_population_with_health_coverage),_eligible_population_adjustment=fns.MAX((_implied_eligible_households_not_enrolled-_people_in_informal_sector_not_enrolled_to_cbhi)/_household_adjustment_time,0),_implied_discontinuation_rate[0]=_discontinuation_rate[0]*(2/(1+_relative_ncd_care_service_availability)),_discontinuation_from_care[0]=fns.MIN(_treated_ncd[0]*_implied_discontinuation_rate[0],_treated_ncd[0]/_transition_time),_implied_discontinuation_rate[1]=_discontinuation_rate[1]*(2/(1+_relative_ncd_care_service_availability)),_discontinuation_from_care[1]=fns.MIN(_treated_ncd[1]*_implied_discontinuation_rate[1],_treated_ncd[1]/_transition_time),_minutes_per_non_ncd_visit=_minutes_per_visit,_non_ncd_visits=_total_visits-_active_patient_ncd_related_service_utilization-_ncd_screening_related_service_utilization,_demand_minutes_for_non_ncd=_non_ncd_visits*_minutes_per_non_ncd_visit,_demand_minutes_for_ncd_screening=_ncd_screening_related_service_utilization*_minutes_per_screen,_minutes_per_ncd_patient_year=_annual_health_service_utilization_per_ncd_patient*_minutes_per_visit,_demand_minutes_for_ncd=_total_ncd_care_demand_pop*_minutes_per_ncd_patient_year,_death_rate_for_untreated_ncd[0]=_base_death_rate*_relative_death_risk_for_ncd[0],_death_of_untreated_ncd_patients[0]=fns.MIN(_untreated_ncd[0]*_death_rate_for_untreated_ncd[0],_untreated_ncd[0]/_transition_time),_death_rate_for_untreated_ncd[1]=_base_death_rate*_relative_death_risk_for_ncd[1],_death_of_untreated_ncd_patients[1]=fns.MIN(_untreated_ncd[1]*_death_rate_for_untreated_ncd[1],_untreated_ncd[1]/_transition_time),_ocm_rate_for_treated[0]=_death_rate_for_untreated_ncd[0]*_treated_ncd_death_risk_relative_to_untreated[0],_death_of_treated_ncd_patients[0]=fns.MIN(_treated_ncd[0]*_ocm_rate_for_treated[0],_treated_ncd[0]/_transition_time),_ocm_rate_for_treated[1]=_death_rate_for_untreated_ncd[1]*_treated_ncd_death_risk_relative_to_untreated[1],_death_of_treated_ncd_patients[1]=fns.MIN(_treated_ncd[1]*_ocm_rate_for_treated[1],_treated_ncd[1]/_transition_time),_data_adjusted_membership_cost_per_household=fns.LOOKUP(_data_cbhi_membership_cost_per_household,_time)*fns.LOOKUP(_data_inflation_conversion_multiplier_for_2017_birr_value,_time),_adjusted_total_cbhi_collected_fees=_data_adjusted_membership_cost_per_household*_cbhi_beneficiaries*_household_size_adj_for_fees,_adjusted_subsidies=_adjusted_total_cbhi_collected_fees*_subsidy_fraction,_collected_fees_and_subsidies=_adjusted_total_cbhi_collected_fees+_adjusted_subsidies,_max_provider_per_facility=_base_provider_per_facility*_strategy_to_increase_provider_capacity,_provider_gap=fns.MAX(_max_provider_per_facility-_provider_per_facility,0),_change_in_provider_availability=_provider_gap/_max_provider_per_facility*_provider_adjustment_rate}function evalAux4(){_implied_cbhi_reimbursement_approval_fraction=fns.MIN(_cbhi_reimbursement_approval_fraction*_strategy_to_increase_reimbursement,1),_reimbursement_requests_from_cbhis=_cbhi_or_fee_waivered_patient_visits*_base_average_reimbursement_per_person,_cbhi_reimbursements_approved=fns.MIN(_reimbursement_requests_from_cbhis*_implied_cbhi_reimbursement_approval_fraction,_cbhi_revenue/_revenue_utilization_time)}function evalAux(){evalAux0(),evalAux1(),evalAux2(),evalAux3(),evalAux4()}function evalLevels0(){_cbhi_beneficiaries=fns.INTEG(_cbhi_beneficiaries,_new_enrollments-_dropout),_cbhi_revenue=fns.INTEG(_cbhi_revenue,_collected_fees_and_subsidies-_cbhi_reimbursements_approved),_facilities_with_medication=fns.INTEG(_facilities_with_medication,_restocking_rate-_stock_out_rate),_facilities_without_medication=fns.INTEG(_facilities_without_medication,_stock_out_rate-_restocking_rate),_fee_waivered_population_with_health_coverage=fns.INTEG(_fee_waivered_population_with_health_coverage,_fee_waivered_insurance_coverage-_fee_waiver_enrollment_change),_people_in_informal_sector_not_enrolled_to_cbhi=fns.INTEG(_people_in_informal_sector_not_enrolled_to_cbhi,_dropout+_eligible_population_adjustment+_fee_waiver_enrollment_change-_fee_waivered_insurance_coverage-_new_enrollments),_population_at_risk_of_developing_ncd[1]=fns.INTEG(_population_at_risk_of_developing_ncd[1],_new_people_joining_at_risk_population-_death_of_at_risk_population[1]-_developing_ncd[1]),_population_at_risk_of_developing_ncd[0]=fns.INTEG(_population_at_risk_of_developing_ncd[0],_new_people_joining_at_risk_population-_death_of_at_risk_population[0]-_developing_ncd[0]),_total_providers=fns.INTEG(_total_providers,_change_in_provider_availability),_treated_ncd[1]=fns.INTEG(_treated_ncd[1],_new_enrollment_into_care[1]-_discontinuation_from_care[1]-_death_of_treated_ncd_patients[1]),_treated_ncd[0]=fns.INTEG(_treated_ncd[0],_new_enrollment_into_care[0]-_discontinuation_from_care[0]-_death_of_treated_ncd_patients[0]),_untreated_ncd[1]=fns.INTEG(_untreated_ncd[1],_developing_ncd[1]-_new_enrollment_into_care[1]-_death_of_untreated_ncd_patients[1]+_discontinuation_from_care[1]),_untreated_ncd[0]=fns.INTEG(_untreated_ncd[0],_developing_ncd[0]-_new_enrollment_into_care[0]-_death_of_untreated_ncd_patients[0]+_discontinuation_from_care[0]),__level1=fns.INTEG(__level1,_cbhi_reimbursements_approved-_cbhi_paid),__level3=fns.INTEG(__level3,_demand_minutes_for_non_ncd+_demand_minutes_for_ncd+_demand_minutes_for_ncd_screening-_total_demand_minutes)}function evalLevels(){evalLevels0()}function setInputs(e){_enrollment_strategy_strength=e(0),_fee_waiver_strategy_strength=e(1),_delay_reduction_strategy_strength=e(2),_reimbursement_strategy_strength=e(3),_provider_strategy_strength=e(4),_restock_strategy_strength=e(5),_screen_strategy_strength=e(6),_dropout_rate=e(7),_base_enrollment_rate=e(8),_new_fee_waiver_rate=e(9),_fee_waiver_adjustment_rate=e(10),_strength_of_perceived_benefit=e(11),_initial_fee_waivered_population=e(12),_population_adjustment=e(13),_initial_population_at_risk_of_developing_ncd[0]=e(14),_initial_population_at_risk_of_developing_ncd[1]=e(15),_initial_undiagnosed_uncontrolled_ncd[0]=e(16),_initial_diagnosed_not_controlled_ncd[0]=e(17),_ncd_development_rate[0]=e(18),_base_ncd_screen_rate[0]=e(19),_treated_ncd_death_risk_relative_to_untreated[0]=e(20),_discontinuation_rate[0]=e(21),_strength_coverage_on_screen[0]=e(22),_initial_undiagnosed_uncontrolled_ncd[1]=e(23),_initial_diagnosed_not_controlled_ncd[1]=e(24),_ncd_development_rate[1]=e(25),_base_tx_enrollment_rate_post_screening[1]=e(26),_base_tx_enrollment_rate_post_screening[0]=e(27),_relative_death_risk_for_ncd[1]=e(28),_relative_death_risk_for_ncd[0]=e(29),_treated_ncd_death_risk_relative_to_untreated[1]=e(30),_discontinuation_rate[1]=e(31),_base_death_rate=e(32),_strength_coverage_on_screen[1]=e(33),_base_positive_ncd_fraction_for_screened_people[0]=e(34),_base_positive_ncd_fraction_for_screened_people[1]=e(35),_reference_utilization_per_capita=e(36),_strength_access_on_utilization=e(37),_base_average_fee_per_person=e(38),_base_average_reimbursement_per_person=e(39),e(40),e(41),e(42),_initial_cbhi_revenue=e(43),_provider_adjustment_rate=e(44),_initial_providers=e(45),_base_medication_utilization_rate=e(46),_base_medication_restocking_rate=e(47),_cbhi_reimbursement_approval_fraction=e(48),_subsidy_fraction=e(49)}function setConstant(e,i){throw new Error("The setConstant function was not enabled for the generated model. Set the customConstants property in the spec/config file to allow for overriding constants at runtime.")}function setLookup(e,i){throw new Error("The setLookup function was not enabled for the generated model. Set the customLookups property in the spec/config file to allow for overriding lookups at runtime.")}const outputVarIds=["_cbhi_beneficiaries","_fee_waivered_population_with_health_coverage","_fraction_in_treatment[_dia]","_fraction_in_treatment[_htn]","_essential_medication_availability","_frac_adult_of_pop_with_coverage","_new_enrollment_into_care[_dia]","_new_enrollment_into_care[_htn]","_people_screened_for_ncd[_dia]","_people_screened_for_ncd[_htn]","_total_service_utilization_per_capita"],outputVarNames=["CBHI beneficiaries","Fee waivered population with health coverage","Fraction in treatment[DIA]","Fraction in treatment[HTN]","essential medication availability","frac adult of pop with coverage","new enrollment into care[DIA]","new enrollment into care[HTN]","people screened for NCD[DIA]","people screened for NCD[HTN]","total service utilization per capita"];function storeOutputs(e){e(_cbhi_beneficiaries),e(_fee_waivered_population_with_health_coverage),e(_fraction_in_treatment[1]),e(_fraction_in_treatment[0]),e(_essential_medication_availability),e(_frac_adult_of_pop_with_coverage),e(_new_enrollment_into_care[1]),e(_new_enrollment_into_care[0]),e(_people_screened_for_ncd[1]),e(_people_screened_for_ncd[0]),e(_total_service_utilization_per_capita)}function storeOutput(e,i){throw new Error("The storeOutput function was not enabled for the generated model. Set the customOutputs property in the spec/config file to allow for capturing arbitrary variables at runtime.")}const modelListing=void 0;async function loadGeneratedModel(){return{kind:"js",outputVarIds,outputVarNames,modelListing,getInitialTime,getFinalTime,getTimeStep,getSaveFreq,getModelFunctions,setModelFunctions,setTime,setInputs,setConstant,setLookup,storeOutputs,storeOutput,initConstants,initLevels,evalAux,evalLevels}}exposeModelWorker(loadGeneratedModel)})();\n';
class BundleModelRunner {
  /**
   * @param modelSpec The spec for the bundled model.
   * @param inputMap The model inputs.
   * @param modelRunner The model runner.
   */
  constructor(e, n, r) {
    this.modelSpec = e, this.inputMap = n, this.modelRunner = r, this.inputs = [...n.values()].map((i) => i.value), this.outputs = r.createOutputs();
  }
  async runModelForScenario(e, n) {
    return setInputsForScenario(this.inputMap, e), n[0]?.startsWith("ModelImpl") ? this.runModelWithImplOutputs(n) : this.runModelWithNormalOutputs(n);
  }
  async runModelWithNormalOutputs(e) {
    this.outputs = await this.modelRunner.runModel(this.inputs, this.outputs);
    const n = this.outputs.runTimeInMillis, r = /* @__PURE__ */ new Map();
    for (const i of e) {
      const a = this.modelSpec.outputVars.get(i);
      if (a)
        if (a.sourceName === void 0) {
          const s = this.outputs.getSeriesForVar(a.varId);
          s && r.set(i, datasetFromPoints(s.points));
        } else
          console.error("Static data sources not yet handled in default model check bundle");
    }
    return {
      datasetMap: r,
      modelRunTime: n
    };
  }
  async runModelWithImplOutputs(e) {
    const n = [];
    for (const o of e) {
      const c = this.modelSpec.implVars.get(o);
      c && n.push(c);
    }
    const r = this.outputs.startTime, i = this.outputs.endTime, a = this.outputs.saveFreq;
    let s = createImplOutputs(n, r, i, a);
    s = await this.modelRunner.runModel(this.inputs, s);
    const _ = s.runTimeInMillis, l = /* @__PURE__ */ new Map();
    for (const o of e) {
      const c = this.modelSpec.implVars.get(o), u = s.getSeriesForVar(c.varId);
      u && l.set(o, datasetFromPoints(u.points));
    }
    return {
      datasetMap: l,
      modelRunTime: _
    };
  }
}
function datasetFromPoints(t) {
  const e = /* @__PURE__ */ new Map();
  for (const n of t)
    n.y !== void 0 && e.set(n.x, n.y);
  return e;
}
function createImplOutputs(t, e, n, r) {
  const i = [], a = [];
  for (const _ of t)
    i.push(_.varId), a.push({
      varIndex: _.varIndex,
      subscriptIndices: _.subscriptIndices
    });
  const s = new Outputs(i, e, n, r);
  return s.varSpecs = a, s;
}
const VERSION = 1;
class BundleModel {
  /**
   * @param modelSpec The spec for the bundled model.
   * @param bundleModelRunner The bundle model runner.
   */
  constructor(e, n) {
    this.modelSpec = e, this.bundleModelRunner = n;
  }
  // from CheckBundleModel interface
  async getDatasetsForScenario(e, n) {
    return this.bundleModelRunner.runModelForScenario(e, n);
  }
}
async function initBundleModel(t, e) {
  const n = await spawnAsyncModelRunner({ source: modelWorkerJs }), r = new BundleModelRunner(t, e, n);
  return new BundleModel(t, r);
}
function createBundle() {
  const t = getInputVars(inputSpecs), e = getOutputVars(outputSpecs), { implVars: n, implVarGroups: r } = getImplVars(encodedImplVars), i = {
    modelSizeInBytes,
    dataSizeInBytes,
    inputVars: t,
    outputVars: e,
    implVars: n,
    implVarGroups: r
    // TODO: startTime and endTime are optional; the comparison graphs work OK if
    // they are undefined.  The main benefit of using these is to set a specific
    // range for the x-axis on the comparison graphs, so maybe we should find
    // another way to allow these to be defined.
    // startTime,
    // endTime
  };
  return {
    version: VERSION,
    modelSpec: i,
    initModel: () => initBundleModel(i, t)
  };
}
export {
  createBundle
};
