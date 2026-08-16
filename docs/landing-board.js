// Freeform landing-page photo board. Uses existing Supabase upload + draft/publish CMS.
(function(){
  const DEFAULT_BOARD={items:[]};
  let selectedId=null;

  function boardData(){
    if(!data.landingBoard || !Array.isArray(data.landingBoard.items)) data.landingBoard=JSON.parse(JSON.stringify(DEFAULT_BOARD));
    return data.landingBoard;
  }
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function itemById(id){return boardData().items.find(x=>x.id===id);}
  function maxZ(){return boardData().items.reduce((m,x)=>Math.max(m,Number(x.z)||1),1);}
  function minZ(){return boardData().items.reduce((m,x)=>Math.min(m,Number(x.z)||1),1);}
  function safeUrl(url){return String(url||'').replace(/["'<>]/g,'');}

  function ensurePublicLayer(){
    const landing=$('landing'); if(!landing) return null;
    let layer=$('landingPhotoBoard');
    if(!layer){
      layer=document.createElement('div'); layer.id='landingPhotoBoard'; layer.className='landing-photo-board';
      const center=landing.querySelector('.landing-center'); landing.insertBefore(layer,center||null);
    }
    return layer;
  }
  function renderLandingBoard(){
    const layer=ensurePublicLayer(); if(!layer) return;
    const items=boardData().items;
    layer.innerHTML=items.map(it=>`<figure class="landing-photo" style="left:${clamp(Number(it.x)||50,0,100)}%;top:${clamp(Number(it.y)||50,0,100)}%;width:${clamp(Number(it.w)||18,6,60)}%;transform:translate(-50%,-50%) rotate(${Number(it.rot)||0}deg);z-index:${Number(it.z)||1}"><img src="${safeUrl(it.url)}" alt="Personal photo"></figure>`).join('');
  }

  function injectEditor(){
    const panel=$('tab-general'); if(!panel || $('landingBoardEditor')) return;
    const wrap=document.createElement('section');
    wrap.id='landingBoardEditor'; wrap.className='landing-board-editor';
    wrap.innerHTML=`
      <div class="landing-board-head">
        <div><p class="eyebrow">LANDING PHOTO BOARD</p><h4>Scatter your photos around the hole.</h4><p>Drag · resize · rotate · layer. These positions are saved to Draft and only go live when you Publish.</p></div>
        <label class="upload-btn">+ Upload photos<input id="landingBoardUpload" type="file" accept="image/*" multiple hidden></label>
      </div>
      <div id="landingBoardStage" class="landing-board-stage">
        <div class="landing-board-safe"><span>keep the portal readable</span></div>
      </div>
      <div id="landingBoardControls" class="landing-board-controls">
        <span id="landingBoardHint">Select a photo to edit it.</span>
        <div class="landing-board-actions">
          <button class="small" data-board-action="straighten">Straighten</button>
          <button class="small" data-board-action="duplicate">Duplicate</button>
          <button class="small" data-board-action="back">Send back</button>
          <button class="small" data-board-action="front">Bring front</button>
          <button class="danger small" data-board-action="delete">Delete</button>
        </div>
      </div>`;
    panel.appendChild(wrap);

    $('landingBoardUpload').onchange=uploadLandingPhotos;
    wrap.querySelectorAll('[data-board-action]').forEach(b=>b.onclick=()=>boardAction(b.dataset.boardAction));
    renderBoardEditor();
  }

  function renderBoardEditor(){
    injectEditor();
    const stage=$('landingBoardStage'); if(!stage) return;
    stage.querySelectorAll('.board-photo').forEach(x=>x.remove());
    boardData().items.forEach(it=>{
      const el=document.createElement('div');
      el.className='board-photo'+(selectedId===it.id?' selected':'');
      el.dataset.id=it.id;
      el.style.left=(Number(it.x)||50)+'%'; el.style.top=(Number(it.y)||50)+'%'; el.style.width=(Number(it.w)||18)+'%';
      el.style.zIndex=Number(it.z)||1; el.style.transform=`translate(-50%,-50%) rotate(${Number(it.rot)||0}deg)`;
      el.innerHTML=`<img src="${safeUrl(it.url)}" alt="Landing photo"><button class="board-rotate" title="Rotate">↻</button><button class="board-resize" title="Resize">↘</button>`;
      el.addEventListener('pointerdown',startDrag);
      el.querySelector('.board-resize').addEventListener('pointerdown',startResize);
      el.querySelector('.board-rotate').addEventListener('pointerdown',startRotate);
      stage.appendChild(el);
    });
    updateControls();
  }

  function select(id){selectedId=id; renderBoardEditor();}
  function stageRect(){return $('landingBoardStage').getBoundingClientRect();}

  function startDrag(e){
    if(e.target.closest('.board-resize,.board-rotate')) return;
    e.preventDefault(); const el=e.currentTarget,id=el.dataset.id,it=itemById(id); if(!it)return;
    selectedId=id; it.z=maxZ()+1; renderBoardEditor();
    const r=stageRect(),sx=e.clientX,sy=e.clientY,ox=Number(it.x)||50,oy=Number(it.y)||50;
    function move(ev){it.x=clamp(ox+(ev.clientX-sx)/r.width*100,0,100);it.y=clamp(oy+(ev.clientY-sy)/r.height*100,0,100);const n=document.querySelector(`.board-photo[data-id="${id}"]`);if(n){n.style.left=it.x+'%';n.style.top=it.y+'%';}}
    function up(){window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderLandingBoard();queueDraft();}
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  }

  function startResize(e){
    e.preventDefault();e.stopPropagation();const el=e.target.closest('.board-photo'),id=el.dataset.id,it=itemById(id);if(!it)return;selectedId=id;
    const r=stageRect(),sx=e.clientX,ow=Number(it.w)||18;
    function move(ev){it.w=clamp(ow+(ev.clientX-sx)/r.width*100,6,60);const n=document.querySelector(`.board-photo[data-id="${id}"]`);if(n)n.style.width=it.w+'%';}
    function up(){window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderLandingBoard();queueDraft();updateControls();}
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  }

  function startRotate(e){
    e.preventDefault();e.stopPropagation();const el=e.target.closest('.board-photo'),id=el.dataset.id,it=itemById(id);if(!it)return;selectedId=id;
    function angle(ev){const b=el.getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2;return Math.atan2(ev.clientY-cy,ev.clientX-cx)*180/Math.PI+90;}
    const start=angle(e),orig=Number(it.rot)||0;
    function move(ev){it.rot=Math.round(orig+(angle(ev)-start));el.style.transform=`translate(-50%,-50%) rotate(${it.rot}deg)`;}
    function up(){window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderLandingBoard();queueDraft();updateControls();}
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  }

  async function uploadLandingPhotos(e){
    const files=[...e.target.files]; if(!files.length)return;
    const positions=[[13,22,-9],[87,21,8],[12,73,6],[88,72,-7],[25,86,4],[75,87,-4]];
    for(let i=0;i<files.length;i++){
      try{
        const r=await uploadFile(files[i],1600,.84),p=positions[boardData().items.length%positions.length];
        const it={id:'landing-'+Date.now()+'-'+i,url:r.url,x:p[0],y:p[1],w:16,rot:p[2],z:maxZ()+1};
        boardData().items.push(it); selectedId=it.id; renderBoardEditor(); renderLandingBoard(); queueDraft();
      }catch(err){markCloud(err.message,'bad');break;}
    }
    e.target.value='';
  }

  function boardAction(action){
    const it=itemById(selectedId);if(!it)return;
    if(action==='straighten') it.rot=0;
    if(action==='front') it.z=maxZ()+1;
    if(action==='back') it.z=minZ()-1;
    if(action==='delete'){boardData().items=boardData().items.filter(x=>x.id!==selectedId);selectedId=null;}
    if(action==='duplicate'){
      const copy={...it,id:'landing-'+Date.now(),x:clamp((Number(it.x)||50)+4,0,100),y:clamp((Number(it.y)||50)+4,0,100),z:maxZ()+1};
      boardData().items.push(copy);selectedId=copy.id;
    }
    renderBoardEditor();renderLandingBoard();queueDraft();
  }

  function updateControls(){
    const it=itemById(selectedId),hint=$('landingBoardHint');
    if(hint)hint.textContent=it?`Selected · ${Math.round(Number(it.w)||18)}% wide · ${Math.round(Number(it.rot)||0)}°`:'Select a photo to edit it.';
    document.querySelectorAll('[data-board-action]').forEach(b=>b.disabled=!it);
  }

  // Make the board render whenever cloud data or the theme is re-rendered.
  const oldRenderAll=renderAll;
  renderAll=function(){oldRenderAll();renderLandingBoard();};
  const oldOpenSettings=openSettings;
  openSettings=function(){oldOpenSettings();injectEditor();renderBoardEditor();};

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{injectEditor();renderLandingBoard();});
  else {injectEditor();renderLandingBoard();}
})();
