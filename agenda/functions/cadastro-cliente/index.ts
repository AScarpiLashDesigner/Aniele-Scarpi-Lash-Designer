import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const db=createClient(Deno.env.get("SUPABASE_URL"),Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false}});
const owner="7e2fd9f8-959a-4d2d-b4e3-ffb46be58b91";
const publicKey="sb_publishable_ZCpDV1h1dH5nuIsm2MLczA_hJ3DMmD8";
const headers={"Access-Control-Allow-Origin":"https://ascarpilashdesigner.github.io","Access-Control-Allow-Headers":"apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const fields=["ja_fez_extensao","ultimo_procedimento","reacao_anterior","alergia_conhecida","qual_alergia","lentes_contato","tratamento_medico","medicamento_continuo","qual_medicamento","gestante_amamentando","condicao_ocular","qual_condicao","irritacao_ocular","cirurgia_ocular","observacoes_saude","informacoes_verdadeiras","ciente_riscos","autoriza_procedimento","autoriza_imagens","observacoes_adicionais"];
async function handle(req){
if(req.method==="OPTIONS")return new Response(null,{headers});
if(req.method!=="POST")return reply({error:"Método inválido"},405);
if(req.headers.get("apikey")!==publicKey)return reply({error:"Acesso inválido"},401);
try{
const raw=await req.text();if(raw.length>24000)return reply({error:"Formulário muito grande"},413);
let b;try{b=JSON.parse(raw)}catch{return reply({error:"Formulário inválido"},400)}
if(!b||typeof b!=="object")return reply({error:"Formulário inválido"},400);
const text=(key,max)=>typeof b[key]==="string"?b[key].trim().slice(0,max):"";
const nome=text("nome",160),nascimento=text("nascimento",10),instagram=text("instagram",100);
let whatsapp=text("whatsapp",25).replace(/\D/g,"");if(whatsapp.length===10||whatsapp.length===11)whatsapp="55"+whatsapp;
if(nome.length<3||!/^55[1-9][0-9]{9,10}$/.test(whatsapp))return reply({error:"Confira seu nome completo e WhatsApp com DDD."},400);
const date=new Date(nascimento+"T12:00:00Z");
if(!/^\d{4}-\d{2}-\d{2}$/.test(nascimento)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==nascimento||nascimento<"1900-01-01"||date>Date.now())return reply({error:"Confira sua data de nascimento."},400);
if(typeof b.id!=="string"||!/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(b.id))return reply({error:"Recarregue a página e tente novamente."},400);
if(!b.answers||typeof b.answers!=="object"||Array.isArray(b.answers))return reply({error:"Preencha a anamnese."},400);
const answers={};for(const k of fields){if(typeof b.answers[k]==="string")answers[k]=b.answers[k].trim().slice(0,1000)}
if(["informacoes_verdadeiras","ciente_riscos","autoriza_procedimento"].some(k=>answers[k]!=="Sim")||b.consentimento_dados!==true)return reply({error:"Confirme as declarações e o uso dos dados para seu atendimento."},400);
const {data:retry,error:retryError}=await db.from("clientes_studio").select("id").eq("owner_id",owner).eq("id",b.id).maybeSingle();
if(retryError)throw retryError;if(retry)return reply({ok:true});
const {data:matches,error:matchError}=await db.from("clientes_studio").select("whatsapp").eq("owner_id",owner);
if(matchError)throw matchError;
const normalize=(v)=>{let n=String(v||"").replace(/\D/g,"");return n.length===10||n.length===11?"55"+n:n};
if(matches.some(c=>normalize(c.whatsapp)===whatsapp))return reply({error:"Para confirmar ou atualizar sua ficha, entre em contato com o estúdio."},409);
const {count,error:limitError}=await db.from("clientes_studio").select("id",{count:"exact",head:true}).eq("owner_id",owner).gte("created_at",new Date(Date.now()-3600000).toISOString());
if(limitError)throw limitError;if(count>=30)return reply({error:"Tente novamente mais tarde ou entre em contato com o estúdio."},429);
const {error}=await db.from("clientes_studio").insert({id:b.id,owner_id:owner,nome,whatsapp,nascimento,instagram:instagram||null,anamnese:answers,anamnese_at:new Date().toISOString()});
if(error){if(error.code==="23505")return reply({ok:true});throw error}
return reply({ok:true});
}catch{return reply({error:"Não foi possível enviar. Tente novamente em alguns instantes."},500)}
}
Deno.serve(handle);
