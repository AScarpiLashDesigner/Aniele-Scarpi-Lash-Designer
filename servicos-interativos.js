(function(){
"use strict";
const cards=document.querySelectorAll("#servicos .cards > .card");
const details={
"Fio a Fio":"Ideal para quem prefere um resultado discreto, com definição e aparência natural.",
"Volume Brasileiro":"Uma opção para quem deseja destacar os olhos com mais volume e definição.",
"Volume Egípcio":"Para quem gosta de um olhar mais marcante, com volume e presença.",
"Volume Inglês":"Proporciona volume intenso e maior preenchimento com fios tecnológicos 5D W, criando um olhar marcante e sofisticado.",
"Volume Wispy":"Combina diferentes comprimentos para criar um acabamento texturizado e moderno.",
"Volume Luxo":"Indicado para quem busca um visual mais intenso e cheio de destaque.",
"Efeito Molhado":"Cria um acabamento definido com fios agrupados e efeito visual marcante.",
"Efeito Fox Eyes":"Destaca a região externa do olhar para um efeito visual alongado."
};
cards.forEach(card=>{
const title=card.querySelector("h3")?.textContent.trim();
const content=card.querySelector(".card-conteudo");
if(!title||!content)return;
const wrap=document.createElement("div");wrap.className="as-servico-acoes";
const toggle=document.createElement("button");toggle.type="button";toggle.className="as-servico-detalhes";toggle.textContent="Conhecer a técnica";toggle.setAttribute("aria-expanded","false");
const panel=document.createElement("div");panel.className="as-servico-painel";panel.hidden=true;
const info=document.createElement("p");info.textContent=details[title]||"Conheça os detalhes desta técnica e converse comigo para escolher o resultado ideal.";
const note=document.createElement("p");note.className="as-servico-nota";note.textContent="O efeito final depende da avaliação dos seus cílios naturais.";
panel.append(info,note);
toggle.addEventListener("click",()=>{panel.hidden=!panel.hidden;toggle.setAttribute("aria-expanded",String(!panel.hidden));toggle.textContent=panel.hidden?"Conhecer a técnica":"Ocultar detalhes"});
const book=document.createElement("a");book.className="as-servico-agendar";book.href="./agendar.html?tecnica="+encodeURIComponent(title);book.textContent="Agendar esta técnica";book.setAttribute("aria-label","Solicitar agendamento: "+title);
wrap.append(toggle,panel,book);content.append(wrap);
});
})();