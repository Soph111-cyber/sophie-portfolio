// Image performance layer: prioritize visible landing photos, lazy-load room media,
// and upload future images as smaller WebP files.
(function(){
  const STORAGE_ORIGIN='https://ddpctbzxgiilncumkyje.supabase.co';

  // Start the storage connection as early as possible.
  if(!document.querySelector('link[data-storage-preconnect]')){
    const l=document.createElement('link');
    l.rel='preconnect';l.href=STORAGE_ORIGIN;l.crossOrigin='anonymous';l.dataset.storagePreconnect='1';
    document.head.appendChild(l);
  }

  function tuneImage(img){
    if(!(img instanceof HTMLImageElement))return;
    img.decoding='async';
    if(img.closest('#landingPhotoBoard,.landing-photo-board')){
      img.loading='eager';
      const pics=[...document.querySelectorAll('#landingPhotoBoard img,.landing-photo-board img')];
      const i=pics.indexOf(img);
      img.fetchPriority=(i>=0&&i<4)?'high':'auto';
    }else if(img.closest('#exploreContent,.content-block,.gallery,.image-row-block')){
      img.loading='lazy';
      img.fetchPriority='low';
    }
  }

  function tuneAll(root=document){
    if(root instanceof HTMLImageElement)tuneImage(root);
    root.querySelectorAll?.('img').forEach(tuneImage);
  }

  tuneAll();
  new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(n=>{
    if(n.nodeType===1)tuneAll(n);
  }))).observe(document.documentElement,{childList:true,subtree:true});

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
