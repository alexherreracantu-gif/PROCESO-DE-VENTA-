/* BYD Grupo Tec · Conector Banorte v0.5.0
   Content script. Solo actúa en el simulador público BYD de Banorte cuando el cotizador
   lo abre con un fragmento #bydquote=… Nunca solicita ni aprueba créditos.

   Novedades v0.3.0 (aprendizajes validados en Banorte el 24-sep-2026):
   - Sin el candado fijo de 40%: la tasa del convenio depende del % de enganche
     (20–24.9 → 13.88 · 25–39.9 → 11.88 · 40–49.9 → 10.88 · 50+ → 8.88 ESP 2%, 7.88 "BYD 7.88%", 7.18 King 2027).
   - Convenio dinámico: el cotizador manda qué convenio usar (q.convenio) y la tasa esperada.
   - Eventos jQuery + espera a que Banorte termine sus AJAX (jQuery.active), porque la página
     resetea año/modelo/paquete de vida si se llena demasiado rápido.
   - Pase de revisión: vuelve a poner cualquier campo que Banorte haya borrado.
   - Códigos exactos de modelo (sin ambigüedad GL vs GL DM-i).
   - Reintenta el convenio si la tasa no coincide.
   - Regresa al cotizador TODOS los números oficiales (comisión, monto, pago a la firma,
     tabla de plazos con tasa y mensualidad, primas de seguros).
   - Escenarios: puede correr varios enganches/convenios seguidos y regresar la comparación.
   - v0.3.3: modo rápido; espera AJAX solo en campos dependientes y evita 20 s de espera del paquete de vida.
   - v0.3.7: elimina BASE_ACTIVE global; cada evento espera su propio ciclo AJAX,
   - v0.3.8: convenio tolerante a formato/espacios y selección verificada.
   - v0.3.9: nunca acepta silenciosamente 'Ninguno' si Banorte ofrece un convenio BYD;
     prioriza BYD ESP 2% y luego 1%. Detecta controles de 'cotizar/incluir seguro'
     por etiqueta/id/select/radio/checkbox y reintenta el seguro si el primer cálculo da $0.
   - v0.4.0: protege el mínimo de enganche de Banorte (10%).
   - v0.4.1: corrige KING cuando Banorte borra Enganche durante cargas AJAX tardías.
   - v0.4.2: estabiliza en conjunto Enganche + Paquete vida + Convenio. Banorte 2027 puede
     vaciar ESTRENE después de aplicar el convenio; ya no se calcula hasta que los tres
     permanezcan válidos simultáneamente.
   - v0.4.3: botón DETENER y límite de reintentos para evitar bucles.
   - v0.4.4: corrige falsos positivos de intervención manual. Solo pointerdown/keydown
     confiables del usuario detienen la automatización; input/change internos de Banorte se ignoran.
   - v0.5.0: regresa los resultados también al portal Park Point (park-point-two.vercel.app)
     y a localhost para pruebas. El resto del flujo es idéntico a v0.4.4.
*/
(()=>{'use strict';
const LEGACY_ORIGIN='https://cotizador-byd-grupo-tec.alexherreracantu.chatgpt.site';
// Portal Park Point (BYD Cumbres). Si cambia el dominio, agrégalo aquí y sube la versión.
const PORTALES=['https://park-point-two.vercel.app'];
const fragment=location.hash.match(/(?:^#|&)bydquote=([A-Za-z0-9_-]+)/);
if(!fragment)return;
let q;
try{const padded=fragment[1].replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(fragment[1].length/4)*4,'=');q=JSON.parse(decodeURIComponent(escape(atob(padded))))}catch{return}
if(!q||!q.requestId||!Number.isFinite(q.price)||!Number.isFinite(q.down))return;

// v0.3.1: permite regresar resultados al cotizador viejo o a un proyecto Lovable,
// pero nunca a un origen arbitrario. El cotizador nuevo debe mandar q.returnOrigin=location.origin.
function allowedReturnOrigin(value){
  try{
    const u=new URL(String(value||''));
    if(u.protocol==='http:'&&(u.hostname==='localhost'||u.hostname==='127.0.0.1'))return u.origin;
    if(u.protocol!=='https:')return null;
    if(u.origin===LEGACY_ORIGIN)return u.origin;
    if(PORTALES.includes(u.origin))return u.origin;
    if(u.hostname==='lovable.app'||u.hostname.endsWith('.lovable.app'))return u.origin;
    return null;
  }catch{return null}
}
const RETURN_ORIGIN=allowedReturnOrigin(q.returnOrigin)||allowedReturnOrigin(document.referrer)||LEGACY_ORIGIN;
try{history.replaceState(null,'',location.pathname+location.search)}catch{}

const P='datosFinanciamientoAutomotriz_';
const $=id=>document.getElementById(id);
class HaltError extends Error{constructor(message='Automatización detenida.'){super(message);this.name='HaltError'}}
let halted=false;
let haltReason='';
function assertRunning(){if(halted)throw new HaltError(haltReason||'Automatización detenida.')}
const delay=ms=>new Promise((resolve,reject)=>setTimeout(()=>halted?reject(new HaltError(haltReason||'Automatización detenida.')):resolve(),ms));
const TERMINAL=new Set(['verified','review','error']);
const normalize=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9%.]+/g,' ').trim();
const num=s=>{if(s==null||!String(s).trim())return null;const raw=String(s).replace(/[$\s]/g,'');if(!/^-?(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d+)?$/.test(raw)||!/[0-9]/.test(raw))return null;const n=Number(raw.replace(/,/g,''));return Number.isFinite(n)?n:null};
const floor2=v=>Math.floor(v*100+1e-6)/100;

/* ---------- UI: overlays huérfanos y aviso ---------- */
let releaseTimers=[];
function isVisible(el){if(!el||!el.isConnected)return false;const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;const r=el.getBoundingClientRect();return r.width>1&&r.height>1}
function hasVisibleDialog(){return['[role="dialog"]','.modal.open','.modal.active','.modal.show','.modal.in','.swal2-container.swal2-shown','.sweet-alert.show','.bootbox.modal.show'].some(sel=>[...document.querySelectorAll(sel)].some(isVisible))}
function releaseOrphanedUi(){
  if(hasVisibleDialog())return false;let removed=0;
  for(const sel of['.lean-overlay','.modal-overlay','.modal-backdrop','.sidenav-overlay','#sidenav-overlay','.ui-widget-overlay','.blockUI.blockOverlay','.blockOverlay'])
    for(const el of document.querySelectorAll(sel)){if(!isVisible(el))continue;const r=el.getBoundingClientRect();const big=r.width>=innerWidth*.75&&r.height>=innerHeight*.75;if(big||/lean-overlay|modal-overlay|modal-backdrop/.test(el.className)||el.id==='sidenav-overlay'){el.remove();removed++}}
  for(const n of[document.body,document.documentElement]){n?.classList.remove('modal-open','no-scroll','overflow-hidden');if(n&&/hidden|clip/.test(n.style.overflow))n.style.overflow=''}
  return removed>0;
}
function scheduleRelease(){releaseTimers.forEach(clearTimeout);releaseTimers=[120,700,1800].map(ms=>setTimeout(releaseOrphanedUi,ms))}
function report(state,message,more={}){
  try{window.opener?.postMessage({source:'BYD-GRUPO-TEC',version:'0.3.0',connectorVersion:'0.5.0',requestId:q.requestId,state,message,...more},RETURN_ORIGIN)}catch{}
  let box=$('byd-connector-state');
  if(!box){
    box=document.createElement('div');box.id='byd-connector-state';
    box.style.cssText='position:fixed;bottom:18px;right:18px;z-index:2147483647;background:#092f50;color:#fff;padding:14px 16px;border-radius:9px;max-width:390px;box-shadow:0 8px 30px #0004;font:14px/1.45 Arial,sans-serif;pointer-events:auto;user-select:text;white-space:pre-line';
    const msg=document.createElement('div');msg.id='byd-connector-message';box.append(msg);
    const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;margin-top:10px;align-items:center';
    const stop=document.createElement('button');stop.id='byd-connector-stop';stop.type='button';stop.textContent='DETENER';
    stop.style.cssText='border:0;border-radius:6px;padding:7px 12px;background:#fff;color:#092f50;font-weight:700;cursor:pointer';
    stop.addEventListener('pointerdown',e=>e.stopPropagation(),true);
    stop.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();stopAutomation('Automatización detenida por ti. Ya no modificaré ningún campo.');},true);
    controls.append(stop);box.append(controls);document.body.append(box);
  }
  const msg=$('byd-connector-message');if(msg)msg.textContent='BYD Grupo Tec · '+message;
  const stop=$('byd-connector-stop');if(stop){stop.disabled=halted||TERMINAL.has(state);stop.textContent=halted?'DETENIDO':TERMINAL.has(state)?'FINALIZADO':'DETENER';stop.style.opacity=stop.disabled?'.65':'1'}
  if(TERMINAL.has(state))scheduleRelease();
}
function stopAutomation(reason='Automatización detenida.'){
  if(halted)return;
  halted=true;haltReason=reason;
  releaseTimers.forEach(clearTimeout);releaseTimers=[];
  try{window.opener?.postMessage({source:'BYD-GRUPO-TEC',version:'0.3.0',connectorVersion:'0.5.0',requestId:q.requestId,state:'review',message:reason,manualStop:true},RETURN_ORIGIN)}catch{}
  let box=$('byd-connector-state');
  if(!box){
    box=document.createElement('div');box.id='byd-connector-state';box.style.cssText='position:fixed;bottom:18px;right:18px;z-index:2147483647;background:#092f50;color:#fff;padding:14px 16px;border-radius:9px;max-width:390px;box-shadow:0 8px 30px #0004;font:14px/1.45 Arial,sans-serif;pointer-events:auto;user-select:text;white-space:pre-line';document.body.append(box);
  }
  let msg=$('byd-connector-message');if(!msg){msg=document.createElement('div');msg.id='byd-connector-message';box.prepend(msg)}
  msg.textContent='BYD Grupo Tec · '+reason;
  const stop=$('byd-connector-stop');if(stop){stop.disabled=true;stop.textContent='DETENIDO';stop.style.opacity='.65'}
}
function manualInteraction(e){
  if(halted||!e.isTrusted)return;
  const target=e.target?.nodeType===1?e.target:null;if(!target)return;
  if(target.closest('#byd-connector-state'))return;
  if(!target.closest('input,select,textarea,button,label,[role="button"],[role="combobox"]'))return;
  stopAutomation('Intervención manual detectada. Automatización detenida; puedes editar Banorte libremente.');
}
// Solo señales inequívocas de interacción humana.
// NO escuchar input/change: Banorte y plugins UI los disparan durante cargas automáticas
// y en v0.4.3 podían producir falsos positivos aunque el usuario no tocara nada.
document.addEventListener('pointerdown',manualInteraction,true);
document.addEventListener('keydown',manualInteraction,true);

