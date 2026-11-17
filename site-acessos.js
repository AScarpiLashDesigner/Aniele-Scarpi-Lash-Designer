/* Contagem agregada: sem cookies, identificadores ou dados dos formulários. */
(() => {
  'use strict';
  const cfg = window.AS_AGENDA_CONFIG;
  if (!cfg?.url || !cfg?.key || !/^https?:$/.test(location.protocol)) return;
  if (window.AS_SITE_PRIVACY?.excluded()) return;
  const pagina = /\/agendar\.html$/.test(location.pathname) ? 'agendamento' : 'inicio';
  function category(value) {
    const s = value.toLowerCase();
    if (/^(instagram|ig)$/.test(s) || /(^|\.)instagram\.com$/.test(s)) return 'instagram';
    if (/^google$/.test(s) || /(^|\.)google\.[a-z.]+$/.test(s)) return 'google';
    if (/^(facebook|fb)$/.test(s) || /(^|\.)facebook\.com$/.test(s)) return 'facebook';
    return 'outros';
  }
  function source() {
    const utm = new URLSearchParams(location.search).get('utm_source');
    let ref; try { ref = document.referrer ? new URL(document.referrer) : null; } catch {}
    let result = utm ? category(utm) : ref && ref.origin !== location.origin ? category(ref.hostname) : 'direto';
    try {
      const last = JSON.parse(sessionStorage.getItem('as-site-origem') || 'null');
      if (!utm && (!ref || ref.origin === location.origin) && last?.ate > Date.now() &&
          ['instagram','google','facebook','direto','outros'].includes(last.origem)) result = last.origem;
      sessionStorage.setItem('as-site-origem', JSON.stringify({origem:result,ate:Date.now()+1800000}));
    } catch {}
    return result;
  }
  const origem = source();
  function send(evento) {
    if (window.AS_SITE_PRIVACY?.excluded()) return;
    // Falhas na estatística nunca impedem navegar ou agendar.
    fetch(cfg.url + '/rest/v1/site_eventos', {
      method:'POST', headers:{apikey:cfg.key,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify({evento,pagina,origem}), keepalive:true, credentials:'omit',
      referrerPolicy:'no-referrer'
    }).catch(() => {});
  }
  send('visita');
  document.addEventListener('click', e => {
    const anchor = e.target.closest?.('a[href]');
    if (!anchor) return;
    let url; try { url = new URL(anchor.href, location.href); } catch { return; }
    if (['wa.me','api.whatsapp.com','web.whatsapp.com'].includes(url.hostname)) send('whatsapp');
    else if (url.origin === location.origin && /\/agendar\.html$/.test(url.pathname)) send('agendar');
  }, {capture:true});
})();
