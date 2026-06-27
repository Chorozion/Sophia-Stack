// Sophia SEO Suite — admin UI entry (STUB).
//
// `adminEntry` in the manifest points here. Rendering extension admin panels
// inside the Sophia Stack dashboard is a PLANNED integration point — see
// docs/extensions/admin-ui.md. For now the dashboard surfaces the extension's
// adminNav item; the panel UI is provided by the extension and mounted at the
// declared path once panel rendering ships.
//
// The real Sophia SEO Suite exports an owner-friendly admin UI here (audit
// dashboard, metadata editor, schema tools, etc.). This stub is a placeholder.
export default {
  // path is declared in extension.json adminNav.path
  title: "SEO Suite",
  // TODO(seo-suite): export the panel (component/HTML) once the Stack's
  // panel-mount contract is finalized. Until then this is documentation only.
  render() {
    return "<h2>Sophia SEO Suite</h2><p>Stub admin panel. The full Suite renders its tools here.</p>";
  },
};
