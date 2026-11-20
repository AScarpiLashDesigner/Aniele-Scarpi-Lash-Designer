export type Client={id:string;name:string;phone:string;days:number;notes:string};
export type Appointment={id:string;clientId:string;date:string;time:string;duration:number;technique:string;notes:string;days:number;maintenance:string;pending:boolean;status:string;maintenanceOf?:string;price?:number};
export type Window={id:string;date:string;start:string;end:string};
export type State={clients:Client[];appointments:Appointment[];windows:Window[];logo:string;slot:number};
export const empty:State={clients:[],appointments:[],windows:[],logo:'',slot:120};
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date())}
export function addDays(d:string,n:number){const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)}
export function monday(d:string){const day=new Date(d+'T12:00:00Z').getUTCDay();return addDays(d,-((day+6)%7))}
export function minutes(t:string){const [h,m]=t.split(':').map(Number);return h*60+m}
export function clock(n:number){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
export const active=(a:Appointment)=>!['Cancelado','Não compareceu'].includes(a.status);
export function due(a:Appointment,s:State){return a.maintenance||addDays(a.date,a.days||s.clients.find(c=>c.id===a.clientId)?.days||21)}
export function weekly(s:State,start:string,client=''){
 const end=addDays(start,6), inWeek=(d:string)=>d>=start&&d<=end;
 const appointments=s.appointments.filter(a=>inWeek(a.date)&&(!client||a.clientId===client)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const completed=s.appointments.filter(a=>a.status==='Realizado'&&a.date<=today());
 const last=s.clients.map(c=>completed.filter(a=>a.clientId===c.id).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))[0]).filter(Boolean);
 const maintenance=last.filter(a=>inWeek(due(a,s))&&(!client||a.clientId===client)).map(a=>({...a,due:due(a,s),scheduled:s.appointments.some(b=>b.clientId===a.clientId&&active(b)&&b.status!=='Realizado'&&b.date>=today()&&b.date>a.date)}));
 const slots:{date:string;start:string;end:string}[]=[];
 for(let i=0;i<7;i++) {const date=addDays(start,i);
 for(let t=480;t<=1200;t+=30){if(t<780&&t+120>720)continue;if(s.appointments.some(a=>a.date===date&&active(a)&&minutes(a.time)<t+120&&minutes(a.time)+(Number(a.duration)||120)>t))continue;slots.push({date,start:clock(t),end:clock(t+120)});}}
 const now=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
 return {start,end,appointments,maintenance,slots:slots.filter(x=>x.date>today()||(x.date===today()&&x.start>now))};
}

export function maintenanceFollowup(a:Appointment,s:State){return s.appointments.filter(b=>b.maintenanceOf===a.id&&['Agendado','Confirmado','Realizado'].includes(b.status)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))[0]}
export function maintenanceDraft(a:Appointment,s:State){return {clientId:a.clientId,date:due(a,s),technique:window.AS_prices.suggestedMaintenance(a.technique),duration:s.slot,pending:true,days:0,maintenance:'',notes:'',status:'Agendado',maintenanceOf:a.id}}

