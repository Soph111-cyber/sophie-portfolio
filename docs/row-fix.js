// Hard override for true multi-image rows + cache-independent block creation.
(function(){
  function ensureImageRowButton(){
    const bar=document.querySelector('.block-toolbar > div');
    if(!bar) return;
    let btn=bar.querySelector('[data-add-block="imageRow"]');
    if(!btn){
      btn=document.createElement('button');
      btn.className='small solidish';
      btn.dataset.addBlock='imageRow';
      btn.textContent='+ Image Row';
      const gallery=bar.querySelector('[data-add-block="gallery"]');
      bar.insertBefore(btn,gallery||null);
    }
  }

  function createBlock(type){
    if(type==='image') return {type:'image',url:'',caption:'',width:100,align:'center',heightMode:'auto',height:420};
    if(type==='imageRow') return {type:'imageRow',items:[],images:[],perRow:3,gap:14,height:320,fit:'cover'};
    if(type==='gallery') return {type:'gallery',items:[],images:[],perRow:3,gap:14,height:320,fit:'cover'};
    if(type==='quote') return {type:'quote',text:''};
    return {type:'text',text:''};
  }

  function bindToolbar(){
    ensureImageRowButton();
    document.querySelectorAll('[data-add-block]').forEach(btn=>{
      btn.onclick=function(e){
        e.preventDefault();
        e.stopPropagation();
        if(typeof persistBlocksFromEditor==='function') persistBlocksFromEditor();
        const sec=(typeof data!=='undefined' && Array.isArray(data.sections)) ? data.sections.find(x=>x.id===editingSectionId) : null;
        if(!sec) return;
        sec.blocks=sec.blocks||[];
        sec.blocks.push(createBlock(btn.dataset.addBlock));
        if(typeof renderBlockEditor==='function') renderBlockEditor(sec.blocks);
        if(typeof queueDraft==='function') queueDraft();
      };
    });
  }

  function applyExploreUiFix(){
    const next=document.getElementById('nextBtn');
    if(next) next.textContent='GO DEEPER ↓';

    if(!document.getElementById('explore-ui-fix-style')){
      const style=document.createElement('style');
      style.id='explore-ui-fix-style';
      style.textContent=`
        #explore .explore-shell > #backToHub{
          position:fixed;
          top:20px;
          left:210px;
          z-index:70;
          margin:0;
        }
        @media (max-width:900px){
          #explore .explore-shell > #backToHub{left:205px;}
        }
        @media (max-width:700px){
          #explore .explore-shell > #backToHub{
            top:18px;
            left:18px;
          }
          .journey-hud{
            top:68px !important;
            bottom:auto !important;
            left:14px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  const oldOpen=window.openSectionEditor;
  if(typeof oldOpen==='function'){
    window.openSectionEditor=function(id){
      oldOpen(id);
      setTimeout(bindToolbar,0);
    };
  }

  document.addEventListener('click',e=>{
    if(e.target && e.target.closest('[data-edit]')) setTimeout(bindToolbar,0);
  });

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{bindToolbar();applyExploreUiFix();});
  }else{
    bindToolbar();
    applyExploreUiFix();
  }

  const obs=new MutationObserver(()=>ensureImageRowButton());
  const toolbar=document.querySelector('.block-toolbar');
  if(toolbar) obs.observe(toolbar,{childList:true,subtree:true});
})();
