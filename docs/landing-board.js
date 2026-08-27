// Freeform landing-page photo board. Uses existing Supabase upload + draft/publish CMS.
(function(){
  // Fast-start snapshot of the current published landing board.
  // This lets the browser start loading the visible photos immediately instead of
  // waiting for the Supabase content request first. Cloud data still replaces this
  // as soon as it arrives, so the editor remains fully dynamic.
  const FAST_START_ITEMS=[
    {w:18.491521368754587,x:11.495417705020792,y:22.769384043660985,z:84,id:'landing-1786888948184-0',rot:-9,url:'https://ddpctbzxgiilncumkyje.supabase.co/storage/v1/object/public/wonderland-media/uploads/1786888947483-88177738-29fb-4fbd-a1a0-a208bb71a047.jpg'},
    {w:14.43535003363503,x:93.61961505091118,y:86.17335842370625,z:199,id:'landing-1786888949545-1',rot:-14,url:'https://ddpctbzxgiilncumkyje.supabase.co/storage/v1/object/public/wonderland-media/uploads/1786888949284-e3afbacc-e343-4341-9a50-182a354e2f12.jpg'},
    {w:16.112186439349927,x:8.642245238541156,y:61.070786872825614,z:164,id:'landing-1786888951260-2',rot:6,url:'https://ddpctbzxgiilncumkyje.supabase.co/storage/v1/object/public/wonderland-media/uploads/1786888950677-6bd92179-01e6-4a82-ae96-9bd1f04ae09a.jpg'},
    {w:18.06242690114359,x:30.244957851103834,y:17.026108554509133,z:118,id:'landing-1786888953513-3',rot:6,url:'https://ddpctbzxgiilncumkyje.supabase.co/storage/v1/object/public/wonderland-media/uploads/1786888953133-014b1315-4595-4e46-ae80-99cfcede03cc.jpg'},
    {w:19.271771037181992,x:85.22944894928754,y:57.14947118259404,z:198,id:'landing-1786888962114-8',rot:0,url:'https://ddpctbzxgiilncumkyje.supabase.co/storage/v1/object/public/wonderland-media/uploads/1786888961735-5b317593-2dd7-4ee4-9408-213099a30fec.jpg'},
    {w:11.538712294367661,x:24.76201807309503,y:52.693636481775904,z:128,id:'landing-1786888969295-12',rot:-11,url:'https://ddpctbzxgiilncumkyje.supabase.co/storage/v1/object/public/wonderland-media/uploads/1786888968818-c465ddf9-2d94-44bf-ac0b-99ef90718f32.jpg'},
    {w:17.339470850278254,x:73.81327685451319,y:22.03808073511225,z:197,id:'landing-1786888970611-13',rot:8,url:'https://ddpctbzxgiilncumkyje.supabase.co/storage/v1/object/public/wonderland-media/uploads/1786888970302-cea920c2-687f-45ed-9350-a347da12f36a.jpg'},
    {w:12.78966425169704,x:19.352019009524824,y:80.75740246690856,z:181,id:'landing-1786889459276-0',rot:-1,url:'https://ddpctbzxgiilncumkyje.supabase.co/storage/v1/object/public/wonderland-media/uploads/1786889458620-f52d95e4-e2d5-4886-956d-4eb5c13a8973.jpg'},
    {w:15.832296651403496,x:50.048501091227365,y:92.84848661478718,z:185,id:'landing-1786889461708-1',rot:0,url:'https://ddpctbzxgiilncumkyje.supabase.co/storage/v1/object/public/wonderland-media/uploads/1786889461357-3d020fa6-6963-4e66-93f6-dd9d603cc0ff.jpg'},
    {w:12.079046618915118,x:92.87790496288682,y:24.67237135025956,z:173,id:'landing-1786889462892-2',rot:-7,url:'https://ddpctbzxgiilncumkyje.supabase.co/storage/v1/object/public/wonderland-media/uploads/1786889462619-62497dfe-0a53-4df2-8c35-8888ea017414.jpg'},
    {w:13.242739802470645,x:75.52119663783482,y:85.33000412368855,z:200,id:'landing-1786889737916-0',rot:10,url:'https://ddpctbzxgiilncumkyje.supabase.co/storage/v1/object/public/wonderland-media/uploads/1786889737197-0df7f8e9-4ab4-4f76-9c78-a743d8a89449.jpg'}
  ];
  const DEFAULT_BOARD={items:FAST_START_ITEMS.map(x=>({...x}))};
  let selectedId=null;

  function warmLandingImages(){
    if(document.querySelector('link[data-landing-preconnect]')) return;
    const pre=document.createElement('link');
    pre.rel='preconnect';pre.href='https://ddpctbzxgiilncumkyje.supabase.co';pre.crossOrigin='anonymous';pre.dataset.landingPreconnect='1';
    document.head.appendChild(pre);
    FAST_START_ITEMS.forEach((it,i)=>{
      const img=new Image();
      img.decoding='async';
      img.fetchPriority=i<5?'high':'auto';
      img.src=it.url;
    });
  }

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
    layer.innerHTML=items.map((it,i)=>`<figure class="landing-photo" style="left:${clamp(Number(it.x)||50,0,100)}%;top:${clamp(Number(it.y)||50,0,100)}%;width:${clamp(Number(it.w)||18,6,60)}%;transform:translate(-50%,-50%) rotate(${Number(it.rot)||0}deg);z-index:${Number(it.z)||1}"><img src="${safeUrl(it.url)}" alt="Personal photo" loading="eager" decoding="async" fetchpriority="${i<5?'high':'auto'}"></figure>`).join('');
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

  warmLandingImages();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{injectEditor();renderLandingBoard();});
  else {injectEditor();renderLandingBoard();}
})();
