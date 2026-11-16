(function(){"use strict";
const REVIEW_URL="https://g.page/r/Ca5KVujLfpZIECE/review";
const style=document.createElement("style");style.textContent=`
#as-pos-layer{position:fixed;inset:0;z-index:9998;background:#201617bb;display:none;align-items:center;justify-content:center;padding:12px}
#as-pos-layer.open{display:flex}#as-pos-panel{width:min(920px,100%);max-height:94vh;overflow:auto;border-radius:18px;padding:23px;background:#fffaf9;color:#49352f;box-shadow:0 20px 60px #0004;font:14px/1.5 Arial,sans-serif}
#as-pos-panel h2{font:29px Georgia,serif;margin:5px 0 9px}#as-pos-panel .top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
#as-pos-panel button,#as-pos-panel a.as-pos-action{display:inline-block;border:0;border-radius:9px;padding:10px 13px;background:#68483d;color:white;text-decoration:none;cursor:pointer;font:inherit}
#as-pos-panel .muted{color:#77665f}#as-pos-panel .filters{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
#as-pos-panel .filters button{background:#efe3de;color:#49352f}#as-pos-panel .filters button.active{background:#68483d;color:white}
#as-pos-panel .item{background:white;border:1px solid #ebded9;border-radius:12px;padding:16px;margin:12px 0}
#as-pos-panel .item h3{margin:0 0 5px;font:20px Georgia,serif}#as-pos-panel .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
#as-pos-panel .tag{font-size:12px;font-weight:bold;color:#79554a}#as-pos-panel .note{font-size:12px;color:#77665f}
#as-pos-panel .as-pos-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px;margin:12px 0}
#as-pos-panel .as-pos-summary>div{padding:12px;background:#f5ebe7;border-radius:11px}
#as-pos-panel .as-pos-summary strong{display:block;font:25px Georgia,serif}
#as-pos-panel button.as-pos-mark{background:#eee3df;color:#49352f}
#as-pos-panel .done{color:#286445;font-weight:bold;font-size:13px}
`;document.head.append(style);
const overlay=document.createElement("div");overlay.id="as-pos-layer";overlay.innerHTML='<section id="as-pos-panel" role="dialog" aria-modal="true" aria-label="Pós-atendimento e avaliações"><div class="top"><div><small>ANIELE SCARPI · LASH DESIGNER</small><h2>Pós-atendimento e avaliações</h2></div><button type="button" id="as-pos-close">Fechar</button></div><p class="muted">Mensagens personalizadas para atendimentos concluídos. O WhatsApp abre com a mensagem pronta, mas somente você pode enviá-la.</p><div id="as-pos-status" role="status"></div><div id="as-pos-summary" class="as-pos-summary"></div><div id="as-pos-filters" class="filters"></div><div id="as-pos-list"></div></section>';document.body.append(overlay);
const status=overlay.querySelector("#as-pos-status"),summary=overlay.querySelector("#as-pos-summary"),filters=overlay.querySelector("#as-pos-filters"),list=overlay.querySelector("#as-pos-list");let records=[],filter="pending",tracking=new Map(),owner="";
function close(){overlay.classList.remove("open")}overlay.querySelector("#as-pos-close").onclick=close;overlay.addEventListener("click",e=>{if(e.target===overlay)close()});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&overlay.classList.contains("open"))close()});
function localDate(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||""));return m?new Date(+m[1],+m[2]-1,+m[3],12):null}
function fmt(s){const d=localDate(s);return d?d.toLocaleDateString("pt-BR"):"—"}
function daysSince(s){const d=localDate(s);if(!d)return Infinity;const now=new Date();now.setHours(12,0,0,0);return Math.round((now-d)/86400000)}
function digits(s){return String(s||"").replace(/\D/g,"")}
function phone(s){const p=digits(s);const normalized=p.startsWith("55")?p:"55"+p;return normalized.length>=12&&normalized.length<=13?normalized:null}
function text(tag,value,parent,cls){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=value;parent.append(e);return e}
function action(parent,label,number,message){const a=document.createElement("a");a.className="as-pos-action";a.textContent=label;a.href="https://wa.me/"+number+"?text="+encodeURIComponent(message);a.target="_blank";a.rel="noopener noreferrer";parent.append(a)}
function entry(r){return tracking.get(String(r.app.id))||{}}
function metric(label,n){const c=text("div","",summary);text("span",label,c);text("strong",String(n),c)}
function render(){
filters.replaceChildren();list.replaceChildren();summary.replaceChildren();
const recent=records.filter(r=>r.days>=0&&r.days<=30);
metric("Aguardando acompanhamento",recent.filter(r=>r.days>=1&&!entry(r).acompanhamento_enviado_em).length);
metric("Acompanhamentos feitos",recent.filter(r=>!!entry(r).acompanhamento_enviado_em).length);
metric("Avaliações solicitadas",recent.filter(r=>!!entry(r).avaliacao_solicitada_em).length);
const opts=[["pending","Aguardando contato"],["recent","Últimos 30 dias"],["followup","Acompanhamento (1–2 dias)"],["review","Avaliação (3+ dias)"],["all","Todos os realizados"]];
for(const [id,label] of opts){const b=text("button",label,filters,id===filter?"active":"");b.type="button";b.onclick=()=>{filter=id;render()}}
const selected=records.filter(r=>filter==="all"||(filter==="recent"&&r.days>=0&&r.days<=30)||(filter==="pending"&&r.days>=1&&r.days<=30&&!entry(r).acompanhamento_enviado_em)||(filter==="followup"&&r.days>=1&&r.days<=2)||(filter==="review"&&r.days>=3));
if(!selected.length){text("p","Nenhum atendimento nesta categoria.",list,"muted");return}
for(const r of selected){
const card=text("article","",list,"item");text("h3",r.client.name||"Cliente",card);
text("p",fmt(r.app.date)+" · "+(r.app.technique||"Extensão de cílios"),card,"muted");
text("p",r.days===0?"Atendimento realizado hoje":r.days>0?"Há "+r.days+" dia(s)":"Atendimento futuro registrado como realizado",card,"tag");
const row=entry(r),num=phone(r.client.phone),actions=text("div","",card,"actions");
const first=String(r.client.name||"cliente").trim().split(/\s+/)[0];
const follow="Olá, "+first+"! 💗 Tudo bem? Passando para saber como você está se sentindo com sua extensão de cílios e se está tudo confortável com o resultado. Qualquer dúvida sobre os cuidados, estou à disposição! ✨";
const review="Olá, "+first+"! 💗 Muito obrigada por confiar no meu trabalho! Se você puder compartilhar sua experiência com meu atendimento em uma avaliação no Google, ficarei muito feliz. Sua opinião me ajuda muito! ✨\n"+REVIEW_URL;
if(num){action(actions,"♡ Abrir acompanhamento no WhatsApp",num,follow);action(actions,"☆ Abrir avaliação no WhatsApp",num,review)}
else text("p","Cadastre um WhatsApp válido com DDD para preparar as mensagens.",card,"note");
for(const [field,label] of [["acompanhamento_enviado_em","Acompanhamento"],["avaliacao_solicitada_em","Avaliação"]]){
const sent=row[field];text("p",label+": "+(sent?"Registrado em "+new Date(sent).toLocaleString("pt-BR"):"Ainda não registrado"),card,sent?"done":"note");
const btn=text("button",sent?"Desfazer registro de "+label.toLowerCase():"Marcar "+label.toLowerCase()+" como enviado",actions,"as-pos-mark");btn.type="button";btn.onclick=()=>save(r,field,!sent,btn);
}
text("p","Abra a conversa, envie a mensagem manualmente e só depois marque como enviada. Abrir o WhatsApp não confirma o envio.",card,"note");
}
}
async function save(r,field,mark,button){
button.disabled=true;status.textContent="Salvando registro...";
try{
const session=JSON.parse(sessionStorage.getItem("as-agenda-session-v1")||"null");
if(!session?.access_token||session.user?.id!==owner)throw Error("Sua sessão expirou. Entre novamente na agenda.");
const cfg=window.AS_AGENDA_CONFIG,previous=entry(r);
const next={owner_id:owner,appointment_id:String(r.app.id),acompanhamento_enviado_em:previous.acompanhamento_enviado_em||null,avaliacao_solicitada_em:previous.avaliacao_solicitada_em||null,atualizado_em:new Date().toISOString()};
next[field]=mark?new Date().toISOString():null;
const resp=await fetch(cfg.url+"/rest/v1/contatos_pos_atendimento?on_conflict=owner_id,appointment_id",{method:"POST",headers:{apikey:cfg.key,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(next)});
if(!resp.ok){const body=await resp.json().catch(()=>({}));throw Error(body.message||"Não foi possível salvar o registro.")}
const saved=await resp.json();tracking.set(String(r.app.id),saved[0]||next);status.textContent="Registro atualizado com sucesso.";render();
}catch(e){status.textContent=e.message||"Erro ao salvar.";button.disabled=false}
}
async function load(){status.textContent="Consultando atendimentos...";list.replaceChildren();try{const session=JSON.parse(sessionStorage.getItem("as-agenda-session-v1")||"null");if(!session?.access_token||!session?.user?.id)throw Error("Entre na agenda para acessar o pós-atendimento.");const cfg=window.AS_AGENDA_CONFIG;const resp=await fetch(cfg.url+"/rest/v1/agenda_studio?owner_id=eq."+encodeURIComponent(session.user.id)+"&select=data",{headers:{apikey:cfg.key,Authorization:"Bearer "+session.access_token},cache:"no-store"});if(!resp.ok)throw Error("Não foi possível consultar sua agenda. Verifique seu login.");const trackingResp=await fetch(cfg.url+"/rest/v1/contatos_pos_atendimento?owner_id=eq."+encodeURIComponent(session.user.id)+"&select=appointment_id,acompanhamento_enviado_em,avaliacao_solicitada_em&limit=10000",{headers:{apikey:cfg.key,Authorization:"Bearer "+session.access_token},cache:"no-store"});if(!trackingResp.ok)throw Error("Não foi possível consultar os registros de acompanhamento.");tracking=new Map((await trackingResp.json()).map(r=>[String(r.appointment_id),r]));owner=session.user.id;const rows=await resp.json();if(!rows.length)throw Error("Agenda não encontrada.");let data=rows[0].data||{};if(typeof data==="string")data=JSON.parse(data);const clients=Array.isArray(data.clients)?data.clients:[],apps=Array.isArray(data.appointments)?data.appointments:[];const clientMap=new Map(clients.map(c=>[String(c.id),c]));records=apps.filter(a=>a.status==="Realizado"&&localDate(a.date)&&clientMap.has(String(a.clientId))).map(a=>({app:a,client:clientMap.get(String(a.clientId)),days:daysSince(a.date)})).sort((a,b)=>b.app.date.localeCompare(a.app.date)||String(b.app.time||"").localeCompare(String(a.app.time||"")));status.textContent="Exibindo somente atendimentos marcados como realizados.";render()}catch(e){status.textContent=e.message||"Erro ao consultar atendimentos."}}
window.AS_openPosAtendimento=()=>{filter="pending";overlay.classList.add("open");load()};
function install(){const nav=document.querySelector("nav");if(!nav||document.getElementById("as-pos-nav"))return;const b=document.createElement("button");b.id="as-pos-nav";b.type="button";b.textContent="♡ Pós-atendimento";b.onclick=window.AS_openPosAtendimento;nav.append(b)}
new MutationObserver(install).observe(document.getElementById("root"),{childList:true,subtree:true});install();
})();