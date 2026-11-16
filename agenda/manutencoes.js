(function(){
"use strict";
const cfg=window.AS_AGENDA_CONFIG;
const css=document.createElement("style");css.textContent=`
#as-maint-layer{position:fixed;inset:0;z-index:9997;background:#201617bb;display:none;align-items:center;justify-content:center;padding:14px}
#as-maint-layer.open{display:flex}#as-maint-panel{background:#fffaf9;color:#48332e;width:min(920px,100%);max-height:92vh;overflow:auto;border-radius:17px;padding:22px;box-shadow:0 20px 60px #0004}
#as-maint-panel h2{font-family:Georgia,serif;margin:4px 0 10px}#as-maint-panel .muted{color:#756b68;font-size:14px}
#as-maint-panel button,#as-maint-panel a.action{border:0;border-radius:9px;padding:10px 14px;background:#67483e;color:white;text-decoration:none;cursor:pointer;display:inline-block;font:inherit}
#as-maint-panel .controls{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}#as-maint-panel .controls button{background:#eee3df;color:#49352f}
#as-maint-panel .controls button.selected{background:#67483e;color:white}#as-maint-panel .item{background:white;border:1px solid #ebded9;border-radius:12px;padding:15px;margin:10px 0}
#as-maint-panel .item p{margin:6px 0}#as-maint-panel .tag{font-size:12px;font-weight:700;color:#67483e}#as-maint-panel .row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
#as-maint-panel .summary{background:#f5eeeb;border-radius:10px;padding:12px;margin:12px 0}
`;document.head.append(css);
const layer=document.createElement("div");layer.id="as-maint-layer";layer.innerHTML='<div id="as-maint-panel" role="dialog" aria-modal="true" aria-label="Controle de manutenções"><div class="row"><div><div class="muted">ANIELE SCARPI · LASH DESIGNER</div><h2>Controle de manutenções</h2></div><button id="as-maint-close">Fechar</button></div><p class="muted">Atualizado com os atendimentos da agenda. O WhatsApp abre com uma mensagem pronta; o envio depende de você.</p><div id="as-maint-status" role="status"></div><div id="as-maint-filters" class="controls"></div><div id="as-maint-results"></div></div>';document.body.append(layer);
const status=document.getElementById("as-maint-status"),results=document.getElementById("as-maint-results"),filters=document.getElementById("as-maint-filters");let items=[],filter="all";
function localDate(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||""));return m?new Date(+m[1],+m[2]-1,+m[3],12):null}
function fmt(d){return d?d.toLocaleDateString("pt-BR"):"—"}
function key(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
function digits(s){return String(s||"").replace(/\D/g,"")}
function paragraph(parent,label,value){const p=document.createElement("p");const b=document.createElement("strong");b.textContent=label+": ";p.append(b,document.createTextNode(String(value)));parent.append(p)}
function close(){layer.classList.remove("open")}document.getElementById("as-maint-close").onclick=close;layer.addEventListener("click",e=>{if(e.target===layer)close()});document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
async function load(){
status.textContent="Consultando agenda...";results.replaceChildren();filters.replaceChildren();
try{
const session=JSON.parse(sessionStorage.getItem("as-agenda-session-v1")||"null");if(!session?.access_token||!session?.user?.id)throw Error("Entre na agenda para consultar as manutenções.");
const response=await fetch(cfg.url+"/rest/v1/agenda_studio?owner_id=eq."+encodeURIComponent(session.user.id)+"&select=data",{headers:{apikey:cfg.key,Authorization:"Bearer "+session.access_token},cache:"no-store"});if(!response.ok)throw Error(response.status===401?"Sua sessão expirou. Entre novamente na agenda.":"Não foi possível consultar a agenda.");
const records=await response.json();let data=records[0]?.data||{};if(typeof data==="string")data=JSON.parse(data);
const clients=Array.isArray(data.clients)?data.clients:[],appointments=Array.isArray(data.appointments)?data.appointments:[];const today=new Date();today.setHours(12,0,0,0);
items=clients.map(client=>{
const done=appointments.filter(a=>a.clientId===client.id&&a.status==="Realizado"&&localDate(a.date)).sort((a,b)=>b.date.localeCompare(a.date));
if(!done.length)return null;
const last=done[0],days=Number(last.days)||Number(client.days)||21,base=localDate(last.date);const due=new Date(base);due.setDate(due.getDate()+days);
const upcoming=appointments.some(a=>a.clientId===client.id&&a.status!=="Realizado"&&a.status!=="Cancelado"&&localDate(a.date)&&localDate(a.date)>=today&&localDate(a.date)>=base);
const diff=Math.round((due-today)/86400000);const state=upcoming?"scheduled":diff<0?"late":diff<=7?"soon":"future";
return{client,last,days,due,diff,state}
}).filter(Boolean).sort((a,b)=>a.due-b.due);
status.textContent="Informações calculadas a partir do último atendimento concluído de cada cliente.";render();
}catch(err){status.textContent=err.message||"Erro ao carregar";results.replaceChildren()}
}
function render(){
filters.replaceChildren();results.replaceChildren();
const categories=[["all","Todas"],["late","Atrasadas"],["soon","Próximos 7 dias"],["scheduled","Já agendadas"],["future","Futuras"]];
for(const [id,label] of categories){const btn=document.createElement("button");btn.textContent=label+" ("+(id==="all"?items.length:items.filter(i=>i.state===id).length)+")";btn.className=filter===id?"selected":"";btn.onclick=()=>{filter=id;render()};filters.append(btn)}
const subset=items.filter(i=>filter==="all"||i.state===filter);
if(!subset.length){const p=document.createElement("p");p.textContent="Nenhuma manutenção nesta categoria.";results.append(p);return}
for(const item of subset){
const card=document.createElement("div");card.className="item";const row=document.createElement("div");row.className="row";const title=document.createElement("strong");title.textContent=item.client.name;const tag=document.createElement("span");tag.className="tag";tag.textContent={late:"MANUTENÇÃO ATRASADA",soon:"MANUTENÇÃO PRÓXIMA",scheduled:"JÁ AGENDADA",future:"MANUTENÇÃO FUTURA"}[item.state];row.append(title,tag);card.append(row);
paragraph(card,"Último atendimento",fmt(localDate(item.last.date))+" · "+(item.last.technique||"Técnica não informada"));paragraph(card,"Manutenção prevista",fmt(item.due)+" ("+item.days+" dias)");if(item.state==="late")paragraph(card,"Atraso",Math.abs(item.diff)+" dia(s)");if(item.state==="scheduled")paragraph(card,"Situação","Existe um próximo agendamento na agenda");
const phone=digits(item.client.phone);if(phone.length>=10){const msg="Olá, "+item.client.name.split(" ")[0]+"! 💗 Sua manutenção de cílios está prevista para "+fmt(item.due)+". Gostaria de agendar seu horário?";const a=document.createElement("a");a.className="action";a.target="_blank";a.rel="noopener noreferrer";a.href="https://wa.me/"+(phone.startsWith("55")?phone:"55"+phone)+"?text="+encodeURIComponent(msg);a.textContent="Enviar lembrete pelo WhatsApp";card.append(a)}else paragraph(card,"WhatsApp","Cadastre um número com DDD para enviar lembretes");
results.append(card)}
}
window.AS_openManutencoes=()=>{layer.classList.add("open");filter="all";load()};
function install(){const nav=document.querySelector("nav");if(!nav||document.getElementById("as-maint-nav"))return;const button=document.createElement("button");button.type="button";button.id="as-maint-nav";button.textContent="♡ Manutenções";button.onclick=window.AS_openManutencoes;nav.append(button)}
new MutationObserver(install).observe(document.getElementById("root"),{childList:true,subtree:true});install();
})();