// Sophia SEO Suite — INTEGRATION STUB (not the real product).
//
// This file exists to PROVE the contract: how an SEO extension registers admin
// nav + settings, serves API routes, reads the site/pages, requests a SAFE patch,
// uses the provider-agnostic AI service, and writes audit logs. It deliberately
// does NOT implement real SEO logic — the full Sophia SEO Suite is built as a
// separate product/repo and installs into any compatible Sophia Stack deployment.
//
// Every place the real Suite would do work is marked  // TODO(seo-suite).
export default {
  async activate(ctx) {
    ctx.logger.info("SEO Suite stub: activating (contract demo only)");

    ctx.admin.registerNav({ label: "SEO Suite", path: "/admin/extensions/seo", icon: "search" });
    ctx.settings.register({
      siteName: { type: "string", default: "" },
      defaultTitleSuffix: { type: "string", default: " | My Site" },
      targetKeywords: { type: "string", default: "" },
    });

    // R5: register an admin PANEL. The Stack renders it as its own tab in the
    // dashboard, iframed from the route below — so the extension is self-contained.
    ctx.admin.registerPanel({ label: "SEO Suite", path: "panel" });
    ctx.routes.register("/panel", async (req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end('<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,Segoe UI,sans-serif;background:#0a1628;color:#e8f4f8;padding:24px;margin:0}h1{color:#00D4FF;margin:0 0 6px}.b{background:linear-gradient(120deg,#00D4FF,#0066FF);color:#04121a;border:0;border-radius:9px;padding:9px 16px;font-weight:700;cursor:pointer}pre{background:#0c1a28;border:1px solid rgba(0,212,255,.15);border-radius:10px;padding:14px;color:#9fd9ea;overflow:auto;margin-top:14px}</style></head><body><h1>Sophia SEO Suite</h1><p style="color:#9fc7d6">Stub panel. The full Suite renders its audit dashboard, metadata editor, and schema tools here &mdash; integrated with THIS site (reads the live model, reacts to new content and Stripe pages, writes safe patches).</p><button class="b" onclick="run()">Run SEO audit</button><pre id="o">Click &ldquo;Run SEO audit&rdquo;.</pre><script>async function run(){document.getElementById("o").textContent="Auditing\\u2026";try{var r=await fetch("/api/extensions/sophia-seo-suite/audit",{credentials:"same-origin"});document.getElementById("o").textContent=JSON.stringify(await r.json(),null,2)}catch(e){document.getElementById("o").textContent=String(e)}}</script></body></html>');
    });

    // GET /api/extensions/sophia-seo-suite/audit
    // The real Suite would run technical SEO + metadata + schema + link checks.
    ctx.routes.register("/audit", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      const model = ctx.site.read();
      const pages = Object.keys(model.pages || {});
      ctx.audit.log("audit.run", { pages: pages.length });
      // TODO(seo-suite): real audit — titles/descriptions/headings/alt text/schema/links/sitemap.
      h.send(res, 200, {
        stub: true,
        note: "Stub audit — the full Sophia SEO Suite returns real findings here.",
        pages: pages.map((p) => ({ route: p, title: model.pages[p].title || "", hasTitle: !!model.pages[p].title })),
        checks: ["titles (stub)", "meta descriptions (stub)", "alt text (stub)", "schema (stub)", "sitemap (stub)"],
      });
    });

    // POST /api/extensions/sophia-seo-suite/optimize-title  { route, title }
    // Demonstrates a SAFE patch — goes through validate-before-commit + rollback.
    ctx.routes.register("/optimize-title", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      const body = JSON.parse((await h.readBody(req)) || "{}");
      const route = body.route || "/";
      let title = body.title;
      // Optional: let the configured AI propose a title (provider-agnostic).
      if (!title) {
        try {
          // TODO(seo-suite): real prompt with page content + target keywords.
          const out = await ctx.ai.generate({ prompt: `Suggest one concise, SEO-friendly <title> for the page at ${route}. Reply with only the title.` });
          title = (out.text || "").trim().slice(0, 70);
        } catch (e) { return h.send(res, 400, { error: "AI not configured: " + e.message }); }
      }
      const suffix = ctx.settings.get("defaultTitleSuffix") || "";
      const r = ctx.site.patch([{ op: "mset", path: `pages.${route}.title`, value: title + suffix }]);
      ctx.audit.log("optimize-title", { route, ok: r.ok });
      h.send(res, r.ok ? 200 : 400, r);
    });

    // React to content changes — the real Suite would queue re-audits here.
    ctx.hooks.on("page.afterSave", () => { /* TODO(seo-suite): schedule re-audit */ });
    ctx.hooks.on("media.afterUpload", () => { /* TODO(seo-suite): check/suggest alt text */ });

    ctx.audit.log("activated", { stub: true, version: ctx.manifest.version });
  },

  async deactivate(ctx) {
    ctx.logger.info("SEO Suite stub: deactivating");
  },
};