/* ---------- Eventos y espera a que Banorte termine ---------- */
// Banorte usa jQuery: sus handlers se disparan con jQuery(el).trigger(). Disparar además el
// evento nativo duplica peticiones AJAX y provoca que año/modelo/paquete de vida se reseteen.
const jq=()=>window.jQuery||window.wrappedJSObject?.jQuery;
function fire(el,types){const $j=jq();if($j){types.forEach(t=>$j(el).trigger(t))}else types.forEach(t=>el.dispatchEvent(new Event(t,{bubbles:true})))}
// Espera AJAX por ACCIÓN, no contra una línea base global tomada al arrancar.
// Esa línea base global era la causa principal de carreras: si Banorte tenía una petición
// temporal al iniciar, el conector podía avanzar antes de que terminara el AJAX nuevo; si
// Banorte mantenía una petición persistente, cada paso podía agotar el timeout.
function activeCount(){const $j=jq();const n=$j?.active;return Number.isFinite(n)?n:null}
async function idle(baseline=null,{timeout=4200,quiet=240}={}){
  assertRunning();
  await delay(100);
  const start=Date.now();let quietSince=0;
  while(Date.now()-start<timeout){
    assertRunning();
    const n=activeCount();
    if(n==null){await delay(quiet);return}
    const ready=baseline==null?true:n<=baseline;
    if(ready){if(!quietSince)quietSince=Date.now();if(Date.now()-quietSince>=quiet)return}
    else quietSince=0;
    await delay(80);
  }
  // No bloquear el flujo por una petición persistente ajena al campo actual. La validación
  // del valor/catálogo posterior decide si realmente quedó listo.
}
async function waitFor(fn,timeout=30000){assertRunning();const t0=Date.now();do{assertRunning();const r=fn();if(r)return r;await delay(160)}while(Date.now()-t0<timeout);throw Error('No apareció un campo requerido en Banorte. Revisa su pestaña.')}
async function setText(id,value,{settle=true}={}){assertRunning();const el=$(id);if(!el)throw Error('Falta el campo '+id+' en Banorte.');const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const before=activeCount();el.focus();Object.getOwnPropertyDescriptor(proto,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));fire(el,['keyup','change','blur']);if(settle)await idle(before);else await delay(25)}
// Selecciona por código exacto; si no hay código, por texto exacto; si no, por texto parcial único.
async function pick(id,{code,text,optional=false,fallbackSingle=false,timeout=20000,settle=true}={}){
  assertRunning();
  const el=await waitFor(()=>$(id),timeout);
  let match=null;
  try{match=await waitFor(()=>{
    const opts=validOptions(el);
    if(code!=null){const c=opts.find(o=>String(o.value)===String(code));if(c)return c}
    if(text!=null){
      const ex=opts.find(o=>normalize(o.textContent)===normalize(text));if(ex)return ex;
      const part=opts.filter(o=>normalize(o.textContent).includes(normalize(text)));
      if(part.length===1)return part[0];
      if(part.length>1)throw Error('Hay varias opciones para «'+text+'» en '+id+'. Manda el código exacto desde el cotizador.');
    }
    if(fallbackSingle&&opts.length===1)return opts[0];
    return null;
  },timeout)}catch(e){
    const opts=validOptions(el);
    if(fallbackSingle&&opts.length===1){match=opts[0]}
    else if(optional)return false;
    else throw e.message?.startsWith('Hay varias')?e:Error('No se encontró «'+(text??code)+'» en '+id+'.');
  }
  if(el.value!==match.value){const before=activeCount();el.value=match.value;fire(el,['change']);if(settle)await idle(before);else await delay(25)}
  return true;
}

