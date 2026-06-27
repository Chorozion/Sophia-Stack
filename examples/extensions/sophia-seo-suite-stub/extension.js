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
