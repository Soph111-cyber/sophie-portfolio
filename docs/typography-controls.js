// Per-section typography controls + optional per Text/Quote block font-size overrides.
(function(){
  const clamp=(v,min,max,def)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):def};
  const defaults={titleSize:88,eyebrowSize:12,textSize:22,quoteSize:46,lineHeight:1.65};
  const getSection=()=>Array.isArray(data?.sections)?data.sections.find(s=>s.id===editingSectionId):null;
  const typo=s=>{if(!s.typography)s.typography={};return {...defaults,...s.typography};};

  function ensureTypographyPanel(){
    const editor=$('sectionEditor'); if(!editor) return null;
    let panel=$('sectionTypographyControls');
    if(panel) return panel;
    const grid=editor.querySelector('.editor-grid');
    panel=document.createElement('section');
    panel.id='sectionTypographyControls';
    panel.className='section-typography-controls';
    panel.innerHTML=`
      <div class="typography-head"><div><p class="eyebrow">TYPOGRAPHY</p><h4>Type sizes for this room</h4><p>Set the overall scale here. Individual Text and Quote blocks can still override their own size below.</p></div><button type="button" class="small" id="resetSectionTypography">Reset sizes</button></div>
      <div class="typography-grid">
        <label>Section title <strong data-readout="titleSize"></strong><input data-typo="titleSize" type="range" min="42" max="140" step="2"></label>
        <label>Small label / eyebrow <strong data-readout="eyebrowSize"></strong><input data-typo="eyebrowSize" type="range" min="9" max="24" step="1"></label>
        <label>Default text <strong data-readout="textSize"></strong><input data-typo="textSize" type="range" min="12" max="42" step="1"></label>
        <label>Default quote <strong data-readout="quoteSize"></strong><input data-typo="quoteSize" type="range" min="20" max="84" step="2"></label>
        <label>Text line height <strong data-readout="lineHeight"></strong><input data-typo="lineHeight" type="range" min="1.1" max="2.2" step="0.05"></label>
      </div>`;
    grid.after(panel);
    panel.querySelectorAll('[data-typo]').forEach(inp=>{
      inp.addEventListener('input',()=>{
        const s=getSection();if(!s)return;
        s.typography=s.typography||{};
        const k=inp.dataset.typo;
        s.typography[k]=Number(inp.value);
        updateReadout(inp);
        queueDraft();
      });
    });
    $('resetSectionTypography').onclick=()=>{
      const s=getSection();if(!s)return;
      s.typography={...defaults};hydrateTypography();queueDraft();
    };
    return panel;
  }

  function updateReadout(inp){
    const out=document.querySelector(`[data-readout="${inp.dataset.typo}"]`);if(!out)return;
    out.textContent=inp.dataset.typo==='lineHeight'?Number(inp.value).toFixed(2):`${Math.round(Number(inp.value))}px`;
  }

  function hydrateTypography(){
    ensureTypographyPanel();
    const s=getSection();if(!s)return;
    const t=typo(s);
    document.querySelectorAll('#sectionTypographyControls [data-typo]').forEach(inp=>{inp.value=t[inp.dataset.typo];updateReadout(inp)});
  }

  const oldOpenEditor=window.openSectionEditor;
  if(typeof oldOpenEditor==='function'){
    window.openSectionEditor=function(id){oldOpenEditor(id);setTimeout(()=>{ensureTypographyPanel();hydrateTypography();decorateBlockTypography()},0)};
  }

  function decorateBlockTypography(){
    const s=getSection();if(!s)return;
    const blocks=s.blocks||[];
    document.querySelectorAll('#blockEditorList .block-edit').forEach((el,i)=>{
      const b=blocks[i];if(!b||!['text','quote'].includes(b.type)||el.querySelector('.block-typography-control'))return;
      const isQuote=b.type==='quote',def=isQuote?typo(s).quoteSize:typo(s).textSize;
      const hasCustom=Number.isFinite(Number(b.fontSize));
      const wrap=document.createElement('div');wrap.className='block-typography-control';
      wrap.innerHTML=`<label>Font size <select data-block-font-mode><option value="default" ${hasCustom?'':'selected'}>Use section default</option><option value="custom" ${hasCustom?'selected':''}>Custom size</option></select></label><label class="block-size-slider">Custom size <strong>${Math.round(hasCustom?Number(b.fontSize):def)}px</strong><input data-block-font-size type="range" min="${isQuote?20:12}" max="${isQuote?96:54}" step="1" value="${Math.round(hasCustom?Number(b.fontSize):def)}" ${hasCustom?'':'disabled'}></label>`;
      el.appendChild(wrap);
      const mode=wrap.querySelector('[data-block-font-mode]'),range=wrap.querySelector('[data-block-font-size]'),read=wrap.querySelector('strong');
      mode.onchange=()=>{range.disabled=mode.value!=='custom';syncBlockFont(el,i);};
      range.oninput=()=>{read.textContent=range.value+'px';syncBlockFont(el,i);};
    });
  }

  function syncBlockFont(el,i){
    const s=getSection();if(!s||!s.blocks?.[i])return;
    const mode=el.querySelector('[data-block-font-mode]')?.value;
    if(mode==='custom')s.blocks[i].fontSize=Number(el.querySelector('[data-block-font-size]').value);
    else delete s.blocks[i].fontSize;
    queueDraft();
  }

  const oldRenderBlockEditor=window.renderBlockEditor;
  if(typeof oldRenderBlockEditor==='function'){
    window.renderBlockEditor=function(blocks){oldRenderBlockEditor(blocks);setTimeout(decorateBlockTypography,0)};
  }

  const oldCollect=window.collectBlocks;
  if(typeof oldCollect==='function'){
    window.collectBlocks=function(){
      const result=oldCollect();
      document.querySelectorAll('#blockEditorList .block-edit').forEach((el,i)=>{
        const mode=el.querySelector('[data-block-font-mode]')?.value;
        const range=el.querySelector('[data-block-font-size]');
        if(result[i]&&mode==='custom'&&range)result[i].fontSize=Number(range.value);
        else if(result[i])delete result[i].fontSize;
      });
      return result;
    };
  }

  const oldBlockHTML=window.blockHTML;
  if(typeof oldBlockHTML==='function'){
    window.blockHTML=function(b){
      if(b?.type==='text'){
        const style=Number.isFinite(Number(b.fontSize))?` style="font-size:${clamp(b.fontSize,12,54,22)}px"`:'';
        return `<div class="content-block block-text"${style}>${esc(b.text||'').replace(/\n/g,'<br>')}</div>`;
      }
      if(b?.type==='quote'){
        const style=Number.isFinite(Number(b.fontSize))?` style="font-size:${clamp(b.fontSize,20,96,46)}px"`:'';
        return `<blockquote class="content-block block-quote"${style}>${esc(b.text||'').replace(/\n/g,'<br>')}</blockquote>`;
      }
      return oldBlockHTML(b);
    };
  }

  function applySectionTypography(id){
    const s=data.sections.find(x=>x.id===id);if(!s)return;
    const t=typo(s),root=$('explore');
    root.style.setProperty('--section-title-size',clamp(t.titleSize,42,140,88)+'px');
    root.style.setProperty('--section-eyebrow-size',clamp(t.eyebrowSize,9,24,12)+'px');
    root.style.setProperty('--section-text-size',clamp(t.textSize,12,42,22)+'px');
    root.style.setProperty('--section-quote-size',clamp(t.quoteSize,20,84,46)+'px');
    root.style.setProperty('--section-line-height',clamp(t.lineHeight,1.1,2.2,1.65));
  }

  const oldOpenSection=window.openSection;
  if(typeof oldOpenSection==='function'){
    window.openSection=function(id){oldOpenSection(id);applySectionTypography(id)};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureTypographyPanel);else ensureTypographyPanel();
})();