/* ---------- Datos que manda el cotizador ---------- */
// Campos nuevos opcionales (compatibles con v0.2.x):
// q.subbrandCode, q.yearCode, q.bankModelCode  → códigos exactos de Banorte
// q.accessoriesDesc                             → texto para "Descripción accesorios"
// q.convenio  (ej. "BYD ESP 2%", "BYD 7.88%", "BYD KING DM-i 2027") y q.expected.rate
// q.plazo     (meses del plazo destacado, ej. 60)
// q.scenarios [{label, down, convenio, expected:{rate,monthly,principal,fee}}] para comparar
const convenio=q.convenio||'BYD ESP 2%';
const accDesc=q.accessoriesDesc||'Cargador Wallbox y accesorios';
const MIN_PCT=0.20; // referencia comercial para convenios; Banorte puede variar campañas.
const BANORTE_MIN_DOWN_PCT=0.10; // validación visible del simulador: enganche entre 10% y 100%.
const ceil2=v=>Math.ceil(v*100-1e-8)/100;
function minimumBanorteDown(base){return ceil2(Math.max(0,base)*BANORTE_MIN_DOWN_PCT)}

function baseFields(){
  return [
    [P+'marcaAutomovil',{text:'BYD',code:'416'}],
    [P+'submarca',{code:q.subbrandCode,text:q.subbrand}],
    [P+'year',{code:q.yearCode,text:String(q.year)}],
    [P+'modelo',{code:q.bankModelCode,text:q.bankModel}],
    [P+'categoriaAuto',{code:'366',text:'Automóviles residentes'}],
    [P+'usoAutomovil',{code:'1',text:'Particular'}],
    ['IdPaquete',{code:'5162',text:'BYD FINANCIAL BRONCE NUEVOS AUTOS 7/10'}],
    ['GeneroConductor',{text:q.gender==='Femenino'?'FEMENINO':'MASCULINO'}],
    [P+'edad',{text:String(q.age||40)}],
    [P+'tipoDeSeguroDeVida',{code:'4',text:'Anual Contado'}],
    // Banorte a veces cambia/retarda el catálogo del paquete de vida. Preferir ESTRENE (1979);
    // si solo existe una opción válida, usarla; si no, continuar y dejar que la validación final decida.
    [P+'paquete',{code:'1979',text:'ESTRENE',optional:true,fallbackSingle:true,timeout:1200,settle:true}],
    [P+'formaPagoSeguroExterno',{code:'2',text:'CONTADO'}],
    [P+'garantiaExtendida',{code:q.warranty?'1':'2',text:q.warranty?'Financiado':'No aplica'}],
    [P+'agencia',{code:'20847',text:'BYD Cumbres'}],
  ];
}
function moneyFields(down){return[[P+'valorFactura',q.price],[P+'montoAccesorio',q.accessories||0],[P+'enganche',down]].concat(q.warranty?[[P+'valorGarantia',q.warranty]]:[])}
const val=id=>{const e=$(id);const n=e?num(e.value):null;return n==null?NaN:n};
const moneyMatches=(id,v)=>Number.isFinite(val(id))&&Math.abs(val(id)-v)<=0.005;

// KING y algunos catálogos 2027 disparan AJAX tardío después de Paquete vida/garantía.
// Ese AJAX puede vaciar Enganche aunque ya haya sido capturado. No basta con escribirlo una vez:
// exigimos que el valor sobreviva un intervalo estable antes de continuar.
async function setEngancheOnce(down){
  const el=$(P+'enganche');
  if(!el)throw Error('Banorte no mostró el campo Enganche.');
  const value=Number(down).toFixed(2);
  const before=activeCount();
  el.focus();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);
  el.dispatchEvent(new Event('input',{bubbles:true}));
  fire(el,['keyup','change','blur']);
  await idle(before,{timeout:5200,quiet:320});
  await delay(180);
}
async function engancheStable(down,{stableMs=650,timeout=1800}={}){
  const start=Date.now();let okSince=0;
  while(Date.now()-start<timeout){
    if(moneyMatches(P+'enganche',down)){
      if(!okSince)okSince=Date.now();
      if(Date.now()-okSince>=stableMs)return true;
    }else okSince=0;
    await delay(90);
  }
  return false;
}
async function ensureEngancheStable(down,{attempts=2}={}){
  for(let i=1;i<=attempts;i++){
    assertRunning();
    if(await engancheStable(down,{stableMs:300,timeout:450}))return true;
    report('working','Fijando enganche en Banorte'+(i>1?' (reintento '+i+')':'')+'…');
    await setEngancheOnce(down);
    if(await engancheStable(down))return true;
  }
  const current=$(P+'enganche')?.value||'vacío';
  throw Error('Banorte volvió a borrar Enganche después de '+attempts+' intentos. Valor esperado: $'+Number(down).toLocaleString('es-MX',{minimumFractionDigits:2})+'; valor visible: '+current+'.');
}
function validOptions(el){return el?[...el.options].filter(o=>o.value!==''&&o.value!=='-1'&&!o.disabled&&!/^(?:primero selecciona|selecciona|seleccione|--)/i.test(o.textContent.trim())):[]}
function selectedIs(el,{code,text}={}){if(!el||!el.value||el.value==='-1')return false;const opt=el.selectedOptions?.[0];if(code!=null&&String(el.value)===String(code))return true;if(text!=null&&opt&&normalize(opt.textContent)===normalize(text))return true;return false}
async function retriggerFinancialPackage(){
  const el=$('IdPaquete');if(!el)return false;
  let opt=validOptions(el).find(o=>String(o.value)==='5162')||validOptions(el).find(o=>normalize(o.textContent)===normalize('BYD FINANCIAL BRONCE NUEVOS AUTOS 7/10'));
  if(!opt)return false;
  if(el.value!==opt.value)el.value=opt.value;
  // En Banorte, "Paquete vida" puede depender del evento de Paquete financiero.
  const before=activeCount();
  fire(el,['change']);
  await idle(before);
  return true;
}
async function ensureLifePackage({timeout=9000}={}){
  const id=P+'paquete';
  const lifeType=$(P+'tipoDeSeguroDeVida');
  const age=$(P+'edad');
  const gender=$('GeneroConductor');
  const t0=Date.now();let attempt=0;
  while(Date.now()-t0<timeout){
    attempt++;
    const el=$(id);
    const opts=validOptions(el);
    let opt=opts.find(o=>String(o.value)==='1979')||opts.find(o=>normalize(o.textContent)===normalize('ESTRENE'));
    if(!opt&&opts.length===1)opt=opts[0];
    if(opt){
      if(el.value!==opt.value){const before=activeCount();el.value=opt.value;fire(el,['change']);await idle(before)}
      return true;
    }
    // El catálogo de Paquete vida depende de varios campos y Banorte no siempre lo refresca
    // al mismo tiempo. Re-disparamos únicamente los prerrequisitos, sin tocar convenio.
    await retriggerFinancialPackage();
    if(gender){const before=activeCount();fire(gender,['change']);await idle(before,{timeout:1800,quiet:140})}
    if(age){const before=activeCount();fire(age,['change','blur']);await idle(before,{timeout:1800,quiet:140})}
    if(lifeType){const before=activeCount();fire(lifeType,['change']);await idle(before,{timeout:2800,quiet:180})}
    await delay(attempt===1?220:360);
  }
  return false;
}


