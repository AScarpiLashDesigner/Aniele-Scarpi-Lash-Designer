(function(){
  "use strict";
  const header=document.querySelector("header");
  const nav=header?.querySelector("nav");
  if(!header||!nav)return;
  nav.id="as-public-nav";
  const button=document.createElement("button");
  button.type="button";
  button.className="as-menu-toggle";
  button.setAttribute("aria-label","Abrir menu de navegação");
  button.setAttribute("aria-controls",nav.id);
  button.setAttribute("aria-expanded","false");
  button.innerHTML='<i class="fa-solid fa-bars" aria-hidden="true"></i>';
  header.insertBefore(button,nav);
  const setOpen=open=>{
    header.classList.toggle("as-menu-open",open);
    button.setAttribute("aria-expanded",String(open));
    button.setAttribute("aria-label",open?"Fechar menu de navegação":"Abrir menu de navegação");
    button.innerHTML=open?'<i class="fa-solid fa-xmark" aria-hidden="true"></i>':'<i class="fa-solid fa-bars" aria-hidden="true"></i>';
  };
  button.addEventListener("click",()=>setOpen(!header.classList.contains("as-menu-open")));
  nav.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>setOpen(false)));
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&header.classList.contains("as-menu-open")){setOpen(false);button.focus()}});
  document.addEventListener("click",event=>{if(header.classList.contains("as-menu-open")&&!header.contains(event.target))setOpen(false)});
  window.matchMedia("(min-width: 993px)").addEventListener("change",event=>{if(event.matches)setOpen(false)});
})();