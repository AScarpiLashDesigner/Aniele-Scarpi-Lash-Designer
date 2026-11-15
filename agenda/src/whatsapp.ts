import {addDays,today,type Appointment,type Client,type State} from './agenda';
export type MessageKind='booking'|'reminder';
export function whatsappPhone(value:string){
 const raw=(value||'').trim();if(!raw||/[^\d\s()+.\-]/.test(raw))return null;
 const digits=raw.replace(/\D/g,'');
 if(raw.startsWith('+'))return /^[1-9]\d{7,14}$/.test(digits)?digits:null;
 if(/^55[1-9]{2}\d{8,9}$/.test(digits))return digits;
 if(/^[1-9]{2}\d{8,9}$/.test(digits))return '55'+digits;
 return null;
}
export function appointmentMessage(a:Appointment,c:Client,kind:MessageKind){
 const date=new Date(a.date+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});
 return kind==='booking'?`Olá, ${c.name}! Seu agendamento no estúdio Aniele Scarpi Lash Designer está marcado para ${date}, às ${a.time}.\nProcedimento: ${a.technique}.\nQualquer imprevisto, me avise por aqui. Espero você!`:`Olá, ${c.name}! Passando para lembrar do seu atendimento no estúdio Aniele Scarpi Lash Designer em ${date}, às ${a.time}.\nProcedimento: ${a.technique}.\nPode confirmar sua presença? Será um prazer receber você!`;
}
export function whatsappLink(a:Appointment,c:Client,kind:MessageKind){const phone=whatsappPhone(c.phone);return phone?'https://wa.me/'+phone+'?text='+encodeURIComponent(appointmentMessage(a,c,kind)):null}
export function tomorrowReminders(s:State,reference=today()){
 const date=addDays(reference,1);
 return {date,appointments:s.appointments.filter(a=>a.date===date&&['Agendado','Confirmado'].includes(a.status)).sort((a,b)=>a.time.localeCompare(b.time)).map(a=>{const c=s.clients.find(c=>c.id===a.clientId);return {id:a.id,clientId:a.clientId,name:c?.name||'Cliente não encontrada',date:a.date,time:a.time,technique:a.technique,pending:a.pending,status:a.status,reminderUrl:c?whatsappLink(a,c,'reminder'):null}})};
}
