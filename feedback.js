import {request} from './feedback-api.js?v=20261116-1';
const section=document.getElementById('avaliacoes');
if(section){
 const cards=document.getElementById('as-feedback-cards'),state=document.getElementById('as-feedback-state'),more=document.getElementById('as-feedback-more'),retry=document.getElementById('as-feedback-retry');
 let offset=0,loading=false;const size=9;
 function element(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
 function card(r){const a=element('article',undefined,'as-feedback-card');a.append(element('div','“','as-feedback-quote'));if(r.nota!==null){const stars=element('div','★'.repeat(r.nota)+'☆'.repeat(5-r.nota),'as-feedback-stars');stars.setAttribute('aria-label',r.nota+' de 5 estrelas');a.append(stars)}a.append(element('p',r.comentario,'as-feedback-comment'),element('p',String(r.nome).replace(/^@/,'').split(/[\s_.]+/)[0],'as-feedback-name'));if(r.origem!=='site')a.append(element('small',r.origem==='whatsapp'?'Recebido pelo WhatsApp':'Recebido pelo Instagram','as-feedback-source'));return a}
 async function load(){if(loading)return;loading=true;more.disabled=true;retry.hidden=true;state.textContent=offset?'Carregando mais avaliações…':'Carregando avaliações…';try{const rows=await request('/rest/v1/feedback_studio?select=id,nome,nota,comentario,origem&status=eq.aprovado&order=created_at.desc,id.desc&limit='+size+'&offset='+offset);if(!Array.isArray(rows))throw Error();rows.forEach(r=>cards.append(card(r)));offset+=rows.length;more.hidden=rows.length<size;state.textContent=offset?'':'Seu olhar também faz parte dessa história. Compartilhe sua experiência.';}catch{state.textContent='Não foi possível carregar as avaliações agora.';retry.hidden=false;}finally{loading=false;more.disabled=false;}}
 more.addEventListener('click',load);retry.addEventListener('click',load);
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load()}},{rootMargin:'300px'});observer.observe(section)}else load();
 const form=document.getElementById('as-feedback-form'),message=document.getElementById('as-feedback-message'),submit=form.querySelector('[type=submit]'),comment=document.getElementById('as-feedback-comment');
 let sending=false,submissionId=null,submittedText='';
 comment.addEventListener('input',()=>document.getElementById('as-feedback-count').textContent=comment.value.length);
 form.addEventListener('submit',async e=>{e.preventDefault();if(sending||!form.reportValidity())return;
  const data=new FormData(form);if(data.get('website')){message.textContent='Não foi possível enviar. Recarregue a página.';return}
  const nome=String(data.get('nome')).trim(),comentario=String(data.get('comentario')).trim(),nota=Number(data.get('nota'));
  if(nome.length<2||comentario.length<10||!Number.isInteger(nota)||nota<1||nota>5){message.textContent='Confira o nome, a nota e o comentário antes de enviar.';return}
  const text=JSON.stringify({nome,comentario,nota});if(text!==submittedText){submissionId=crypto.randomUUID();submittedText=text}
  sending=true;submit.disabled=true;submit.textContent='Enviando…';message.textContent='Enviando sua avaliação…';
  try{try{await request('/rest/v1/feedback_studio',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id:submissionId,nome,comentario,nota,consentimento:true})})}catch(err){if(err.status!==409||err.code!=='23505')throw err}
   message.textContent='Obrigada por compartilhar! Sua avaliação foi recebida e ficará aguardando aprovação antes de aparecer no site.';form.reset();document.getElementById('as-feedback-count').textContent='0';submissionId=null;submittedText='';
  }catch(err){message.textContent=err.message+' Seu comentário foi mantido no formulário.'}finally{sending=false;submit.disabled=false;submit.textContent='Enviar minha avaliação'}
 });
 const details=document.getElementById('deixar-avaliacao');function openHash(){if(location.hash==='#deixar-avaliacao')details.open=true}window.addEventListener('hashchange',openHash);openHash();
}
