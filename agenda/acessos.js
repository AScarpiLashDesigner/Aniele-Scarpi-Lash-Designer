import {ownerSession,ownerRequest,login,logout} from '../feedback-api.js?v=20261116-1';
const $ = id => document.getElementById(id);
let busy = false, generation = 0;
function exclusionStatus() {
  const excluded=window.AS_SITE_PRIVACY?.excluded();
  $('exclusion-status').textContent=excluded?'Seus acessos e cliques neste navegador estão excluídos da contagem.':'Seus acessos neste navegador estão sendo contabilizados.';
  $('exclusion-toggle').textContent=excluded?'Voltar a contabilizar neste navegador':'Excluir meus acessos neste navegador';
}
$('exclusion-toggle').onclick=()=>{
  try {
    const privacy=window.AS_SITE_PRIVACY;
    if(!privacy)throw Error();
    if(privacy.excluded())privacy.include();else privacy.exclude();
    exclusionStatus();
  } catch { $('exclusion-status').textContent='Não foi possível salvar a preferência. Verifique se o navegador permite armazenamento local.'; }
};
function ownerReady() { window.AS_SITE_PRIVACY?.rememberOwner(); exclusionStatus(); }

function el(tag,text,parent,cls) { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; if(parent)parent.append(n); return n; }
function showLogin(message='Entre com seu login da agenda.') {
  generation++; $('login').hidden=false; $('panel').hidden=true; $('login-status').textContent=message;
  for(const id of ['summary','metrics','sources','pages','days']) $(id).replaceChildren();
}
function metric(parent,label,value) { const card=el('div',undefined,parent,'metric');el('span',label,card);el('strong',Number(value||0).toLocaleString('pt-BR'),card); }
function bars(id,rows,key,labels) {
  const parent=$(id); parent.replaceChildren();
  if(!rows.length) { el('p','Nenhum acesso registrado neste período.',parent,'note'); return; }
  const max=Math.max(1,...rows.map(r=>Number(r.total)));
  for(const row of rows) {const bar=el('div',undefined,parent,'bar'),label=el('div',undefined,bar,'bar-label');
    el('span',labels?labels[row[key]]||row[key]:row[key].split('-').reverse().join('/'),label);
    el('strong',Number(row.total).toLocaleString('pt-BR'),label);
    const track=el('div',undefined,bar,'track'),fill=el('div',undefined,track,'fill');fill.style.width=(100*Number(row.total)/max)+'%';
  }
}
async function load() {
  if(busy)return; busy=true; const current=++generation;
  $('refresh').disabled=$('periodo').disabled=true;$('status').textContent='Carregando acessos…';
  for(const id of ['summary','metrics','sources','pages','days']) $(id).replaceChildren();
  try {
    const data=await ownerRequest('/rest/v1/rpc/site_resumo',{method:'POST',body:JSON.stringify({p_periodo:$('periodo').value})});
    if(current!==generation)return;
    const cards=el('div',undefined,$('summary'),'cards');
    metric(cards,'Visitas hoje',data.hoje); metric(cards,'Visitas nos últimos 7 dias',data.sete_dias); metric(cards,'Visitas neste mês',data.mes);
    metric($('metrics'),'Visitas no período',data.visitas);metric($('metrics'),'Cliques para agendar',data.agendar);metric($('metrics'),'Cliques no WhatsApp',data.whatsapp);
    bars('sources',data.origens,'origem',{instagram:'Instagram',google:'Google',facebook:'Facebook',direto:'Direto / não identificado',outros:'Outras origens'});
    bars('pages',data.paginas,'pagina',{inicio:'Início',agendamento:'Agendamento'});bars('days',data.dias,'dia');
    $('status').textContent='Atualizado às '+new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'})+'.';
  } catch(err) { if(current===generation){if(err.status===401||err.status===403)showLogin(err.message);else $('status').textContent=err.message;} }
  finally {busy=false;$('refresh').disabled=$('periodo').disabled=false;}
}
$('login-form').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;$('login-status').textContent='Entrando…';try{await login($('email').value.trim(),$('password').value);ownerReady();$('password').value='';$('login').hidden=true;$('panel').hidden=false;await load();}catch(err){$('login-status').textContent='Não foi possível entrar. Confira seus dados e a conexão.';}finally{button.disabled=false;}};
$('logout').onclick=async()=>{showLogin('Você saiu da conta.');await logout();};
$('refresh').onclick=load;$('periodo').onchange=load;
ownerSession().then(()=>{ownerReady();$('login').hidden=true;$('panel').hidden=false;return load();}).catch(err=>showLogin(err.message));