/* ---------- Seguro de auto ---------- */
function controlText(el){
  if(!el)return '';
  const id=el.id||'';
  let label=null;
  try{label=id?document.querySelector(`label[for="${CSS.escape(id)}"]`):null}catch{}
  return [el.textContent,el.value,el.getAttribute?.('aria-label'),el.getAttribute?.('title'),label?.textContent].filter(Boolean).join(' ');
}
function clickOnce(el){
  if(!el)return false;
  const $j=jq();
  if($j)$j(el).trigger('click'); else el.click();
  return true;
}
async function setChoiceControl(el,{code='7',text='Howden'}={}){
  if(!el)return false;
  if(el.tagName==='SELECT'){
    const opts=validOptions(el);
    const target=opts.find(o=>String(o.value)===String(code)) || opts.find(o=>normalize(o.textContent).includes(normalize(text)));
    if(!target)return false;
    if(el.value!==target.value){const before=activeCount();el.value=target.value;fire(el,['change']);await idle(before)}
    return true;
  }
  if(el.matches?.('input[type="checkbox"],input[type="radio"]')){
    if(!el.checked){const before=activeCount();clickOnce(el);await idle(before)}
    return !!el.checked;
  }
  return false;
}
async function selectInsuranceProvider(){
  report('working','Seleccionando seguro Howden…');
  await pick(P+'aseguradora',{code:'7',text:'Howden',settle:true});
  // Algunas versiones de Banorte muestran un control adicional para decidir si se cotiza/incluye seguro.
  // No asumir que usa el mismo código 7 de la aseguradora; se resuelve por sus opciones/etiqueta.
  await ensureInsuranceOptIn();
}

function associatedText(el){
  if(!el)return '';
  const bits=[el.id,el.name,el.className,el.getAttribute?.('aria-label'),el.getAttribute?.('title')];
  if(el.id){
    try{bits.push(document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent)}catch{}
  }
  const wrap=el.closest?.('label,.input-field,.form-group,.row,.col');
  if(wrap)bits.push(wrap.innerText);
  return normalize(bits.filter(Boolean).join(' '));
}
function insuranceOptInCandidates(){
  const controls=[...document.querySelectorAll('select,input[type="checkbox"],input[type="radio"]')];
  return controls.map(el=>{
    const t=associatedText(el);
    if(!t.includes('SEGURO'))return null;
    if(t.includes('VIDA')||t.includes('MONTO')||t.includes('PRIMA')||t.includes('FORMA PAGO')||t.includes('ASEGURADORA'))return null;
    let score=0;
    if(t.includes('COTIZ'))score+=100;
    if(t.includes('INCLUIR')||t.includes('INCLUSION'))score+=80;
    if(t.includes('SEGURO EXTERNO'))score+=55;
    if(t.includes('SEGURO BANORTE'))score+=50;
    if((el.id||'').toLowerCase().includes('segurobanorte'))score+=90;
    return score?{el,t,score}:null;
  }).filter(Boolean).sort((a,b)=>b.score-a.score);
}
async function ensureInsuranceOptIn(){
  const candidates=insuranceOptInCandidates();
  for(const {el} of candidates){
    if(el.tagName==='SELECT'){
      const opts=validOptions(el);
      const yes=opts.find(o=>/^(SI|SÍ|YES)$/i.test(o.textContent.trim()))
        || opts.find(o=>/(COTIZ|INCLUIR|CON SEGURO|SEGURO)/i.test(o.textContent) && !/(NO|SIN SEGURO)/i.test(o.textContent))
        || opts.find(o=>String(o.value)==='1');
      if(yes){
        if(el.value!==yes.value){const before=activeCount();el.value=yes.value;fire(el,['change']);await idle(before,{timeout:5000,quiet:220})}
        return true;
      }
    }else if(el.type==='checkbox'){
      if(!el.checked){const before=activeCount();clickOnce(el);await idle(before,{timeout:5000,quiet:220})}
      if(el.checked)return true;
    }else if(el.type==='radio'){
      const group=el.name?[...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)]:[el];
      const yes=group.find(r=>{const t=associatedText(r);return /(^| )(SI|SÍ|YES|COTIZAR|INCLUIR)( |$)/i.test(t)&&!/ NO | SIN SEGURO /i.test(' '+t+' ')}) || group.find(r=>String(r.value)==='1');
      if(yes){if(!yes.checked){const before=activeCount();clickOnce(yes);await idle(before,{timeout:5000,quiet:220})}return !!yes.checked}
    }
  }
  return false;
}
function insurancePremium(){
  const ids=['montoSeguroDanios',P+'montoSeguroDanios','MontoSeguroDanios'];
  for(const id of ids){const el=$(id);const n=el?num(el.value||el.textContent):null;if(Number.isFinite(n)&&n>0)return n}
  const zones=[...document.querySelectorAll('[id*="seguro" i],[class*="seguro" i],[id*="cobertura" i],[class*="cobertura" i]')];
  for(const z of zones){
    const m=(z.innerText||'').match(/(?:Prima|Seguro(?:\s+de\s+daños)?)[^$\d]{0,30}\$?\s*([\d,]+\.\d{2})/i);
    const n=m?num(m[1]):null;if(Number.isFinite(n)&&n>0)return n;
  }
  return null;
}
function insuranceQuoteControls(){
  const all=[...document.querySelectorAll('button,a,input[type="button"],input[type="submit"],[role="button"]')];
  const scored=[];
  for(const el of all){
    if(!isVisible(el)||el.disabled)continue;
    const txt=normalize(controlText(el));
    const ident=normalize([el.id,el.name,el.className].filter(Boolean).join(' '));
    if(el.id==='calcularOfertas'||txt.includes('RECALCULAR'))continue;
    let score=0;
    if((txt.includes('COTIZAR')||txt.includes('COTIZA'))&&txt.includes('SEGURO'))score+=100;
    if(ident.includes('SEGURO')&&(ident.includes('COTIZ')||ident.includes('CALCUL')))score+=60;
    if(score)scored.push({el,score,txt,ident});
  }
  scored.sort((a,b)=>b.score-a.score);
  return scored;
}
function insuranceQuoteToggle(){
  for(const lab of document.querySelectorAll('label')){
    const txt=normalize(lab.textContent);
    if(!(txt.includes('COTIZ')&&txt.includes('SEGURO')))continue;
    const id=lab.getAttribute('for');
    const el=id?$(id):lab.querySelector('input');
    if(el?.matches?.('input[type="checkbox"],input[type="radio"]'))return el;
  }
  return null;
}
async function quoteInsuranceIfNeeded({required=false}={}){
  let premium=insurancePremium();
  if(Number.isFinite(premium)&&premium>0){report('working','Seguro ya cotizado: $'+premium.toLocaleString('es-MX',{minimumFractionDigits:2}));return premium}
  report('working','Activando y cotizando seguro en Banorte…');
  await ensureInsuranceOptIn();
  const toggle=insuranceQuoteToggle();
  if(toggle&&!toggle.checked){const before=activeCount();clickOnce(toggle);await idle(before,{timeout:5000,quiet:260})}
  const candidates=insuranceQuoteControls();
  if(candidates.length){
    const before=activeCount();
    clickOnce(candidates[0].el);
    await idle(before,{timeout:8000,quiet:300});
    premium=await waitFor(()=>insurancePremium(),12000).catch(()=>null);
  }else{
    premium=await waitFor(()=>insurancePremium(),5000).catch(()=>null);
  }
  if(Number.isFinite(premium)&&premium>0){
    report('working','Seguro cotizado: $'+premium.toLocaleString('es-MX',{minimumFractionDigits:2}));
    return premium;
  }
  if(required)throw Error('Banorte no devolvió la prima del seguro. Revisa la sección “Cotizar seguro”.');
  report('working','Seguro seleccionado; Banorte aún no mostró prima. Continuando al cálculo…');
  return null;
}

