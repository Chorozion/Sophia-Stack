// patch.mjs — addressable, surgical edits to a Site Model.
//
// This is the token-efficiency lever for EDITS: instead of re-emitting a whole
// file, the AI emits tiny ops that target a node by stable id. applyPatch also
// returns the set of changed node ids so a live runtime can re-render only the
// affected subtree (real-time edits).
//
// Ops:
//   { op: "set",    id, path, value }      set node.<path> (dot path) on block <id>
//   { op: "add",    route, value, index }  insert a block into a page (default: end)
//   { op: "remove", id }                   delete block <id>
//   { op: "move",   id, index }            reorder block <id> within its page

function findBlock(model, id) {
  for (const route of Object.keys(model.pages || {})) {
    const blocks = model.pages[route].blocks || [];
    const i = blocks.findIndex((b) => b.id === id);
    if (i !== -1) return { route, blocks, index: i, block: blocks[i] };
  }
  return null;
}

function setPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

export function applyPatch(model, ops) {
  const next = structuredClone(model);
  const changed = new Set();

  for (const op of Array.isArray(ops) ? ops : [ops]) {
    switch (op.op) {
      case "set": {
        const hit = findBlock(next, op.id);
        if (!hit) throw new Error(`set: no block with id ${op.id}`);
        setPath(hit.block, op.path, op.value);
        changed.add(op.id);
        break;
      }
      case "add": {
        const route = op.route || "/";
        const page = next.pages?.[route];
        if (!page) throw new Error(`add: no page at ${route}`);
        page.blocks = page.blocks || [];
        const idx = op.index == null ? page.blocks.length : op.index;
        if (!op.value?.id) throw new Error(`add: block must have an id`);
        page.blocks.splice(idx, 0, op.value);
        changed.add(op.value.id);
        break;
      }
      case "remove": {
        const hit = findBlock(next, op.id);
        if (!hit) throw new Error(`remove: no block with id ${op.id}`);
        hit.blocks.splice(hit.index, 1);
        changed.add(op.id);
        break;
      }
      case "move": {
        const hit = findBlock(next, op.id);
        if (!hit) throw new Error(`move: no block with id ${op.id}`);
        const [b] = hit.blocks.splice(hit.index, 1);
        hit.blocks.splice(op.index, 0, b);
        changed.add(op.id);
        break;
      }
      default:
        throw new Error(`unknown op: ${op.op}`);
    }
  }
  return { model: next, changed: [...changed] };
}
