/* Preferência local da responsável; não envia identificadores ao servidor. */
(() => {
  const KEY = 'as-site-excluir-meus-acessos-v1';
  const OWNER = '7e2fd9f8-959a-4d2d-b4e3-ffb46be58b91';
  let fallback = null;
  function preference() { try { return localStorage.getItem(KEY); } catch { return fallback; } }
  function save(value) { localStorage.setItem(KEY,value); fallback=value; }
  function ownerInThisTab() {
    try { return JSON.parse(sessionStorage.getItem('as-agenda-session-v1') || 'null')?.user?.id === OWNER; }
    catch { return false; }
  }
  function sync(owner = ownerInThisTab()) {
    let value=preference();
    if (value===null && owner) {
      fallback='1';
      try { save('1'); } catch {}
      value='1';
    }
    return value==='1';
  }
  window.AS_SITE_PRIVACY = { excluded:sync, rememberOwner:()=>sync(true),
    exclude:()=>save('1'), include:()=>save('0') };
  sync();
})();
