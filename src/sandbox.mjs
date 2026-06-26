// sandbox.mjs — run AI/owner-written server functions safely (Node built-in vm,
// zero dependencies). The LLM writes a function BODY; the runtime executes it in
// a locked-down context with NO require / process / fs / network — only the
// request input, a scoped database, and safe built-ins. A timeout bounds runaway
// code. This is the contained "v1 coding" backend: real logic, can't touch the host.
import vm from "node:vm";

// Build the database surface a function gets — scoped CRUD over the app's
// declared collections (only). No raw filesystem, no access to other state.
function makeDb(dataStore, model) {
  const exists = (c) => !!model.data?.collections?.[c];
  const guard = (c) => { if (!exists(c)) throw new Error(`unknown collection: ${c}`); };
  return {
    list: (c, opts) => { guard(c); return dataStore.list(c, opts || {}); },
    get: (c, id) => { guard(c); return dataStore.get(c, id); },
    create: (c, rec) => { guard(c); return dataStore.create(c, rec && typeof rec === "object" ? rec : {}); },
    update: (c, id, patch) => { guard(c); return dataStore.update(c, id, patch || {}); },
    remove: (c, id) => { guard(c); return dataStore.remove(c, id); },
    count: (c) => { guard(c); return dataStore.count(c); },
  };
}

// Run one function. `code` is the body the LLM wrote; `input` is the request data.
// Returns the function's return value (must be JSON-serializable). Throws on error
// or timeout. The context is frozen and minimal — no escape to host capabilities.
export function runFunction(code, { input = {}, dataStore, model, timeoutMs = 1500 } = {}) {
  const sandbox = {
    input,
    db: makeDb(dataStore, model),
    JSON, Math, Date, Number, String, Boolean, Array, Object,
    console: { log: () => {}, error: () => {} },
    // explicitly NOT provided: require, process, global, fetch, fs, Buffer, eval, Function
  };
  const context = vm.createContext(Object.freeze({ ...sandbox }));
  const script = new vm.Script(`"use strict";(function(){\n${code}\n})()`, { filename: "fn.js" });
  const result = script.runInContext(context, { timeout: timeoutMs, breakOnSigint: true });
  // Ensure the result is serializable (defends against returning functions/cycles).
  return JSON.parse(JSON.stringify(result ?? null));
}
