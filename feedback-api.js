// Compartilha a sessão da agenda principal; não contém credenciais privadas.
const config=window.AS_AGENDA_CONFIG;
export const OWNER='7e2fd9f8-959a-4d2d-b4e3-ffb46be58b91';
const SESSION='as-agenda-session-v1';
export class ApiError extends Error {constructor(message,status,code){super(message);this.status=status;this.code=code}}
export async function request(path,{token,...options}={}){
 if(!config?.url||!config?.key)throw new Error('Não foi possível conectar. Recarregue a página.');
 let response;
 try{response=await fetch(config.url+path,{...options,headers:{apikey:config.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...options.headers},cache:'no-store',signal:options.signal||AbortSignal.timeout(20000)});}catch{throw new Error('Falha de conexão. Confira sua internet e tente novamente.');}
 const body=await response.text();let result=null;try{result=body?JSON.parse(body):null}catch{}
 if(!response.ok)throw new ApiError(response.status===401?'Sua sessão terminou. Entre novamente.':response.status===409?'Este envio já foi recebido.':response.status===429?'Aguarde um momento antes de tentar novamente.':'Não foi possível concluir. Tente novamente.',response.status,result?.code);
 return result;
}
function remember(s){const value={...s,expires_at:s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600)};sessionStorage.setItem(SESSION,JSON.stringify(value));return value}
let refreshing;
export async function ownerSession(){
 let s;try{s=JSON.parse(sessionStorage.getItem(SESSION)||'null')}catch{}
 if(!s?.access_token||!s?.refresh_token)throw new ApiError('Entre com seu login da agenda.',401);
 if(!s.expires_at||s.expires_at<Date.now()/1000+60){
  if(!refreshing)refreshing=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh_token})}).then(remember).finally(()=>refreshing=null);
  try{s=await refreshing}catch(err){if(err.status===400||err.status===401){sessionStorage.removeItem(SESSION);throw new ApiError('Sua sessão terminou. Entre novamente.',401)}throw err}
 }
 const user=await request('/auth/v1/user',{token:s.access_token});
 if(user?.id!==OWNER)throw new ApiError('Esta área é exclusiva da responsável pelo estúdio.',403);
 return s;
}
export async function login(email,password){
 const s=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
 if(s?.user?.id!==OWNER)throw new ApiError('Esta área é exclusiva da responsável pelo estúdio.',403);
 return remember(s);
}
export async function ownerRequest(path,options={}){const s=await ownerSession();return request(path,{...options,token:s.access_token})}
export async function logout(){let s;try{s=JSON.parse(sessionStorage.getItem(SESSION)||'null')}catch{}sessionStorage.removeItem(SESSION);if(s?.access_token)await request('/auth/v1/logout',{method:'POST',token:s.access_token}).catch(()=>{});}