async function fillForm(down){
  releaseOrphanedUi();
  report('working','Cargando campos en Banorte…');
  if(!document.querySelector('form#formPreguntas')){
    const item=await waitFor(()=>document.querySelector('#subrubro-11'),15000);
    const before=activeCount();document.querySelector('.seleccionRubro[data-id="8"]')?.click();await delay(120);item.click();await idle(before);
  }
  await waitFor(()=>$(P+'tipoCliente'));
  report('working','Validando datos generales…');

  // Solo esperamos AJAX en campos que realmente cargan catálogos dependientes.
  await pick(P+'tipoCliente',{text:'Tradicional',code:'3',settle:false});
  await setText('CodigoPostal',q.zip,{settle:false});
  await waitFor(()=>$('CodigoPostal').classList.contains('valid'),10000).catch(()=>{throw Error('Banorte no validó el código postal '+q.zip+'.')});
  await pick(P+'tipoPersona',{code:'1',text:'(PF) Persona física',settle:false});
  await selectInsuranceProvider();

  // Cadena dependiente vehículo: aquí sí esperamos entre cada paso.
  report('working','Cargando vehículo en Banorte…');
  const vehicle=baseFields().slice(0,4);
  for(const [id,o] of vehicle)await pick(id,{...o,settle:true});
  // Categoría y uso no necesitan pausa AJAX completa.
  for(const [id,o] of baseFields().slice(4,6))await pick(id,{...o,settle:false});

  // Importes se pueden capturar en bloque; una sola estabilización al final.
  report('working','Capturando enganche e importes…');
  for(const [id,v] of moneyFields(down))await setText(id,v,{settle:false});
  if(q.accessories)await setText(P+'descripcionAccesorio',accDesc,{settle:false});

  // v0.3.6: orden estable para los campos que alimentan "Paquete vida".
  // Primero Paquete financiero + datos de conductor + Condiciones de vida; después
  // re-disparamos Paquete financiero para que Banorte cargue el catálogo dependiente.
  report('working','Cargando paquete y seguro de vida…');
  await pick('IdPaquete',{code:'5162',text:'BYD FINANCIAL BRONCE NUEVOS AUTOS 7/10',settle:true});
  await pick('GeneroConductor',{text:q.gender==='Femenino'?'FEMENINO':'MASCULINO',settle:false});
  await pick(P+'edad',{text:String(q.age||40),settle:false});
  await pick(P+'tipoDeSeguroDeVida',{code:'4',text:'Anual Contado',settle:true});
  await retriggerFinancialPackage();
  await ensureLifePackage({timeout:5000});
  await pick(P+'formaPagoSeguroExterno',{code:'2',text:'CONTADO',settle:false});
  await pick(P+'garantiaExtendida',{code:q.warranty?'1':'2',text:q.warranty?'Financiado':'No aplica',settle:true});
  await pick(P+'agencia',{code:'20847',text:'BYD Cumbres',settle:false});
  await pick('GeneraCotMultiplazo',{text:'Si',optional:true,timeout:1500,settle:false});
  await idle();
  report('working','Revisando que Banorte no haya borrado campos…');
  await verifyAndFix(down);
  // Cotizar seguro antes del convenio. Si Banorte resetea algo al cotizarlo,
  // lo reparamos y después dejamos el convenio como ÚLTIMO cambio del formulario.
  await quoteInsuranceIfNeeded({required:false});
  report('working','Revisando campos después del seguro…');
  await verifyAndFix(down);
}
// Banorte a veces borra año/modelo/paquete/paquete de vida/enganche con respuestas AJAX tardías.
// Último pase fuerte: vuelve a disparar seguro de vida, recupera ESTRENE y reescribe importes
// DESPUÉS de que todos los catálogos terminaron. Esto evita el caso visual de Enganche y Paquete vida vacíos.
async function forceCriticalFields(down){
  await idle();

  // 1) Reafirmar condiciones de vida para forzar que Banorte vuelva a cargar el catálogo dependiente.
  const lifeType=$(P+'tipoDeSeguroDeVida');
  if(lifeType){
    const desired=[...lifeType.options].find(o=>String(o.value)==='4') || [...lifeType.options].find(o=>normalize(o.textContent)===normalize('Anual Contado'));
    if(desired){
      const before=activeCount();
      lifeType.value=desired.value;
      fire(lifeType,['change']);
      await idle(before);
    }
  }

  // 2) Paquete vida: Banorte 27-sep-2026 puede dejarlo en
  // "Primero selecciona un paquete" aunque IdPaquete se vea seleccionado.
  // Re-disparar IdPaquete después del tipo de vida hace que cargue el catálogo correcto.
  await ensureLifePackage({timeout:5000});

  // 3) Reaplicar importes al FINAL. Cambios de vida/garantía de Banorte pueden borrar el enganche.
  await setText(P+'valorFactura',q.price,{settle:false});
  await setText(P+'montoAccesorio',q.accessories||0,{settle:false});
  if(q.warranty){
    const gw=$(P+'garantiaExtendida');
    if(gw && gw.value!=='1')await pick(P+'garantiaExtendida',{code:'1',text:'Financiado',settle:true});
    await setText(P+'valorGarantia',q.warranty,{settle:false});
  }
  if(q.accessories)await setText(P+'descripcionAccesorio',accDesc,{settle:false});
  await idle();

  // 4) Enganche es el último importe crítico. En KING debe sobrevivir las cargas tardías.
  await ensureEngancheStable(down);
}

