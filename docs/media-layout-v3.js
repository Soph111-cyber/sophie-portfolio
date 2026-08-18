// Media Layout V3: captions per image, caption font size, and multiple media groups per row.
(function(){
  const previousBlockHTML = window.blockHTML;

  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||min));
  const safeItems=b=>{
    if(Array.isArray(b.items)&&b.items.length){
      return b.items.map(x=>typeof x==='string'?{url:x}:x).filter(x=>x&&x.url).map(x=>({
        url:x.url,
        width:clamp(x.width||33.333,10,100),
        caption:x.caption||'',
        captionSize:clamp(x.captionSize||13,9,32)
      }));
    }
    return (b.images||[]).filter(Boolean).map(u=>({url:u,width:33.333,caption:'',captionSize:13}));
  };

  function cap(text,size,cls=''){
    if(!text) return '';
    return `<figcaption class="media-caption ${cls}" style="--caption-size:${clamp(size||13,9,32)}px">${esc(text)}</figcaption>`;
  }

  function groupStyle(b){
    return `--group-width:${clamp(b.groupWidth||100,20,100)}%;`;
  }

  function rowHTML(b,kind){
    const items=safeItems(b);
    const perRow=clamp(b.perRow||b.columns||3,1,5);
    const gap=clamp(b.gap||14,0,48);
    const height=clamp(b.height||320,100,800);
    const fit=b.fit==='contain'?'contain':'cover';
    const fallback=100/perRow;
    return `<div class="content-block media-block-unit ${kind==='gallery'?'gallery gallery-flex':'image-row-block'}" style="${groupStyle(b)}--row-gap:${gap}px">${items.map((it,i)=>{
      const w=clamp(it.width||fallback,10,100);
      return `<figure class="image-row-item" style="--row-item-width:${w}%;--row-height:${height}px"><img src="${esc(it.url)}" alt="Image ${i+1}" style="object-fit:${fit}">${cap(it.caption,it.captionSize,'row-caption')}</figure>`;
    }).join('')}</div>`;
  }

  window.blockHTML=function(b){
    if(b.type==='image'&&b.url){
      const width=clamp(b.width||100,20,100);
      const align=['left','center','right'].includes(b.align)?b.align:'center';
      const fixed=b.heightMode==='fixed';
      const height=fixed?clamp(b.height||420,120,900):null;
      return `<figure class="content-block media-block-unit block-image advanced-image ${esc(b.layout||'editorial')} align-${align} ${fixed?'fixed-height':''}" style="${groupStyle(b)}--image-width:${width}%;${height?`--image-height:${height}px;`:''}"><img src="${esc(b.url)}" alt="Photo">${cap(b.caption,b.captionSize||13,'single-caption')}</figure>`;
    }
    if(b.type==='imageRow') return rowHTML(b,'row');
    if(b.type==='gallery') return rowHTML(b,'gallery');
    return previousBlockHTML?previousBlockHTML(b):'';
  };

  function imageFields(b){
    const width=clamp(b.width||100,20,100), groupWidth=clamp(b.groupWidth||100,20,100);
    const align=b.align||'center', heightMode=b.heightMode||'auto', height=clamp(b.height||420,120,900), captionSize=clamp(b.captionSize||13,9,32);
    return `
      <div class="layout-preview-wrap"><img class="preview-img" data-preview src="${esc(b.url||'')}" style="${b.url?'':'display:none'}"></div>
      <input data-field="url" type="hidden" value="${esc(b.url||'')}">
      <div class="inline-grid"><label class="upload-btn">Upload / replace photo<input data-image-upload type="file" accept="image/*" hidden></label><input data-field="caption" value="${esc(b.caption||'')}" placeholder="Caption for this photo"></div>
      <div class="layout-control-grid">
        <label>Caption size <strong data-caption-size-readout>${captionSize}px</strong><input data-field="captionSize" data-live-caption-size type="range" min="9" max="32" step="1" value="${captionSize}"></label>
        <label>Group width <strong data-group-width-readout>${groupWidth}%</strong><input data-field="groupWidth" data-live-group-width type="range" min="20" max="100" step="5" value="${groupWidth}"></label>
        <label>Image size <strong data-size-readout>${width}%</strong><input data-field="width" data-live-size type="range" min="20" max="100" step="5" value="${width}"></label>
        <label>Alignment<select data-field="align"><option value="left" ${align==='left'?'selected':''}>Left</option><option value="center" ${align==='center'?'selected':''}>Center</option><option value="right" ${align==='right'?'selected':''}>Right</option></select></label>
        <label>Height<select data-field="heightMode"><option value="auto" ${heightMode==='auto'?'selected':''}>Auto</option><option value="fixed" ${heightMode==='fixed'?'selected':''}>Fixed</option></select></label>
        <label>Fixed height (px)<input data-field="height" type="number" min="120" max="900" step="20" value="${height}"></label>
      </div>`;
  }

  function rowFields(b,label){
    const items=safeItems(b),perRow=clamp(b.perRow||b.columns||3,1,5),gap=clamp(b.gap||14,0,48),height=clamp(b.height||320,100,800),fit=b.fit==='contain'?'contain':'cover',groupWidth=clamp(b.groupWidth||100,20,100);
    return `
      <div class="row-help"><strong>${label}</strong><span>Each photo has its own caption, caption size, and width. Group width controls whether this whole block can sit beside another image group.</span></div>
      <div class="row-live-preview" data-row-live-preview></div>
      <div class="gallery-admin-preview advanced-gallery-editor" data-gallery-preview></div>
      <textarea data-field="galleryItems" hidden>${esc(JSON.stringify(items))}</textarea>
      <div class="gallery-global-controls">
        <label>Group width <strong data-group-width-readout>${groupWidth}%</strong><input data-field="groupWidth" data-live-group-width type="range" min="20" max="100" step="5" value="${groupWidth}"></label>
        <label>Photos on each row<select data-field="perRow">${[1,2,3,4,5].map(n=>`<option value="${n}" ${perRow===n?'selected':''}>${n}</option>`).join('')}</select></label>
        <label>Gap <strong>${gap}px</strong><input data-field="gap" data-live-gap type="range" min="0" max="48" step="2" value="${gap}"></label>
        <label>Image height <strong>${height}px</strong><input data-field="height" data-live-height type="range" min="100" max="800" step="20" value="${height}"></label>
        <label>Image fit<select data-field="fit"><option value="cover" ${fit==='cover'?'selected':''}>Crop to fill</option><option value="contain" ${fit==='contain'?'selected':''}>Show whole image</option></select></label>
      </div>
      <div class="gallery-add-row"><label class="upload-btn">+ Upload multiple photos<input data-gallery-upload type="file" accept="image/*" multiple hidden></label><button class="small" data-equalize>Make equal widths</button><button class="small" data-clear-gallery>Clear group</button></div>`;
  }

  function getItems(el){try{return JSON.parse(el.querySelector('[data-field="galleryItems"]').value||'[]')}catch{return[]}}
  function setItems(el,items){el.querySelector('[data-field="galleryItems"]').value=JSON.stringify(items);renderCards(el);renderPreview(el)}

  function renderPreview(el){
    const box=el.querySelector('[data-row-live-preview]');if(!box)return;
    const items=getItems(el),perRow=Number(el.querySelector('[data-field="perRow"]').value)||3,gap=Number(el.querySelector('[data-field="gap"]').value)||0,height=Number(el.querySelector('[data-field="height"]').value)||320,fit=el.querySelector('[data-field="fit"]').value||'cover',fallback=100/perRow;
    box.style.setProperty('--preview-gap',gap+'px');
    box.innerHTML=items.map((it,i)=>{const w=clamp(it.width||fallback,10,100),sz=clamp(it.captionSize||13,9,32);return `<figure class="row-preview-item" style="flex-basis:${w}%"><div style="height:${Math.min(180,height)}px"><img src="${esc(it.url)}" style="object-fit:${fit}" alt="preview ${i+1}"></div>${it.caption?`<figcaption style="font-size:${sz}px">${esc(it.caption)}</figcaption>`:''}<span>${Math.round(w)}%</span></figure>`}).join('');
  }

  function renderCards(el){
    const box=el.querySelector('[data-gallery-preview]');if(!box)return;
    const items=getItems(el),perRow=Number(el.querySelector('[data-field="perRow"]').value)||3,fallback=100/perRow;
    box.innerHTML=items.map((it,j)=>{const w=clamp(it.width||fallback,10,100),sz=clamp(it.captionSize||13,9,32);return `<div class="ga-card"><div class="ga-thumb" style="background-image:url('${esc(it.url)}')"><button data-remove-photo="${j}">×</button></div><label>Caption<input data-photo-caption="${j}" value="${esc(it.caption||'')}" placeholder="Write caption..."></label><label>Caption size <strong>${sz}px</strong><input type="range" min="9" max="32" step="1" value="${sz}" data-photo-caption-size="${j}"></label><label>Photo width <strong>${Math.round(w)}%</strong><input type="range" min="10" max="100" step="5" value="${w}" data-photo-width="${j}"></label></div>`}).join('');
    box.querySelectorAll('[data-remove-photo]').forEach(btn=>btn.onclick=()=>{const a=getItems(el);a.splice(Number(btn.dataset.removePhoto),1);setItems(el,a)});
    box.querySelectorAll('[data-photo-caption]').forEach(inp=>inp.oninput=()=>{const a=getItems(el),i=Number(inp.dataset.photoCaption);a[i].caption=inp.value;el.querySelector('[data-field="galleryItems"]').value=JSON.stringify(a);renderPreview(el)});
    box.querySelectorAll('[data-photo-caption-size]').forEach(inp=>inp.oninput=()=>{const a=getItems(el),i=Number(inp.dataset.photoCaptionSize);a[i].captionSize=Number(inp.value);el.querySelector('[data-field="galleryItems"]').value=JSON.stringify(a);inp.parentElement.querySelector('strong').textContent=inp.value+'px';renderPreview(el)});
    box.querySelectorAll('[data-photo-width]').forEach(inp=>inp.oninput=()=>{const a=getItems(el),i=Number(inp.dataset.photoWidth);a[i].width=Number(inp.value);el.querySelector('[data-field="galleryItems"]').value=JSON.stringify(a);inp.parentElement.querySelector('strong').textContent=inp.value+'%';renderPreview(el)});
  }

  function equalize(el){const a=getItems(el),n=Number(el.querySelector('[data-field="perRow"]').value)||3,w=100/n;a.forEach(x=>x.width=w);setItems(el,a)}

  function setupRow(el){
    renderCards(el);renderPreview(el);
    const upload=el.querySelector('[data-gallery-upload]');
    upload.onchange=async e=>{const a=getItems(el),n=Number(el.querySelector('[data-field="perRow"]').value)||3,w=100/n;for(const f of [...e.target.files]){try{const r=await uploadFile(f,1500,.82);a.push({url:r.url,width:w,caption:'',captionSize:13})}catch(err){markCloud(err.message,'bad');break}}setItems(el,a);queueDraft();e.target.value=''};
    el.querySelector('[data-clear-gallery]').onclick=()=>setItems(el,[]);
    el.querySelector('[data-equalize]').onclick=()=>equalize(el);
    el.querySelector('[data-field="perRow"]').onchange=()=>equalize(el);
    const gap=el.querySelector('[data-live-gap]');if(gap)gap.oninput=()=>{gap.previousElementSibling.textContent=gap.value+'px';renderPreview(el)};
    const h=el.querySelector('[data-live-height]');if(h)h.oninput=()=>{h.previousElementSibling.textContent=h.value+'px';renderPreview(el)};
    const gw=el.querySelector('[data-live-group-width]');if(gw)gw.oninput=()=>gw.parentElement.querySelector('[data-group-width-readout]').textContent=gw.value+'%';
    el.querySelector('[data-field="fit"]').onchange=()=>renderPreview(el);
  }

  window.renderBlockEditor=function(blocks){
    const list=$('blockEditorList');list.innerHTML='';
    blocks.forEach((b,i)=>{
      const el=document.createElement('div');el.className='block-edit';el.dataset.index=i;
      let fields='';
      if(b.type==='text'||b.type==='quote') fields=`<textarea data-field="text">${esc(b.text||'')}</textarea>`;
      if(b.type==='image') fields=imageFields(b);
      if(b.type==='imageRow') fields=rowFields(b,'IMAGE ROW');
      if(b.type==='gallery') fields=rowFields(b,'GALLERY');
      el.innerHTML=`<div class="block-edit-top"><strong>${b.type==='imageRow'?'IMAGE ROW':b.type.toUpperCase()}</strong><div><button class="small" data-up>↑</button><button class="small" data-down>↓</button><button class="small" data-remove>Remove</button></div></div>${fields}`;
      el.querySelector('[data-up]').onclick=()=>moveBlock(i,-1);el.querySelector('[data-down]').onclick=()=>moveBlock(i,1);el.querySelector('[data-remove]').onclick=()=>removeBlock(i);
      const size=el.querySelector('[data-live-size]');if(size)size.oninput=()=>{el.querySelector('[data-size-readout]').textContent=size.value+'%';const p=el.querySelector('[data-preview]');if(p)p.style.width=size.value+'%'};
      const cs=el.querySelector('[data-live-caption-size]');if(cs)cs.oninput=()=>el.querySelector('[data-caption-size-readout]').textContent=cs.value+'px';
      const gw=el.querySelector('[data-live-group-width]');if(gw)gw.oninput=()=>el.querySelector('[data-group-width-readout]').textContent=gw.value+'%';
      const iu=el.querySelector('[data-image-upload]');if(iu)iu.onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const r=await uploadFile(f,1800,.84);el.querySelector('[data-field="url"]').value=r.url;const im=el.querySelector('[data-preview]');im.src=r.url;im.style.display='block';queueDraft()}catch(err){markCloud(err.message,'bad')}e.target.value=''};
      if(b.type==='imageRow'||b.type==='gallery')setupRow(el);
      list.appendChild(el);
    });
  };

  window.collectBlocks=function(){
    const s=data.sections.find(x=>x.id===editingSectionId),orig=s?.blocks||[];
    return [...document.querySelectorAll('#blockEditorList .block-edit')].map((el,i)=>{
      const type=orig[i]?.type||'text',obj={type};
      el.querySelectorAll('[data-field]').forEach(f=>{
        const k=f.dataset.field;
        if(k==='galleryItems'){try{obj.items=JSON.parse(f.value||'[]')}catch{obj.items=[]}obj.images=obj.items.map(x=>x.url)}
        else if(['width','height','perRow','gap','captionSize','groupWidth'].includes(k))obj[k]=Number(f.value);
        else obj[k]=f.value;
      });
      return obj;
    });
  };

  function groupMediaBlocks(){
    const root=$('exploreContent');if(!root)return;
    const children=[...root.children];
    let row=null;
    children.forEach(ch=>{
      if(ch.classList.contains('media-block-unit')){
        if(!row){row=document.createElement('div');row.className='media-flow-row';root.insertBefore(row,ch)}
        row.appendChild(ch);
      }else row=null;
    });
  }

  const oldOpenSection=openSection;
  openSection=function(id){oldOpenSection(id);groupMediaBlocks()};
})();
