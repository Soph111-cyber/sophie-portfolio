// Image performance layer: prioritize landing photos, intelligently prefetch room media,
// and upload future images as smaller WebP files.
(function(){
  const STORAGE_ORIGIN='https://ddpctbzxgiilncumkyje.supabase.co';
  const warmed=new Set();
  const warming=new Set();

  // Start the storage connection as early as possible.
  if(!document.querySelector('link[data-storage-preconnect]')){
    const l=document.createElement('link');
    l.rel='preconnect';l.href=STORAGE_ORIGIN;l.crossOrigin='anonymous';l.dataset.storagePreconnect='1';
    document.head.appendChild(l);
  }
  if(!document.querySelector('link[data-storage-dns]')){
    const l=document.createElement('link');
    l.rel='dns-prefetch';l.href=STORAGE_ORIGIN;l.dataset.storageDns='1';
    document.head.appendChild(l);
  }

  function sectionUrls(section){
    const urls=[];
    if(section?.bg)urls.push(section.bg);
    (section?.blocks||[]).forEach(b=>{
      if(b.type==='image'&&b.url)urls.push(b.url);
      if(b.type==='imageRow'){
        (b.items||[]).forEach(it=>{const u=typeof it==='string'?it:it?.url;if(u)urls.push(u)});
        (b.images||[]).forEach(u=>u&&urls.push(u));
      }
      if(b.type==='gallery'){
        (b.items||[]).forEach(it=>{const u=typeof it==='string'?it:it?.url;if(u)urls.push(u)});
        (b.images||[]).forEach(u=>u&&urls.push(u));
      }
    });
    return [...new Set(urls)];
  }

  function warmUrl(url,priority='auto'){
    if(!url||warmed.has(url)||warming.has(url))return;
    warming.add(url);
    const img=new Image();
    img.decoding='async';
    try{img.fetchPriority=priority}catch{}
    img.onload=img.onerror=()=>{warming.delete(url);warmed.add(url)};
    img.src=url;
  }

  function prefetchSection(section,all=false){
    if(!section)return;
    const urls=sectionUrls(section);
    const limit=all?urls.length:Math.min(3,urls.length);
    for(let i=0;i<limit;i++){
      setTimeout(()=>warmUrl(urls[i],i<2?'high':'auto'),i*45);
    }
  }

  function idleWarmRooms(){
    const sections=(typeof data!=='undefined'&&Array.isArray(data.sections))?data.sections:[];
    const run=()=>sections.forEach((s,i)=>setTimeout(()=>prefetchSection(s,false),i*180));
    if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1200});
    else setTimeout(run,350);
  }

  function tuneImage(img){
    if(!(img instanceof HTMLImageElement))return;
    img.decoding='async';
    if(img.closest('#landingPhotoBoard,.landing-photo-board')){
      img.loading='eager';
      const pics=[...document.querySelectorAll('#landingPhotoBoard img,.landing-photo-board img')];
      const i=pics.indexOf(img);
      img.fetchPriority=(i>=0&&i<4)?'high':'auto';
    }else if(img.closest('#exploreContent')){
      // Current room: load the first visible images aggressively, then let the rest stream in.
      const pics=[...document.querySelectorAll('#exploreContent img')];
      const i=pics.indexOf(img);
      if(i>=0&&i<6){img.loading='eager';img.fetchPriority=i<3?'high':'auto';}
      else{img.loading='lazy';img.fetchPriority='auto';}
    }else if(img.closest('.content-block,.gallery,.image-row-block')){
      img.loading='lazy';img.fetchPriority='auto';
    }
  }

  function tuneAll(root=document){
    if(root instanceof HTMLImageElement)tuneImage(root);
    root.querySelectorAll?.('img').forEach(tuneImage);
  }

  function bindRoomPrefetch(){
    const cards=[...document.querySelectorAll('#sectionGrid .room-card')];
    const sections=(typeof data!=='undefined'&&Array.isArray(data.sections))?data.sections:[];
    cards.forEach((card,i)=>{
      if(card.dataset.prefetchBound)return;
      card.dataset.prefetchBound='1';
      const warm=()=>prefetchSection(sections[i],true);
      card.addEventListener('pointerenter',warm,{passive:true});
      card.addEventListener('focus',warm,{passive:true});
      card.addEventListener('touchstart',warm,{passive:true,once:true});
    });
  }

  tuneAll();
  new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(n=>{
    if(n.nodeType===1){tuneAll(n);if(n.id==='sectionGrid'||n.querySelector?.('#sectionGrid'))bindRoomPrefetch();}
  }))).observe(document.documentElement,{childList:true,subtree:true});

  // Patch hub rendering so every freshly rendered card gets prefetch listeners.
  if(typeof renderHub==='function'){
    const oldRenderHub=renderHub;
    renderHub=function(){oldRenderHub();bindRoomPrefetch();idleWarmRooms();};
  }

  // Warm a room immediately before entering it, then prioritize its first screenful.
  if(typeof openSection==='function'){
    const oldOpenSection=openSection;
    openSection=function(id){
      const section=(typeof data!=='undefined'&&Array.isArray(data.sections))?data.sections.find(s=>s.id===id):null;
      prefetchSection(section,true);
      oldOpenSection(id);
      requestAnimationFrame(()=>tuneAll(document.getElementById('exploreContent')||document));
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bindRoomPrefetch();idleWarmRooms();});
  else{bindRoomPrefetch();idleWarmRooms();}

  // Override future CMS uploads with smaller WebP assets.
  window.compressFile=async function(file,max=1400,q=.74){
    max=Math.min(Number(max)||1400,1400);
    q=Math.min(Number(q)||.74,.76);
    return await new Promise((resolve,reject)=>{
      const img=new Image(),url=URL.createObjectURL(file);
      img.onload=()=>{
        let w=img.width,h=img.height,s=Math.min(1,max/Math.max(w,h));
        w=Math.max(1,Math.round(w*s));h=Math.max(1,Math.round(h*s));
        const c=document.createElement('canvas');c.width=w;c.height=h;
        c.getContext('2d',{alpha:false}).drawImage(img,0,0,w,h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/webp',q));
      };
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read image'));};
      img.src=url;
    });
  };

  window.uploadFile=async function(file,max=1400,q=.74){
    if(typeof markCloud==='function')markCloud('Optimizing image…');
    const dataUrl=await window.compressFile(file,max,q);
    const base64=dataUrl.split(',')[1];
    const j=await api('upload',{mime:'image/webp',base64},true);
    if(typeof markCloud==='function')markCloud('Image uploaded ✓','good');
    return {url:j.url,preview:dataUrl};
  };
})();
