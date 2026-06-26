// SiteRenderer.jsx — expand a Site Model into a React tree.
//
// Each block is keyed by its stable id and wrapped with data-sid (for surgical
// real-time updates). The active style PRESET supplies all visuals via the
// blocks' semantic classes; author-chosen effects (block.fx) are applied here
// as fx-* classes on the wrapper.
import React from "react";
import { BLOCKS } from "./blocks.jsx";

const fxClass = (fx) => (Array.isArray(fx) ? fx.map((f) => `fx-${f}`).join(" ") : "");

export function SiteRenderer({ model, route = "/", data = {} }) {
  const blocks = model?.pages?.[route]?.blocks || [];
  return (
    <>
      {blocks.map((b) => {
        const C = BLOCKS[b.type];
        const bound = b.connection ? { _data: data[b.connection] } : {};
        const cls = ["sx-node", fxClass(b.fx)].filter(Boolean).join(" ");
        return (
          <div data-sid={b.id} key={b.id} className={cls}>
            {C ? <C {...b} {...bound} /> : <div className="sx-unknown">unknown block: {b.type}</div>}
          </div>
        );
      })}
    </>
  );
}
