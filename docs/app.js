const STORAGE_KEY = 'sophie_wonderland_v1';
const PASSWORD = '20090225'; // Note: static-site passwords are deterrents, not true security.

const demoData = {
  hubPrompt: 'Which would you like to explore first?',
  depthStep: 50,
  finalTitle: 'Bye, for now.',
  finalQuote: `Some things are worth preserving. Others are worth rebuilding.\nAnd some questions are worth carrying with us, even before we know their answers.\n\nThanks for wandering down a few weird holes with me.`,
  sections: [
    {id:'snake',icon:'🐍',label:'The Snake Hole',subtitle:'A literal wrong turn',title:'I followed a snake hole. It led somewhere.',bg:'',opacity:.35,overlay:.70,blocks:[
      {type:'text',text:'This room is a placeholder for your snake-hole tomb discovery, GIS prediction model, maps, field photos, and the question that came after finding something hidden: what should we do once we know where it is?'},
      {type:'quote',text:'Sometimes curiosity begins as a very bad navigation decision.'}
    ]},
    {id:'skull',icon:'💀',label:'The Boiled Skull',subtitle:'Heat, bones & uncertainty',title:'What happens when evidence itself gets cooked?',bg:'',opacity:.35,overlay:.72,blocks:[
      {type:'text',text:'Add your pig-skull experiment here: the problem, the controlled boiling process, the quantitative age markers, photos, plots, and what the experiment changed about an archaeological age estimate.'},
      {type:'quote',text:'Evidence does not always arrive intact. Sometimes the first problem is learning how it changed.'}
    ]},
    {id:'pigsty',icon:'🐷',label:'The Pigsty Museum',subtitle:'Architecture got a second life',title:'An abandoned pigsty had terrible museum potential. So naturally...',bg:'',opacity:.35,overlay:.68,blocks:[
      {type:'text',text:'Use before / during / after images here. Show the underground pigsty, tomb-engineering ideas you borrowed, the renovation, and the interactive museum you built with villagers.'}
    ]},
    {id:'opera',icon:'🎭',label:'Patch History',subtitle:'Fu Hao v2.0',title:'Patch notes for a 3,000-year-old story.',bg:'',opacity:.35,overlay:.70,blocks:[
      {type:'text',text:'Show rehearsal photos, archaeological references, costume details, and the changes you helped make to the Fu Hao production—especially where historical evidence made the characters more human, complicated, and real.'}
    ]},
    {id:'life',icon:'🪩',label:'Evidence I Have Friends',subtitle:'Non-academic findings',title:'Field notes from being a person.',bg:'',opacity:.30,overlay:.62,blocks:[
      {type:'text',text:'Put the gloriously non-strategic photos here: friends, food, travel, backstage chaos, bad selfies, tiny obsessions, and moments you kept simply because they mattered.'},
      {type:'quote',text:'Not everything meaningful needs to become a project.'}
    ]}
  ]
};

let data = loadData();
let visited = new Set();
let currentSectionId = null;
let editingSectionId = null;

const $ = id => document.getElementById(id);
const screens = [...document.querySelectorAll('.screen')];
function show(id){ screens.forEach(s=>s.classList.toggle('active',s.id===id)); window.scrollTo(0,0); }
function clone(x){return JSON.parse(JSON.stringify(x));}
function loadData(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)) || clone(demoData)}catch{return clone(demoData)} }
function saveData(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); renderHub(); renderFinal(); renderAdminSections(); }
function esc(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}

function enterHole(){
  $('holeBtn').classList.add('drop-animation');
  setTimeout(()=>{ $('holeBtn').classList.remove('drop-animation'); show('hub'); renderHub(); },850);
}
$('enterBtn').onclick=enterHole; $('holeBtn').onclick=enterHole;

