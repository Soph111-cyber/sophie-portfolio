// Keep Math Corner photos fully visible without changing other rooms.
(function(){
  const prevOpenSection = window.openSection;
  if (typeof prevOpenSection !== 'function') return;

  function forceFullImages(content){
    if(!content) return;

    // Remove any fixed/cropping geometry from Math Corner image containers.
    content.querySelectorAll('.image-row-item, .gallery figure, .advanced-image, .block-image').forEach(el=>{
      el.style.setProperty('height','auto','important');
      el.style.setProperty('max-height','none','important');
      el.style.setProperty('overflow','visible','important');
      el.style.setProperty('aspect-ratio','auto','important');
    });

    // Force the actual image element to use its natural aspect ratio.
    content.querySelectorAll('.image-row-item img, .gallery img, .advanced-image img, .block-image img').forEach(img=>{
      img.style.setProperty('display','block','important');
      img.style.setProperty('width','100%','important');
      img.style.setProperty('max-width','100%','important');
      img.style.setProperty('height','auto','important');
      img.style.setProperty('max-height','none','important');
      img.style.setProperty('min-height','0','important');
      img.style.setProperty('object-fit','contain','important');
      img.style.setProperty('object-position','center center','important');
      img.style.setProperty('aspect-ratio','auto','important');
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
