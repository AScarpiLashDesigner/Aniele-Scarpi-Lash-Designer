(() => {
  const root = document.getElementById('root');
  if (!root) return;
  function install() {
    const nav = root.querySelector('.sidebar nav');
    if (!nav || document.getElementById('as-acessos-nav')) return;
    const button = document.createElement('button');
    button.id = 'as-acessos-nav'; button.type = 'button';
    button.textContent = '↗ Acessos do site';
    button.onclick = () => location.href = './acessos.html';
    nav.append(button);
  }
  new MutationObserver(install).observe(root,{childList:true,subtree:true}); install();
})();