function renderHub(){
  $('hubPrompt').textContent = visited.size ? 'Which would you like to explore next?' : data.hubPrompt;
  const grid=$('sectionGrid'); grid.innerHTML='';
  data.sections.forEach(sec=>{
    const b=document.createElement('button'); b.className='room-card'+(visited.has(sec.id)?' visited':'');
    b.innerHTML=`<span class="icon">${esc(sec.icon)}</span><div><h3>${esc(sec.label)}</h3><p>${esc(sec.subtitle||'')}</p></div>`;
    b.onclick=()=>openSection(sec.id); grid.appendChild(b);
  });
}

function blockHTML(b){
  if(b.type==='text') return `<div class="content-block block-text">${esc(b.text||'').replace(/\n/g,'<br>')}</div>`;
  if(b.type==='quote') return `<blockquote class="content-block block-quote">${esc(b.text||'').replace(/\n/g,'<br>')}</blockquote>`;
  if(b.type==='image') return `<figure class="content-block block-image"><img src="${esc(b.url||'')}" alt="${esc(b.alt||'Photo')}" /><figcaption class="block-caption">${esc(b.caption||'')}</figcaption></figure>`;
  if(b.type==='gallery'){
    const imgs=(b.images||[]).filter(Boolean).map(u=>`<img src="${esc(u)}" alt="Gallery image">`).join('');
    return `<div class="content-block gallery cols-${Math.min(3,Math.max(2,Number(b.columns)||2))}">${imgs}</div>`;
  }
  return '';
}
function openSection(id){
  const sec=data.sections.find(s=>s.id===id); if(!sec)return;
  currentSectionId=id;
  $('exploreBg').style.backgroundImage=sec.bg?`url("${sec.bg.replace(/"/g,'\\"')}")`:'radial-gradient(circle at 70% 10%, #24241f, #050505 62%)';
  $('exploreBg').style.opacity=sec.opacity ?? .35;
  $('explore').querySelector('.explore-overlay').style.opacity=sec.overlay ?? .7;
  $('exploreContent').innerHTML=`<p class="eyebrow">${esc(sec.icon)} ${esc(sec.label)}</p><h2 class="room-title">${esc(sec.title)}</h2>${(sec.blocks||[]).map(blockHTML).join('')}`;
  show('explore');
}
$('backToHub').onclick=()=>show('hub');
$('nextBtn').onclick=()=>{
  if(currentSectionId) visited.add(currentSectionId);
  renderDepth(); show('depth');
};
function renderDepth(){
  $('depthValue').textContent=visited.size * (Number(data.depthStep)||50);
  const remaining=data.sections.filter(s=>!visited.has(s.id));
  const box=$('depthChoices'); box.innerHTML='';
  if(remaining.length===0){
    const b=document.createElement('button'); b.className='depth-choice';
    b.innerHTML=`<span>🕳️</span><strong>finally</strong><small>one last fall</small>`;
    b.onclick=()=>show('final'); box.appendChild(b); return;
  }
  remaining.forEach(sec=>{const b=document.createElement('button'); b.className='depth-choice'; b.innerHTML=`<span>${esc(sec.icon)}</span><strong>${esc(sec.label)}</strong><small>${esc(sec.subtitle||'')}</small>`;b.onclick=()=>openSection(sec.id);box.appendChild(b)});
}
function renderFinal(){ $('finalTitle').textContent=data.finalTitle; $('finalQuote').textContent=data.finalQuote; }
$('restartBtn').onclick=()=>{visited.clear();currentSectionId=null;renderHub();show('landing')};

$('settingsBtn').onclick=()=>{ $('passwordInput').value=''; $('passwordError').textContent=''; $('passwordDialog').showModal(); setTimeout(()=>$('passwordInput').focus(),100)};
$('passwordForm').onsubmit=e=>{
  e.preventDefault();
  if($('passwordInput').value===PASSWORD){$('passwordDialog').close();openSettings()}
  else $('passwordError').textContent='Nope. Wrong tunnel.';
};
function openSettings(){ hydrateGeneral(); renderAdminSections(); $('settingsDialog').showModal(); }
$('closeSettings').onclick=()=>$('settingsDialog').close();

