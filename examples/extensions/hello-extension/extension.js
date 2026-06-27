// hello-extension — a minimal, working Sophia Stack extension.
//
// It demonstrates the full contract: register admin nav + a setting, serve API
// routes, listen to a hook, make a SAFE (validated, rollback-able) patch, use the
// provider-agnostic AI service, and write audit entries. Everything is gated by the
// permissions declared in extension.json.
export default {
  async activate(ctx) {
    ctx.logger.info("activating");

    // A setting the owner can configure (settings:read/write).
    ctx.settings.register({ greeting: { type: "string", default: "Hello from the extension!" } });

    // Show up in the admin (the dashboard reads adminNav from /api/sophia/extensions).
    ctx.admin.registerNav({ label: "Hello", path: "/admin/extensions/hello", icon: "smile" });

    // GET /api/extensions/hello-extension/ping  — a public read route.
    ctx.routes.register("/ping", async (req, res, h) => {
      h.send(res, 200, {
        ok: true,
        greeting: ctx.settings.get("greeting") || "Hello!",
        site: ctx.site.read().site,
        providers: ctx.ai.listProviders(),
      });
    });

    // POST /api/extensions/hello-extension/stamp — a SAFE patch (goes through
    // validate-before-commit + rollback; the extension cannot mutate the model directly).
    ctx.routes.register("/stamp", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      const r = ctx.site.patch([{ op: "mset", path: "brief", value: "Touched by hello-extension." }]);
      ctx.audit.log("stamp", { ok: r.ok });
      h.send(res, r.ok ? 200 : 400, r);
    });

    // React to site changes (hook bus). Disabled extensions never receive hooks.
    ctx.hooks.on("page.afterSave", (payload) => {
      ctx.audit.log("observed:page.afterSave", (payload && payload.changed) || null);
    });

    ctx.audit.log("activated", { version: ctx.manifest.version });
  },

  async deactivate(ctx) {
    ctx.logger.info("deactivating");
  },
};
