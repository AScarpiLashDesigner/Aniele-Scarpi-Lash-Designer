import { createClient } from "npm:@supabase/supabase-js@2";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,apikey,authorization","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Content-Type":"application/json"};
const projectOwner="7e2fd9f8-959a-4d2d-b4e3-ffb46be58b91";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
function mins(t:string){const a=/^(\d\d):(\d\d)/.exec(t||"");return a?+a[1]*60+(+a[2]):NaN}
function iso(d:Date){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
function available(data:any,requests:any[],date:string){const duration=120;const appointments=(data.appointments||[]).filter((a:any)=>a.date===date&&!["Cancelado","Cancelada","Não compareceu"].includes(a.status));const pending=requests.filter((r:any)=>r.data===date&&r.status==="pendente");const slots:string[]=[];for(let t=480;t+duration<=1320;t+=30){const now=new Date();const localDay=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo"}).format(now);const localClock=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit",hour12:false}).format(now);if(date===localDay&&t<=mins(localClock))continue;if(t<780&&t+duration>720)continue;if(appointments.some((a:any)=>t<mins(a.time)+(Number(a.duration)||120)&&t+duration>mins(a.time)))continue;if(pending.some((a:any)=>t<mins(a.horario)+duration&&t+duration>mins(a.horario)))continue;slots.push(String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0"))}return slots}
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("",{headers});try{
if(!["GET","POST"].includes(req.method))return new Response(JSON.stringify({error:"Método inválido"}),{status:405,headers});
const {data:agenda,error}=await db.from("agenda_studio").select("data").eq("owner_id",projectOwner).single();if(error||!agenda)throw Error("Agenda indisponível");
const today=new Date();const todayStr=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(today);const dates=Array.from({length:31},(_,i)=>{const d=new Date(todayStr+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)});
const {data:requests,error:rError}=await db.from("solicitacoes_agendamento").select("data,horario,status").eq("owner_id",projectOwner).eq("status","pendente").in("data",dates.length?dates:["1900-01-01"]);if(rError)throw Error("Solicitações indisponíveis");
if(req.method==="GET"){const days=dates.map((date:string)=>({date,slots:available(agenda.data,requests||[],date)})).filter((d:any)=>d.slots.length);return new Response(JSON.stringify({days,duration:120}),{headers:{"Cache-Control":"no-store",...headers}})}
const body=await req.json();const nome=String(body.nome||"").trim(),whatsapp=String(body.whatsapp||"").replace(/\D/g,""),tecnica=String(body.tecnica||"").trim(),date=String(body.date||""),time=String(body.time||"");
if(nome.length<2||nome.length>120||whatsapp.length<10||whatsapp.length>13||tecnica.length<2||tecnica.length>100||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))return new Response(JSON.stringify({error:"Confira os dados informados."}),{status:400,headers});
if(!dates.includes(date)||!available(agenda.data,requests||[],date).includes(time))return new Response(JSON.stringify({error:"Esse horário não está mais disponível. Atualize a página."}),{status:409,headers});
const {error:insertError}=await db.from("solicitacoes_agendamento").insert({owner_id:projectOwner,nome,whatsapp,tecnica,data:date,horario:time+":00"});if(insertError){if(insertError.code==="23P01")return new Response(JSON.stringify({error:"Esse horário acabou de ser solicitado por outra cliente. Escolha outro horário."}),{status:409,headers});throw Error("Não foi possível registrar a solicitação.");}
const normalizedPhone=whatsapp.startsWith("55")&&[12,13].includes(whatsapp.length)?whatsapp.slice(2):whatsapp;
const {data:existingClients,error:clientLookupError}=await db.from("clientes_studio").select("id,whatsapp").eq("owner_id",projectOwner);
let cadastroOk=!clientLookupError;
if(cadastroOk){
 const exists=(existingClients||[]).some((c:any)=>{const digits=String(c.whatsapp||"").replace(/\\D/g,"");return (digits.startsWith("55")&&[12,13].includes(digits.length)?digits.slice(2):digits)===normalizedPhone});
 if(!exists){
  const {error:clientInsertError}=await db.from("clientes_studio").insert({owner_id:projectOwner,nome,whatsapp:normalizedPhone,tecnica_desejada:tecnica});
  if(clientInsertError&&clientInsertError.code!=="23505"){cadastroOk=false;console.error("Falha no cadastro automático",clientInsertError.code)}
 }
}else console.error("Falha na consulta de cadastro");
return new Response(JSON.stringify({ok:true,cadastro_atualizado:cadastroOk,message:"Solicitação enviada! Aguarde a confirmação pelo WhatsApp."}),{status:201,headers});
}catch(e){return new Response(JSON.stringify({error:String(e instanceof Error?e.message:"Erro inesperado")}),{status:500,headers})}});