document.querySelectorAll('.tab').forEach(tab=>tab.onclick=()=>{
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); tab.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active')); $('tab-'+tab.dataset.tab).classList.add('active');
});
function hydrateGeneral(){ $('editHubPrompt').value=data.hubPrompt; $('editFinalTitle').value=data.finalTitle; $('editFinalQuote').value=data.finalQuote; $('editDepthStep').value=data.depthStep; }
$('saveGeneral').onclick=()=>{data.hubPrompt=$('editHubPrompt').value;data.finalTitle=$('editFinalTitle').value;data.finalQuote=$('editFinalQuote').value;data.depthStep=Number($('editDepthStep').value)||50;saveData()};

function renderAdminSections(){
  const list=$('adminSectionList');list.innerHTML='';
  data.sections.forEach((s,i)=>{
    const row=document.createElement('div');row.className='admin-row';row.draggable=true;row.dataset.id=s.id;
    row.innerHTML=`<span class="drag">⋮⋮</span><div><strong>${esc(s.icon)} ${esc(s.label)}</strong><div style="color:#777;font-size:12px">${esc(s.subtitle||'')}</div></div><div class="move-btns"><button class="small" data-dir="up">↑</button><button class="small" data-dir="down">↓</button></div><button class="small" data-edit="1">Edit</button>`;
    row.querySelector('[data-edit]').onclick=()=>openSectionEditor(s.id);
    row.querySelector('[data-dir="up"]').onclick=()=>moveSection(i,-1); row.querySelector('[data-dir="down"]').onclick=()=>moveSection(i,1);
    list.appendChild(row);
  });
  enableDrag();
}
function moveSection(i,d){const j=i+d;if(j<0||j>=data.sections.length)return;[data.sections[i],data.sections[j]]=[data.sections[j],data.sections[i]];saveData()}
function enableDrag(){
  let dragId=null;
  document.querySelectorAll('.admin-row').forEach(row=>{
    row.ondragstart=()=>dragId=row.dataset.id;
    row.ondragover=e=>e.preventDefault();
    row.ondrop=e=>{e.preventDefault();const target=row.dataset.id;if(!dragId||dragId===target)return;const from=data.sections.findIndex(s=>s.id===dragId),to=data.sections.findIndex(s=>s.id===target);const [m]=data.sections.splice(from,1);data.sections.splice(to,0,m);saveData()};
  });
}
$('addSection').onclick=()=>{
  const id='room-'+Date.now(); data.sections.push({id,icon:'🌀',label:'New Room',subtitle:'something strange',title:'A new hole in Wonderland.',bg:'',opacity:.35,overlay:.7,blocks:[]}); saveData(); openSectionEditor(id);
};

