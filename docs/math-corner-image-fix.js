// Keep Math Corner photos fully visible without changing other rooms.
(function(){
  const prevOpenSection = window.openSection;
  if (typeof prevOpenSection !== 'function') return;

  function forceFullImages(content){
    if(!content) return;

    // Math Corner image rows are always exactly three columns on desktop.
    content.querySelectorAll('.v4-row-images').forEach(row=>{
      row.style.setProperty('display','grid','important');
      row.style.setProperty('grid-template-columns','repeat(3,minmax(0,1fr))','important');
      row.style.setProperty('gap','14px','important');
      row.style.setProperty('align-items','start','important');
      row.style.setProperty('width','100%','important');
    });

    // Ignore per-photo width/height values saved in the CMS for Math Corner.
    content.querySelectorAll('.image-row-item, .gallery figure, .advanced-image, .block-image').forEach(el=>{
      el.style.setProperty('width','auto','important');
      el.style.setProperty('max-width','none','important');
      el.style.setProperty('min-width','0','important');
      el.style.setProperty('height','auto','important');
      el.style.setProperty('max-height','none','important');
      el.style.setProperty('overflow','visible','important');
      el.style.setProperty('aspect-ratio','auto','important');
      el.style.setProperty('flex','none','important');
    });

    // Keep the existing, known-good image URL. Only change layout/cropping behavior.
    content.querySelectorAll('.image-row-item img, .gallery img, .advanced-image img, .block-image img').forEach(img=>{
      img.removeAttribute('width');
      img.removeAttribute('height');
      img.style.setProperty('display','block','important');
      img.style.setProperty('width','100%','important');
      img.style.setProperty('max-width','100%','important');
      img.style.setProperty('height','auto','important');
      img.style.setProperty('max-height','none','important');
      img.style.setProperty('min-height','0','important');
      img.style.setProperty('object-fit','contain','important');
      img.style.setProperty('object-position','center center','important');
      img.style.setProperty('aspect-ratio','auto','important');
      img.loading='eager';
      try{img.fetchPriority='high'}catch{}
    });
  }

  window.openSection = function(id){
    prevOpenSection(id);
    const explore = document.getElementById('explore');
    const content = document.getElementById('exploreContent');
    if (!explore || !content) return;

    const label = content.querySelector('.eyebrow')?.textContent || '';
    const title = content.querySelector('.room-title')?.textContent || '';
    const isMathCorner = /math\s*corner/i.test(`${label} ${title}`);
    explore.classList.toggle('math-corner-full-images', isMathCorner);

    if(isMathCorner){
      forceFullImages(content);
      requestAnimationFrame(()=>forceFullImages(content));
      setTimeout(()=>forceFullImages(content),120);
    }
  };
})();
