/* GSH Virtual English Teacher — robust bootstrap (EN-only, self-mounting, with logs) */
(function(){
  if (window.__GSH_BOOTSTRAP_LOADED__) {
    console.log("[GSH bootstrap] already loaded — skipping");
    return;
  }
  window.__GSH_BOOTSTRAP_LOADED__ = true;
  window.__GSH_BOOTSTRAP_STAGE__ = "start";

  const CONFIG = {
    BACKEND_BASE_URL: "https://misty-tree-121b.rgermano-wup.workers.dev",
    CHAT_MODEL: "gpt-4o-mini",
    TTS_VOICE: "alloy",
    TTS_FORMAT: "mp3",
    STT_MODEL: "whisper-1",
    MAX_IX: 20,
    MAX_MS: 10 * 60 * 1000
  };

  function log(...a){ try{ console.log("[GSH bootstrap]", ...a); }catch{} }

  function onReady(fn){
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  // Tenta achar/criar #gsh-gpt-widget por até ~8s
  function waitForMount(maxMs=8000){
    return new Promise(resolve=>{
      let mount = document.getElementById("gsh-gpt-widget");
      if (mount) return resolve(mount);

      const start = Date.now();
      const tryMake = ()=>{
        let m = document.getElementById("gsh-gpt-widget");
        if (!m) {
          // cria e coloca antes do footer se possível
          m = document.createElement("div");
          m.id = "gsh-gpt-widget";
          const footer = document.querySelector('footer, #footer, .footer, .site-footer, [class*="footer"], [id*="footer"]');
          if (footer && footer.parentNode) footer.parentNode.insertBefore(m, footer);
          else (document.querySelector('main, #main, .site-content, .content, [role="main"]') || document.body).appendChild(m);
          log("mount created");
        }
        // confirma que ficou no DOM
        if (document.body.contains(m)) return resolve(m);
        if (Date.now() - start < maxMs) return setTimeout(tryMake, 40);
        resolve(m);
      };
      tryMake();
    });
  }

  function injectStyles(){
    if (document.getElementById("gsh-widget-style")) return;
    const css = `
:root{--bg:#0b1020;--ink:#e8ecff;--muted:#a6b0d6}
.gsh-wrap{max-width:760px;margin:24px auto;padding:16px;color:var(--ink);font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Helvetica Neue,Arial}
.gsh-card{background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.08);border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.25);overflow:hidden;background:#0b1020}
.gsh-header{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:space-between;gap:10px}
.gsh-left{display:flex;align-items:center;gap:10px}
.gsh-dot{width:10px;height:10px;background:linear-gradient(45deg,#82ffd2,#5da0ff);border-radius:50%}
.gsh-title{font-weight:700;letter-spacing:.2px}
.gsh-pill{font-size:12px;padding:6px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:#121a3f}
.gsh-usage{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--muted)}
.gsh-row{display:flex;gap:8px;align-items:center}
.gsh-bar{width:140px;height:8px;background:#0f1530;border:1px solid rgba(255,255,255,.12);border-radius:999px;overflow:hidden}
.gsh-fill{height:100%;background:#5da0ff;width:0%}
.gsh-messages{height:420px;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}
.gsh-msg{padding:10px 12px;border-radius:14px;line-height:1.45;white-space:pre-wrap}
.gsh-msg.user{align-self:flex-end;background:rgba(93,160,255,.15);border:1px solid rgba(93,160,255,.35)}
.gsh-msg.bot{align-self:flex-start;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15)}
.gsh-controls{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.07)}
.gsh-input{flex:1;background:#0f1530;color:var(--ink);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px}
.gsh-btn{background:#1a2453;color:var(--ink);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:10px 14px;cursor:pointer}
.gsh-btn:hover{background:#21306c}
.gsh-tiny{font-size:12px;color:var(--muted);padding:0 12px 10px}
.gsh-audio{display:flex;gap:6px;align-items:center}`;
    const style = document.createElement("style");
    style.id = "gsh-widget-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function widgetHTML(){
    return `
<div class="gsh-wrap">
  <div class="gsh-card">
    <div class="gsh-header">
      <div class="gsh-left">
        <div class="gsh-dot"></div>
        <div class="gsh-title">GSH – Globy</div>
        <span class="gsh-pill" id="gsh-status">ready</span>
      </div>
      <div class="gsh-usage" id="gsh-usageBox" style="display:none;">
        <div>Left today:</div>
        <div class="gsh-row" style="gap:12px">
          <div title="interactions left"><div class="gsh-bar"><div id="gsh-barIx" class="gsh-fill"></div></div></div>
          <div id="gsh-ixText">20 interactions</div>
          <div title="minutes left"><div class="gsh-bar"><div id="gsh-barMin" class="gsh-fill"></div></div></div>
          <div id="gsh-minText">10 min</div>
          <div id="gsh-resetText" class="gsh-pill" title="Resets exactly 24h after first use">resets in 24h</div>
        </div>
      </div>
    </div>

    <div id="gsh-auth" style="padding:16px;display:none;gap:12px;flex-direction:column;">
      <div class="gsh-tiny">Log in with your school email to chat with Globy.</div>
      <div class="gsh-row" style="flex-wrap:wrap;gap:12px;align-items:flex-end;">
        <div style="display:flex;flex-direction:column;gap:6px;min-width:260px;">
          <label for="gsh-email">Email</label>
          <input id="gsh-email" type="text" placeholder="student@globalspeak.email or admin@globalspeak.online" class="gsh-input"/>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;min-width:200px;">
          <label for="gsh-pass">Password</label>
          <input id="gsh-pass" type="password" placeholder="your password" class="gsh-input"/>
        </div>
        <button id="gsh-login" class="gsh-btn">Log in</button>
      </div>
      <div class="gsh-tiny">Admins: <code>@globalspeak.online</code>. Students: <code>@globalspeak.email</code>.</div>
    </div>

    <div id="gsh-admin" style="display:none;padding:16px;border-bottom:1px solid rgba(255,255,255,.07);">
      <div class="gsh-row" style="justify-content:space-between;align-items:center;">
        <div class="gsh-title" style="font-size:14px;">Admin Panel</div>
        <button id="gsh-logoutA" class="gsh-btn">Logout</button>
      </div>
      <div class="gsh-tiny">Add/Remove authorized students (domain <code>@globalspeak.email</code>).</div>
      <div class="gsh-row" style="flex-wrap:wrap;gap:8px;margin-top:8px;">
        <input id="gsh-newEmail" type="text" placeholder="newstudent@globalspeak.email" class="gsh-input"/>
        <input id="gsh-newPass" type="text" placeholder="student password" class="gsh-input"/>
        <button id="gsh-add" class="gsh-btn">+ Add student</button>
      </div>
      <div class="gsh-row" style="flex-wrap:wrap;gap:8px;margin-top:8px;">
        <input id="gsh-delEmail" type="text" placeholder="student@globalspeak.email" class="gsh-input"/>
        <button id="gsh-del" class="gsh-btn">– Remove student</button>
      </div>
      <div id="gsh-adminMsg" class="gsh-tiny" style="margin-top:8px;"></div>
    </div>

    <div id="gsh-chat" style="display:none;">
      <div id="gsh-messages" class="gsh-messages"></div>
      <div class="gsh-tiny">Tip: You can type or record in Spanish/Portuguese; Globy will ALWAYS reply in ENGLISH with grammar fixes and a pronunciation tip.</div>
      <div class="gsh-controls">
        <input id="gsh-text" type="text" placeholder="Type your question..." class="gsh-input"/>
        <div class="gsh-row">
          <button id="gsh-mic" class="gsh-btn">🎙️ Record</button>
          <button id="gsh-send" class="gsh-btn">Send</button>
        </div>
      </div>
      <div class="gsh-controls" style="justify-content:space-between;">
        <label class="gsh-audio"><input type="checkbox" id="gsh-playAudio" checked> Play audio reply</label>
        <div class="gsh-row">
          <button id="gsh-stop" class="gsh-btn">⏹️ Stop audio</button>
          <button id="gsh-clear" class="gsh-btn">🧹 Clear</button>
          <button id="gsh-logoutU" class="gsh-btn">Logout</button>
        </div>
      </div>
    </div>
  </div>
</div>
<audio id="gsh-tts" preload="auto"></audio>`;
  }

  async function init(){
    window.__GSH_BOOTSTRAP_STAGE__ = "init";
    const mount = await waitForMount();
    if (!mount) { log("no mount — abort"); return; }

    if (mount.dataset.initialized === "1") {
      log("already initialized");
      return;
    }
    injectStyles();
    mount.innerHTML = widgetHTML();
    mount.dataset.initialized = "1";
    log("UI injected");
    try { wireUp(mount); } catch(e){ console.error("[GSH bootstrap] wireUp error:", e); }
  }

  function $(root, sel){ return root.querySelector(sel); }

  function wireUp(root){
    window.__GSH_BOOTSTRAP_STAGE__ = "wireUp";
    const $status = $('#gsh-status'), $usageBox = $('#gsh-usageBox'), $barIx = $('#gsh-barIx'), $barMin = $('#gsh-barMin'), $ixText = $('#gsh-ixText'), $minText = $('#gsh-minText'), $resetText = $('#gsh-resetText');
    const $auth = $('#gsh-auth'), $admin = $('#gsh-admin'), $chat = $('#gsh-chat');
    const $email = $('#gsh-email'), $pass = $('#gsh-pass'), $login = $('#gsh-login'), $logoutA = $('#gsh-logoutA'), $logoutU = $('#gsh-logoutU');
    const $newEmail = $('#gsh-newEmail'), $newPass = $('#gsh-newPass'), $add = $('#gsh-add'), $delEmail = $('#gsh-delEmail'), $del = $('#gsh-del'), $adminMsg = $('#gsh-adminMsg');
    const $messages = $('#gsh-messages'), $text = $('#gsh-text'), $send = $('#gsh-send'), $mic = $('#gsh-mic'), $clear = $('#gsh-clear'), $playAudio = $('#gsh-playAudio'), $stop = $('#gsh-stop'), $tts = $('#gsh-tts');
    let session = null;

    function setStatus(s){ $status.textContent = s; }
    function addMessage(t, who){ const d=document.createElement('div'); d.className=`gsh-msg ${who}`; d.textContent=t; $messages.appendChild(d); $messages.scrollTop=$messages.scrollHeight; }
    function show(view){ $auth.style.display='none'; $admin.style.display='none'; $chat.style.display='none'; if(view==='auth') $auth.style.display='flex'; if(view==='admin'){ $admin.style.display='block'; $usageBox.style.display='none'; } if(view==='chat'){ $chat.style.display='block'; $usageBox.style.display='flex'; fetchUsage(); }}
    function authHeader(){ return session? { 'Authorization': `Bearer ${session.token}` } : {}; }

    async function fetchUsage(){
      try{
        const r = await fetch(`${CONFIG.BACKEND_BASE_URL}/usage`, { headers: { ...authHeader() } });
        const data = await r.json();
        if(!r.ok) throw new Error(data.error || 'usage error');
        const ixLeft = Math.max(0, CONFIG.MAX_IX - (data.interactions || 0));
        const msLeft = Math.max(0, CONFIG.MAX_MS - (data.used_ms || 0));
        const minLeft = Math.floor(msLeft / 60000);
        const pctIx = (ixLeft / CONFIG.MAX_IX) * 100;
        const pctMin = (msLeft / CONFIG.MAX_MS) * 100;
        $barIx.style.width = `${pctIx}%`; $barMin.style.width = `${pctMin}%`;
        $ixText.textContent = `${ixLeft} interactions`; $minText.textContent = `${minLeft} min`;
        if(data.resetAt){
          const t = new Date(data.resetAt);
          const diff = Math.max(0, t.getTime() - Date.now());
          const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000);
          $resetText.textContent = `resets in ${h}h ${m}m`;
        }
      }catch(e){ console.warn('usage', e); }
    }

    async function login(){
      const email = $email.value.trim(); const password = $pass.value;
      if(!email || !password) return alert('Fill in email and password.');
      setStatus('authenticating...');
      const r = await fetch(`${CONFIG.BACKEND_BASE_URL}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
      const data = await r.json();
      if(!r.ok){ setStatus('error'); return alert(data.error || 'Login failed'); }
      session = { token: data.token, role: data.role, email: data.email };
      localStorage.setItem('gsh_session', JSON.stringify(session));
      setStatus('ready'); show(session.role === 'admin' ? 'admin' : 'chat');
    }
    async function logout(){
      if(session){ try{ await fetch(`${CONFIG.BACKEND_BASE_URL}/auth/logout`, { method:'POST', headers:{...authHeader()} }); }catch{} }
      session = null; localStorage.removeItem('gsh_session'); show('auth');
    }

    $login.addEventListener('click', login);
    $logoutA.addEventListener('click', logout);
    $logoutU.addEventListener('click', logout);

    try{
      const s = JSON.parse(localStorage.getItem('gsh_session'));
      if(s){ session = s; show(s.role === 'admin' ? 'admin' : 'chat'); } else { show('auth'); }
    }catch{ show('auth'); }

    $add.addEventListener('click', async ()=>{
      const email = $newEmail.value.trim(), password = $newPass.value;
      if(!email || !password) return alert("Enter the student's email and password.");
      const r = await fetch(`${CONFIG.BACKEND_BASE_URL}/admin/addUser`, { method:'POST', headers:{ ...authHeader(), 'Content-Type':'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await r.json();
      $adminMsg.textContent = data.ok ? `Student ${email} added.` : (data.error || 'Error');
    });
    $del.addEventListener('click', async ()=>{
      const email = $delEmail.value.trim();
      if(!email) return alert("Enter the student's email.");
      const r = await fetch(`${CONFIG.BACKEND_BASE_URL}/admin/deleteUser`, { method:'POST', headers:{ ...authHeader(), 'Content-Type':'application/json' }, body: JSON.stringify({ email }) });
      const data = await r.json();
      $adminMsg.textContent = data.ok ? `Student ${email} removed.` : (data.error || 'Error');
    });

    async function transcribe(blob){
      setStatus('transcribing...');
      const form = new FormData(); form.append('file', blob, 'audio.webm'); form.append('model', CONFIG.STT_MODEL);
      const r = await fetch(`${CONFIG.BACKEND_BASE_URL}/stt`, { method:'POST', headers:{ ...authHeader() }, body: form });
      if(!r.ok){ const e = await r.json().catch(()=>({})); throw new Error(e.error || 'Transcription failed'); }
      const data = await r.json(); setStatus('ready'); await fetchUsage(); return data.text;
    }
    async function chat(prompt){
      setStatus('thinking...');
      const r = await fetch(`${CONFIG.BACKEND_BASE_URL}/chat`, { method:'POST', headers:{ ...authHeader(), 'Content-Type':'application/json' }, body: JSON.stringify({
        model: CONFIG.CHAT_MODEL,
        messages: [
          { role:'system', content: `You are Global Speak Hub's virtual English teacher. Always reply 100% in ENGLISH only (text and audio), even if the student's input is in Spanish or Portuguese. Your job on every turn: (1) answer the question clearly and naturally in English; (2) correct the student's grammar and spelling with 1–2 short examples in English; (3) give a quick pronunciation tip in English; (4) if the student uses Spanish/Portuguese, briefly restate what they asked in English before answering.` },
          { role:'user', content: prompt }
        ] }) });
      const data = await r.json(); if(!r.ok) throw new Error(data.error || 'Chat failed');
      setStatus('ready'); await fetchUsage(); return data.reply;
    }
    async function tts(text){
      setStatus('generating audio...');
      const r = await fetch(`${CONFIG.BACKEND_BASE_URL}/tts`, { method:'POST', headers:{ ...authHeader(), 'Content-Type':'application/json' }, body: JSON.stringify({ voice: CONFIG.TTS_VOICE, format: CONFIG.TTS_FORMAT, input: text }) });
      if(!r.ok){ const e=await r.text(); throw new Error(e || 'TTS failed'); }
      const buf = await r.arrayBuffer(); setStatus('ready'); await fetchUsage();
      return new Blob([buf], { type: `audio/${CONFIG.TTS_FORMAT}` });
    }

    async function handleSend(text){
      if(!text) return;
      addMessage(text, 'user'); $text.value='';
      try{
        const answer = await chat(text);
        addMessage(answer, 'bot');
        if($playAudio.checked){
          try{ const audioBlob = await tts(answer); const url = URL.createObjectURL(audioBlob); $tts.src = url; await $tts.play(); }catch(e){ console.error(e); }
        }
      }catch(err){ setStatus('error'); addMessage('⚠️ ' + err.message, 'bot'); }
    }

    $send.addEventListener('click', ()=> handleSend($text.value.trim()));
    $text.addEventListener('keydown', e=>{ if(e.key==='Enter') handleSend($text.value.trim()); });
    $stop.addEventListener('click', ()=>{ try{ $tts.pause(); $tts.currentTime=0; }catch{} });
    $clear.addEventListener('click', ()=>{ $messages.innerHTML=''; });

    let recording=false, mediaRecorder, chunks=[];
    $mic.addEventListener('click', async ()=>{
      if(!recording){
        try{
          const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
          chunks=[]; mediaRecorder=new MediaRecorder(stream);
          mediaRecorder.ondataavailable = e => chunks.push(e.data);
          mediaRecorder.onstop = async ()=>{
            const blob = new Blob(chunks, { type:'audio/webm' });
            try{ const text = await transcribe(blob); addMessage(`(voice) ${text}`, 'user'); await handleSend(text); }
            catch(err){ addMessage('⚠️ ' + err.message, 'bot'); }
          };
          mediaRecorder.start(); recording=true; $mic.textContent='⏹️ Stop'; setStatus('recording...');
        }catch{ alert('Please allow microphone access.'); }
      } else {
        mediaRecorder.stop(); recording=false; $mic.textContent='🎙️ Record'; setStatus('processing...');
      }
    });

    window.__GSH_BOOTSTRAP_STAGE__ = "ready";
    log("widget wired up");
  }

  function $(sel){ return document.querySelector(sel); }

  onReady(()=>{ log("init requested"); init(); });
})();
