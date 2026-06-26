// dashboard.mjs — the owner's control panel (Connect · Pages · Data · Media ·
// Keys · Settings). Plain vanilla JS (no backticks inside) so it nests safely.
export function dashboardPage(username) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sophia · Dashboard</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(120% 70% at 50% -10%,#0d2036,transparent),#0A1628;color:#e8f4f8;font-family:system-ui,sans-serif}
.wrap{max-width:820px;margin:0 auto;padding:24px 18px 70px}
.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.brand{font-weight:700;font-size:20px;color:#00D4FF}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px}.tab{padding:9px 14px;border-radius:10px;background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.16);color:#9fc7d6;font-size:14px;cursor:pointer}.tab.on{background:linear-gradient(120deg,#00D4FF,#0066FF);color:#04121a;font-weight:700;border-color:transparent}
.logout{color:#7d93a8;font-size:13px;cursor:pointer;background:none;border:1px solid rgba(0,212,255,.2);border-radius:8px;padding:7px 12px}
.card{background:rgba(0,212,255,.04);border:1px solid rgba(0,212,255,.16);border-radius:14px;padding:20px;margin-bottom:14px}
h2{font-size:16px;margin:0 0 4px}p{color:#7d93a8;font-size:13px;margin:0 0 12px}
input,textarea{width:100%;background:#0d1f30;border:1px solid rgba(0,212,255,.2);color:#fff;border-radius:9px;padding:11px;font-size:14px;margin-bottom:8px}textarea{min-height:110px;line-height:1.5;resize:vertical}
button{background:linear-gradient(120deg,#00D4FF,#0066FF);color:#04121a;border:0;border-radius:9px;padding:10px 16px;font-weight:700;font-size:14px;cursor:pointer}
button.ghost{background:none;border:1px solid rgba(0,212,255,.25);color:#9fc7d6}button.danger{background:none;border:1px solid #ff6b6b55;color:#ff8a8a;padding:5px 10px;font-size:12px}
.field{background:#08141f;border:1px solid rgba(0,212,255,.18);border-radius:9px;padding:11px;font-family:ui-monospace,monospace;font-size:13px;word-break:break-all;margin-top:8px}
.label{color:#5a7a90;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin:10px 0 4px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.ok{color:#5fd38a;font-size:13px}.copy{cursor:pointer;color:#00D4FF;font-size:12px;margin-left:8px}
.item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:#0c1a28;border:1px solid rgba(0,212,255,.12);border-radius:9px;margin-bottom:8px;font-size:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}.thumb{background:#0c1a28;border:1px solid rgba(0,212,255,.12);border-radius:9px;padding:8px;text-align:center;font-size:11px}.thumb img{width:100%;height:80px;object-fit:cover;border-radius:6px}
a{color:#00D4FF}.hide{display:none}code{color:#FF6B35}</style></head>
<body><div class="wrap">
  <div class="top"><div class="brand">Sophia · Dashboard</div><button class="logout" id="logout">Log out (${username || "admin"})</button></div>
  <div class="tabs" id="tabs"></div>
  <div id="panel"></div>
</div>
<script>
  var $=function(id){return document.getElementById(id)};
  var origin=location.origin+'/';
  var api=function(m,p,b){var o={method:m,headers:{}};if(b!==undefined){o.headers['Content-Type']='application/json';o.body=JSON.stringify(b)}return fetch(p,o).then(function(r){return r.json().catch(function(){return{}})})};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  var TABS=['Connect','Pages','Data','Media','Keys','Settings'];var cur='Connect';
  function renderTabs(){$('tabs').innerHTML=TABS.map(function(t){return '<div class="tab '+(t===cur?'on':'')+'" data-t="'+t+'">'+t+'</div>'}).join('');Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(el){el.onclick=function(){cur=el.getAttribute('data-t');renderTabs();render()}})}
  function render(){var P=$('panel');P.innerHTML='';if(cur==='Connect')connect(P);else if(cur==='Pages')pages(P);else if(cur==='Data')data(P);else if(cur==='Media')media(P);else if(cur==='Keys')keys(P);else settings(P)}

  function connect(P){
    P.innerHTML='<div class="card"><h2>Connect your AI</h2><p>Mint a key, then give your AI the key + your URL. It reads the skill and builds.</p><button id="mint">Mint a new key</button><div id="ko" class="hide"><div class="label">Your key <span class="copy" id="cpk">copy</span></div><div class="field" id="key"></div><div class="label">Your site URL</div><div class="field">'+esc(origin)+'</div><div class="label">Skill</div><div class="field"><a href="'+origin+'skill.md" target="_blank">'+origin+'skill.md</a></div><div class="field" id="say" style="margin-top:10px;border-style:dashed;border-color:#FF6B35"></div></div></div><div class="card"><h2>Your live site</h2><div class="row"><a href="/" target="_blank">Open site →</a></div></div>';
    $('mint').onclick=function(){api('POST','/api/sophia/tokens',{label:'agent'}).then(function(j){if(!j.token)return;$('key').textContent=j.token;$('say').textContent='Tell your AI: "Read '+origin+'skill.md, then build my website using key '+j.token+'."';$('cpk').onclick=function(){navigator.clipboard.writeText(j.token)};$('ko').classList.remove('hide')})};
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
    P.innerHTML='<div class="card"><h2>Describe your site</h2><p>Your AI reads this to know what to build.</p><textarea id="brief"></textarea><div class="row"><button id="sb">Save</button> <span class="ok" id="bok"></span></div></div>'
      +'<div class="card"><h2>Sign in with Google <span style="color:#7d93a8;font-size:12px">(optional)</span></h2><p>Set up your OWN Google OAuth app, paste the credentials here, and you can sign in with Google. Redirect URL: <code>'+esc(origin)+'auth/google/callback</code></p>'
      +'<label class="row" style="margin-bottom:8px"><input type="checkbox" id="oe" style="width:auto;margin:0"> Enable Google sign-in</label>'
      +'<div class="label">Client ID</div><input id="ocid"><div class="label">Client Secret</div><input id="ocs" placeholder="(leave blank to keep current)"><div class="label">Your Google email (only this account may sign in)</div><input id="oem">'
      +'<div class="row"><button id="so">Save</button> <span class="ok" id="ook"></span></div></div>';
    api('GET','/api/sophia/brief').then(function(j){$('brief').value=j.brief||''});
    $('sb').onclick=function(){api('PUT','/api/sophia/brief',{brief:$('brief').value}).then(function(){$('bok').textContent='saved ✓';setTimeout(function(){$('bok').textContent=''},2000)})};
    api('GET','/api/sophia/oauth').then(function(j){$('oe').checked=!!j.enabled;$('ocid').value=j.clientId||'';$('oem').value=j.allowedEmail||''});
    $('so').onclick=function(){var b={enabled:$('oe').checked,provider:'google',clientId:$('ocid').value,allowedEmail:$('oem').value};if($('ocs').value)b.clientSecret=$('ocs').value;api('PUT','/api/sophia/oauth',b).then(function(){$('ook').textContent='saved ✓';setTimeout(function(){$('ook').textContent=''},2000)})};
  }
  $('logout').onclick=function(){fetch('/_logout',{method:'POST'}).then(function(){location.href='/_setup'})};
  renderTabs();render();
</script></body></html>`;
}