function openSectionEditor(id){
  editingSectionId=id; const s=data.sections.find(x=>x.id===id); if(!s)return;
  $('editorHeading').textContent='Edit: '+s.label; $('secLabel').value=s.label||'';$('secIcon').value=s.icon||'';$('secTitle').value=s.title||'';$('secSubtitle').value=s.subtitle||'';$('secBg').value=s.bg||'';$('secOpacity').value=s.opacity??.35;$('secOverlay').value=s.overlay??.7;
  renderBlockEditor(s.blocks||[]); $('sectionEditor').showModal();
}
$('closeSectionEditor').onclick=()=>$('sectionEditor').close();
function renderBlockEditor(blocks){
  const list=$('blockEditorList');list.innerHTML='';
  blocks.forEach((b,i)=>{
    const el=document.createElement('div');el.className='block-edit';el.dataset.index=i;
    let fields='';
    if(b.type==='text'||b.type==='quote') fields=`<textarea data-field="text">${esc(b.text||'')}</textarea>`;
    if(b.type==='image') fields=`<div class="inline-grid"><input data-field="url" value="${esc(b.url||'')}" placeholder="Image URL"><input data-field="caption" value="${esc(b.caption||'')}" placeholder="Caption"></div>`;
    if(b.type==='gallery') fields=`<textarea data-field="images" placeholder="One image URL per line">${esc((b.images||[]).join('\n'))}</textarea><label>Columns <select data-field="columns"><option ${b.columns==2?'selected':''}>2</option><option ${b.columns==3?'selected':''}>3</option></select></label>`;
    el.innerHTML=`<div class="block-edit-top"><strong>${b.type.toUpperCase()}</strong><div><button class="small" data-up>↑</button><button class="small" data-down>↓</button><button class="small" data-remove>Remove</button></div></div>${fields}`;
    el.querySelector('[data-up]').onclick=()=>moveBlock(i,-1);el.querySelector('[data-down]').onclick=()=>moveBlock(i,1);el.querySelector('[data-remove]').onclick=()=>removeBlock(i);
    list.appendChild(el);
  });
}
function collectBlocks(){
  const s=data.sections.find(x=>x.id===editingSectionId);const original=s.blocks||[];
  return [...document.querySelectorAll('.block-edit')].map((el,i)=>{
    const type=original[i]?.type || 'text'; const obj={type};
    el.querySelectorAll('[data-field]').forEach(f=>{if(f.dataset.field==='images')obj.images=f.value.split('\n').map(x=>x.trim()).filter(Boolean);else if(f.dataset.field==='columns')obj.columns=Number(f.value);else obj[f.dataset.field]=f.value}); return obj;
  });
}
function persistBlocksFromEditor(){const s=data.sections.find(x=>x.id===editingSectionId);if(s)s.blocks=collectBlocks()}
function moveBlock(i,d){persistBlocksFromEditor();const s=data.sections.find(x=>x.id===editingSectionId),j=i+d;if(j<0||j>=s.blocks.length)return;[s.blocks[i],s.blocks[j]]=[s.blocks[j],s.blocks[i]];renderBlockEditor(s.blocks)}
function removeBlock(i){persistBlocksFromEditor();const s=data.sections.find(x=>x.id===editingSectionId);s.blocks.splice(i,1);renderBlockEditor(s.blocks)}
document.querySelectorAll('[data-add-block]').forEach(btn=>btn.onclick=()=>{persistBlocksFromEditor();const s=data.sections.find(x=>x.id===editingSectionId);const t=btn.dataset.addBlock;const b=t==='image'?{type:'image',url:'',caption:''}:t==='gallery'?{type:'gallery',images:[],columns:2}:{type:t,text:''};s.blocks.push(b);renderBlockEditor(s.blocks)});
$('saveSection').onclick=()=>{
  const s=data.sections.find(x=>x.id===editingSectionId);if(!s)return;s.blocks=collectBlocks();s.label=$('secLabel').value;s.icon=$('secIcon').value;s.title=$('secTitle').value;s.subtitle=$('secSubtitle').value;s.bg=$('secBg').value;s.opacity=Number($('secOpacity').value);s.overlay=Number($('secOverlay').value);saveData();$('sectionEditor').close();
};
$('deleteSection').onclick=()=>{if(!confirm('Delete this room?'))return;data.sections=data.sections.filter(x=>x.id!==editingSectionId);saveData();$('sectionEditor').close()};

$('exportData').onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sophie-wonderland-content.json';a.click();URL.revokeObjectURL(a.href)};
$('importData').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const incoming=JSON.parse(await f.text());if(!Array.isArray(incoming.sections))throw new Error();data=incoming;saveData();hydrateGeneral();alert('Imported!')}catch{alert('That file does not look like Wonderland data.')}};
$('resetData').onclick=()=>{if(confirm('Reset all local edits to demo content?')){data=clone(demoData);saveData();hydrateGeneral()}};

renderHub();renderFinal();
