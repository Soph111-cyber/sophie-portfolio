// Media Layout V4: Image Row shares one caption; individual Image blocks explicitly choose same/new row.
(function(){
  const prevBlockHTML=window.blockHTML;
  const prevRenderBlockEditor=window.renderBlockEditor;
  const prevCollectBlocks=window.collectBlocks;
  const prevOpenSection=window.openSection;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||min));
  const safeItems=b=>{
    if(Array.isArray(b.items)&&b.items.length) return b.items.map(x=>typeof x==='string'?{url:x}:x).filter(x=>x&&x.url);
    return (b.images||[]).filter(Boolean).map(url=>({url}));
  };
  const sharedRowCaption=b=>b.caption||safeItems(b).map(x=>x.caption).find(Boolean)||'';

  function captionHTML(text,size,cls=''){
    if(!text)return'';
    return `<figcaption class="media-caption ${cls}" style="--caption-size:${clamp(size||13,9,32)}px">${esc(text)}</figcaption>`;
  }

  function imageRowHTML(b){
    const items=safeItems(b),perRow=clamp(b.perRow||b.columns||3,1,5),gap=clamp(b.gap||14,0,48),height=clamp(b.height||320,100,800),fit=b.fit==='contain'?'contain':'cover',fallback=100/perRow,groupWidth=clamp(b.groupWidth||100,20,100);
    return `<figure class="content-block media-block-unit image-row-block v4-shared-row-caption" data-media-placement="new" style="--group-width:${groupWidth}%;--row-gap:${gap}px"><div class="v4-row-images">${items.map((it,i)=>{const w=clamp(it.width||fallback,10,100);return `<div class="image-row-item" style="--row-item-width:${w}%;--row-height:${height}px"><img src="${esc(it.url)}" alt="Image ${i+1}" style="object-fit:${fit}"></div>`}).join('')}</div>${captionHTML(sharedRowCaption(b),b.captionSize||13,'shared-row-caption')}</figure>`;
  }

  window.blockHTML=function(b){
    if(b.type==='image'&&b.url){
      const width=clamp(b.width||100,20,100),groupWidth=clamp(b.groupWidth||100,20,100),align=['left','center','right'].includes(b.align)?b.align:'center',fixed=b.heightMode==='fixed',height=fixed?clamp(b.height||420,120,900):null;
      return `<figure class="content-block media-block-unit block-image advanced-image ${esc(b.layout||'editorial')} align-${align} ${fixed?'fixed-height':''}" data-media-placement="${b.sameRow?'same':'new'}" style="--group-width:${groupWidth}%;--image-width:${width}%;${height?`--image-height:${height}px;`:''}"><img src="${esc(b.url)}" alt="Photo">${captionHTML(b.caption,b.captionSize||13,'single-caption')}</figure>`;
    }
    if(b.type==='imageRow')return imageRowHTML(b);
    return prevBlockHTML?prevBlockHTML(b):'';
  };

  function syncRowOrder(el,b,from,to){
    if(from===to||from<0||to<0)return;
    const field=el.querySelector('[data-field="galleryItems"]');
    let items=[];
    try{items=JSON.parse(field?.value||'[]')}catch{items=safeItems(b)}
    if(!Array.isArray(items)||from>=items.length||to>=items.length)return;
    const [moved]=items.splice(from,1);items.splice(to,0,moved);
    if(field)field.value=JSON.stringify(items);
    b.items=items;b.images=items.map(x=>x.url);

    const cards=[...el.querySelectorAll('[data-gallery-preview] .ga-card')];
    const previews=[...el.querySelectorAll('[data-row-live-preview] .row-preview-item')];
    const moveNode=(nodes,a,z)=>{
      const node=nodes[a];if(!node)return;
      if(z>=nodes.length-1)nodes[0]?.parentElement?.appendChild(node);
      else if(z>a)nodes[0]?.parentElement?.insertBefore(node,nodes[z+1]);
      else nodes[0]?.parentElement?.insertBefore(node,nodes[z]);
    };
    moveNode(cards,from,to);moveNode(previews,from,to);
    decorateRowOrdering(el,b);
    if(typeof queueDraft==='function')queueDraft();
  }

  function decorateRowOrdering(el,b){
    if(b.type!=='imageRow')return;
    const cards=[...el.querySelectorAll('[data-gallery-preview] .ga-card')];
    cards.forEach((card,i)=>{
      card.draggable=true;
      card.dataset.rowOrderIndex=i;
      card.classList.add('v4-sortable-card');
      let tools=card.querySelector('.v4-row-order-tools');
      if(!tools){
        tools=document.createElement('div');tools.className='v4-row-order-tools';
        tools.innerHTML='<button type="button" data-row-left title="Move left">←</button><span title="Drag to reorder">⋮⋮ drag</span><button type="button" data-row-right title="Move right">→</button>';
        card.prepend(tools);
      }
      const left=tools.querySelector('[data-row-left]'),right=tools.querySelector('[data-row-right]');
      left.disabled=i===0;right.disabled=i===cards.length-1;
      left.onclick=e=>{e.preventDefault();e.stopPropagation();syncRowOrder(el,b,i,i-1)};
      right.onclick=e=>{e.preventDefault();e.stopPropagation();syncRowOrder(el,b,i,i+1)};
      card.ondragstart=e=>{card.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i))};
      card.ondragend=()=>card.classList.remove('dragging');
      card.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move'};
      card.ondrop=e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain')),to=Number(card.dataset.rowOrderIndex);syncRowOrder(el,b,from,to)};
    });
    if(!document.getElementById('v4-row-order-style')){
      const style=document.createElement('style');style.id='v4-row-order-style';style.textContent=`
        .v4-sortable-card{cursor:grab;transition:.18s ease}.v4-sortable-card.dragging{opacity:.45;transform:scale(.97)}
        .v4-row-order-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-2px 0 9px}
        .v4-row-order-tools span{font:10px 'DM Mono',monospace;color:var(--muted);letter-spacing:.06em;cursor:grab;user-select:none}
        .v4-row-order-tools button{width:30px;height:28px;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.07);color:var(--ink);cursor:pointer}
        .v4-row-order-tools button:disabled{opacity:.25;cursor:not-allowed}
      `;document.head.appendChild(style);
    }
  }

  function enhanceEditor(blocks){
    [...document.querySelectorAll('#blockEditorList .block-edit')].forEach((el,i)=>{
      const b=blocks[i];if(!b)return;el.dataset.blockType=b.type;
      if(b.type==='image'){
        const controls=el.querySelector('.layout-control-grid');
        if(controls&&!el.querySelector('[data-v4-placement]')){
          const label=document.createElement('label');
          label.className='v4-placement-control';
          label.innerHTML=`Placement<select data-v4-placement><option value="new" ${b.sameRow?'':'selected'}>New row</option><option value="same" ${b.sameRow?'selected':''}>Same row as previous Image</option></select><small>Use Group width to control how much horizontal space this image takes.</small>`;
          controls.prepend(label);
        }
      }
      if(b.type==='imageRow'){
        const help=el.querySelector('.row-help');
        if(help){const span=help.querySelector('span');if(span)span.textContent='All photos in this Image Row share one caption. Drag photo cards or use ← / → to change their order.';}
        if(!el.querySelector('.v4-shared-caption-editor')){
          const shared=document.createElement('div');shared.className='v4-shared-caption-editor';
          const text=sharedRowCaption(b),size=clamp(b.captionSize||13,9,32);
          shared.innerHTML=`<label>Caption for the whole Image Row<input data-v4-row-caption value="${esc(text)}" placeholder="One caption for this entire row"></label><label>Caption size <strong data-v4-row-caption-size-readout>${size}px</strong><input data-v4-row-caption-size type="range" min="9" max="32" step="1" value="${size}"></label>`;
          const preview=el.querySelector('[data-row-live-preview]');
          (preview||help||el.firstChild).insertAdjacentElement('afterend',shared);
          const slider=shared.querySelector('[data-v4-row-caption-size]');slider.oninput=()=>shared.querySelector('[data-v4-row-caption-size-readout]').textContent=slider.value+'px';
        }
        decorateRowOrdering(el,b);
      }
    });
  }

  window.renderBlockEditor=function(blocks){prevRenderBlockEditor(blocks);enhanceEditor(blocks)};

  window.collectBlocks=function(){
    const out=prevCollectBlocks();
    [...document.querySelectorAll('#blockEditorList .block-edit')].forEach((el,i)=>{
      if(!out[i])return;
      if(out[i].type==='image')out[i].sameRow=el.querySelector('[data-v4-placement]')?.value==='same';
      if(out[i].type==='imageRow'){
        out[i].caption=el.querySelector('[data-v4-row-caption]')?.value||'';
        out[i].captionSize=Number(el.querySelector('[data-v4-row-caption-size]')?.value)||13;
        if(Array.isArray(out[i].items))out[i].items=out[i].items.map(x=>({...x,caption:undefined,captionSize:undefined}));
      }
    });
    return out;
  };

  function regroupMedia(){
    const root=$('exploreContent');if(!root)return;
    [...root.querySelectorAll(':scope > .media-flow-row')].forEach(row=>{while(row.firstChild)root.insertBefore(row.firstChild,row);row.remove()});
    const children=[...root.children];let currentRow=null;
    children.forEach(ch=>{
      if(!ch.classList.contains('media-block-unit')){currentRow=null;return;}
      const same=ch.dataset.mediaPlacement==='same';
      if(!same||!currentRow){currentRow=document.createElement('div');currentRow.className='media-flow-row v4-media-flow-row';root.insertBefore(currentRow,ch)}
      currentRow.appendChild(ch);
    });
  }

  window.openSection=function(id){prevOpenSection(id);regroupMedia()};
})();
