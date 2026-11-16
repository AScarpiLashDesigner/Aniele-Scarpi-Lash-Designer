(function () {
  'use strict';
  const overlay = document.createElement('div');
  overlay.id = 'as-free-overlay';
  overlay.innerHTML = `<section id="as-free-dialog" role="dialog" aria-modal="true" aria-labelledby="as-free-title" tabindex="-1">
    <div class="as-free-top"><div><p class="as-free-eyebrow">ANIELE SCARPI · DIVULGAÇÃO</p><h2 id="as-free-title">Sua agenda no Instagram</h2></div><button type="button" id="as-free-close" aria-label="Fechar">✕</button></div>
    <p class="as-free-note">Selecione as vagas que quer divulgar. Atendimentos de 2 horas, a partir das 08h, com último início às 20h e almoço das 12h às 13h.</p>
    <div class="as-free-toolbar"><label>Semana a partir de<input id="as-free-start" type="date" required></label><button type="button" id="as-free-reload">Atualizar horários</button></div>
    <p id="as-free-status" role="status" aria-live="polite"></p>
    <div class="as-free-layout"><div><h3>1. Escolha os horários</h3><div class="as-free-actions"><button type="button" id="as-free-all">Selecionar todos</button><button type="button" id="as-free-clear">Limpar seleção</button></div><p class="as-free-note">Cada horário é uma opção de início. As vagas podem se sobrepor; a reserva é confirmada pela agenda.</p><div id="as-free-results"></div></div>
    <div><h3>2. Personalize sua imagem</h3><div class="as-free-fields"><label>Formato<select id="as-free-format"><option value="story">Story · 1080 × 1920</option><option value="feed">Feed · 1080 × 1350</option></select></label><label>Título<input id="as-free-heading" value="Agenda aberta" maxlength="28"></label><label>Chamada<input id="as-free-call" value="Reserve seu momento de beleza" maxlength="44"></label><label>Cor de destaque<input id="as-free-color" type="color" value="#68483d"></label></div>
    <div id="as-free-preview" aria-label="Prévia da arte"></div><p class="as-free-note" id="as-free-count"></p><div class="as-free-actions"><button type="button" id="as-free-png" disabled>Baixar imagem PNG</button><button type="button" id="as-free-svg" disabled>Baixar SVG editável</button></div><p class="as-free-note">Os horários são conferidos novamente antes do download. Baixe a imagem e publique no Instagram; acrescente seu link de agendamento no Story.</p></div></div></section>`;
  document.body.append(overlay);
  const $ = id => overlay.querySelector('#as-free-' + id);
  const status = $('status'), results = $('results'), input = $('start');
  let days = [], selected = new Set(), logo = '', loaded = false, pending = false, revision = 0, opener;
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
    for(let start=480;start<=1200;start+=60) {
      const end=start+120;
      if(date<today||date===today&&start<=minutes(parts)||start<780&&end>720||busy.some(a=>start<a.end&&end>a.start))continue;
      free.push(hh(start));
    }
    return free;
  }
  async function query(first) {
    const s=JSON.parse(sessionStorage.getItem('as-agenda-session-v1')||'null'), cfg=window.AS_AGENDA_CONFIG;
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
  function artwork() {
    const feed=$('format').value==='feed',height=feed?1350:1920,accent=/^#[a-f0-9]{6}$/i.test($('color').value)?$('color').value:'#68483d';
    const rows=chosen(),top=feed?360:510,bottom=height-280,rowHeight=Math.min(feed?87:143,(bottom-top)/Math.max(rows.length,1));
    const text=(x,y,size,value,extra='')=>`<text x="${x}" y="${y}" fill="${accent}" font-size="${size}" ${extra}>${escape(value)}</text>`;
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="${height}" viewBox="0 0 1080 ${height}" role="img" aria-label="Horários disponíveis de Aniele Scarpi"><rect width="1080" height="${height}" fill="#faf7f3"/><rect x="32" y="32" width="1016" height="${height-64}" rx="12" fill="none" stroke="#dac8c2"/><path d="M830 0Q700 180 1080 390V0Z" fill="#f0e0e2"/><path d="M0 ${height-390}Q310 ${height-170} 230 ${height}H0Z" fill="#f0e0e2"/><g font-family="Arial,sans-serif">`;
    if(logo)svg+=`<image x="430" y="${feed?60:110}" width="220" height="130" preserveAspectRatio="xMidYMid meet" xlink:href="${escape(logo)}"/>`;
    else svg+=text(540,feed?138:188,42,'Aniele Scarpi','text-anchor="middle" font-family="Georgia,serif"');
    svg+=text(540,feed?220:315,14,'TOLEDO · MG   |   LASH DESIGNER','text-anchor="middle" letter-spacing="4"');
    svg+=text(540,feed?287:400,64,$('heading').value||'Agenda aberta','text-anchor="middle" font-family="Georgia,serif"');
    svg+=text(540,feed?329:450,22,$('call').value,'text-anchor="middle"');
    if(!rows.length)svg+=text(540,(top+bottom)/2,27,'Selecione os horários para sua arte','text-anchor="middle"');
    rows.forEach((row,i)=>{
      const y=top+i*rowHeight;
      svg+=`<line x1="105" y1="${y}" x2="975" y2="${y}" stroke="#e2d4ce"/>`;
      const dateY=y+Math.min(34,rowHeight*.32),timeY=dateY+Math.min(43,rowHeight*.39);
      svg+=text(540,dateY,20,label(row.date).toLocaleUpperCase('pt-BR'),'text-anchor="middle" letter-spacing="2"');
      const groups=[];for(let n=0;n<row.times.length;n+=7)groups.push(row.times.slice(n,n+7).join('   ·   '));
      groups.forEach((line,j)=>{svg+=text(540,timeY+j*25,24,line,'text-anchor="middle"');});
    });
    svg+=text(540,height-190,27,'Agende pelo link ou pelo direct','text-anchor="middle"');
    svg+=text(540,height-141,23,'@ascarpi_lashdesigner','text-anchor="middle"');
    svg+=text(540,height-83,21,'Realçando a beleza do seu olhar.','text-anchor="middle" font-family="Georgia,serif" font-style="italic"');
    return svg+'</g></svg>';
  }
  function preview() {
    $('preview').innerHTML=artwork();
    const count=chosen().reduce((n,d)=>n+d.times.length,0);
    $('count').textContent=count+' horário(s) selecionado(s) · '+chosen().length+' dia(s)';
    $('png').disabled=$('svg').disabled=!loaded||pending||!count;
  }
  function controls(disabled) {
    for(const id of ['start','reload','all','clear','format','heading','call','color'])$(id).disabled=disabled;
    for(const box of results.querySelectorAll('input'))box.disabled=disabled;
  }
  async function load() {
    if(pending)return;
    if(!input.value){status.textContent='Escolha a data inicial.';return;}
    const first=input.value,version=++revision;
    pending=true;loaded=false;selected.clear();days=[];renderDays();controls(true);preview();status.textContent='Consultando agenda e solicitações pendentes…';
    try {
      const [fresh]=await Promise.all([query(first),loadLogo()]);
      if(version!==revision)return;
      days=fresh;loaded=true;renderDays();
      const total=days.reduce((n,d)=>n+d.times.length,0);status.textContent=total+' opções de início disponíveis. Selecione as que deseja divulgar.';
    }catch(e){status.textContent=e.message||'Erro ao carregar horários.';}
    finally{pending=false;controls(false);preview();}
  }
  function saveBlob(blob,extension) {
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='horarios-aniele-'+input.value+'-'+$('format').value+'.'+extension;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function exportImage(type) {
    if(pending||!loaded||!selected.size)return;
    pending=true;controls(true);preview();status.textContent='Conferindo os horários antes de baixar…';
    try {
      const fresh=await query(input.value),valid=new Set(fresh.flatMap(d=>d.times.map(t=>key(d.date,t))));
      const removed=[...selected].filter(k=>!valid.has(k));days=fresh;
      if(removed.length){removed.forEach(k=>selected.delete(k));renderDays();status.textContent='A agenda mudou: '+removed.length+' horário(s) removido(s). Confira a prévia e clique em baixar novamente.';return;}
      if(!chosen().length)throw Error('Selecione pelo menos um horário disponível.');
      const svg=artwork();
      if(type==='svg')saveBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),'svg');
      else {
        const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
        try {
          const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Não foi possível gerar a imagem. Tente baixar o SVG.'));img.src=url;});
          const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=$('format').value==='feed'?1350:1920;
          const ctx=canvas.getContext('2d');if(!ctx)throw Error('Seu navegador não conseguiu criar a imagem.');ctx.drawImage(img,0,0);
          const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Não foi possível criar o PNG.');saveBlob(blob,'png');
        }finally{URL.revokeObjectURL(url);}
      }
      status.textContent='Download preparado! Horários conferidos às '+new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'})+'. Confira o arquivo salvo antes de postar.';
    }catch(e){loaded=false;status.textContent=(e.message||'Não foi possível baixar a imagem.')+' Atualize os horários para tentar novamente.';}
    finally{pending=false;controls(false);preview();}
  }
  function close(){if(pending)return;overlay.classList.remove('open');opener?.focus();}
  window.AS_openHorariosLivres=function(){opener=document.activeElement;input.value=iso(new Date());input.min=input.value;input.max=shift(input.value,24);overlay.classList.add('open');$('dialog').focus();load();};
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
