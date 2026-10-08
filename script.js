const API='';
const $=i=>document.getElementById(i),S={view:'home',prev:[],res:null,cam:null,auto:false};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pc=x=>Math.round(x*1000)/10;

/* ---------- navigation ---------- */
function go(v,push=true){if(push&&v!==S.view)S.prev.push(S.view);if(v!=='scan')stopCam();S.view=v;$('home').hidden=v!=='home';$('scan').hidden=v!=='scan';if(v==='home')renderRecent();scrollTo(0,0)}
function back(){go(S.prev.pop()||'home',false)}
function setTab(t){$('tUp').classList.toggle('on',t==='up');$('tCam').classList.toggle('on',t==='cam');$('pUp').hidden=t!=='up';$('pCam').hidden=t!=='cam';if(t==='up')stopCam()}
function pill(t,busy){$('pill').className='pill'+(busy?' busy':'');$('pill').lastChild.textContent=t}

/* ---------- recent scans (localStorage) ---------- */
const ls={get:()=>{try{return JSON.parse(localStorage.avScans||'[]')}catch{return[]}},set:v=>{try{localStorage.avScans=JSON.stringify(v)}catch{}}};
function renderRecent(){const a=ls.get();$('recent').innerHTML=a.length?a.map(x=>`<div class="row"><i class="dot ${x.n==='Healthy'?'ok':''}"></i><div><b>${esc(x.n)}</b> <span class="mu">${esc(x.c)}</span></div><span class="mu sm">${pc(x.p)}% · ${new Date(x.t).toLocaleDateString([],{day:'numeric',month:'short'})}</span></div>`).join(''):'<div class="empty">🍃<b>No recent scans</b><span class="mu">Your latest crop analysis will appear here.</span></div>'}

/* ---------- camera + upload ---------- */
async function startCam(){setTab('cam');try{S.cam=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});$('vid').srcObject=S.cam;return true}catch{say('I could not open the camera. Please allow camera access in your browser.');return false}}
function stopCam(){S.cam&&S.cam.getTracks().forEach(t=>t.stop());S.cam=null;$('vid').srcObject=null}
function snap(){const v=$('vid');if(!S.cam||!v.videoWidth)return false;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);c.toBlob(analyze,'image/jpeg',.92);return true}
function shrink(f){return new Promise(r=>{const i=new Image();i.onload=()=>{const k=Math.min(1,1024/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);c.toBlob(r,'image/jpeg',.9)};i.src=URL.createObjectURL(f)})}
async function pick(f){if(f&&f.type.startsWith('image/'))analyze(await shrink(f))}

