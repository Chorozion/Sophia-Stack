// edit-panel.mjs — the built-in, self-contained CSS editor served at /_edit.
// Edits the live custom CSS layer with a bearer token; the preview iframe
// updates in real time over SSE (no redeploy). This ships INSIDE the stack.
export const EDIT_PANEL = `<!doctype html><html><head><meta charset="utf-8"><title>Sophia · Edit</title>
<style>
  *{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#0b0b12;color:#e8e8f0;height:100vh;display:grid;grid-template-columns:420px 1fr}
  .panel{padding:18px;border-right:1px solid #222;display:flex;flex-direction:column;gap:12px;overflow:auto}
  h1{font-size:15px;margin:0;letter-spacing:.02em}
  label{font-size:12px;color:#9aa0b8;text-transform:uppercase;letter-spacing:.08em}
  input,textarea{width:100%;background:#13131f;border:1px solid #2a2a3a;color:#e8e8f0;border-radius:8px;padding:10px;font-family:ui-monospace,Menlo,monospace;font-size:13px}
  textarea{flex:1;min-height:340px;resize:vertical;line-height:1.5}
  button{background:linear-gradient(120deg,#7c8cff,#c06cff);color:#fff;border:0;border-radius:8px;padding:11px;font-weight:600;cursor:pointer}
  .row{display:flex;gap:8px}.row button{flex:1}
  .muted{color:#6f7590;font-size:12px}.ok{color:#5fd38a}.err{color:#ff7676}
  iframe{border:0;width:100%;height:100%;background:#fff}
</style></head>
<body>
  <div class="panel">
    <h1>Sophia · live CSS editor</h1>
    <p class="muted">Edit custom CSS layered over the active preset. Applies live, no redeploy. Needs an editor token.</p>
    <div><label>API token</label><input id="tok" placeholder="sx_..." /></div>
    <div style="flex:1;display:flex;flex-direction:column"><label>custom.css</label><textarea id="css" spellcheck="false"></textarea></div>
    <div class="row"><button id="apply">Apply live</button><button id="reload" style="background:#23233a">Reload</button></div>
    <div id="status" class="muted"></div>
    <p class="muted">Tip: an LLM does the same via <code>PUT /api/sophia/css</code> + <code>POST /api/sophia/patch</code>. Catalog at <code>/api/sophia/catalog</code>.</p>
  </div>
  <iframe id="preview" src="/"></iframe>
<script>
  const $ = (id) => document.getElementById(id);
  $('tok').value = localStorage.getItem('sx_token') || '';
  $('tok').addEventListener('change', () => localStorage.setItem('sx_token', $('tok').value.trim()));
  async function loadCss(){ const r = await fetch('/api/sophia/css'); const j = await r.json(); $('css').value = j.css || ''; }
  async function apply(){
    const token = $('tok').value.trim();
    const res = await fetch('/api/sophia/css', { method:'PUT', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify({ css: $('css').value }) });
    const j = await res.json().catch(()=>({}));
    $('status').className = res.ok ? 'ok' : 'err';
    $('status').textContent = res.ok ? 'applied live ✓' : ('error: ' + (j.error || res.status));
  }
  $('apply').onclick = apply;
  $('reload').onclick = () => { loadCss(); $('preview').contentWindow.location.reload(); };
  loadCss();
</script></body></html>`;
