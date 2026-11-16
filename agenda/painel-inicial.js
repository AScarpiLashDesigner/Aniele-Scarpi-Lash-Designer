(function(){"use strict";
const panel=document.createElement("section");panel.id="as-home";panel.setAttribute("aria-label","Resumo inteligente do estúdio");
panel.innerHTML='<div class="head"><div><p class="caption">ANIELE SCARPI · LASH DESIGNER</p><h2>Meu estúdio hoje</h2></div><button type="button" id="as-home-refresh">↻ Atualizar</button></div><div class="grid" id="as-home-grid"></div><p id="as-home-status" role="status">Aguardando login na agenda…</p><div class="actions"><button type="button" id="as-home-new-client">＋ Nova cliente</button><button type="button" id="as-home-new-appointment">＋ Novo atendimento</button><button type="button" id="as-home-slots">◷ Horários livres</button><a href="./solicitacoes.html">Solicitações online</a></div>';
const grid=panel.querySelector("#as-home-grid"),status=panel.querySelector("#as-home-status");let lastLoad=0,busy=false;
const cards=[["Atendimentos de hoje","Agendados para hoje"],["Próximas manutenções","Vencidas ou até 7 dias"],["Clientes aguardando contato","Realizados há 1–30 dias"],["Solicitações pendentes","Aguardando aprovação"]];
function show(values){grid.replaceChildren();cards.forEach(([title,note],i)=>{const c=document.createElement("div");c.className="tile";if(i===3&&Number(values?.[i])>0){c.classList.add("as-pending-alert");c.style.border="2px solid #c9957f";c.style.background="#fff3ed";c.style.cursor="pointer";c.title="Abrir solicitações pendentes";c.setAttribute("role","link");c.tabIndex=0;c.onclick=()=>location.href="./solicitacoes.html";c.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();location.href="./solicitacoes.html"}}}const label=document.createElement("span");label.textContent=title;const number=document.createElement("strong");number.textContent=values?.[i]??"—";const sub=document.createElement("small");sub.textContent=note;c.append(label,number,sub);grid.append(c)})}
function date(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||""));return m?new Date(+m[1],+m[2]-1,+m[3],12):null}
function dayKey(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
function difference(a,b){return Math.round((a-b)/86400000)}
function install(){const content=document.querySelector(".content");if(!content)return;const nav=document.querySelector("nav button.nav-active");const isAgenda=nav?.textContent?.trim()==="Agenda semanal";content.classList.toggle("as-home-clean",!!isAgenda);if(!isAgenda){if(panel.isConnected)panel.remove();return}const title=content.querySelector(".title-row");if(!title)return;if(panel.parentElement!==content||panel.previousElementSibling!==title)title.insertAdjacentElement("afterend",panel);if(Date.now()-lastLoad>60000&&!busy)load()}
async function load(){if(busy||!panel.isConnected)return;busy=true;lastLoad=Date.now();status.textContent="Atualizando dados reais do estúdio…";try{
const session=JSON.parse(sessionStorage.getItem("as-agenda-session-v1")||"null");if(!session?.access_token||!session?.user?.id){show(null);status.textContent="Entre na sua conta para visualizar os indicadores.";return}
const cfg=window.AS_AGENDA_CONFIG;if(!cfg?.url||!cfg?.key)throw Error("Configuração da agenda indisponível.");
const headers={apikey:cfg.key,Authorization:"Bearer "+session.access_token};
const base=cfg.url+"/rest/v1/",owner=encodeURIComponent(session.user.id);
const [a,c,q]=await Promise.all([
fetch(base+"agenda_studio?owner_id=eq."+owner+"&select=data",{headers,cache:"no-store"}),
fetch(base+"contatos_pos_atendimento?owner_id=eq."+owner+"&select=appointment_id,acompanhamento_enviado_em&limit=10000",{headers,cache:"no-store"}),
fetch(base+"solicitacoes_agendamento?owner_id=eq."+owner+"&status=eq.pendente&select=id&limit=10000",{headers,cache:"no-store"})
]);
if(!a.ok||!c.ok||!q.ok)throw Error("Não foi possível consultar todos os indicadores. Confira seu login e tente novamente.");
const rows=await a.json();if(!rows.length)throw Error("Agenda não encontrada para esta conta.");
let data=rows[0].data||{};if(typeof data==="string")data=JSON.parse(data);
const apps=Array.isArray(data.appointments)?data.appointments:[],clients=Array.isArray(data.clients)?data.clients:[];
const contact=new Map((await c.json()).map(x=>[String(x.appointment_id),x]));
const requests=await q.json();const today=new Date();today.setHours(12,0,0,0);const todayKey=dayKey(today);
const todayApps=apps.filter(x=>x.date===todayKey&&!["Cancelado","Realizado"].includes(x.status)).length;
const due=clients.filter(client=>{
const done=apps.filter(a=>String(a.clientId)===String(client.id)&&a.status==="Realizado"&&date(a.date)).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
if(!done.length)return false;const last=done[0],base=date(last.date),days=Number(last.days)||Number(client.days)||21;
const dueDate=new Date(base);dueDate.setDate(dueDate.getDate()+days);const delta=difference(dueDate,today);
const booked=apps.some(a=>String(a.clientId)===String(client.id)&&!["Realizado","Cancelado"].includes(a.status)&&date(a.date)&&date(a.date)>=today&&date(a.date)>=base);
return !booked&&delta<=7
}).length;
const pending=apps.filter(a=>a.status==="Realizado"&&date(a.date)&&difference(today,date(a.date))>=1&&difference(today,date(a.date))<=30&&!contact.get(String(a.id))?.acompanhamento_enviado_em).length;
show([todayApps,due,pending,requests.length]);status.textContent="Atualizado às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})+" · Informações privadas do Supabase.";lastLoad=Date.now();
}catch(e){show(null);status.textContent=e.message||"Erro ao carregar indicadores."}finally{busy=false}}
panel.querySelector("#as-home-refresh").onclick=()=>{lastLoad=0;load()};
panel.querySelector("#as-home-new-client").onclick=()=>{location.href="./clientes.html"};
panel.querySelector("#as-home-new-appointment").onclick=()=>{document.querySelector(".content .title-row button.primary")?.click()};
panel.querySelector("#as-home-slots").onclick=()=>{window.AS_openHorariosLivres?.()};
show(null);new MutationObserver(install).observe(document.getElementById("root"),{childList:true,subtree:true});install();
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&Date.now()-lastLoad>60000)load()});
})();