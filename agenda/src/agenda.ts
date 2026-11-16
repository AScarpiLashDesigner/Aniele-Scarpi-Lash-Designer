export type Client={id:string;name:string;phone:string;days:number;notes:string};
export type Appointment={id:string;clientId:string;date:string;time:string;duration:number;technique:string;notes:string;days:number;maintenance:string;pending:boolean;status:string;maintenanceOf?:string};
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
 for(let i=0;i<7;i++) {const date=addDays(start,i);const windows=s.windows.filter(w=>w.date===date).map(w=>[minutes(w.start),minutes(w.end)]).sort((a,b)=>a[0]-b[0]);const merged:number[][]=[];for(const w of windows){const p=merged.at(-1);if(p&&w[0]<=p[1])p[1]=Math.max(p[1],w[1]);else merged.push([...w]);}
 for(const [begin,end] of merged){let t=begin;while(t+s.slot<=end){const overlap=s.appointments.filter(a=>a.date===date&&active(a)&&minutes(a.time)<t+s.slot&&minutes(a.time)+a.duration>t).sort((a,b)=>minutes(a.time)-minutes(b.time))[0];if(overlap){t=minutes(overlap.time)+overlap.duration;continue;}slots.push({date,start:clock(t),end:clock(t+s.slot)});t+=s.slot;}}}
 const now=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
 return {start,end,appointments,maintenance,slots:slots.filter(x=>x.date>today()||(x.date===today()&&x.start>now))};
}

export function maintenanceFollowup(a:Appointment,s:State){return s.appointments.filter(b=>b.maintenanceOf===a.id&&['Agendado','Confirmado','Realizado'].includes(b.status)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))[0]}
export function maintenanceDraft(a:Appointment,s:State){return {clientId:a.clientId,date:due(a,s),technique:'Manutenção',duration:s.slot,pending:true,days:0,maintenance:'',notes:'',status:'Agendado',maintenanceOf:a.id}}
