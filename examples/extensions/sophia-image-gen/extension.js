// Image Studio — generate images for the site you're building.
//
// Providers (bring your own key): OpenAI (gpt-image-1), fal.ai (FLUX), Google Imagen 3,
// plus a key-free SVG "placeholder" for instant mockups. Images save to the site's media
// library (ctx.media.save) and can drop straight into a block (ctx.site.patch). The prompt
// is made CONTEXT-AWARE: with "match my site", the extension reads the Site Model and uses
// the configured AI (ctx.ai.generate) to write a prompt that fits the brand and content.

const SIZE = { landscape: "1792x1024", square: "1024x1024", portrait: "1024x1792" };

async function genOpenAI(key, prompt, size) {
  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-1", prompt, size: size || "1024x1024", n: 1 }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || ("OpenAI image error " + r.status));
  const b64 = j.data && j.data[0] && (j.data[0].b64_json);
  if (!b64) throw new Error("OpenAI returned no image");
  return { dataUrl: "data:image/png;base64," + b64 };
}

// fal.ai models all use POST https://fal.run/<model> with `Authorization: Key <falKey>`
// and return images[].url. Param shape differs: "image_size" (FLUX, Seedream) vs
// "aspect_ratio" + "resolution" (Nano Banana 2).
async function genFalModel(key, model, prompt, size, shape) {
  const land = size === SIZE.landscape, port = size === SIZE.portrait;
  const body = { prompt, num_images: 1 };
  if (shape === "aspect") { body.aspect_ratio = land ? "16:9" : port ? "9:16" : "1:1"; body.resolution = "2K"; body.output_format = "png"; }
  else body.image_size = land ? "landscape_16_9" : port ? "portrait_16_9" : "square_hd";
  const r = await fetch("https://fal.run/" + model, {
    method: "POST", headers: { Authorization: "Key " + key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || (j.error && j.error.message) || ("fal error " + r.status));
  const url = j.images && j.images[0] && j.images[0].url;
  if (!url) throw new Error("fal returned no image");
  const ir = await fetch(url); // fetch the hosted image so we own it locally
  if (!ir.ok) throw new Error("could not download the generated image");
  return { buffer: Buffer.from(await ir.arrayBuffer()), type: ir.headers.get("content-type") || "image/png" };
}

// model id + param shape per fal model.
const FAL_MODELS = {
  "fal-flux": ["fal-ai/flux/schnell", "image_size"],
  "fal-seedream": ["fal-ai/bytedance/seedream/v4.5/text-to-image", "image_size"],
  "fal-nano-banana": ["fal-ai/nano-banana-2", "aspect"],
};

async function genImagen(key, prompt, size) {
  const aspectRatio = size === SIZE.landscape ? "16:9" : size === SIZE.portrait ? "9:16" : "1:1";
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=" + encodeURIComponent(key), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio } }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || ("Imagen error " + r.status));
  const pred = j.predictions && j.predictions[0];
  if (!pred || !pred.bytesBase64Encoded) throw new Error("Imagen returned no image");
  return { dataUrl: "data:" + (pred.mimeType || "image/png") + ";base64," + pred.bytesBase64Encoded };
}

// Key-free instant mockup — a branded SVG with the prompt. Great for placeholders/testing.
function genPlaceholder(prompt) {
  const txt = String(prompt || "image").slice(0, 48).replace(/[<&>]/g, "");
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a1628"/><stop offset="1" stop-color="#0a3a6e"/></linearGradient></defs><rect width="1024" height="640" fill="url(#g)"/><text x="50%" y="48%" fill="#00d4ff" font-family="system-ui,sans-serif" font-size="30" text-anchor="middle">' + txt + '</text><text x="50%" y="56%" fill="#5a7a90" font-family="system-ui,sans-serif" font-size="15" text-anchor="middle">Image Studio · placeholder</text></svg>';
  return { dataUrl: "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64"), type: "image/svg+xml" };
}

async function refinePrompt(ctx, request) {
  try {
    const m = ctx.site.read() || {};
    const sections = Object.values(m.pages || {}).flatMap((p) => (p.blocks || []).map((b) => b.type + (b.headline ? ` “${b.headline}”` : ""))).slice(0, 12).join(", ");
    const context = `Site: ${m.site || "(untitled)"}. Style: ${m.style || "?"}. Brief: ${(m.brief || "").slice(0, 300)}. Sections: ${sections}.`;
    const out = await ctx.ai.generate({
      system: "You write vivid, concise prompts for an AI image generator. Given a website's context and a request, write ONE prompt (under 50 words) for an image that fits the site's brand, mood, and subject. Photographic unless the brand is clearly illustrated. No text/words in the image. Reply with ONLY the prompt.",
      prompt: context + "\n\nRequest: " + request,
    });
    return ((out && out.text) || "").trim() || request;
  } catch { return request; }
}

const KEY_SETTING = { openai: "openaiKey", imagen: "geminiKey", fal: "falKey", "fal-flux": "falKey", "fal-seedream": "falKey", "fal-nano-banana": "falKey" };

// Shared by the /generate route AND the `generate` job (which the main builder calls).
async function doGenerate(ctx, body) {
  body = body || {};
  if (!body.prompt) return { ok: false, error: "prompt required" };
  const provider = body.provider || ctx.settings.get("provider") || "placeholder";
  let prompt = String(body.prompt);
  if (body.contextual) prompt = await refinePrompt(ctx, prompt);
  const size = SIZE[body.size] || body.size || SIZE.landscape;
  try {
    let out;
    if (provider === "placeholder") out = genPlaceholder(prompt);
    else {
      const key = ctx.settings.get(KEY_SETTING[provider]);
      if (!key) return { ok: false, error: `add your ${KEY_SETTING[provider] === "falKey" ? "fal.ai" : provider} API key in Image Studio first` };
      if (provider === "openai") out = await genOpenAI(key, prompt, size);
      else if (provider === "imagen") out = await genImagen(key, prompt, size);
      else if (provider === "fal") out = await genFalModel(key, FAL_MODELS["fal-flux"][0], prompt, size, FAL_MODELS["fal-flux"][1]);
      else if (FAL_MODELS[provider]) out = await genFalModel(key, FAL_MODELS[provider][0], prompt, size, FAL_MODELS[provider][1]);
      else return { ok: false, error: "unknown provider: " + provider };
    }
    const rec = out.buffer ? ctx.media.save(out.buffer, { type: out.type, name: "ai-image" }) : ctx.media.save(out.dataUrl, { name: "ai-image" });
    ctx.audit.log("generate", { provider, prompt: prompt.slice(0, 80) });
    if (body.place && body.place.id && body.place.path) ctx.site.patch([{ op: "set", id: body.place.id, path: body.place.path, value: rec.url }], "image-gen");
    return { ok: true, url: rec.url, prompt, provider };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

export default {
  async activate(ctx) {
    ctx.settings.register({ provider: { type: "string", default: "placeholder" }, openaiKey: { type: "string", default: "" }, falKey: { type: "string", default: "" }, geminiKey: { type: "string", default: "" } });
    ctx.admin.registerPanel({ label: "Image Studio", path: "panel" });

    // POST /generate { prompt, provider?, size?, contextual?, place?:{id,path} } -> { url, prompt }
    ctx.routes.register("/generate", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      let body = {}; try { body = JSON.parse((await h.readBody(req)) || "{}"); } catch {}
      const r = await doGenerate(ctx, body);
      return h.send(res, r.ok ? 200 : (/api key|prompt required|unknown provider/.test(r.error || "") ? 400 : 502), r);
    });
    // The main builder calls this job (via the generate_image tool) to make site images.
    ctx.jobs.register("generate", (payload) => doGenerate(ctx, { contextual: true, ...payload }));

    // PUT /keys { provider?, openaiKey?, falKey?, geminiKey? } — owner saves config.
    ctx.routes.register("/keys", async (req, res, h) => {
      if (!h.isAdmin) return h.send(res, 401, { error: "owner only" });
      const b = JSON.parse((await h.readBody(req)) || "{}");
      for (const k of ["provider", "openaiKey", "falKey", "geminiKey"]) if (b[k] !== undefined) ctx.settings.set(k, b[k]);
      return h.send(res, 200, { ok: true, provider: ctx.settings.get("provider"), have: { openai: !!ctx.settings.get("openaiKey"), fal: !!ctx.settings.get("falKey"), imagen: !!ctx.settings.get("geminiKey") } });
    });

    ctx.routes.register("/panel", async (req, res) => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(PANEL); });
  },
};

const PANEL = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#0a1626;color:#e6f0f5;margin:0;padding:22px;font-size:14px}
h1{color:#00d4ff;font-size:18px;margin:0 0 4px}p{color:#8499a8;margin:0 0 14px}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
label{font-size:12px;color:#8aa6b8}
select,input,textarea{background:#0c1c2b;border:1px solid rgba(255,255,255,.1);color:#fff;border-radius:8px;padding:9px 11px;font-size:13.5px}
textarea{width:100%;min-height:70px}
button{background:#00c2e0;color:#04212c;border:0;border-radius:8px;padding:9px 16px;font-weight:600;cursor:pointer}button:disabled{opacity:.5}
.card{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:16px;margin-bottom:12px}
img{max-width:100%;border-radius:10px;border:1px solid rgba(255,255,255,.1);margin-top:12px}
.muted{color:#5a7a90;font-size:12px}code{color:#ff7a45}
</style></head><body>
<h1>Image Studio</h1><p>1) Pick a provider · 2) Get a key (link below) and paste it · 3) Describe your image · 4) Generate. The image saves to your media library.</p>
<div class="card"><div class="row"><label>Provider</label>
<select id="prov"><option value="placeholder">Placeholder (free, no key)</option><option value="fal-seedream">fal · Seedream 4.5 (best quality)</option><option value="fal-nano-banana">fal · Nano Banana 2 (Gemini)</option><option value="fal-flux">fal · FLUX schnell (fastest)</option><option value="openai">OpenAI · gpt-image-1</option><option value="imagen">Google · Imagen 3</option></select>
<input id="key" placeholder="paste your API key" style="flex:1;min-width:200px"><button id="savekey">Save key</button></div>
<div class="muted" id="keyhelp" style="margin-top:4px"></div></div>
<div class="card">
<textarea id="prompt" placeholder="e.g. a warm, inviting hero photo for a neighborhood coffee shop at golden hour"></textarea>
<div class="row"><label><input type="checkbox" id="ctx" checked> Match my site</label>
<label>Size <select id="size"><option value="landscape">Landscape</option><option value="square">Square</option><option value="portrait">Portrait</option></select></label>
<button id="go">Generate</button><span id="msg" class="muted"></span></div>
<div id="result"></div></div>
<script>
var $=function(i){return document.getElementById(i)};
var LINKS={
  'fal-seedream':{key:'https://fal.ai/dashboard/keys',keyName:'fal.ai',model:'https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image',note:'Seedream 4.5 — best quality. One fal.ai key works for all three fal models.'},
  'fal-nano-banana':{key:'https://fal.ai/dashboard/keys',keyName:'fal.ai',model:'https://fal.ai/models/fal-ai/nano-banana-2',note:'Nano Banana 2 (Gemini-class). One fal.ai key works for all three fal models.'},
  'fal-flux':{key:'https://fal.ai/dashboard/keys',keyName:'fal.ai',model:'https://fal.ai/models/fal-ai/flux/schnell',note:'FLUX schnell — fastest, cheapest. One fal.ai key works for all three fal models.'},
  'openai':{key:'https://platform.openai.com/api-keys',keyName:'OpenAI',model:'https://platform.openai.com/docs/guides/images',note:'gpt-image-1. Billing must be enabled on your OpenAI account.'},
  'imagen':{key:'https://aistudio.google.com/apikey',keyName:'Google AI Studio',model:'https://ai.google.dev/gemini-api/docs/imagen',note:'Imagen 3. Needs an API key with image access (paid tier).'},
  'placeholder':{note:'Free — no key needed. Generates a branded placeholder image (great for mockups/testing).'}
};
function updateHelp(){var l=LINKS[$('prov').value]||{};var h='';if(l.key){h+='<a href="'+l.key+'" target="_blank" rel="noopener">Get your '+l.keyName+' key &#8599;</a> &nbsp;·&nbsp; ';}if(l.model){h+='<a href="'+l.model+'" target="_blank" rel="noopener">model details &#8599;</a> &nbsp;·&nbsp; ';}h+=(l.note||'')+' Keys are stored on your server only, never in the page.';$('keyhelp').innerHTML=h;var needsKey=!!l.key;$('key').style.display=needsKey?'':'none';$('savekey').style.display=needsKey?'':'none';}
$('prov').onchange=updateHelp;updateHelp();
function api(p,b){return fetch('/api/extensions/sophia-image-gen/'+p,{method:b?'POST':'GET',headers:b?{'Content-Type':'application/json'}:{},credentials:'same-origin',body:b?JSON.stringify(b):undefined}).then(function(r){return r.json()})}
$('savekey').onclick=function(){var p=$('prov').value;var b={provider:p};b[p==='openai'?'openaiKey':p==='imagen'?'geminiKey':'falKey']=$('key').value;
  fetch('/api/extensions/sophia-image-gen/keys',{method:'PUT',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(b)}).then(function(r){return r.json()}).then(function(){$('msg').textContent='saved ✓';setTimeout(function(){$('msg').textContent=''},1500)})};
$('go').onclick=function(){var pr=$('prompt').value.trim();if(!pr){$('msg').textContent='enter a prompt';return}
  $('go').disabled=true;$('msg').textContent='generating…';$('result').innerHTML='';
  api('generate',{prompt:pr,provider:$('prov').value,size:$('size').value,contextual:$('ctx').checked}).then(function(j){$('go').disabled=false;
    if(j&&j.ok){$('msg').textContent='';$('result').innerHTML='<img src="'+j.url+'"><div class="muted" style="margin-top:8px">Saved to media: <code>'+j.url+'</code><br>Prompt used: '+(j.prompt||'').replace(/</g,'&lt;')+'</div><div class="row" style="margin-top:8px"><button onclick="navigator.clipboard.writeText(\\''+j.url+'\\')">Copy URL</button></div>'}
    else{$('msg').textContent=(j&&j.error)||'failed'}
  }).catch(function(){$('go').disabled=false;$('msg').textContent='error'})};
</script></body></html>`;
