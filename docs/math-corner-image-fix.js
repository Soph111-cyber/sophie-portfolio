// Keep Math Corner photos fully visible without changing other rooms.
(function(){
  const prevOpenSection = window.openSection;
  if (typeof prevOpenSection !== 'function') return;

  window.openSection = function(id){
    prevOpenSection(id);
    const explore = document.getElementById('explore');
    const content = document.getElementById('exploreContent');
    if (!explore || !content) return;

    const label = content.querySelector('.eyebrow')?.textContent || '';
    const title = content.querySelector('.room-title')?.textContent || '';
    const isMathCorner = /math\s*corner/i.test(`${label} ${title}`);
    explore.classList.toggle('math-corner-full-images', isMathCorner);
  };
})();
