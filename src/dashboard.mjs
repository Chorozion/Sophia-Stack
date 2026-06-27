// dashboard.mjs — the owner's control panel (Connect · Pages · Data · Media ·
// Keys · Settings). Plain vanilla JS (no backticks inside) so it nests safely.
export function dashboardPage(username) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sophia · Dashboard</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(110% 55% at 50% -8%,#0d2036,transparent),#0a1626;color:#e6f0f5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px;-webkit-font-smoothing:antialiased}
.wrap{max-width:1040px;margin:0 auto;padding:20px 18px 60px}
.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.brand{font-weight:700;font-size:20px;color:#00D4FF}
.tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:16px}.tab{padding:7px 12px;border-radius:8px;background:transparent;border:1px solid transparent;color:#8aa6b8;font-size:13px;cursor:pointer;transition:.12s}.tab:hover{color:#cfe0ea;background:rgba(255,255,255,.04)}.tab.on{background:rgba(0,194,224,.12);color:#00d4ff;font-weight:600;border-color:rgba(0,194,224,.32)}
.logout{color:#7d93a8;font-size:13px;cursor:pointer;background:none;border:1px solid rgba(0,212,255,.2);border-radius:8px;padding:7px 12px}
.card{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:16px;margin-bottom:12px}
h2{font-size:15px;font-weight:600;margin:0 0 3px}p{color:#8499a8;font-size:13px;margin:0 0 11px;line-height:1.5}
input,textarea{width:100%;background:#0c1c2b;border:1px solid rgba(255,255,255,.1);color:#fff;border-radius:8px;padding:9px 11px;font-size:13.5px;margin-bottom:8px}input:focus,textarea:focus{outline:0;border-color:rgba(0,194,224,.5)}textarea{min-height:104px;line-height:1.5;resize:vertical}
button{background:#00c2e0;color:#04212c;border:0;border-radius:8px;padding:8px 14px;font-weight:600;font-size:13.5px;cursor:pointer;transition:.12s}button:hover{background:#1ccdec}button:disabled{opacity:.5;cursor:default}
button.ghost{background:transparent;border:1px solid rgba(255,255,255,.14);color:#cfe0ea}button.ghost:hover{background:rgba(255,255,255,.05)}button.danger{background:none;border:1px solid rgba(255,107,107,.32);color:#ff8a8a;padding:5px 10px;font-size:12px;font-weight:500}
.field{background:#08141f;border:1px solid rgba(0,212,255,.18);border-radius:9px;padding:11px;font-family:ui-monospace,monospace;font-size:13px;word-break:break-all;margin-top:8px}
.label{color:#5a7a90;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin:10px 0 4px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.ok{color:#5fd38a;font-size:13px}.copy{cursor:pointer;color:#00D4FF;font-size:12px;margin-left:8px}
.item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);border-radius:8px;margin-bottom:7px;font-size:13.5px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}.thumb{background:#0c1a28;border:1px solid rgba(0,212,255,.12);border-radius:9px;padding:8px;text-align:center;font-size:11px}.thumb img{width:100%;height:80px;object-fit:cover;border-radius:6px}
a{color:#00D4FF}.hide{display:none}code{color:#FF6B35}</style></head>
<body><div class="wrap">
  <div class="top"><div class="brand">Sophia · Dashboard</div><button class="logout" id="logout">Log out (${username || "admin"})</button></div>
  <div class="tabs" id="tabs"></div>
  <div id="onboard"></div>
  <div id="panel"></div>
</div>
<script>
  var $=function(id){return document.getElementById(id)};
  var origin=location.origin+'/';
  var api=function(m,p,b){var o={method:m,headers:{}};if(b!==undefined){o.headers['Content-Type']='application/json';o.body=JSON.stringify(b)}return fetch(p,o).then(function(r){return r.json().catch(function(){return{}})})};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  var TABS=['Build','Connect','Pages','Data','Media','Keys','Extensions','Settings'];var cur='Build';
  var extPanels=[]; // panels contributed by installed extensions: [{id,label,path}]
  function renderTabs(){
    var core=TABS.map(function(t){return '<div class="tab '+(t===cur?'on':'')+'" data-t="'+t+'">'+t+'</div>'}).join('');
    var ext=extPanels.map(function(p){var key='ext:'+p.id+':'+p.path;return '<div class="tab '+(cur===key?'on':'')+'" data-t="'+esc(key)+'" title="'+esc(p.id)+'">'+esc(p.label)+'</div>'}).join('');
    $('tabs').innerHTML=core+ext;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(el){el.onclick=function(){cur=el.getAttribute('data-t');renderTabs();render()}});
  }
  function extPanel(P,key){var i=key.indexOf(':',4);var id=key.slice(4,i);var path=key.slice(i+1).replace(/^\\//,'');P.innerHTML='<div class="card" style="padding:8px"><iframe src="/api/extensions/'+esc(id)+'/'+esc(path)+'" style="width:100%;height:660px;border:1px solid rgba(0,212,255,.18);border-radius:10px;background:#0a1628"></iframe></div>'}
  function loadExtPanels(){return api('GET','/api/sophia/extensions').then(function(j){var ps=[];((j&&j.extensions)||[]).forEach(function(e){if(e.active&&e.panels)e.panels.forEach(function(p){if(p&&p.path)ps.push({id:e.id,label:p.label||e.name,path:String(p.path).replace(/^\\//,'')})})});extPanels=ps;renderTabs()}).catch(function(){})}
  function goTab(t){cur=t;renderTabs();render();window.scrollTo(0,0)}
  function initOnboarding(){
    Promise.all([api('GET','/api/sophia/onboarding'),api('GET','/api/sophia/llm')]).then(function(r){
      var ob=r[0]||{},llm=r[1]||{};var O=$('onboard');if(!O)return;
      if(ob.done){O.innerHTML='';return}
      var aiOK=!!(llm&&llm.configured);
      function step(done,txt,btn,act){return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0"><span style="width:22px;height:22px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:13px;'+(done?'background:#1f8a4c;color:#fff':'background:rgba(0,212,255,.12);color:#00D4FF;border:1px solid rgba(0,212,255,.3)')+'">'+(done?'&check;':'')+'</span><span style="flex:1;font-size:14px;'+(done?'color:#7d93a8':'color:#e8f4f8')+'">'+txt+'</span>'+(btn&&!done?'<button class="ghost" style="padding:4px 12px" data-act="'+act+'">'+btn+'</button>':'')+'</div>'}
      O.innerHTML='<div class="card" style="border:1px solid rgba(0,212,255,.35);background:linear-gradient(160deg,rgba(0,212,255,.07),rgba(0,102,255,.03))">'
        +'<div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Welcome to Sophia &mdash; let&rsquo;s get you live</h2><span class="copy" id="obskip">skip</span></div>'
        +'<p style="margin:6px 0 8px">A few quick steps and your site is live. No code needed &mdash; anybody can do this.</p>'
        +step(true,'Admin account created &mdash; you&rsquo;re signed in.',null,null)
        +step(true,'Recovery phrase saved at setup &mdash; keep it safe; it&rsquo;s how you get back in.',null,null)
        +step(aiOK,'Connect an AI provider so Sophia can build for you.','Open Settings','Settings')
        +step(false,'Describe your site in Build and watch it render live in VEX.','Start building','Build')
        +'<div class="row" style="margin-top:8px"><button id="obdone">I&rsquo;m all set &mdash; finish</button></div></div>';
      Array.prototype.forEach.call(document.querySelectorAll('[data-act]'),function(b){b.onclick=function(){goTab(b.getAttribute('data-act'))}});
      function finish(){api('POST','/api/sophia/onboarding',{done:true}).then(function(){if($('onboard'))$('onboard').innerHTML=''})}
      $('obdone').onclick=finish;$('obskip').onclick=finish;
    });
  }
  function render(){var P=$('panel');P.innerHTML='';if(cur.indexOf('ext:')===0){extPanel(P,cur);return}if(cur==='Build')build(P);else if(cur==='Connect')connect(P);else if(cur==='Pages')pages(P);else if(cur==='Data')data(P);else if(cur==='Media')media(P);else if(cur==='Keys')keys(P);else if(cur==='Extensions')extensions(P);else settings(P)}
  function extensions(P){
    P.innerHTML='<div class="card"><h2>Extensions</h2><p>Add features with one click &mdash; installed straight from a public git repo, non-destructively. Your site data is never touched.</p>'
      +'<div class="item" style="background:linear-gradient(120deg,rgba(0,212,255,.08),transparent)"><span><b>Sophia SEO Suite</b> <span style="color:#7d93a8;font-size:12px">SEO audits · metadata · schema · sitemaps</span></span><button id="addseo">Add</button></div>'
      +'<div class="label" style="margin-top:14px">Install from a git repo <span style="color:#7d93a8;font-size:12px">(owner/repo, owner/repo#branch, or a GitHub URL)</span></div>'
      +'<div class="row"><input id="girepo" placeholder="owner/repo" style="flex:2;margin:0"><input id="gisub" placeholder="subdir (optional)" style="flex:1;margin:0"><button id="giadd" class="ghost">Install</button></div>'
      +'<div id="gimsg" style="font-size:13px;margin-top:8px"></div>'
      +'<div class="label" style="margin-top:16px">Installed</div><div id="extlist">loading&hellip;</div></div>';
    function load(){api('GET','/api/sophia/extensions').then(function(j){var ex=(j&&j.extensions)||[];
      $('extlist').innerHTML=ex.length?ex.map(function(e){return '<div class="item"><span><b>'+esc(e.name)+'</b> <span style="color:#7d93a8;font-size:12px">v'+esc(e.version)+' &middot; '+(e.active?'<span style="color:#5fd38a">active</span>':'disabled')+(e.error?' &middot; <span style="color:#ff8a8a">'+esc(e.error)+'</span>':'')+'</span></span><span class="row"><button class="ghost" data-tog="'+esc(e.id)+'" data-on="'+(e.enabled?'1':'0')+'">'+(e.enabled?'Disable':'Enable')+'</button> <button class="danger" data-unin="'+esc(e.id)+'">Uninstall</button></span></div>'}).join(''):'<div style="color:#7d93a8;font-size:13px">No extensions installed yet.</div>';
      Array.prototype.forEach.call(document.querySelectorAll('[data-tog]'),function(b){b.onclick=function(){api('POST','/api/sophia/extensions',{id:b.getAttribute('data-tog'),enabled:b.getAttribute('data-on')!=='1'}).then(load)}});
      Array.prototype.forEach.call(document.querySelectorAll('[data-unin]'),function(b){b.onclick=function(){if(!confirm('Uninstall '+b.getAttribute('data-unin')+'? Your site data is untouched.'))return;api('POST','/api/sophia/extensions/uninstall',{id:b.getAttribute('data-unin')}).then(function(){load();loadExtPanels();if(cur.indexOf('ext:')===0){cur='Extensions';renderTabs();render()}})}});
    })}
    function install(repo,sub,btn){var old=btn.textContent;btn.disabled=true;btn.textContent='Installing…';$('gimsg').innerHTML='<span style="color:#9fc7d6">Pulling from git&hellip;</span>';
      api('POST','/api/sophia/extensions/install',{repo:repo,subdir:sub}).then(function(r){btn.disabled=false;btn.textContent=old;
        if(r&&r.ok){$('gimsg').innerHTML='<span class="ok">Installed '+esc(r.name||r.id)+' v'+esc(r.version)+' &check; &mdash; its panel is now in the top tabs.</span>';load();loadExtPanels()}
        else{$('gimsg').innerHTML='<span style="color:#ff8a8a">'+esc((r&&r.error)||'install failed')+'</span>'}
      })}
    $('addseo').onclick=function(){install('Chorozion/SophiaXT-SEO-Suite','extensions/sophia-stack',this)};
    $('giadd').onclick=function(){var rp=$('girepo').value.trim();if(!rp){$('gimsg').textContent='Enter a repo.';return}install(rp,$('gisub').value.trim(),this)};
    load();
  }

  // BUILD: describe -> copy prompt -> paste into ANY ai -> paste reply back -> apply.
  // The stack does the editing; the AI only writes the change. No setup, any LLM.
  function extractPatch(text){
    if(!text)return null;
    var t=String(text).trim();
    var f=String.fromCharCode(96,96,96); // triple backtick (code fence)
    var i=t.indexOf(f);
    if(i>=0){var j=t.indexOf(f,i+3);if(j>i){t=t.slice(i+3,j).replace(/^json/i,'').trim();}}
    try{return JSON.parse(t)}catch(e){}
    var s=t.indexOf('{'),e=t.lastIndexOf('}');
    if(s>=0&&e>s){try{return JSON.parse(t.slice(s,e+1))}catch(e2){}}
    var sa=t.indexOf('['),ea=t.lastIndexOf(']');
    if(sa>=0&&ea>sa){try{return JSON.parse(t.slice(sa,ea+1))}catch(e3){}}
    return null;
  }
  function build(P){
    P.innerHTML=
      '<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">'
      +'<div style="flex:1 1 360px;min-width:300px">'
      +'<div class="card"><h2>Build with Sophia <span style="color:#7d93a8;font-size:12px">(needs an AI key in Settings)</span></h2><p>Chat with the builder. It reads your site, makes the changes, fixes its own mistakes, and keeps going &mdash; like Bolt, on your own site.</p>'
      +'<div id="thread" style="max-height:320px;overflow:auto;margin-bottom:10px"></div>'
      +'<textarea id="ask" placeholder="e.g. Build a coffee shop landing page: a hero, a menu section, opening hours, and a contact form. Warm colors."></textarea>'
      +'<div class="row"><button id="go">Send</button> <a href="/" target="_blank" style="margin-left:4px">Open site &rarr;</a> <span id="r" style="font-size:13px"></span></div>'
      +'<div id="needkey" class="hide" style="margin-top:10px;font-size:13px;color:#FF6B35">Add your AI key in <b>Settings</b> (one-time) to use this. No key? Use the manual option below, or hand your AI the token on the <b>Connect</b> tab.</div></div>'
      +'<div class="card"><h2>Manual &middot; any chatbot, no AI key</h2><p>Copy a prompt out, paste the reply back. Works with any AI (free accounts too).</p>'
      +'<textarea id="want" placeholder="What do you want? e.g. a landing page for my coffee shop with hours and a contact form."></textarea>'
      +'<div class="row"><button id="genp" class="ghost">1 &middot; Copy the prompt</button> <span class="ok" id="gok"></span></div>'
      +'<textarea id="reply" placeholder="2 · Paste everything the AI replied here." style="margin-top:10px"></textarea>'
      +'<div class="row"><button id="applyb" class="ghost">Apply to my site</button> <span id="ares" style="font-size:13px"></span></div></div>'
      +'</div>'
      +'<div style="flex:1 1 440px;min-width:320px;position:sticky;top:12px">'
      +'<div class="card" style="padding:14px">'
      +'<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px"><h2 style="margin:0">VEX <span style="color:#7d93a8;font-size:12px">live preview</span></h2>'
      +'<label style="font-size:12px;color:#cfe6f0;cursor:pointer"><input type="checkbox" id="vexprev" checked style="width:auto;margin-right:5px;vertical-align:middle">Preview before going live</label></div>'
      +'<div id="vexbar" class="hide" style="margin-bottom:8px;padding:10px 12px;border-radius:10px;background:rgba(0,212,255,.12);border:1px solid rgba(0,212,255,.3);font-size:13px;display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span id="vexmsg" style="flex:1">Previewing &mdash; not live yet.</span><button id="vexapply">Push to Live</button><button id="vexdiscard" class="ghost">Discard</button></div>'
      +'<iframe id="vexframe" src="/?vex=1" style="width:100%;height:540px;border:1px solid rgba(0,212,255,.18);border-radius:10px;background:#fff"></iframe>'
      +'<div style="font-size:11px;color:#7d93a8;margin-top:6px">Edits land here live as you chat. With <b>Preview</b> on, changes stage here first &mdash; then Apply or Discard.</div>'
      +'</div></div>'
      +'</div>';
    // VEX preview pane wiring (same-origin postMessage to the iframe).
    function vexPost(msg){var f=$('vexframe');if(f&&f.contentWindow){try{f.contentWindow.postMessage(msg,location.origin)}catch(e){}}}
    var pendingPreview=null, staged=null;
    window.addEventListener('message',function(e){if(e.origin!==location.origin)return;if(e.data&&e.data.__vex==='ready'&&pendingPreview){vexPost({__vex:'preview',ops:pendingPreview.ops||[],css:pendingPreview.css})}});
    function showPreview(p){staged=p;pendingPreview=p;$('vexbar').classList.remove('hide');$('vexmsg').textContent='Previewing '+((p.ops&&p.ops.length)||0)+' change(s) — not yet live.';vexPost({__vex:'reset'})}
    function clearPreview(){pendingPreview=null;staged=null;$('vexbar').classList.add('hide');vexPost({__vex:'reset'})}
    $('vexdiscard').onclick=function(){clearPreview()};
    $('vexapply').onclick=function(){
      if(!staged){return} var s=staged; $('vexmsg').textContent='Applying…';
      var doCss=(typeof s.css==='string')?api('PUT','/api/sophia/css',{css:s.css}):Promise.resolve({ok:true});
      doCss.then(function(){return (s.ops&&s.ops.length)?api('POST','/api/sophia/patch',{ops:s.ops}):{ok:true}}).then(function(r){
        if(r&&r.ok!==false){bubble('sophia','Applied to your live site ✓');pendingPreview=null;staged=null;$('vexbar').classList.add('hide');vexPost({__vex:'reset'})}
        else{$('vexmsg').textContent='Apply rejected: '+esc((r&&r.error)||'invalid');}
      });
    };
    // Conversational agent loop: prompt -> Sophia replies + edits the live site.
    var thread=[];
    function bubble(role,text,note){
      var d=document.createElement('div');var me=role==='user';
      d.style.cssText='margin:8px 0;padding:9px 12px;border-radius:10px;font-size:14px;line-height:1.5;'+(me?'background:rgba(0,212,255,.12);margin-left:40px':'background:#0c1a28;border:1px solid rgba(0,212,255,.12);margin-right:40px');
      var lbl=document.createElement('div');lbl.style.cssText='font-size:11px;color:#7d93a8;margin-bottom:3px';lbl.textContent=me?'You':'Sophia';
      var body=document.createElement('div');body.style.whiteSpace='pre-wrap';body.textContent=text;
      d.appendChild(lbl);d.appendChild(body);
      if(note){var n=document.createElement('div');n.style.cssText='margin-top:6px;font-size:12px;color:#5fd38a';n.textContent=note;d.appendChild(n)}
      $('thread').appendChild(d);$('thread').scrollTop=$('thread').scrollHeight;
    }
    // Greeting + key check on open
    api('GET','/api/sophia/llm').then(function(j){
      if(j&&j.configured){bubble('sophia','Hi, I am Sophia. Tell me what you want to build — a landing page, a portfolio, an online shop — and I will create it. We can keep refining it together.')}
      else{$('needkey').classList.remove('hide');bubble('sophia','Add your AI key in Settings (one-time), then come back here and tell me what to build.')}
    });
    function send(){
      var t=$('ask').value.trim(); if(!t){return}
      var prev=$('vexprev').checked; var NL=String.fromCharCode(10);
      thread.push({role:'user',content:t}); bubble('user',t); $('ask').value=''; $('go').disabled=true;
      var d=document.createElement('div');d.style.cssText='margin:8px 40px 8px 0;padding:9px 12px;border-radius:10px;background:#0c1a28;border:1px solid rgba(0,212,255,.12);font-size:14px;line-height:1.5';
      var lbl=document.createElement('div');lbl.style.cssText='font-size:11px;color:#7d93a8;margin-bottom:3px';lbl.textContent='Sophia is thinking…';
      var bd=document.createElement('div');bd.style.whiteSpace='pre-wrap';
      d.appendChild(lbl);d.appendChild(bd);$('thread').appendChild(d);$('thread').scrollTop=$('thread').scrollHeight;
      var acc='',finished=false;
      function fin(){$('go').disabled=false}
      function ev(e){
        if(e.type==='token'){lbl.textContent='Sophia';acc+=e.text;bd.textContent=acc;$('thread').scrollTop=$('thread').scrollHeight}
        else if(e.type==='tool'){lbl.textContent='Sophia · '+(e.name==='apply_patch'?'editing your site…':(e.name==='set_css'?'styling…':(e.name==='read_model'?'reading your site…':'working…')))}
        else if(e.type==='done'){finished=true;lbl.textContent='Sophia';if(!acc)bd.textContent=e.reply||'Done.';thread.push({role:'assistant',content:e.reply||acc||''});
          if(prev&&e.preview&&((e.preview.ops&&e.preview.ops.length)||typeof e.preview.css==='string')){showPreview(e.preview);var n=document.createElement('div');n.style.cssText='margin-top:6px;font-size:12px;color:#5fd38a';n.textContent='↗ Previewing in VEX — Push to Live or Discard →';d.appendChild(n)}
          else if(e.applied&&e.applied.length){var n2=document.createElement('div');n2.style.cssText='margin-top:6px;font-size:12px;color:#5fd38a';n2.textContent='✓ '+e.applied.length+' change(s) applied — live now';d.appendChild(n2)}
          fin()}
        else if(e.type==='error'){bd.textContent=e.message||'Something went wrong.';fin()}
      }
      fetch('/api/sophia/agent/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:thread,preview:prev})}).then(function(res){
        if(res.status===400){return res.json().then(function(j){if(j&&j.error==='no_llm'){$('needkey').classList.remove('hide');bd.textContent='I need an AI key first — add one in Settings.'}else bd.textContent=(j&&j.message)||'Error.';fin()})}
        if(!res.body||!res.body.getReader){return res.json().then(function(j){ev({type:'done',reply:(j&&j.reply)||'Done.',applied:(j&&j.applied)||[],preview:j&&j.preview})})}
        var reader=res.body.getReader();var dec=new TextDecoder();var buf='';
        function pump(){return reader.read().then(function(r){
          if(r.done){if(!finished)fin();return}
          buf+=dec.decode(r.value,{stream:true});var sep;
          while((sep=buf.indexOf(NL+NL))>=0){var chunk=buf.slice(0,sep);buf=buf.slice(sep+2);var line='';chunk.split(NL).forEach(function(x){if(x.indexOf('data:')===0)line+=x.slice(5).trim()});if(!line)continue;var obj;try{obj=JSON.parse(line)}catch(err){continue}ev(obj)}
          return pump()})}
        return pump();
      }).catch(function(){if(!finished){bd.textContent='Connection error. Try again.';fin()}});
    }
    $('go').onclick=send;
    $('ask').onkeydown=function(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send()}};
    var cat=null,mdl=null;
    Promise.all([api('GET','/api/sophia/catalog'),api('GET','/api/sophia/model')]).then(function(r){cat=r[0];mdl=r[1]});
    $('genp').onclick=function(){
      if(!cat||!mdl){$('gok').textContent='loading, try again in a second';return}
      var blocks=Object.keys(cat.blocks||{}).join(', ');
      var styles=Object.keys(cat.styles||{}).join(', ');
      var nl=String.fromCharCode(10);
      var p='You are editing a live website by writing a JSON patch. Reply with ONLY a JSON object and nothing else (no explanation, no markdown).'+nl+nl
        +'PATCH FORMAT: { "ops": [ ... ] }'+nl
        +'Operations:'+nl
        +'- {"op":"set","id":"<blockId>","path":"<prop>","value":<any>}   change a block prop'+nl
        +'- {"op":"add","value":{"id":"<newUniqueId>","type":"<type>"},"index":<n>}   add a block'+nl
        +'- {"op":"remove","id":"<blockId>"}'+nl
        +'- {"op":"move","id":"<blockId>","index":<n>}'+nl
        +'- {"op":"mset","path":"<dotPath>","value":<any>}   set anything (e.g. "style", "pages./about", "data.collections.signups", "functions.subscribe")'+nl
        +'- {"op":"mdel","path":"<dotPath>"}'+nl+nl
        +'ALLOWED block types: '+blocks+nl
        +'ALLOWED styles: '+styles+nl
        +'Rules: keep every block id unique; only use allowed block types and styles.'+nl+nl
        +'CURRENT SITE (the model you are editing):'+nl+JSON.stringify(mdl)+nl+nl
        +'WHAT I WANT:'+nl+($('want').value||'Improve the homepage and make it look professional.')+nl+nl
        +'Reply with ONLY the JSON patch.';
      navigator.clipboard.writeText(p);$('gok').textContent='copied — now paste it into your AI';setTimeout(function(){$('gok').textContent=''},5000);
    };
    $('applyb').onclick=function(){
      var patch=extractPatch($('reply').value);
      var ops=patch&&(patch.ops||(Array.isArray(patch)?patch:null));
      if(!ops){$('ares').innerHTML='<span style="color:#ff8a8a">Could not find a JSON patch. Paste the full reply, or ask the AI to reply with only { "ops": [...] }.</span>';return}
      $('ares').textContent='applying...';
      api('POST','/api/sophia/patch',{ops:ops}).then(function(r){
        if(r&&r.ok){$('ares').innerHTML='<span class="ok">Applied! Press Open site to see it.</span>';$('reply').value=''}
        else{$('ares').innerHTML='<span style="color:#ff8a8a">Rejected: '+esc((r&&r.errors&&r.errors.join('; '))||(r&&r.error)||'invalid patch')+'</span>'}
      });
    };
  }

  function starterText(key){
    var n=String.fromCharCode(10);
    return 'You can build and edit my live website through its API. Do what I ask by calling it.'+n+n
      +'1) Read the instructions: '+origin+'skill.md'+n
      +'2) Read what is allowed: GET '+origin+'api/sophia/catalog'+n
      +'3) Read the current site: GET '+origin+'api/sophia/model'+n
      +'4) Make changes (send header  Authorization: Bearer '+key+'  on every write):'+n
      +'   - POST '+origin+'api/sophia/patch     edit pages/blocks/style/data/functions'+n
      +'   - PUT  '+origin+'api/sophia/css       custom CSS'+n
      +'   - POST '+origin+'api/sophia/rollback  undo the last change'+n+n
      +'KEY = '+key+n+n
      +'Start: read the skill + catalog, then make this first change: set the style to "dark-tech" and rewrite the homepage hero.';
  }
  function connect(P){
    P.innerHTML='<div class="card"><h2>Connect your AI &mdash; it edits directly, like a CLI</h2><p>Mint a key, then hand your AI three things below: the skill, your URL, and the token. Any AI that can make web requests then posts edits straight to your site &mdash; no Custom GPT, no API key. Works in <b>Claude</b> (add as a Connector), <b>Cursor / Cline / Claude Code</b>, or <b>ChatGPT</b> (agent mode or an Action). A plain chat with no web tool (e.g. the Grok app) can read it but can&apos;t send the request &mdash; that is the app&apos;s limit, not the token.</p><button id="mint">Mint a key + starter</button>'
      +'<div id="ko" class="hide"><div class="label">① One thing to copy — paste into any AI chat <span class="copy" id="cps">copy</span></div><textarea id="starter" readonly style="min-height:200px;font-family:ui-monospace,monospace;font-size:12px"></textarea>'
      +'<div class="label">② Just the key — for a Custom GPT / tool auth field <span class="copy" id="cpk">copy</span></div><div class="field" id="key"></div></div></div>'
      +'<div class="card"><h2>Per-platform (optional, for native tools)</h2>'
      +'<p style="margin-bottom:8px"><b>ChatGPT</b> (Custom GPT Action): Explore GPTs → Create → Action → Import from URL <span class="copy" id="cpo">copy</span>, Auth = API Key / Bearer + your key.</p>'
      +'<div class="field" style="margin-bottom:12px"><a href="'+origin+'openapi.json" target="_blank">'+origin+'openapi.json</a></div>'
      +'<p style="margin-bottom:8px"><b>Claude / MCP apps</b>: add an MCP server <span class="copy" id="cpm">copy</span> with a Bearer header = your key.</p>'
      +'<div class="field" style="margin-bottom:12px">'+origin+'mcp</div>'
      +'<p><b>Grok / Kimi / DeepSeek / others</b>: paste the starter block above. If the app has a "custom tool / function" feature, point it at the same REST endpoints + Bearer key.</p></div>'
      +'<div class="card"><h2>Your live site</h2><div class="row"><a href="/" target="_blank">Open site →</a></div></div>';
    $('cpo').onclick=function(){navigator.clipboard.writeText(origin+'openapi.json')};
    $('cpm').onclick=function(){navigator.clipboard.writeText(origin+'mcp')};
    $('mint').onclick=function(){api('POST','/api/sophia/tokens',{label:'agent'}).then(function(j){if(!j.token)return;$('key').textContent=j.token;$('starter').value=starterText(j.token);$('cps').onclick=function(){navigator.clipboard.writeText($('starter').value)};$('cpk').onclick=function(){navigator.clipboard.writeText(j.token)};$('ko').classList.remove('hide')})};
  }
  function pages(P){
    api('GET','/api/sophia/model').then(function(m){var ps=m.pages||{};
      var rows=Object.keys(ps).map(function(r){return '<div class="item"><span><b>'+esc(r)+'</b> &nbsp;<span style="color:#7d93a8">'+esc(ps[r].title||'')+'</span></span><span class="row"><a href="'+esc(r)+'" target="_blank">open</a> '+(r==='/'?'':'<button class="danger" data-del="'+esc(r)+'">delete</button>')+'</span></div>'}).join('');
      P.innerHTML='<div class="card"><h2>Pages</h2><p>Every page on your site. Your AI adds these too.</p>'+rows+'<div class="label">Add a page</div><div class="row"><input id="pp" placeholder="/about" style="flex:1;margin:0"><input id="pt" placeholder="Page title" style="flex:1;margin:0"><button id="addp">Add</button></div></div>';
      Array.prototype.forEach.call(document.querySelectorAll('[data-del]'),function(b){b.onclick=function(){api('POST','/api/sophia/patch',{ops:[{op:'mdel',path:'pages.'+b.getAttribute('data-del')}]}).then(render)}});
      $('addp').onclick=function(){var p=$('pp').value.trim();if(!p)return;if(p[0]!=='/')p='/'+p;api('POST','/api/sophia/patch',{ops:[{op:'mset',path:'pages.'+p,value:{title:$('pt').value||p,blocks:[{id:'h'+Date.now(),type:'hero',headline:$('pt').value||'New page'}]}}]}).then(render)};
    });
  }
  function data(P){
    api('GET','/api/sophia/model').then(function(m){var cs=(m.data&&m.data.collections)||{};var names=Object.keys(cs);
      P.innerHTML='<div class="card"><h2>Data</h2><p>Collections your AI created. Click to view records.</p>'+(names.length?names.map(function(n){return '<div class="item"><span><b>'+esc(n)+'</b> <span style="color:#7d93a8">'+((cs[n].fields||[]).map(function(f){return esc(f.name)}).join(', '))+'</span></span><button class="ghost" data-col="'+esc(n)+'">view</button></div>'}).join('')+'<div id="recs"></div>':'<p style="color:#7d93a8">No collections yet.</p>')+'</div>';
      Array.prototype.forEach.call(document.querySelectorAll('[data-col]'),function(b){b.onclick=function(){api('GET','/api/data/'+b.getAttribute('data-col')).then(function(j){$('recs').innerHTML='<div class="field" style="white-space:pre-wrap;max-height:300px;overflow:auto">'+esc(JSON.stringify(j.items||j,null,2))+'</div>'})}});
    });
  }
  function media(P){
    api('GET','/api/media').then(function(j){var items=j.items||[];
      P.innerHTML='<div class="card"><h2>Media</h2><p>Photos, files, and video on your site.</p><input type="file" id="mf" multiple style="margin-bottom:10px"><div class="grid" id="mg">'+items.map(function(it){return '<div class="thumb">'+(/^image/.test(it.type)?'<img src="'+esc(it.url)+'">':'<div style="height:80px;display:flex;align-items:center;justify-content:center;color:#00D4FF">'+esc((it.type||'file').split('/')[1]||'file')+'</div>')+'<div style="margin-top:6px">'+esc(it.name).slice(0,16)+'</div><div class="row" style="justify-content:center;margin-top:4px"><span class="copy" data-u="'+esc(it.url)+'">copy url</span> <button class="danger" data-rm="'+esc(it.id)+'">x</button></div></div>'}).join('')+'</div></div>';
      $('mf').onchange=function(e){var fs=e.target.files;var n=0;Array.prototype.forEach.call(fs,function(f){fetch('/api/media',{method:'POST',headers:{'Content-Type':f.type||'application/octet-stream','X-Filename':f.name},body:f}).then(function(){if(++n===fs.length)render()})})};
      Array.prototype.forEach.call(document.querySelectorAll('[data-rm]'),function(b){b.onclick=function(){api('DELETE','/api/media/'+b.getAttribute('data-rm')).then(render)}});
      Array.prototype.forEach.call(document.querySelectorAll('[data-u]'),function(b){b.onclick=function(){navigator.clipboard.writeText(origin.replace(/\\/$/,'')+b.getAttribute('data-u'))}});
    });
  }
  function keys(P){
    api('GET','/api/sophia/tokens').then(function(j){var ts=j.tokens||[];
      P.innerHTML='<div class="card"><h2>Keys</h2><p>Keys your AI uses. Revoke any to cut off access instantly.</p>'+ts.map(function(t){return '<div class="item"><span>'+esc(t.preview)+' <span style="color:#7d93a8">'+esc(t.label||'')+' · '+esc(t.role)+'</span></span><button class="danger" data-rk="'+esc(t.preview)+'">revoke</button></div>'}).join('')+'<button id="mintk" style="margin-top:8px">Mint a new key</button><div class="field hide" id="nk"></div></div>';
      $('mintk').onclick=function(){api('POST','/api/sophia/tokens',{label:'agent'}).then(function(r){$('nk').textContent=r.token;$('nk').classList.remove('hide')})};
      Array.prototype.forEach.call(document.querySelectorAll('[data-rk]'),function(b){b.onclick=function(){api('DELETE','/api/sophia/tokens',{token:b.getAttribute('data-rk').replace('…','')}).then(render)}});
    });
  }
  function settings(P){
    P.innerHTML='<div class="card" id="updcard"><h2>Updates</h2><p id="upd" style="margin:0">Checking for updates&hellip;</p></div>'
      +'<div class="card"><h2>AI key &mdash; let Sophia build for you</h2><p>Pick a provider below, tap <b>Get a key</b>, sign up, copy the key, paste it here, Save. That&rsquo;s it &mdash; then chat on the Build tab.</p>'
      +'<div class="label">Providers (free signups)</div><div id="provs"></div>'
      +'<div class="label">API key</div><input id="lk" placeholder="(leave blank to keep current)">'
      +'<div id="advfields" class="hide"><div class="label">Model</div><input id="lm" placeholder="gpt-4o-mini"><div class="label">API base URL</div><input id="lb" placeholder="https://api.openai.com/v1"></div>'
      +'<div class="row"><button id="sl">Save</button> <span class="ok" id="lok"></span></div></div>'
      +'<div class="card"><h2>Describe your site</h2><p>Your AI reads this to know what to build.</p><textarea id="brief"></textarea><div class="row"><button id="sb">Save</button> <span class="ok" id="bok"></span></div></div>'
      +'<div class="card"><h2>Payments &mdash; sell with your own Stripe <span style="color:#7d93a8;font-size:12px">(optional)</span></h2><p>Connect <b>your own</b> Stripe account to sell products or subscriptions to your customers &mdash; Sophia never takes a cut. Get keys at <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener">dashboard.stripe.com/apikeys</a> (use <b>test</b> keys first). For payment confirmations, add a Stripe webhook to <code>'+esc(origin)+'api/payments/webhook</code> and paste its signing secret.</p>'
      +'<div class="label">Stripe secret key</div><input id="psk" placeholder="sk_… (leave blank to keep current)">'
      +'<div class="label">Webhook signing secret</div><input id="pwh" placeholder="whsec_… (leave blank to keep current)">'
      +'<div class="label">Publishable key (optional)</div><input id="ppk" placeholder="pk_…">'
      +'<div class="row"><button id="sp">Save</button> <span class="ok" id="pok"></span></div></div>'
      +'<label class="row" style="margin:2px 2px 12px;color:#9fc7d6;cursor:pointer"><input type="checkbox" id="advtog" style="width:auto;margin:0 7px 0 0"> Show advanced settings <span style="color:#7d93a8;font-size:12px">&nbsp;(model + base URL, Google sign-in)</span></label>'
      +'<div id="advsec" class="hide"><div class="card"><h2>Sign in with Google <span style="color:#7d93a8;font-size:12px">(optional)</span></h2><p>Set up your OWN Google OAuth app, paste the credentials here, and you can sign in with Google. Redirect URL: <code>'+esc(origin)+'auth/google/callback</code></p>'
      +'<label class="row" style="margin-bottom:8px"><input type="checkbox" id="oe" style="width:auto;margin:0"> Enable Google sign-in</label>'
      +'<div class="label">Client ID</div><input id="ocid"><div class="label">Client Secret</div><input id="ocs" placeholder="(leave blank to keep current)"><div class="label">Your Google email (only this account may sign in)</div><input id="oem">'
      +'<div class="row"><button id="so">Save</button> <span class="ok" id="ook"></span></div></div></div>';
    $('advtog').onchange=function(){var sh=this.checked;['advfields','advsec'].forEach(function(id){var e=$(id);if(e)e.classList[sh?'remove':'add']('hide')})};
    api('GET','/api/sophia/update').then(function(j){var el=$('upd');if(!el)return;if(j.enabled===false){el.textContent='Update checks are off (SOPHIA_UPDATE_CHECK=off).';return}if(j.error){el.textContent='Installed v'+(j.current||'?')+' — could not check ('+j.error+').';return}
      if(j.updateAvailable){
        el.innerHTML='<b style="color:#FF6B35">Update available: v'+esc(j.latest)+'</b> &mdash; you have v'+esc(j.current)+'. Your data is preserved and auto-migrated. '+(j.releaseUrl?'<a href="'+esc(j.releaseUrl)+'" target="_blank" rel="noopener">What&rsquo;s new &#8599;</a>':'')+'<div class="row" style="margin-top:8px"><button id="updnow">Update now</button> <span id="updmsg" style="font-size:13px"></span></div>'+(j.notes?'<pre style="white-space:pre-wrap;font-size:12px;color:#9fc7d6;background:#0c1a28;border:1px solid rgba(0,212,255,.12);border-radius:8px;padding:10px;margin-top:8px;max-height:160px;overflow:auto">'+esc(j.notes.slice(0,1200))+'</pre>':'');
        if($('updnow'))$('updnow').onclick=function(){var b=this;b.disabled=true;$('updmsg').textContent='Backing up + updating (this can take a minute)…';api('POST','/api/sophia/update/apply',{}).then(function(r){b.disabled=false;
          if(r&&r.ok&&r.updated){$('updmsg').innerHTML='<span class="ok">Updated to v'+esc(r.latest)+' &check; — restart to finish.</span>';if(r.changelog){var pre=document.createElement('pre');pre.style.cssText='white-space:pre-wrap;font-size:12px;color:#5fd38a;margin-top:8px';pre.textContent=r.changelog.slice(0,1500);$('upd').appendChild(pre)}}
          else if(r&&r.upToDate){$('updmsg').textContent='Already up to date.'}
          else{$('updmsg').innerHTML='<span style="color:#ff8a8a">'+esc((r&&r.error)||'update failed')+(r&&r.rolledBack?' — rolled back, your site is unchanged.':'')+'</span>'}
        }).catch(function(){b.disabled=false;$('updmsg').textContent='Update failed to start.'})};
      }
      else{el.innerHTML='You&rsquo;re on the latest version (v'+esc(j.current)+') &check;'}}).catch(function(){});
    api('GET','/api/sophia/brief').then(function(j){$('brief').value=j.brief||''});
    $('sb').onclick=function(){api('PUT','/api/sophia/brief',{brief:$('brief').value}).then(function(){$('bok').textContent='saved ✓';setTimeout(function(){$('bok').textContent=''},2000)})};
    api('GET','/api/sophia/oauth').then(function(j){$('oe').checked=!!j.enabled;$('ocid').value=j.clientId||'';$('oem').value=j.allowedEmail||''});
    $('so').onclick=function(){var b={enabled:$('oe').checked,provider:'google',clientId:$('ocid').value,allowedEmail:$('oem').value};if($('ocs').value)b.clientSecret=$('ocs').value;api('PUT','/api/sophia/oauth',b).then(function(){$('ook').textContent='saved ✓';setTimeout(function(){$('ook').textContent=''},2000)})};
    api('GET','/api/payments/config').then(function(j){if(j.configured)$('pok').textContent='Stripe connected ✓';$('ppk').value=j.publishableKey||''});
    $('sp').onclick=function(){var b={publishableKey:$('ppk').value};if($('psk').value)b.secretKey=$('psk').value;if($('pwh').value)b.webhookSecret=$('pwh').value;api('PUT','/api/payments/config',b).then(function(r){$('pok').textContent=r.configured?'Stripe connected ✓':'saved';$('psk').value='';$('pwh').value='';setTimeout(function(){if($('pok'))$('pok').textContent=r.configured?'Stripe connected ✓':''},2500)})};
    var llmType='openai';
    api('GET','/api/sophia/llm').then(function(j){$('lm').value=j.model||'';$('lb').value=j.baseURL||'';llmType=j.type||'openai';if(j.configured)$('lk').placeholder='(saved — leave blank to keep)';if(j.envProviders&&j.envProviders.length)$('lok').textContent='env providers: '+j.envProviders.join(', ')});
    $('sl').onclick=function(){var b={model:$('lm').value,baseURL:$('lb').value,type:llmType};if($('lk').value)b.apiKey=$('lk').value;api('PUT','/api/sophia/llm',b).then(function(){$('lok').textContent='saved ✓';$('lk').value='';setTimeout(function(){$('lok').textContent=''},2000)})};
    // [name, get-key url, base URL, model, note, adapter type]
    var PROVIDERS=[
      ['OpenAI','https://platform.openai.com/api-keys','https://api.openai.com/v1','gpt-4o-mini','popular','openai'],
      ['Anthropic (Claude)','https://console.anthropic.com/settings/keys','https://api.anthropic.com/v1','claude-sonnet-4','','anthropic'],
      ['Google Gemini','https://aistudio.google.com/apikey','https://generativelanguage.googleapis.com/v1beta','gemini-2.5-pro','','gemini'],
      ['DeepSeek','https://platform.deepseek.com/api_keys','https://api.deepseek.com','deepseek-chat','cheap','openai'],
      ['Groq','https://console.groq.com/keys','https://api.groq.com/openai/v1','llama-3.3-70b-versatile','fast, free tier','openai'],
      ['OpenRouter','https://openrouter.ai/keys','https://openrouter.ai/api/v1','openai/gpt-4o-mini','many models','openai'],
      ['Mistral','https://console.mistral.ai/api-keys','https://api.mistral.ai/v1','mistral-large-latest','','openai'],
      ['Together','https://api.together.xyz/settings/api-keys','https://api.together.xyz/v1','meta-llama/Llama-3.3-70B-Instruct-Turbo','','openai'],
      ['Ollama (local)','https://ollama.com/download','http://localhost:11434/v1','llama3.1','no key','openai'],
      ['LM Studio (local)','https://lmstudio.ai','http://localhost:1234/v1','local-model','no key','openai']
    ];
    $('provs').innerHTML=PROVIDERS.map(function(p,i){return '<div class="item"><span><b>'+p[0]+'</b>'+(p[4]?' <span style="color:#7d93a8;font-size:12px">'+p[4]+'</span>':'')+'</span><span class="row"><a href="'+p[1]+'" target="_blank" rel="noopener">Get a key &#8599;</a> <button class="ghost" data-use="'+i+'">Use</button></span></div>'}).join('');
    Array.prototype.forEach.call(document.querySelectorAll('[data-use]'),function(b){b.onclick=function(){var p=PROVIDERS[+b.getAttribute('data-use')];$('lb').value=p[2];$('lm').value=p[3];llmType=p[5]||'openai';$('lk').focus()}});
  }
  $('logout').onclick=function(){fetch('/_logout',{method:'POST'}).then(function(){location.href='/_setup'})};
  renderTabs();render();initOnboarding();loadExtPanels();
</script></body></html>`;
}