/* ---------- analysis + result ---------- */
async function analyze(b){
  $('prev').src=URL.createObjectURL(b);$('prev').hidden=false;
  $('res').innerHTML='<div class="idle"><div class="spin"></div>Analyzing your leaf…</div>';pill('Analyzing…',true);
  const fd=new FormData();fd.append('image',b,'leaf.jpg');
  try{const r=await fetch(API+'/api/predict',{method:'POST',body:fd}),d=await r.json();if(!r.ok)throw 0;S.res=d;show(d);
    if(d.status==='prediction')ls.set([{n:d.disease_name,c:d.crop,p:d.confidence,t:Date.now()},...ls.get()].slice(0,5))}
  catch{S.res=null;$('res').innerHTML=note('Could not analyze the image','Please try again in a moment. If the problem continues, check the Vercel function logs.')}
  pill('AI Assistant Ready');if(S.auto){S.auto=false;speakRes()}
}
const note=(t,m)=>`<div class="note warn"><b>${esc(t)}</b><p class="mu">${esc(m)}</p></div>`;
function show(d){const R=$('res');
  if(d.status==='not_leaf')return R.innerHTML=note("This doesn't look like a crop leaf",'Upload a clear photo of a single Tomato, Potato or Bell Pepper leaf.');
  if(d.status==='uncertain')return R.innerHTML=note(`Not confident enough (${pc(d.confidence)}%)`,'Try a clearer, well-lit photo of the whole leaf. Only Tomato, Potato and Bell Pepper are supported. For a reliable diagnosis, consult an agricultural expert.');
  const ok=d.disease_name==='Healthy',L=(t,a)=>a&&a.length?`<h4>${t}</h4><ul>${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
  R.innerHTML=`<span class="chip ${ok?'ok':''}">${ok?'Healthy plant':'Disease detected'}</span><p class="mu" style="margin-top:8px">${esc(d.crop)}</p><h2>${esc(d.disease_name)}</h2>
  <div class="meter"><i style="width:${pc(d.confidence)}%"></i></div><p class="mu sm">Confidence ${pc(d.confidence)}%</p>
  ${d.cause?`<h4>Possible cause</h4><p>${esc(d.cause)}</p>`:''}${L('Symptoms',d.symptoms)}${L('General management',d.general_management)}${L('Prevention and care',d.prevention)}
  <button class="btn alt" id="hear">Read result aloud</button><p class="mu sm" style="margin-top:14px">AI-based preliminary identification, not a substitute for professional agricultural advice.</p>`;
  $('hear').onclick=speakRes}

/* ---------- voice: speech out ---------- */
let dockT;function dock(a,b,keep){const d=$('dock');d.innerHTML=`<b>${esc(a)}</b><span>${esc(b||'')}</span>`;d.classList.add('show');clearTimeout(dockT);if(!keep)dockT=setTimeout(()=>d.classList.remove('show'),7000)}
function talk(t){if(!('speechSynthesis' in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t),v=speechSynthesis.getVoices();u.voice=v.find(x=>x.lang==='en-IN')||v.find(x=>x.lang.startsWith('en'))||null;u.lang='en-IN';speechSynthesis.speak(u)}
function say(t){dock('AgriVision',t);talk(t)}
function resText(){const d=S.res;if(!d)return'There is no result yet. Scan a leaf first.';
  if(d.status==='not_leaf')return"That doesn't look like a crop leaf. Please try another photo.";
  if(d.status==='uncertain')return'I could not confidently identify the condition. Please upload a clearer image or consult an agricultural expert.';
  return d.disease_name==='Healthy'?`This ${d.crop} plant looks healthy, with ${Math.round(d.confidence*100)} percent confidence.`:`Detected ${d.disease_name} in ${d.crop}, with ${Math.round(d.confidence*100)} percent confidence. Ask me how to treat it, or how to prevent it.`}
function speakRes(){say(resText())}
function speakList(k,fb){const d=S.res;if(!d)return say('There is no result yet. Scan a leaf first.');if(d.status!=='prediction')return speakRes();const a=d[k]||[];say(a.length?a.join('. '):fb)}

/* ---------- voice: commands ---------- */
function intent(text){const T=' '+text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()+' ',h=(...p)=>p.some(x=>T.includes(x));
  if(h('what is the disease','what disease','tell me the result','what did you find','what is the condition','read the result','read result','what is wrong'))return'RESULT';
  if(h('how to treat','treatment','what should i do','management','cure'))return'TREAT';
  if(h('prevent'))return'PREVENT';
  if(h('stop camera','close camera','turn off camera'))return'STOPCAM';
  if(h('take photo','take a photo','take picture','take a picture','capture','click photo','click a photo'))return'SNAP';
  if(h('camera'))return'CAM';
  if(h('upload'))return'UPLOAD';
  if(h('check my','scan','diagnose','crop disease','disease detection','open crop','crop scan','start diagnosis'))return'SCAN';
  if(h(' home ','main menu'))return'HOME';
  if(h(' back ','previous'))return'BACK';
  if(h('help','what can you do','commands'))return'HELP';
  if(h(' exit ',' quit ','goodbye',' bye '))return'EXIT';
  if(h(' hello ',' hi ',' hey ','namaste'))return'HI';return'?'}
async function command(text){dock('You said',`“${text}”`);const i=intent(text);
  if(i==='SCAN'){go('scan');setTab('up');say('Opening crop scan. Upload a leaf photo, or say open camera.')}
  else if(i==='CAM'){go('scan');say('Opening the camera. Say capture when the leaf is in view.');await startCam()}
  else if(i==='SNAP'){if(S.view==='scan'&&S.cam&&snap()){S.auto=true;dock('AgriVision','Photo captured. Analyzing…')}else{go('scan');say('Starting the camera. Say capture when the leaf is in view.');await startCam()}}
  else if(i==='STOPCAM'){stopCam();say('Camera stopped.')}
  else if(i==='UPLOAD'){go('scan');setTab('up');say('Choose a leaf photo to upload.')}
  else if(i==='RESULT')speakRes();
  else if(i==='TREAT')speakList('general_management','This plant looks healthy, so no treatment is needed.');
  else if(i==='PREVENT')speakList('prevention','Keep monitoring the plant regularly.');
  else if(i==='HOME'||i==='EXIT'){go('home');say(i==='EXIT'?'Goodbye! Take care of your crops.':'Going home.')}
  else if(i==='BACK'){back();say('Going back.')}
  else if(i==='HELP')say('You can say: check my crop, open camera, capture, what is the disease, how to treat it, go home, or go back.');
  else if(i==='HI')say('Hello! How can I help with your crops today?');
  else say('Sorry, I did not understand that. Say help to hear what I can do.')}

/* ---------- voice: speech in ---------- */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null;
function listen(){
  if(rec){rec.stop();return}
  if(!SR)return say('Voice commands need Chrome or Edge.');
  speechSynthesis.cancel();rec=new SR();rec.lang='en-IN';rec.interimResults=true;let fin='',err='';
  rec.onstart=()=>{$('mic').classList.add('on');pill('Listening…',true);dock('Listening…','Speak now',true)};
  rec.onresult=e=>{let t='';fin='';for(const r of e.results){t+=r[0].transcript;if(r.isFinal)fin+=r[0].transcript}dock('Listening…',t,true)};
  rec.onerror=e=>{err=e.error==='not-allowed'?'Microphone access is blocked. Allow it in your browser settings.':e.error==='network'?'Voice recognition needs an internet connection.':e.error==='audio-capture'?'No microphone was found.':''};
  rec.onend=()=>{rec=null;$('mic').classList.remove('on');pill('AI Assistant Ready');
    if(err)say(err);else if(fin.trim())command(fin.trim());else say("I didn't catch that. Tap the mic and try again.")};
  rec.start()}

/* ---------- wiring ---------- */
$('cardScan').onclick=()=>{go('scan');setTab('up')};$('cardVoice').onclick=listen;$('mic').onclick=listen;$('back').onclick=back;
$('clr').onclick=()=>{ls.set([]);renderRecent()};$('tUp').onclick=()=>setTab('up');$('tCam').onclick=startCam;$('stop').onclick=()=>{stopCam();setTab('up')};
$('snap').onclick=snap;$('file').onchange=e=>pick(e.target.files[0]);
const dz=$('drop');['dragover','dragenter'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.add('over')}));
['dragleave','drop'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.remove('over')}));dz.addEventListener('drop',e=>pick(e.dataTransfer.files[0]));
if('speechSynthesis' in window)speechSynthesis.onvoiceschanged=()=>{};
renderRecent();
