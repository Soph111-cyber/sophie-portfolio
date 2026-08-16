// Freeform Wonderland hub photo board. Uses existing Supabase upload + draft/publish CMS.
(function(){
  const DEFAULT_BOARD={items:[]};
  let selectedId=null;

  function boardData(){
    if(!data.hubBoard || !Array.isArray(data.hubBoard.items)) data.hubBoard=JSON.parse(JSON.stringify(DEFAULT_BOARD));
    return data.hubBoard;
  }
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function itemById(id){return boardData().items.find(x=>x.id===id);}
  function maxZ(){return boardData().items.reduce((m,x)=>Math.max(m,Number(x.z)||1),1);}
  function minZ(){return boardData().items.reduce((m,x)=>Math.min(m,Number(x.z)||1),1);}
  function safeUrl(url){return String(url||'').replace(/["'<>]/g,'');}

  function ensurePublicLayer(){
    const hub=$('hub'); if(!hub) return null;
    let layer=$('hubPhotoBoard');
    if(!layer){
      layer=document.createElement('div'); layer.id='hubPhotoBoard'; layer.className='hub-photo-board';
      const wrap=hub.querySelector('.hub-wrap'); hub.insertBefore(layer,wrap||null);
    }
    return layer;
  }

  function renderHubBoard(){
    const layer=ensurePublicLayer(); if(!layer) return;
    layer.innerHTML=boardData().items.map(it=>`<figure class="hub-photo" style="left:${clamp(Number(it.x)||50,0,100)}%;top:${clamp(Number(it.y)||50,0,100)}%;width:${clamp(Number(it.w)||16,6,55)}%;transform:translate(-50%,-50%) rotate(${Number(it.rot)||0}deg);z-index:${Number(it.z)||1}"><img src="${safeUrl(it.url)}" alt="Personal photo"></figure>`).join('');
  }

  function injectEditor(){
    const panel=$('tab-general'); if(!panel || $('hubBoardEditor')) return;
    const wrap=document.createElement('section');
    wrap.id='hubBoardEditor'; wrap.className='landing-board-editor hub-board-editor';
    wrap.innerHTML=`
      <div class="landing-board-head">
        <div><p class="eyebrow">WONDERLAND PHOTO BOARD</p><h4>Decorate the room-selection page.</h4><p>Drag · resize · rotate · layer. Keep the title and room cards readable; everything is saved to Draft until you Publish.</p></div>
        <label class="upload-btn">+ Upload photos<input id="hubBoardUpload" type="file" accept="image/*" multiple hidden></label>
      </div>
      <div id="hubBoardStage" class="landing-board-stage hub-board-stage">
        <div class="hub-board-safe-title"><span>keep title readable</span></div>
        <div class="hub-board-safe-cards"><span>keep room cards readable</span></div>
      </div>
      <div id="hubBoardControls" class="landing-board-controls">
        <span id="hubBoardHint">Select a photo to edit it.</span>
        <div class="landing-board-actions">
          <button class="small" data-hub-board-action="straighten">Straighten</button>
          <button class="small" data-hub-board-action="duplicate">Duplicate</button>
          <button class="small" data-hub-board-action="back">Send back</button>
          <button class="small" data-hub-board-action="front">Bring front</button>
          <button class="danger small" data-hub-board-action="delete">Delete</button>
        </div>
      </div>`;
    panel.appendChild(wrap);
    $('hubBoardUpload').onchange=uploadPhotos;
    wrap.querySelectorAll('[data-hub-board-action]').forEach(b=>b.onclick=()=>boardAction(b.dataset.hubBoardAction));
    renderEditor();
  }

  function renderEditor(){
    injectEditor();
    const stage=$('hubBoardStage'); if(!stage) return;
    stage.querySelectorAll('.board-photo').forEach(x=>x.remove());
    boardData().items.forEach(it=>{
      const el=document.createElement('div');
      el.className='board-photo'+(selectedId===it.id?' selected':'');
      el.dataset.id=it.id;
      el.style.left=(Number(it.x)||50)+'%'; el.style.top=(Number(it.y)||50)+'%'; el.style.width=(Number(it.w)||16)+'%';
      el.style.zIndex=Number(it.z)||1; el.style.transform=`translate(-50%,-50%) rotate(${Number(it.rot)||0}deg)`;
      el.innerHTML=`<img src="${safeUrl(it.url)}" alt="Wonderland photo"><button class="board-rotate" title="Rotate">↻</button><button class="board-resize" title="Resize">↘</button>`;
      el.addEventListener('pointerdown',startDrag);
      el.querySelector('.board-resize').addEventListener('pointerdown',startResize);
      el.querySelector('.board-rotate').addEventListener('pointerdown',startRotate);
      stage.appendChild(el);
    });
    updateControls();
  }

  function stageRect(){return $('hubBoardStage').getBoundingClientRect();}

  function startDrag(e){
    if(e.target.closest('.board-resize,.board-rotate')) return;
    e.preventDefault(); const el=e.currentTarget,id=el.dataset.id,it=itemById(id); if(!it)return;
    selectedId=id; it.z=maxZ()+1; renderEditor();
    const r=stageRect(),sx=e.clientX,sy=e.clientY,ox=Number(it.x)||50,oy=Number(it.y)||50;
    function move(ev){it.x=clamp(ox+(ev.clientX-sx)/r.width*100,0,100);it.y=clamp(oy+(ev.clientY-sy)/r.height*100,0,100);const n=document.querySelector(`#hubBoardStage .board-photo[data-id="${id}"]`);if(n){n.style.left=it.x+'%';n.style.top=it.y+'%';}}
    function up(){window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderHubBoard();queueDraft();}
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  }

  function startResize(e){
    e.preventDefault();e.stopPropagation();const el=e.target.closest('.board-photo'),id=el.dataset.id,it=itemById(id);if(!it)return;selectedId=id;
    const r=stageRect(),sx=e.clientX,ow=Number(it.w)||16;
    function move(ev){it.w=clamp(ow+(ev.clientX-sx)/r.width*100,6,55);const n=document.querySelector(`#hubBoardStage .board-photo[data-id="${id}"]`);if(n)n.style.width=it.w+'%';}
    function up(){window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderHubBoard();queueDraft();updateControls();}
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  }

  function startRotate(e){
    e.preventDefault();e.stopPropagation();const el=e.target.closest('.board-photo'),id=el.dataset.id,it=itemById(id);if(!it)return;selectedId=id;
    function angle(ev){const b=el.getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2;return Math.atan2(ev.clientY-cy,ev.clientX-cx)*180/Math.PI+90;}
    const start=angle(e),orig=Number(it.rot)||0;
    function move(ev){it.rot=Math.round(orig+(angle(ev)-start));el.style.transform=`translate(-50%,-50%) rotate(${it.rot}deg)`;}
    function up(){window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderHubBoard();queueDraft();updateControls();}
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  }

  async function uploadPhotos(e){
    const files=[...e.target.files]; if(!files.length)return;
    const positions=[[8,18,-8],[92,17,7],[8,78,5],[92,77,-6],[18,91,-3],[82,91,4]];
    for(let i=0;i<files.length;i++){
      try{
        const r=await uploadFile(files[i],1600,.84),p=positions[boardData().items.length%positions.length];
        const it={id:'hub-'+Date.now()+'-'+i,url:r.url,x:p[0],y:p[1],w:14,rot:p[2],z:maxZ()+1};
        boardData().items.push(it);selectedId=it.id;renderEditor();renderHubBoard();queueDraft();
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
      const copy={...it,id:'hub-'+Date.now(),x:clamp((Number(it.x)||50)+4,0,100),y:clamp((Number(it.y)||50)+4,0,100),z:maxZ()+1};
      boardData().items.push(copy);selectedId=copy.id;
    }
    renderEditor();renderHubBoard();queueDraft();
  }

  function updateControls(){
    const it=itemById(selectedId),hint=$('hubBoardHint');
    if(hint)hint.textContent=it?`Selected · ${Math.round(Number(it.w)||16)}% wide · ${Math.round(Number(it.rot)||0)}°`:'Select a photo to edit it.';
    document.querySelectorAll('[data-hub-board-action]').forEach(b=>b.disabled=!it);
  }

  const oldRenderAll=renderAll;
  renderAll=function(){oldRenderAll();renderHubBoard();};
  const oldOpenSettings=openSettings;
  openSettings=function(){oldOpenSettings();injectEditor();renderEditor();};

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{injectEditor();renderHubBoard();});
  else {injectEditor();renderHubBoard();}
})();
