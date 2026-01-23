(() => {
  console.log('lucky reels script loading');
  try {
  const icons = [
    // sushi
    `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="20" rx="8" width="52" height="24" fill="#fff7ec"/><path d="M8 28c8 12 48 12 48 0" fill="#ff8a65"/></svg>`,
    // tea cup
    `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M12 30h36v8a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8z" fill="#fff"/><path d="M20 22c6-6 24-6 30 0v2H20z" fill="#c8f0d6"/><path d="M50 34a6 6 0 0 0 0-12" stroke="#8b5e3c" stroke-width="2" fill="none"/></svg>`,
    // dango (three mochi balls)
    `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g transform="translate(32,20)"><circle cx="0" cy="0" r="8" fill="#ffd6a5"/><circle cx="0" cy="14" r="8" fill="#ff9fb8"/><circle cx="0" cy="28" r="8" fill="#c8f0d6"/></g></svg>`,
    // kanji (festival/filled box)
    `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="52" height="52" rx="6" fill="#fff3f3"/><text x="50%" y="58%" font-size="28" text-anchor="middle" fill="#b71c1c" font-family="Noto Sans JP, system-ui">祭</text></svg>`,
    // lantern
    `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="32" rx="16" ry="20" fill="#ff6b6b"/><path d="M20 18v28" stroke="#7b2a2a" stroke-width="2"/><path d="M44 18v28" stroke="#7b2a2a" stroke-width="2"/></svg>`,
    // carp streamer (koinobori)
    `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M8 32c12 12 36 12 44 0-8-12-32-12-44 0z" fill="#7bdff6"/><circle cx="34" cy="26" r="3" fill="#1a73a8"/></svg>`,
    // lucky seven
    `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="52" height="52" rx="8" fill="#fff7e6"/><text x="50%" y="60%" font-size="36" text-anchor="middle" fill="#ff8f00" font-family="system-ui, Arial">7</text></svg>`
  ];
  const creditsEl = document.getElementById('credits');
  const betEl = document.getElementById('bet');
  const spinBtn = document.getElementById('spin');
  const rebuySelect = document.getElementById('rebuyAmount');
  const buyRebuyBtn = document.getElementById('buyRebuy');
  const saveScoreBtn = document.getElementById('saveScore');
  const playerNameInput = document.getElementById('playerName');
  const lbList = document.getElementById('lbList');
  const exportBtn = document.getElementById('exportLb');
  const importBtn = document.getElementById('importLbBtn');
  const importArea = document.getElementById('importLb');
  const msgEl = document.getElementById('message');
  const reels = [document.getElementById('r0'), document.getElementById('r1'), document.getElementById('r2')];
  const confettiRoot = document.getElementById('confetti-root');
  const sakuraRoot = document.getElementById('sakura-root');
  const customBetInput = document.getElementById('customBet');
  const allInBtn = document.getElementById('allIn');
  const machineEl = document.querySelector('.machine');
  // auto-rebuy amount when player runs out
  const AUTO_REBUY_AMOUNT = 500;
  
  // --- Inappropriate-word stopper (hashed list only; words are not present in source) ---
  // djb2 hash implementation (returns unsigned 32-bit)
  function djb2Hash(str){
    let h = 5381;
    for(let i=0;i<str.length;i++) h = ((h<<5) + h) + str.charCodeAt(i);
    return h >>> 0;
  }

  // Blocked words stored as djb2 hashes (no plaintext words here)
  const BLOCKED_HASHES = [2090176645,2090158827,2090723197,2090269966,254275567];

  // Normalize and check a name for blocked tokens. Returns true if blocked.
  function nameContainsBlocked(name){
    if(!name) return false;
    const lower = name.toLowerCase();
    // check whole compacted name (remove non-alphanum)
    const compact = lower.replace(/[^a-z0-9]/gi,'');
    if(compact.length >= 3 && BLOCKED_HASHES.includes(djb2Hash(compact))) return true;
    // check tokenized parts (split on non-alphanum)
    const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
    for(const t of tokens){
      if(t.length < 2) continue;
      if(BLOCKED_HASHES.includes(djb2Hash(t))) return true;
      // also check stripped tokens (remove vowels sometimes used to obfuscate?)
      const stripped = t.replace(/[aeiou0-9]/g,'');
      if(stripped.length >= 3 && BLOCKED_HASHES.includes(djb2Hash(stripped))) return true;
    }
    return false;
  }


  let credits = 100;
  let spinning = false;
  const rand = (n) => Math.floor(Math.random()*n);

  function updateCredits(){ creditsEl.textContent = credits; }

  function evaluate(final){
    const [a,b,c] = final;
    if(a===b && b===c){
      return {type:'jackpot',mult:10};
    }
    if(a===b || b===c || a===c){
      return {type:'pair',mult:2};
    }
    return {type:'lose',mult:0};
  }

  function setMessage(text, tone){ msgEl.textContent = text; msgEl.className = tone ? `message ${tone}` : 'message'; }

  function flashWin(reelIndexes){
    reelIndexes.forEach(i=>{
      reels[i].classList.add('win');
      setTimeout(()=>reels[i].classList.remove('win'),400);
    });
  }

  function spawnConfetti(count=30){
    const colors = ['#b71c1c','#ff6b6b','#ffd166','#fff5f5','#ffb3b3'];
    const nodes = [];
    for(let i=0;i<count;i++){
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.background = colors[i%colors.length];
      el.style.left = (50 + (Math.random()*80-40)) + '%';
      el.style.setProperty('--tx', (Math.random()*600-300)+'px');
      el.style.animation = `fall ${1.9 + Math.random()}s linear ${Math.random()*0.2}s both`;
      confettiRoot.appendChild(el);
      nodes.push(el);
    }
    setTimeout(()=>nodes.forEach(n=>n.remove()),3500);
  }

  // Gold burst (win) - particles that radiate from the machine
  function spawnGoldBurst(count=20){
    if(!confettiRoot) return;
    const rect = machineEl ? machineEl.getBoundingClientRect() : {left: window.innerWidth/2, top: window.innerHeight/2, width:200, height:100};
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const nodes = [];
    for(let i=0;i<count;i++){
      const el = document.createElement('div');
      el.className = 'gold-burst';
      el.style.position = 'fixed';
      el.style.left = cx + 'px';
      el.style.top = cy + 'px';
      const size = 6 + Math.random()*10;
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.borderRadius = '50%';
      el.style.background = i%2? 'linear-gradient(135deg,#ffd166,#ffb703)' : '#ffd166';
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%,-50%) scale(1)';
      el.style.transition = 'transform 900ms cubic-bezier(.2,.9,.2,1), opacity 900ms linear';
      document.body.appendChild(el);
      nodes.push(el);
      // animate out on next frame
      (function(node){
        requestAnimationFrame(()=>{
          const angle = Math.random()*Math.PI*2;
          const dist = 60 + Math.random()*160;
          const tx = Math.cos(angle)*dist;
          const ty = Math.sin(angle)*dist;
          const rot = (Math.random()*360)|0;
          node.style.transform = `translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${0.6+Math.random()*0.8})`;
          node.style.opacity = '0';
        });
      })(el);
    }
    setTimeout(()=>nodes.forEach(n=>n.remove()),1100);
  }

  // Sakura petals
  function spawnPetals(count=12){
    if(!sakuraRoot) return;
    const nodes = [];
    for(let i=0;i<count;i++){
      const el = document.createElement('div');
      el.className = 'petal ' + (Math.random()>0.7? 'big' : (Math.random()>0.5? 'small':''));
      el.style.left = (10 + Math.random()*80) + '%';
      el.style.top = (-10 - Math.random()*10) + 'vh';
      el.style.setProperty('--tx', (Math.random()*800-400) + 'px');
      const dur = (2.8 + Math.random()*1.6).toFixed(2) + 's';
      const delay = (Math.random()*0.6).toFixed(2) + 's';
      el.style.animation = `petalFall ${dur} linear ${delay} both`;
      sakuraRoot.appendChild(el);
      nodes.push(el);
    }
    setTimeout(()=>nodes.forEach(n=>n.remove()),7000);
  }

  // gentle continuous petals
  if(sakuraRoot) setInterval(()=>{ try{ spawnPetals(2); }catch(e){} }, 1600);

  

  // Leaderboard (localStorage)
  const LB_KEY = 'luckyReels_leaderboard_v1';
  function loadLeaderboard(){
    try{
      const raw = localStorage.getItem(LB_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){return []}
  }
  function saveLeaderboard(list){ localStorage.setItem(LB_KEY, JSON.stringify(list)); }
  function addScore(name,score){
    if(!name) name = 'Anonymous';
    const list = loadLeaderboard();
    list.push({name,score,date:(new Date()).toISOString()});
    list.sort((a,b)=>b.score - a.score);
    const trimmed = list.slice(0,50);
    saveLeaderboard(trimmed);
    renderLeaderboard();
  }
  function renderLeaderboard(){
    const list = loadLeaderboard();
    lbList.innerHTML='';
    if(list.length===0){lbList.innerHTML='<li>No scores yet.</li>';return}
    list.slice(0,20).forEach((e,idx)=>{
      const li = document.createElement('li');
      li.textContent = `${idx+1}. ${e.name} — ${e.score} (${new Date(e.date).toLocaleString()})`;
      lbList.appendChild(li);
    });
  }

  exportBtn && exportBtn.addEventListener('click', ()=>{
    const raw = localStorage.getItem(LB_KEY) || '[]';
    navigator.clipboard?.writeText(raw).then(()=>{
      setMessage('Leaderboard JSON copied to clipboard. You can paste to share.','');
    }).catch(()=>{
      setMessage('Copy failed — open the import box and copy manually.','');
    });
  });

  importBtn && importBtn.addEventListener('click', ()=>{
    const txt = importArea.value.trim();
    if(!txt){ setMessage('Paste leaderboard JSON into the box first.',''); return; }
    try{
      const imported = JSON.parse(txt);
      if(!Array.isArray(imported)){ throw new Error('Invalid format'); }
      // merge
      const list = loadLeaderboard().concat(imported);
      list.sort((a,b)=>b.score - a.score);
      saveLeaderboard(list.slice(0,50));
      renderLeaderboard();
      setMessage('Imported leaderboard (merged).','');
    }catch(e){ setMessage('Invalid JSON — import failed.',''); }
  });

  saveScoreBtn && saveScoreBtn.addEventListener('click', ()=>{
    const rawName = (playerNameInput.value || '').trim();
    const name = rawName || 'Player';
    // run blocker (do not reveal which word matched)
    try{
      if(name !== 'Player' && nameContainsBlocked(rawName)){
        setMessage('Name contains inappropriate language — please choose another.','');
        return;
      }
    }catch(e){
      // on error, fail-safe: allow save but log
      console.warn('Name checker failure', e);
    }
    addScore(name, credits);
    setMessage('Score saved to leaderboard.','');
  });

  // initial render
  renderLeaderboard();

  // Diagnostics: report missing elements to the console and UI
  const required = { spinBtn, saveScoreBtn, exportBtn, importBtn, creditsEl, playerNameInput };
  Object.entries(required).forEach(([k,v])=>{
    if(!v) console.warn(`Element ${k} is missing (null)`);
  });
  if(!spinBtn){
    setMessage('Spin button not found — UI may be altered. Open DevTools console for details.','');
    console.error('Spin button element not found. Aborting attaching handler.');
  }

  // Rebuy logic: buy chips via UI
  function buyChips(amount){
    amount = Number(amount) || 0;
    if(amount <= 0) return setMessage('Invalid rebuy amount','');
    credits += amount;
    updateCredits();
    setMessage(`Purchased ${amount} chips. Good luck!`,'');
    // re-enable spin if it was disabled due to zero credits
    if(spinBtn) spinBtn.disabled = false;
  }

  // If the player runs out of chips, auto-rebuy a small pack after a short message

  // When credits hit zero, prompt player to rebuy and disable spin
  function checkCreditsForRebuy(){
    if(credits <= 0){
      credits = 0; updateCredits();
      if(spinBtn) spinBtn.disabled = true;
      // inform player and auto-rebuy after a short delay
      setMessage(`Out of chips — auto-rebuying ${AUTO_REBUY_AMOUNT} chips...`, '');
      setTimeout(()=>{
        buyChips(AUTO_REBUY_AMOUNT);
        setMessage(`Auto-rebuy complete: +${AUTO_REBUY_AMOUNT} chips. Good luck!`, '');
      }, 1400);
    }
  }

  function spin(){
    if(spinning) return;
    // prefer a custom bet value if provided, otherwise use the select
    let bet = 0;
    try{
      const cb = customBetInput && parseInt(customBetInput.value,10);
      if(cb && cb > 0) bet = cb;
      else bet = parseInt(betEl.value,10);
    }catch(e){ bet = parseInt(betEl.value,10); }
    if(!Number.isFinite(bet) || bet <=0 || bet > credits){ setMessage('Invalid bet or insufficient credits',''); return; }

    spinning = true; spinBtn.disabled = true; setMessage('Spinning...');

    // simple animation: rapidly change icons then stop one by one
    const intervals = [];
    const final = [null,null,null];
    for(let i=0;i<3;i++){
      intervals[i] = setInterval(()=>{
        reels[i].innerHTML = icons[rand(icons.length)];
      }, 80 + i*20);
    }

    // stop reels with stagger
    const stops = [1100,1500,1800];
    stops.forEach((t,i)=>{
      setTimeout(()=>{
        clearInterval(intervals[i]);
        const pick = icons[rand(icons.length)];
        reels[i].innerHTML = pick;
        final[i]=pick;
        // when last stopped evaluate
        if(i===2){
          const result = evaluate(final);
          if(result.type==='jackpot'){
            const amount = bet * result.mult;
            credits += amount;
            setMessage(`JACKPOT! You won ${amount} credits!`,'win');
            flashWin([0,1,2]);
            // machine glow + particles
            if(machineEl) machineEl.classList.add('big-win');
            spawnConfetti(40);
            spawnPetals(40);
            spawnGoldBurst(36);
            setTimeout(()=>{ if(machineEl) machineEl.classList.remove('big-win'); }, 1600);
          } else if(result.type==='pair'){
            const amount = bet * result.mult;
            credits += amount;
            setMessage(`Nice! Pair pays ${amount} credits.`,'win');
            // highlight the matching reels
            const idxs = [];
            if(final[0]===final[1]) idxs.push(0,1);
            else if(final[1]===final[2]) idxs.push(1,2);
            else idxs.push(0,2);
            flashWin(idxs);
            if(machineEl) machineEl.classList.add('big-win');
            spawnConfetti(18);
            spawnPetals(18);
            spawnGoldBurst(16);
            setTimeout(()=>{ if(machineEl) machineEl.classList.remove('big-win'); }, 1200);
          } else {
            credits -= bet;
            setMessage('No win — try again!','');
          }
          updateCredits();
          checkCreditsForRebuy();
          // auto-suggest saving when you have a high score: if current credits > top leaderboard score, hint user
          try{
            const lb = loadLeaderboard();
            const top = lb.length ? lb[0].score : -1;
            if(credits > top){ setMessage(msgEl.textContent + ' New high score — save it!','win'); }
          }catch(e){}
          spinning = false; spinBtn.disabled = false;
        }
      }, t);
    });
  }

  // initial reel render (random icons)
  for(let i=0;i<3;i++) reels[i].innerHTML = icons[rand(icons.length)];

  spinBtn.addEventListener('click', spin);
  // All-In button: set custom bet to current credits then spin
  allInBtn && allInBtn.addEventListener('click', ()=>{
    if(credits <= 0){ setMessage('No credits to go All In',''); return; }
    if(customBetInput) customBetInput.value = String(credits);
    else if(betEl) betEl.value = String(credits);
    // small delay so UI updates visually before spin starts
    setTimeout(()=>{ try{ spin(); }catch(e){} }, 120);
  });
  updateCredits();
  } catch (err) {
    console.error('Script error', err);
    try {
      const msgEl = document.getElementById('message');
      if (msgEl) msgEl.textContent = 'Script error: ' + (err && err.message ? err.message : String(err));
    } catch (e) {
      // fallback
      alert('Script error: ' + (err && err.message ? err.message : String(err)));
    }
  }
})();
