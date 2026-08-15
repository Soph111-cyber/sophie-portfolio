// Advanced image + gallery layout controls for Sophie's Wonderland.
// Loaded after perfect.js so these functions extend the existing cloud CMS.

(function(){
  const oldBlockHTML = window.blockHTML;

  function normGallery(b){
    if(Array.isArray(b.items) && b.items.length){
      return b.items.map(x=> typeof x==='string' ? {url:x,width:null} : x).filter(x=>x&&x.url);
    }
    return (b.images||[]).filter(Boolean).map(u=>({url:u,width:null}));
  }

  window.blockHTML = function(b){
    if(b.type==='image' && b.url){
      const width=Math.max(20,Math.min(100,Number(b.width)||100));
      const align=['left','center','right'].includes(b.align)?b.align:'center';
      const hMode=b.heightMode||'auto';
      const height=hMode==='fixed'?Math.max(120,Math.min(900,Number(b.height)||420)):null;
      const style=`--image-width:${width}%;--image-align:${align};${height?`--image-height:${height}px;`:''}`;
      return `<figure class="content-block block-image advanced-image ${esc(b.layout||'editorial')} align-${align} ${hMode==='fixed'?'fixed-height':''}" style="${style}"><img src="${esc(b.url)}" alt="Photo"><figcaption class="block-caption">${esc(b.caption||'')}</figcaption></figure>`;
    }
    if(b.type==='gallery'){
      const items=normGallery(b);
      const perRow=Math.max(1,Math.min(5,Number(b.perRow||b.columns)||3));
      const gap=Math.max(0,Math.min(48,Number(b.gap)||14));
      const height=Math.max(100,Math.min(800,Number(b.height)||320));
      const fit=b.fit==='contain'?'contain':'cover';
      const fallback=100/perRow;
      const imgs=items.map((it,i)=>{
        const w=Math.max(10,Math.min(100,Number(it.width)||fallback));
        return `<figure class="gallery-flex-item" style="--item-width:${w}%;--gallery-height:${height}px"><img src="${esc(it.url)}" alt="Gallery image ${i+1}" style="object-fit:${fit}"></figure>`;
      }).join('');
      return `<div class="content-block gallery gallery-flex" style="--gallery-gap:${gap}px">${imgs}</div>`;
    }
    return oldBlockHTML ? oldBlockHTML(b) : '';
  };

  function imageFields(b){
    const width=Math.max(20,Math.min(100,Number(b.width)||100));
    const align=b.align||'center';
    const heightMode=b.heightMode||'auto';
    const height=Math.max(120,Math.min(900,Number(b.height)||420));
    return `
      <div class="layout-preview-wrap"><img class="preview-img" data-preview src="${esc(b.url||'')}" style="${b.url?'':'display:none'}"></div>
      <input data-field="url" type="hidden" value="${esc(b.url||'')}">
      <div class="inline-grid">
        <label class="upload-btn">Upload / replace photo<input data-image-upload type="file" accept="image/*" hidden></label>
        <input data-field="caption" value="${esc(b.caption||'')}" placeholder="Caption">
      </div>
      <div class="layout-control-grid">
        <label>Image size <strong data-size-readout>${width}%</strong><input data-field="width" data-live-size type="range" min="20" max="100" step="5" value="${width}"></label>
        <label>Alignment<select data-field="align"><option value="left" ${align==='left'?'selected':''}>Left</option><option value="center" ${align==='center'?'selected':''}>Center</option><option value="right" ${align==='right'?'selected':''}>Right</option></select></label>
        <label>Height<select data-field="heightMode"><option value="auto" ${heightMode==='auto'?'selected':''}>Auto</option><option value="fixed" ${heightMode==='fixed'?'selected':''}>Fixed</option></select></label>
        <label>Fixed height (px)<input data-field="height" type="number" min="120" max="900" step="20" value="${height}"></label>
      </div>`;
  }

  function galleryFields(b){
    const items=normGallery(b);
    const perRow=Math.max(1,Math.min(5,Number(b.perRow||b.columns)||3));
    const gap=Math.max(0,Math.min(48,Number(b.gap)||14));
    const height=Math.max(100,Math.min(800,Number(b.height)||320));
    const fit=b.fit==='contain'?'contain':'cover';
    return `
      <div class="gallery-admin-preview advanced-gallery-editor" data-gallery-preview></div>
      <textarea data-field="galleryItems" hidden>${esc(JSON.stringify(items))}</textarea>
      <div class="gallery-global-controls">
        <label>Photos per row<select data-field="perRow">${[1,2,3,4,5].map(n=>`<option value="${n}" ${perRow===n?'selected':''}>${n}</option>`).join('')}</select></label>
        <label>Gap <strong>${gap}px</strong><input data-field="gap" data-live-gap type="range" min="0" max="48" step="2" value="${gap}"></label>
        <label>Image height <strong>${height}px</strong><input data-field="height" data-live-height type="range" min="100" max="800" step="20" value="${height}"></label>
        <label>Image fit<select data-field="fit"><option value="cover" ${fit==='cover'?'selected':''}>Cover</option><option value="contain" ${fit==='contain'?'selected':''}>Contain</option></select></label>
      </div>
      <div class="gallery-add-row"><label class="upload-btn">+ Add photos<input data-gallery-upload type="file" accept="image/*" multiple hidden></label><button class="small" data-equalize>Equal widths</button><button class="small" data-clear-gallery>Clear gallery</button></div>`;
  }

  window.renderBlockEditor = function(blocks){
    const list=$('blockEditorList'); list.innerHTML='';
    blocks.forEach((b,i)=>{
      const el=document.createElement('div'); el.className='block-edit'; el.dataset.index=i;
      let fields='';
      if(b.type==='text'||b.type==='quote') fields=`<textarea data-field="text">${esc(b.text||'')}</textarea>`;
      if(b.type==='image') fields=imageFields(b);
      if(b.type==='gallery') fields=galleryFields(b);
      el.innerHTML=`<div class="block-edit-top"><strong>${b.type.toUpperCase()}</strong><div><button class="small" data-up>↑</button><button class="small" data-down>↓</button><button class="small" data-remove>Remove</button></div></div>${fields}`;
      el.querySelector('[data-up]').onclick=()=>moveBlock(i,-1);
      el.querySelector('[data-down]').onclick=()=>moveBlock(i,1);
      el.querySelector('[data-remove]').onclick=()=>removeBlock(i);

      const size=el.querySelector('[data-live-size]');
      if(size) size.oninput=()=>{el.querySelector('[data-size-readout]').textContent=size.value+'%'; const p=el.querySelector('[data-preview]'); if(p)p.style.width=size.value+'%';};

      const iu=el.querySelector('[data-image-upload]');
      if(iu) iu.onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const r=await uploadFile(f,1800,.84);el.querySelector('[data-field="url"]').value=r.url;const im=el.querySelector('[data-preview]');im.src=r.url;im.style.display='block';queueDraft()}catch(err){markCloud(err.message,'bad')}e.target.value=''};

      if(b.type==='gallery') setupGalleryEditor(el,b);
      list.appendChild(el);
    });
  };

  function getGalleryItems(el){
    try{return JSON.parse(el.querySelector('[data-field="galleryItems"]').value||'[]')}catch{return[]}
  }
  function setGalleryItems(el,items){el.querySelector('[data-field="galleryItems"]').value=JSON.stringify(items);renderGalleryEditor(el)}
  function renderGalleryEditor(el){
    const box=el.querySelector('[data-gallery-preview]'); if(!box)return;
    const items=getGalleryItems(el),perRow=Number(el.querySelector('[data-field="perRow"]').value)||3,fallback=100/perRow;
    box.innerHTML=items.map((it,j)=>{const w=Math.max(10,Math.min(100,Number(it.width)||fallback));return `<div class="ga-card"><div class="ga-thumb" style="background-image:url('${esc(it.url)}')"><button data-remove-photo="${j}">×</button></div><label>Width <strong>${Math.round(w)}%</strong><input type="range" min="10" max="100" step="5" value="${w}" data-photo-width="${j}"></label></div>`}).join('');
    box.querySelectorAll('[data-remove-photo]').forEach(btn=>btn.onclick=()=>{const arr=getGalleryItems(el);arr.splice(Number(btn.dataset.removePhoto),1);setGalleryItems(el,arr)});
    box.querySelectorAll('[data-photo-width]').forEach(inp=>inp.oninput=()=>{const arr=getGalleryItems(el),idx=Number(inp.dataset.photoWidth);arr[idx].width=Number(inp.value);el.querySelector('[data-field="galleryItems"]').value=JSON.stringify(arr);inp.parentElement.querySelector('strong').textContent=inp.value+'%'});
  }
  function setupGalleryEditor(el,b){
    renderGalleryEditor(el);
    const gu=el.querySelector('[data-gallery-upload]');
    gu.onchange=async e=>{const arr=getGalleryItems(el),perRow=Number(el.querySelector('[data-field="perRow"]').value)||3,fallback=100/perRow;for(const f of [...e.target.files]){try{const r=await uploadFile(f,1500,.82);arr.push({url:r.url,width:fallback})}catch(err){markCloud(err.message,'bad');break}}setGalleryItems(el,arr);queueDraft();e.target.value=''};
    el.querySelector('[data-clear-gallery]').onclick=()=>setGalleryItems(el,[]);
    el.querySelector('[data-equalize]').onclick=()=>{const arr=getGalleryItems(el),perRow=Number(el.querySelector('[data-field="perRow"]').value)||3,w=100/perRow;arr.forEach(x=>x.width=w);setGalleryItems(el,arr)};
    el.querySelector('[data-field="perRow"]').onchange=()=>{const arr=getGalleryItems(el),w=100/Number(el.querySelector('[data-field="perRow"]').value);arr.forEach(x=>{if(!x.width)x.width=w});setGalleryItems(el,arr)};
    const gap=el.querySelector('[data-live-gap]'); if(gap)gap.oninput=()=>gap.previousElementSibling.textContent=gap.value+'px';
    const h=el.querySelector('[data-live-height]'); if(h)h.oninput=()=>h.previousElementSibling.textContent=h.value+'px';
  }

  window.collectBlocks = function(){
    const s=data.sections.find(x=>x.id===editingSectionId),orig=s?.blocks||[];
    return [...document.querySelectorAll('#blockEditorList .block-edit')].map((el,i)=>{
      const type=orig[i]?.type||'text',obj={type};
      el.querySelectorAll('[data-field]').forEach(f=>{
        const k=f.dataset.field;
        if(k==='galleryItems'){
          try{obj.items=JSON.parse(f.value||'[]')}catch{obj.items=[]}
          obj.images=obj.items.map(x=>x.url);
        } else if(['width','height','perRow','gap'].includes(k)) obj[k]=Number(f.value);
        else obj[k]=f.value;
      });
      return obj;
    });
  };
})();