async function verifyAndFix(down){
  await forceCriticalFields(down);
  for(let pass=0;pass<3;pass++){
    let fixed=0;
    for(const [id,o] of baseFields()){const el=$(id);if(!el)continue;const want=o.code!=null?String(o.code):null;
      if(!selectedIs(el,o)){const changed=await pick(id,o);if(changed)fixed++}}
    for(const [id,v] of moneyFields(down))if(!moneyMatches(id,v)){fixed++;await setText(id,v)}
    if(q.accessories&&!$(P+'descripcionAccesorio')?.value){fixed++;await setText(P+'descripcionAccesorio',accDesc)}
    if(!fixed)break;
  }
  // Pase final justo antes de validar: Enganche debe permanecer estable, no solo existir un instante.
  await ensureEngancheStable(down);
  const lifePkg=$(P+'paquete');
  if(lifePkg && (!lifePkg.value||lifePkg.value==='-1'))await ensureLifePackage({timeout:2500});
  if(lifePkg && (!lifePkg.value||lifePkg.value==='-1') && /primero selecciona/i.test(lifePkg.selectedOptions?.[0]?.textContent||lifePkg.textContent||'')){
    throw Error('Banorte no cargó Paquete vida. El conector reintentó Paquete financiero y Condiciones de vida; vuelve a ejecutar la cotización si Banorte estaba lento.');
  }
  const required=[...document.querySelectorAll('#formPreguntas input.required,#formPreguntas select.required')].filter(el=>!el.disabled&&!el.closest('.hidden')&&(!el.value||el.value==='-1'));
  if(required.length)throw Error('Banorte requiere completar: '+required.map(el=>document.querySelector(`label[for="${el.id}"]`)?.textContent.trim()||el.id).join(', ')+'.');
  const errors=[...document.querySelectorAll('#formPreguntas .input-error')].filter(el=>el.offsetParent!==null&&el.textContent.trim());
  if(errors.length)throw Error('Banorte marcó datos por revisar: '+errors.map(el=>el.textContent.trim()).join('; ')+'.');
}

