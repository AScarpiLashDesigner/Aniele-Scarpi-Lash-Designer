(function () {
  'use strict';
  const overlay = document.createElement('div');
  overlay.id = 'as-free-overlay';
  overlay.innerHTML = `<section id="as-free-dialog" role="dialog" aria-modal="true" aria-labelledby="as-free-title" tabindex="-1">
    <div class="as-free-top"><div><p class="as-free-eyebrow">ANIELE SCARPI · DIVULGAÇÃO</p><h2 id="as-free-title">Sua agenda no Instagram</h2></div><button type="button" id="as-free-close" aria-label="Fechar">✕</button></div>
    <p class="as-free-note">Selecione as vagas que quer divulgar. Inícios a cada 30 minutos. Atendimentos de 2 horas, a partir das 08h, com último início às 20h e almoço das 12h às 13h.</p>
    <div class="as-free-toolbar"><label>Semana a partir de<input id="as-free-start" type="date" required></label><button type="button" id="as-free-reload">Atualizar horários</button></div>
    <div id="as-free-saved" class="as-free-actions" hidden><button type="button" id="as-free-saved-png">Baixar arte salva</button><button type="button" id="as-free-edit-saved">Editar arte salva</button><span class="as-free-note" id="as-free-saved-note"></span></div>
    <p id="as-free-status" role="status" aria-live="polite"></p>
    <div class="as-free-layout"><div><h3>1. Escolha os horários</h3><div class="as-free-actions"><button type="button" id="as-free-all">Selecionar todos</button><button type="button" id="as-free-clear">Limpar seleção</button></div><p class="as-free-note">Cada horário é uma opção de início. As vagas podem se sobrepor; a reserva é confirmada pela agenda.</p><div id="as-free-results"></div></div>
    <div><h3>2. Personalize sua imagem</h3><div class="as-free-fields"><label>Formato<select id="as-free-format"><option value="story">Story · 1080 × 1920</option><option value="feed">Feed · 1080 × 1350</option></select></label><label>Título<input id="as-free-heading" value="Horários disponíveis" maxlength="28"></label><label>Frase manuscrita<input id="as-free-call" value="da semana" maxlength="44"></label><label>Cor de destaque<input id="as-free-color" type="color" value="#a75f47"></label></div>
    <div id="as-free-preview" aria-label="Prévia da arte"></div><p class="as-free-note" id="as-free-count"></p><div class="as-free-actions"><button type="button" id="as-free-png" disabled>Salvar e baixar PNG</button><button type="button" id="as-free-svg" disabled>Baixar SVG editável</button></div><p class="as-free-note">Os horários são conferidos novamente antes do download. Baixe a imagem e publique no Instagram; acrescente seu link de agendamento no Story.</p>
    <section id="as-free-saved-preview" aria-labelledby="as-free-saved-title" hidden>
      <h3 id="as-free-saved-title">Última imagem salva</h3>
      <img id="as-free-saved-image" alt="Arte salva com os horários escolhidos para divulgação">
    </section></div></div></section>`;
  document.body.append(overlay);
  const $ = id => overlay.querySelector('#as-free-' + id);
  const status = $('status'), results = $('results'), input = $('start');
  let days = [], selected = new Set(), logo = '', background = '', designPromise, loaded = false, pending = false, revision = 0, opener;
  let savedArt, storagePromise;
  const session = () => JSON.parse(sessionStorage.getItem('as-agenda-session-v1') || 'null');
  function openArtStorage() {
    if (!storagePromise) {
      storagePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open('as-agenda-divulgacao', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('artes');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }).catch(error => {storagePromise = undefined; throw error;});
    }
    return storagePromise;
  }
  async function artStorage(owner, art) {
    const db = await openArtStorage();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('artes', 'readwrite');
      const store = transaction.objectStore('artes');
      let result = art;
      if (art) store.put(art, owner);
      else {
        const request = store.get(owner);
        request.onsuccess = () => {
          const stored = request.result;
          if (!stored) return;
          if (stored.lastDay < iso(new Date())) store.delete(owner);
          else result = stored;
        };
      }
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  function showSavedArt() {
    $('saved').hidden = !savedArt;
    $('saved').style.display = savedArt ? '' : 'none';
    $('saved-note').textContent = savedArt
      ? 'Disponível neste navegador até ' + label(savedArt.lastDay) + '. A imagem mantém os horários da versão salva. Confira a agenda antes de republicar.'
      : '';
    const image = $('saved-image');
    const previousUrl = image.getAttribute('src');
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    $('saved-preview').hidden = !savedArt;
    if (savedArt) image.src = URL.createObjectURL(savedArt.blob);
    else image.removeAttribute('src');
  }
  const iso = d => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  function shift(s,n) {const d=new Date(s+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10);}
  function minutes(s) {const m=/^(\d{1,2}):(\d{2})/.exec(String(s||'')); return m?Number(m[1])*60+Number(m[2]):NaN;}
  const hh = m => String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  const key = (date,time) => date+'|'+time;
  const escape = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const label = date => new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',timeZone:'UTC'});
  function freeFor(date, appointments) {
    const busy=appointments.filter(a=>a.date===date&&!['Cancelado','Não compareceu'].includes(a.status)).map(a=>({start:minutes(a.time),end:minutes(a.time)+(Number(a.duration)||120)})).filter(a=>Number.isFinite(a.start));
    const free=[], now=new Date(), today=iso(now);
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
    for(let start=480;start<=1200;start+=30) {
      const end=start+120;
      if(date<today||date===today&&start<=minutes(parts)||start<780&&end>720||busy.some(a=>start<a.end&&end>a.start))continue;
      free.push(hh(start));
    }
    return free;
  }
  async function query(first) {
    const s=session(), cfg=window.AS_AGENDA_CONFIG;
    if(!s?.user?.id||!s?.access_token||!cfg?.url||!cfg?.key)throw Error('Entre na agenda para consultar os horários.');
    const [resp,publicResponse]=await Promise.all([
      fetch(cfg.url+'/rest/v1/agenda_studio?owner_id=eq.'+encodeURIComponent(s.user.id)+'&select=data',{headers:{apikey:cfg.key,Authorization:'Bearer '+s.access_token},cache:'no-store',signal:AbortSignal.timeout(20000)}),
      fetch(cfg.url+'/functions/v1/agendamento-publico',{cache:'no-store',signal:AbortSignal.timeout(20000)})
    ]);
    if(!resp.ok)throw Error('Não foi possível consultar sua agenda. Atualize a página e entre novamente.');
    if(!publicResponse.ok)throw Error('Não foi possível sincronizar as solicitações pendentes. Tente atualizar.');
    const rows=await resp.json(), pub=await publicResponse.json();
    if(!rows.length)throw Error('Agenda não encontrada para esta conta.');
    if(!Array.isArray(pub.days))throw Error('A consulta de horários públicos está indisponível.');
    let data=rows[0].data||{}; if(typeof data==='string')data=JSON.parse(data);
    const publicSlots=new Map(pub.days.map(d=>[d.date,new Set(d.slots||[])]));
    return Array.from({length:7},(_,i)=>{const date=shift(first,i);return {date,available:date>=iso(new Date())&&date<=shift(iso(new Date()),30),times:freeFor(date,Array.isArray(data.appointments)?data.appointments:[]).filter(t=>publicSlots.get(date)?.has(t))};});
  }
  async function loadLogo() {
    if(logo)return;
    try {const response=await fetch('../imagens/logo.jpg');if(!response.ok)return;const blob=await response.blob();logo=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>resolve('');r.readAsDataURL(blob);});}catch{}
  }
  function loadDesign() {
    if(designPromise)return designPromise;
    const fontJob=window.AS_POSTER_FONTS?Promise.resolve():new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='./assets/poster-fonts.js?v=20261116-floral1';
      const timer=setTimeout(()=>{script.remove();reject(Error('Não foi possível carregar as fontes da arte.'));},20000);script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('Não foi possível carregar as fontes da arte.'));};document.head.append(script);
    });
    const backgroundJob=background?Promise.resolve():fetch('./assets/poster-floral.jpg?v=20261116-floral1',{signal:AbortSignal.timeout(20000)}).then(r=>{if(!r.ok)throw Error('Não foi possível carregar o fundo da arte.');return r.blob();}).then(blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{background=String(reader.result);resolve();};reader.onerror=()=>reject(Error('Não foi possível abrir o fundo da arte.'));reader.readAsDataURL(blob);}));
    designPromise=Promise.all([fontJob,backgroundJob]).catch(e=>{designPromise=null;throw e;});return designPromise;
  }
  function renderDays() {
    results.replaceChildren();
    for(const day of days) {
      const section=document.createElement('section');section.className='as-free-day';
      const title=document.createElement('h4');title.textContent=label(day.date);
      const times=document.createElement('div');times.className='as-free-times';
      if(!day.times.length){const none=document.createElement('p');none.textContent=day.available?'Sem horários livres':'Fora do período disponível para agendamento';times.append(none);}
      for(const time of day.times) {
        const field=document.createElement('label'),box=document.createElement('input'),text=document.createElement('span');
        box.type='checkbox';box.value=key(day.date,time);box.checked=selected.has(box.value);
        box.onchange=()=>{box.checked?selected.add(box.value):selected.delete(box.value);preview();};
        text.textContent=time;field.append(box,text);times.append(field);
      }
      section.append(title,times);results.append(section);
    }
  }
  function chosen() {return days.map(d=>({date:d.date,times:d.times.filter(t=>selected.has(key(d.date,t)))})).filter(d=>d.times.length);}
  // Preview and PNG use glyph outlines so the saved art never falls back to a system font.
  // SVG keeps editable text and embeds the licensed fonts for editors that support them.
  function artwork(outlined = true) {
    const feed=$('format').value==='feed',height=feed?1350:1920;
    const accent=/^#[a-f0-9]{6}$/i.test($('color').value)?$('color').value:'#a75f47',ink='#3b211a';
    const fonts=window.AS_POSTER_FONTS, rows=chosen();
    if(!fonts||!background)return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 ${height}"><rect width="1080" height="${height}" fill="#f8eee7"/></svg>`;
    const faces={anton:'ASAnton',allura:'ASAllura',cormorantgaramond:'ASCormorant'};
    function text(x,y,size,value,font='cormorantgaramond',fill=ink,anchor='middle',maxWidth=900) {
      value=String(value);const face=fonts[font],glyphs=[...value].map(c=>face.glyphs[c]||face.glyphs['?']);
      const width=glyphs.reduce((n,g)=>n+g.w,0)/face.units*size,ratio=Math.min(1,maxWidth/Math.max(width,1));size*=ratio;
      if(!outlined)return `<text x="${x}" y="${y}" font-family="${faces[font]}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${escape(value)}</text>`;
      const left=x-(anchor==='middle'?width*ratio/2:anchor==='end'?width*ratio:0),scale=size/face.units;
      let cursor=0;const paths=glyphs.map(g=>{const path=g.d?`<path d="${g.d}" transform="translate(${cursor} 0)"/>`:'';cursor+=g.w;return path;}).join('');
      return `<g aria-label="${escape(value)}" fill="${fill}" transform="translate(${left} ${y}) scale(${scale} ${-scale})">${paths}</g>`;
    }
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="${height}" viewBox="0 0 1080 ${height}" role="img" aria-label="Horários disponíveis de Aniele Scarpi">`;
    if(!outlined)svg+='<defs><style>'+Object.entries(fonts).map(([name,font])=>`@font-face{font-family:${faces[name]};src:url(data:font/ttf;base64,${font.data}) format("truetype");}`).join('')+'</style></defs>';
    svg+=`<rect width="1080" height="${height}" fill="#f8eee7"/><image width="1080" height="${height}" preserveAspectRatio="xMidYMin slice" xlink:href="${escape(background)}"/>`;
    // Original logo stays intact; the pale backing is part of the user's original image.
    if(logo)svg+=`<image x="65" y="${feed?37:95}" width="490" height="${feed?135:185}" style="mix-blend-mode:multiply" preserveAspectRatio="xMidYMid meet" xlink:href="${escape(logo)}"/>`;
    else svg+=text(300,feed?130:220,79,'Aniele Scarpi','allura',accent,'middle',470);
    const heading=($('heading').value||'Horários disponíveis').trim().split(/\s+/),line1=heading.shift()||'Horários',line2=heading.join(' ');
    svg+=text(330,feed?240:370,feed?82:105,line1,'anton',ink,'middle',560);
    if(line2)svg+=text(330,feed?335:485,feed?86:106,line2,'anton',accent,'middle',575);
    svg+=text(355,feed?405:582,feed?85:105,$('call').value,'allura',accent,'middle',600);
    svg+=`<path d="M600 ${feed?365:545}c-30-40-50 10 0 35c50-25 30-75 0-35Z" fill="none" stroke="${accent}" stroke-width="3"/>`;
    const top=feed?463:680,bottom=height-(feed?335:440),area=bottom-top;
    const rowHeight=Math.min(feed?175:255,area/Math.max(rows.length,1));
    const offset=rows.length<=3?(area-rowHeight*rows.length)*.32:0;
    if(!rows.length)svg+=text(540,top+area/2,39,'Escolha os horários para divulgar','cormorantgaramond',ink);
    rows.forEach((row,i)=>{
      const y=top+offset+i*rowHeight,date=new Date(row.date+'T12:00:00Z');
      const weekday=date.toLocaleDateString('pt-BR',{weekday:'long',timeZone:'UTC'}).replace('-feira','');
      const dateLabel=weekday[0].toLocaleUpperCase('pt-BR')+weekday.slice(1)+' · '+row.date.slice(8,10)+'/'+row.date.slice(5,7);
      const groups=[];for(let n=0;n<row.times.length;n+=6)groups.push(row.times.slice(n,n+6).join(' · '));
      const dateSize=Math.min(feed?59:72,rowHeight*(groups.length>1?.30:.39)),timeSize=Math.min(feed?60:74,rowHeight*(groups.length>1?.28:.4));
      const dateY=y+dateSize,timeY=dateY+timeSize+5;
      // A translucent cream panel keeps every date legible over the floral illustration.
      svg+=`<rect x="110" y="${y-7}" width="860" height="${rowHeight-5}" rx="9" fill="#fff9f3" opacity=".48"/>`;
      svg+=text(540,dateY,dateSize,dateLabel,'cormorantgaramond',ink);
      groups.forEach((line,j)=>{svg+=text(540,timeY+j*(timeSize+2),timeSize,line,'cormorantgaramond',ink,'middle',850);});
      if(i<rows.length-1){const sy=y+rowHeight-2;svg+=`<path d="M180 ${sy}H520M560 ${sy}H900" fill="none" stroke="${accent}" stroke-width="1"/><path d="M540 ${sy-7}l6 7-6 7-6-7Z" fill="${accent}"/>`;}
    });
    const benefitY=height-(feed?285:370);
    svg+=`<rect x="110" y="${benefitY-43}" width="860" height="95" rx="6" fill="#fff8f3" opacity=".77"/>`;
    [260,540,820].forEach((x,i)=>{
      svg+=`<circle cx="${x}" cy="${benefitY-13}" r="25" fill="${accent}" opacity=".87"/>`;
      if(i===0)svg+=`<path d="M${x-14} ${benefitY-17}l14-11 14 11-14 19Z M${x-14} ${benefitY-17}h28M${x-6} ${benefitY-25}l6 27 6-27" stroke="#fff8f2" fill="none" stroke-width="1.7"/>`;
      if(i===1)svg+=`<circle cx="${x}" cy="${benefitY-13}" r="15" fill="none" stroke="#fff8f2" stroke-width="1.7"/><path d="M${x} ${benefitY-23}v11l8 5" fill="none" stroke="#fff8f2" stroke-width="1.7"/>`;
      if(i===2)svg+=`<path d="M${x} ${benefitY-21}c-14-18-30 6 0 23c30-17 14-41 0-23Z" fill="none" stroke="#fff8f2" stroke-width="1.7"/>`;
      svg+=text(x,benefitY+32,21,['Beleza no detalhe','Cuidado personalizado','Seu olhar em destaque'][i],'cormorantgaramond',ink,'middle',255);
    });
    const ctaY=height-(feed?165:235);
    svg+=`<rect x="126" y="${ctaY-38}" width="840" height="110" rx="5" fill="#704b3b" opacity=".10"/><rect x="115" y="${ctaY-48}" width="850" height="110" rx="5" fill="#fff6ed" opacity=".94"/>`;
    svg+=text(540,ctaY-1,feed?46:55,'Agende seu horário','anton',ink);
    svg+=text(540,ctaY+43,feed?42:49,'Realçando a beleza do seu olhar.','allura',accent,'middle',790);
    svg+=text(540,height-(feed?47:110),feed?28:33,'@ascarpi_lashdesigner','cormorantgaramond',ink);
    if(!feed)svg+=text(540,height-68,27,'Agende pelo link ou me chame no direct','cormorantgaramond',ink);
    return svg+'</svg>';
  }
  function preview() {
    $('preview').innerHTML=artwork();
    const count=chosen().reduce((n,d)=>n+d.times.length,0);
    $('count').textContent=count+' horário(s) selecionado(s) · '+chosen().length+' dia(s)';
    $('png').disabled=$('svg').disabled=!loaded||pending||!count;
  }
  function controls(disabled) {
    for(const id of ['start','reload','all','clear','format','heading','call','color','edit-saved'])$(id).disabled=disabled;
    for(const box of results.querySelectorAll('input'))box.disabled=disabled;
  }
  async function load({ restoredSelection } = {}) {
    if(pending)return;
    if(!input.value){status.textContent='Escolha a data inicial.';return;}
    const first=input.value,version=++revision;
    const selection = new Set(restoredSelection ?? (days[0]?.date === first ? selected : []));
    pending=true;loaded=false;selected.clear();days=[];renderDays();controls(true);preview();status.textContent='Consultando agenda e solicitações pendentes…';
    try {
      const [fresh]=await Promise.all([query(first),loadLogo(),loadDesign()]);
      if(version!==revision)return;
      days=fresh;
      const valid = new Set(fresh.flatMap(day => day.times.map(time => key(day.date, time))));
      selected = new Set([...selection].filter(slot => valid.has(slot)));
      loaded=true;renderDays();
      const total=days.reduce((n,d)=>n+d.times.length,0);status.textContent = restoredSelection
        ? (selection.size - selected.size ? 'Os horários que passaram ou ficaram indisponíveis foram retirados da seleção. ' : '') +
          'Marque ou desmarque horários e clique em Salvar e baixar PNG para atualizar a arte salva.'
        : total+' opções de início disponíveis. Selecione as que deseja divulgar.';
    }catch(e){status.textContent=e.message||'Erro ao carregar horários.';}
    finally{pending=false;controls(false);preview();}
  }
  function saveBlob(blob,extension,first=input.value,format=$('format').value) {
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='horarios-aniele-'+first+'-'+format+'.'+extension;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function exportImage(type) {
    if(pending||!loaded||!selected.size)return;
    pending=true;controls(true);preview();status.textContent='Conferindo os horários antes de baixar…';
    try {
      const fresh=await query(input.value),valid=new Set(fresh.flatMap(d=>d.times.map(t=>key(d.date,t))));
      const removed=[...selected].filter(k=>!valid.has(k));days=fresh;
      if(removed.length){removed.forEach(k=>selected.delete(k));renderDays();status.textContent='A agenda mudou: '+removed.length+' horário(s) removido(s). Confira a prévia e clique em baixar novamente.';return;}
      if(!chosen().length)throw Error('Selecione pelo menos um horário disponível.');
      let storageMessage = '';
      const svg=artwork(type!=='svg');
      if(type==='svg')saveBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),'svg');
      else {
        const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
        try {
          const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Não foi possível gerar a imagem. Tente baixar o SVG.'));img.src=url;});
          const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=$('format').value==='feed'?1350:1920;
          const ctx=canvas.getContext('2d');if(!ctx)throw Error('Seu navegador não conseguiu criar a imagem.');ctx.drawImage(img,0,0);
          const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Não foi possível criar o PNG.');
          const owner = session()?.user?.id;
          const rows = chosen();
          const art = {
            blob, first: input.value, format: $('format').value, lastDay: rows.at(-1).date,
            slots: rows.flatMap(day => day.times.map(time => key(day.date, time))),
            heading: $('heading').value, call: $('call').value, color: $('color').value
          };
          try {
            if (!owner) throw Error('Sessão indisponível.');
            savedArt = await artStorage(owner, art);
            showSavedArt();
          } catch {
            storageMessage = ' O navegador não conseguiu guardar uma cópia na agenda.';
          }
          saveBlob(blob,'png');
        }finally{URL.revokeObjectURL(url);}
      }
      status.textContent='Download preparado! Horários conferidos às '+new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'})+'. Confira o arquivo salvo antes de postar.'+storageMessage;
    }catch(e){loaded=false;status.textContent=(e.message||'Não foi possível baixar a imagem.')+' Atualize os horários para tentar novamente.';}
    finally{pending=false;controls(false);preview();}
  }
  function close(){if(pending)return;overlay.classList.remove('open');opener?.focus();}
  async function refreshSavedArt() {
    let owner;
    try {
      owner = session()?.user?.id;
      const art = owner ? await artStorage(owner) : undefined;
      if (owner === session()?.user?.id) savedArt = art;
    } catch {
      savedArt = undefined;
    }
    showSavedArt();
  }
  window.AS_openHorariosLivres=function(){
    opener=document.activeElement;input.value=iso(new Date());input.min=input.value;input.max=shift(input.value,24);
    savedArt=undefined;showSavedArt();
    overlay.classList.add('open');$('dialog').focus();load();refreshSavedArt();
  };
  $('saved-png').onclick=async()=>{
    await refreshSavedArt();
    if (savedArt) saveBlob(savedArt.blob, 'png', savedArt.first, savedArt.format);
    else status.textContent = 'A arte salva não está mais disponível.';
  };
  $('edit-saved').onclick=async()=>{
    if (pending) return;
    await refreshSavedArt();
    if (pending) return;
    if (!savedArt) {
      status.textContent = 'A arte salva não está mais disponível.';
      return;
    }
    const today = iso(new Date());
    input.min = today;
    input.max = shift(today, 24);
    input.value = savedArt.first < today ? today : savedArt.first;
    for (const field of ['format','heading','call','color']) {
      if (typeof savedArt[field] === 'string') $(field).value = savedArt[field];
    }
    await load({restoredSelection: savedArt.slots || []});
  };
  window.addEventListener('focus', () => {
    if (overlay.classList.contains('open') && !pending) refreshSavedArt();
  });
  setInterval(() => {
    const today = iso(new Date());
    if (!overlay.classList.contains('open') || pending) return;
    if (savedArt && savedArt.lastDay < today) refreshSavedArt();
    if (input.min < today) {
      input.min = today;
      input.max = shift(today, 24);
      if (input.value < today) {
        input.value = today;
        load();
      }
    }
  }, 30000);
  $('close').onclick=close;
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  overlay.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();close();}
    if(e.key==='Tab'){const nodes=[...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),select')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('dialog'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  $('reload').onclick=load;input.addEventListener('change',load);
  $('all').onclick=()=>{selected=new Set(days.flatMap(d=>d.times.map(t=>key(d.date,t))));renderDays();preview();};
  $('clear').onclick=()=>{selected.clear();renderDays();preview();};
  for(const id of ['format','heading','call','color'])$(id).addEventListener('input',preview);
  $('png').onclick=()=>exportImage('png');$('svg').onclick=()=>exportImage('svg');
  // The legacy Instagram card opens this same editor rather than the old text-only dialog.
  document.addEventListener('click',e=>{const button=e.target.closest('button');if(button&&button.closest('.instagram-card')){e.preventDefault();e.stopImmediatePropagation();window.AS_openHorariosLivres();}},true);
})();