/* ---------- Convenio (SIEMPRE al final) ---------- */
function canonConvenio(s){
  return normalize(s).replace(/\s+%/g,'%').replace(/^CONVENIO\s*:?\s*/,'').replace(/\s+/g,' ').trim();
}
function convenioSelect(){
  const known=$('tasaComisionEspecialSelect');if(known?.tagName==='SELECT')return known;
  const candidates=[...document.querySelectorAll('select')].filter(el=>{
    const ident=normalize([el.id,el.name,el.getAttribute('aria-label')].filter(Boolean).join(' '));
    const opts=[...el.options].map(o=>canonConvenio(o.textContent));
    return ident.includes('CONVENIO')||ident.includes('COMISION ESPECIAL')||opts.some(t=>t.includes('BYD')&&(/%/.test(t)||t.includes('ESP')));
  });
  return candidates.length===1?candidates[0]:null;
}
function convenioOption(name,expectedRate=null){
  const el=convenioSelect();if(!el)return null;
  const target=canonConvenio(name);
  const opts=validOptions(el);
  const scored=opts.map(o=>{
    const t=canonConvenio(o.textContent);let score=0;
    if(t===target)score=1000;
    else if(t.startsWith(target+' '))score=900;
    else if(t.includes(target))score=800;
    else{
      const words=target.split(' ').filter(Boolean);
      const tokens=t.split(' ');
      if(words.every(w=>tokens.includes(w)))score=700;
    }
    if(expectedRate!=null){
      const rate=String(expectedRate).replace('.','\\.');
      if(new RegExp('(^|[^0-9])'+rate+'\\s*%').test(t))score+=15;
    }
    return {o,t,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  if(!scored.length)return null;
  if(scored.length>1&&scored[0].score===scored[1].score)throw Error('Banorte ofrece varias opciones parecidas a «'+name+'»: '+scored.slice(0,4).map(x=>x.o.textContent.trim()).join(' | '));
  return scored[0].o;
}
function preferredConvenioOption(el){
  if(!el)return null;
  const opts=validOptions(el).map(o=>({o,t:canonConvenio(o.textContent)}));
  const exact2=opts.find(x=>x.t.includes('BYD ESP 2%')) || opts.find(x=>x.t.includes('BYD')&&/(^| )2%( |$)/.test(x.t));
  if(exact2)return exact2.o;
  const one=opts.find(x=>x.t.includes('BYD')&&/(^| )1%( |$)/.test(x.t));
  if(one)return one.o;
  return null;
}
async function setConvenio(name,expectedRate=null){
  let requested=name;
  const auto=!requested||/^ninguno$/i.test(String(requested).trim());
  const firstEl=await waitFor(()=>convenioSelect(),8000).catch(()=>null);
  if(auto){
    const pref=preferredConvenioOption(firstEl);
    if(pref){requested=pref.textContent.trim();report('working','El cotizador mandó “Ninguno”; Banorte sí ofrece convenio. Usando '+requested+'…')}
    else {report('working','Banorte no ofrece convenio BYD con estos datos; se mantiene Ninguno.');return true}
  }
  report('working','Seleccionando convenio '+requested+'…');
  for(let k=0;k<2;k++){
    const el=firstEl||await waitFor(()=>convenioSelect(),8000).catch(()=>null);
    const opt=el?convenioOption(requested,expectedRate):null;
    if(!el||!opt){
      const list=[...(el?.options||[])].map(o=>o.textContent.trim()).filter(Boolean).join(' | ');
      throw Error('Con estos datos Banorte no ofrece «'+requested+'». Opciones visibles: '+(list||'ninguna'));
    }
    const before=activeCount();
    if(el.value!==opt.value){el.value=opt.value;fire(el,['change'])}
    await idle(before,{timeout:5000,quiet:280});
    await delay(160);
    const current=el.selectedOptions?.[0];
    if(current&&canonConvenio(current.textContent).includes(canonConvenio(requested))){
      report('working','Convenio confirmado: '+current.textContent.trim());
      return true;
    }
  }
  throw Error('Banorte no conservó el convenio «'+requested+'» después de seleccionarlo.');
}

// KING 2027 puede mantener Enganche + Convenio pero vaciar Paquete vida (ESTRENE)
// justo después del último AJAX. Por eso el estado final se considera válido únicamente
// cuando los TRES sobreviven simultáneamente. El convenio sigue siendo el último selector.
function lifePackageOk(){
  const el=$(P+'paquete');
  if(!el||!el.value||el.value==='-1')return false;
  const opt=el.selectedOptions?.[0];
  if(!opt)return false;
  const t=normalize(opt.textContent);
  return String(el.value)==='1979'||t===normalize('ESTRENE')||(!/PRIMERO SELECCIONA|SELECCIONA|SELECCIONE/.test(t)&&validOptions(el).some(o=>o.value===el.value));
}
async function ensureLifePackageStable({attempts=2}={}){
  for(let i=1;i<=attempts;i++){
    assertRunning();
    if(lifePackageOk()){
      await delay(260);
      if(lifePackageOk())return true;
    }
    report('working','Recuperando Paquete vida ESTRENE'+(i>1?' (reintento '+i+')':'')+'…');
    await pick(P+'tipoDeSeguroDeVida',{code:'4',text:'Anual Contado',settle:true});
    await retriggerFinancialPackage();
    await ensureLifePackage({timeout:4200});
    await delay(300);
    if(lifePackageOk())return true;
  }
  return false;
}
function convenioOkFor(name){
  const sel=convenioSelect();
  const convText=canonConvenio(sel?.selectedOptions?.[0]?.textContent||'');
  const requested=String(name||'').trim();
  if(/^ninguno$/i.test(requested))return !preferredConvenioOption(sel)||!/^NINGUNO$/i.test(convText);
  return convText.includes(canonConvenio(requested));
}
async function stabilizeEngancheAndConvenio(down,name,expectedRate=null){
  for(let pass=1;pass<=2;pass++){
    assertRunning();
    // 1) Vida puede borrar enganche; por eso primero dejamos ESTRENE listo.
    if(!await ensureLifePackageStable({attempts:2}))
      throw Error('Banorte no logró conservar Paquete vida ESTRENE.');

    // 2) Reponer Enganche después de cualquier AJAX de vida.
    await ensureEngancheStable(down);

    // 3) Convenio es el último selector del formulario.
    await setConvenio(name,expectedRate);
    await delay(520);

    // 4) Comprobar los tres A LA VEZ.
    const engOk=await engancheStable(down,{stableMs:300,timeout:650});
    const lifeOk=lifePackageOk();
    const convOk=convenioOkFor(name);
    if(engOk&&lifeOk&&convOk){
      await delay(350);
      if(moneyMatches(P+'enganche',down)&&lifePackageOk()&&convenioOkFor(name)){
        report('working','Enganche, Paquete vida y Convenio confirmados.');
        return true;
      }
    }

    const moved=[];
    if(!engOk)moved.push('Enganche');
    if(!lifeOk)moved.push('Paquete vida');
    if(!convOk)moved.push('Convenio');
    report('working','Banorte movió '+(moved.join(' + ')||'un campo crítico')+'. Estabilizando de nuevo…');
  }
  throw Error('Banorte no logró conservar Enganche, Paquete vida y Convenio al mismo tiempo. Se detuvo antes de calcular para evitar una cotización incorrecta.');
}

/* ---------- Calcular y leer la propuesta oficial ---------- */
function readOfficial(){
  const box=$('propuestasList');const all=document.body.innerText;const t=(box&&box.innerText)||all;
  const money=re=>{const m=[...all.matchAll(re)];return m.length?num(m[m.length-1][1]):null};
  const rows=[...t.matchAll(/(?:^|\n)\s*(\d{2})\s*[\t\n ]+([\d.]+)\s*%[\t\n ]+\$\s*([\d,]+\.\d{2})/g)].map(m=>({plazo:+m[1],rate:+m[2],monthly:num(m[3])}));
  const premium=id=>{const v=$(id)?.value;return v?num(v):null};
  return{
    fee:money(/Comisi[oó]n contrataci[oó]n cr[eé]dito[\t\n ]+\$\s*([\d,]+\.\d{2})/g),
    principal:money(/Monto a financiar[\t\n ]+\$\s*([\d,]+\.\d{2})/g),
    signing:money(/Pago a la firma de contrato[\t\n ]+\$\s*([\d,]+\.\d{2})/g),
    down:money(/Enganche[\t\n ]+\$\s*([\d,]+\.\d{2})/g),
    rows,insurance:insurancePremium()??premium('montoSeguroDanios'),life:premium('montoSeguroVida'),
    convenioText:convenioSelect()?.selectedOptions?.[0]?.textContent?.trim()||null
  };
}
async function calculate(expected){
  assertRunning();
  const snapshot=()=>($('propuestasList')?.innerText||'').slice(0,600);
  let off=null;
  for(let intento=1;intento<=2;intento++){
    assertRunning();
    const btn=$('calcularOfertas');
    if(!btn||btn.disabled)throw Error('Banorte no habilitó el botón de cálculo.');
    // Preflight final: nunca hacer click si Banorte volvió a vaciar Paquete vida.
    if(!lifePackageOk())throw Error('Paquete vida se vació justo antes de calcular. El conector se detuvo para no generar una cotización incompleta.');
    const currentDown=val(P+'enganche');
    if(!Number.isFinite(currentDown)||currentDown<=0)throw Error('Enganche se vació justo antes de calcular.');
    // Observe only the result area. A previous proposal must never count as a new response.
    let fresh=false;
    const observer=new MutationObserver(records=>{
      if(records.some(r=>{
        const target=r.target.nodeType===1?r.target:r.target.parentElement;
        return target?.closest?.('#propuestasList') ||
          [...r.addedNodes].some(n=>n.nodeType===1&&(n.id==='propuestasList'||n.querySelector?.('#propuestasList')));
      }))fresh=true;
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style']});
    try{
      report('working','Banorte está calculando la propuesta…');
      btn.click();
      await waitFor(()=>{
        const el=$('propuestasList');
        return fresh&&el&&!el.classList.contains('hidden')&&readOfficial().rows.length>0;
      },20000).catch(()=>{throw Error('Banorte no devolvió una cotización nueva. No se usó el resultado anterior. Revisa los campos y vuelve a calcular.');});
      await idle();
      off=readOfficial();
      if(!off.rows.length)throw Error('La respuesta de Banorte no contiene plazos y mensualidades legibles.');
    }finally{observer.disconnect()}

    // Si Banorte calculó pero dejó seguro externo/vida en cero, no darlo por bueno.
    // Activar el control de seguro, intentar cotizar y volver a colocar el convenio antes del siguiente cálculo.
    const insuranceZero=!(Number.isFinite(off.insurance)&&off.insurance>0);
    const lifeZero=!(Number.isFinite(off.life)&&off.life>0);
    if((insuranceZero||lifeZero)&&intento<2){
      report('working','Banorte dejó seguros en $0. Activando seguro y recalculando…');
      await ensureInsuranceOptIn();
      await quoteInsuranceIfNeeded({required:false});
      const currentDown=Number.isFinite(val(P+'enganche'))?val(P+'enganche'):Math.max(Number(q.down)||0,minimumBanorteDown((q.price||0)+(q.accessories||0)));
      await verifyAndFix(currentDown);
      await stabilizeEngancheAndConvenio(currentDown,expected?.convenio||convenio,expected?.rate);
      continue;
    }
    const got=(q.plazo?off.rows.find(r=>r.plazo===Number(q.plazo)):off.rows[0])?.rate;
    if(!expected?.rate||got==null||Math.abs(got-expected.rate)<0.001)break;
    report('working','La tasa salió '+got+'% y se esperaba '+expected.rate+'%. Reintentando convenio ('+intento+')…');
    await setConvenio(expected.convenio||convenio,expected?.rate);
  }
  return off;
}
function compare(off,exp,plazo){
  const row=(plazo?off.rows.find(r=>r.plazo===plazo):off.rows[off.rows.length-1])||{};
  const close=(a,b)=>a!=null&&b!=null&&Math.abs(a-b)<=0.02;
  const checks={
    fee:exp?.fee==null?null:close(off.fee,exp.fee),
    principal:exp?.principal==null?null:close(off.principal,exp.principal),
    rate:exp?.rate==null?null:row.rate!=null&&Math.abs(row.rate-exp.rate)<0.001,
    monthly:exp?.monthly==null?null:close(row.monthly,exp.monthly)
  };
  return{row,checks,ok:Number.isFinite(row.monthly)&&Number.isFinite(row.rate)&&Number.isFinite(row.plazo)&&[off.fee,off.principal,off.signing,off.down].every(Number.isFinite)&&Object.values(checks).every(v=>v!==false)&&Object.values(checks).some(v=>v===true)};
}

/* ---------- Flujo principal ---------- */
async function run(){
  await delay(650);
  assertRunning();
  const base=(q.price||0)+(q.accessories||0);
  const minDown=minimumBanorteDown(base);
  const scenarios=(Array.isArray(q.scenarios)&&q.scenarios.length?q.scenarios:[{label:'Principal',down:q.down,convenio,expected:{...q.expected,rate:q.expected?.rate}}]);
  const plazo=Number(q.plazo)||null;
  const results=[];
  let formReady=false;
  for(let i=0;i<scenarios.length;i++){
    assertRunning();
    const s=scenarios[i];
    const requestedDown=Number(s.down);
    if(!Number.isFinite(requestedDown))throw Error('El cotizador no envió un enganche numérico válido.');
    const requestedPct=base>0?requestedDown/base:0;
    const belowBanorteMin=requestedDown+0.005<minDown;
    const appliedDown=belowBanorteMin?minDown:requestedDown;
    const pct=base>0?appliedDown/base:0;
    const tag=scenarios.length>1?' ['+(i+1)+'/'+scenarios.length+' '+(s.label||'')+']':'';

    if(belowBanorteMin){
      report('working','El enganche calculado $'+requestedDown.toLocaleString('es-MX',{minimumFractionDigits:2})+
        ' ('+(requestedPct*100).toFixed(2)+'%) queda debajo del mínimo de Banorte. '+
        'Usando temporalmente el mínimo 10%: $'+minDown.toLocaleString('es-MX',{minimumFractionDigits:2})+
        ' para cargar Paquete vida y seguros…'+tag);
    }

    // No impedir campañas que Banorte sí muestre por debajo de 20%; el desplegable real manda.
    if(!formReady){await fillForm(appliedDown);formReady=true}
    else{await setText(P+'enganche',appliedDown);await verifyAndFix(appliedDown)}

    report('working','Convenio '+(s.convenio||convenio)+' al final y calculando…'+tag);
    await stabilizeEngancheAndConvenio(appliedDown,s.convenio||convenio,belowBanorteMin?null:s.expected?.rate);
    const expectedForCalc=belowBanorteMin?{convenio:s.convenio||convenio}:{...s.expected,convenio:s.convenio||convenio};
    const off=await calculate(expectedForCalc);
    if(/^ninguno$/i.test(canonConvenio(off.convenioText||''))){
      const sel=convenioSelect();
      if(preferredConvenioOption(sel))throw Error('Banorte terminó en “Ninguno” aunque existe un convenio BYD disponible. Se detuvo para no entregar una cotización con 2.5% por error.');
    }

    let cmp;
    if(belowBanorteMin){
      const selected=(plazo?off.rows.find(r=>r.plazo===plazo):off.rows[off.rows.length-1])||{};
      cmp={row:selected,checks:{fee:null,principal:null,rate:null,monthly:null,down:Number.isFinite(off.down)&&Math.abs(off.down-appliedDown)<=0.02},ok:false};
    }else{
      cmp=compare(off,s.expected,plazo);
      cmp.checks.down=Number.isFinite(off.down)&&Math.abs(off.down-appliedDown)<=0.02;
      cmp.ok=cmp.ok&&cmp.checks.down;
    }
    results.push({
      label:s.label||null,
      down:appliedDown,
      requestedDown,
      appliedDown,
      minimumDown:minDown,
      belowBanorteMin,
      downPct:+(pct*100).toFixed(2),
      requestedDownPct:+(requestedPct*100).toFixed(2),
      convenio:s.convenio||convenio,
      official:off,
      selected:cmp.row,
      checks:cmp.checks,
      ok:cmp.ok
    });
  }
  const main=results[0];
  const hasMinimumAdjustment=results.some(r=>r.belowBanorteMin);
  const lines=results.map(r=>{
    const prefix=r.belowBanorteMin?'⚠ ':r.ok?'✔ ':'✖ ';
    const extra=r.belowBanorteMin?' · mínimo Banorte $'+r.minimumDown.toLocaleString('es-MX',{minimumFractionDigits:2}):'';
    return prefix+(r.label?r.label+': ':'')+(r.selected.rate??'—')+'% · $'+(r.selected.monthly??0).toLocaleString('es-MX',{minimumFractionDigits:2})+' × '+(r.selected.plazo??'—')+' m'+extra;
  }).join('\n');
  const state=hasMinimumAdjustment?'review':results.every(r=>r.ok)?'verified':'review';
  const insuranceLine=Number.isFinite(main.official.insurance)?'\nSeguro auto: $'+main.official.insurance.toLocaleString('es-MX',{minimumFractionDigits:2}):'';
  const minimumLine=main.belowBanorteMin?'\nEl enganche que pidió el cotizador era $'+main.requestedDown.toLocaleString('es-MX',{minimumFractionDigits:2})+
    ', pero Banorte exige al menos 10% ($'+main.minimumDown.toLocaleString('es-MX',{minimumFractionDigits:2})+'). Se cotizó con el mínimo válido para no bloquear KING/Paquete vida.':'';
  report(state,(state==='verified'?'Banorte coincide con el cotizador.':hasMinimumAdjustment?'Banorte calculó con su enganche mínimo; el presupuesto original queda por debajo del mínimo permitido.':'Banorte calculó, pero algo no coincide. Revisa.')+'\n'+lines+insuranceLine+minimumLine,{
    monthly:main.selected.monthly,principal:main.official.principal,fee:main.official.fee,insurance:main.official.insurance,life:main.official.life,
    official:main.official,results,
    requestedDown:main.requestedDown,
    appliedDown:main.appliedDown,
    minimumDown:main.minimumDown,
    belowBanorteMin:main.belowBanorteMin
  });
}
run().catch(e=>{if(e instanceof HaltError)return;report('error',e.message||'No se pudo completar la cotización de Banorte.');});
})();
