function previousAppointment(appointments, clientId, appointmentId, date, time) {
  const cutoff = date + (time || "00:00");
  let latest;
  for (const item of appointments) {
    if (item.clientId !== clientId || item.id === appointmentId || item.status !== "Realizado") continue;
    const start = item.date + item.time;
    if (start < cutoff && (!latest || start > latest.date + latest.time)) latest = item;
  }
  return latest;
}

export function installPreviousAppointment(db, getSession, root) {
  let activeForm;
  let cleanup;

  function attach(form) {
    const client = form.elements.namedItem("clientId");
    const date = form.elements.namedItem("date");
    const time = form.elements.namedItem("time");
    const section = document.createElement("section");
    section.className = "as-previous-appointment";
    section.setAttribute("aria-label", "Último atendimento");
    const title = document.createElement("h3");
    title.textContent = "Último atendimento";
    const summary = document.createElement("div");
    const details = document.createElement("div");
    details.setAttribute("aria-live", "polite");
    section.append(title, summary, details);
    client.closest("label").after(section);

    let appointments;
    let ownerId;
    let request;
    let previousSelection;

    function addField(target, label, value) {
      if (!value) return;
      const line = document.createElement("p");
      const name = document.createElement("strong");
      name.textContent = label + ": ";
      line.append(name, document.createTextNode(value));
      target.append(line);
    }

    async function update(force = false) {
      const selection = [client.value, date.value, time.value];
      if (!force && previousSelection?.every((value, index) => value === selection[index])) return;
      previousSelection = selection;
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const { signal } = controller;
      section.hidden = !client.value || !date.value;
      summary.replaceChildren();
      details.replaceChildren();
      if (section.hidden) return;
      details.textContent = "Buscando o último atendimento…";
      try {
        const session = getSession();
        if (!session?.user?.id || !session.access_token) throw new Error("Sessão indisponível");
        if (!appointments || ownerId !== session.user.id) {
          const { data, error } = await db.from("agenda_studio").select("data")
            .eq("owner_id", session.user.id).abortSignal(signal).maybeSingle();
          if (signal.aborted) return;
          if (error) throw error;
          const agenda = typeof data?.data === "string" ? JSON.parse(data.data) : data?.data;
          appointments = Array.isArray(agenda?.appointments) ? agenda.appointments : [];
          ownerId = session.user.id;
        }
        const last = previousAppointment(appointments, selection[0], form.dataset.appointmentId, selection[1], selection[2]);
        if (!last) {
          details.textContent = "Nenhum atendimento anterior concluído para esta cliente.";
          return;
        }
        const heading = document.createElement("p");
        heading.textContent = last.date.split("-").reverse().join("/") + " às " + last.time;
        summary.append(heading);
        addField(summary, "Técnica", last.technique);
        addField(summary, "Observações", last.notes);
        details.textContent = "Carregando informações do procedimento…";
        const { data, error } = await db.from("procedimentos_studio")
          .select("volume,mapping,numeracoes,foto_jpeg")
          .match({ owner_id: ownerId, atendimento_id: last.id, cliente_id: last.clientId })
          .abortSignal(signal).maybeSingle();
        if (signal.aborted) return;
        if (error) throw error;
        details.replaceChildren();
        addField(details, "Volume", data?.volume);
        addField(details, "Mapping", data?.mapping);
        addField(details, "Numerações (mm)", data?.numeracoes);
        if (/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(data?.foto_jpeg || "")) {
          const photo = document.createElement("img");
          photo.alt = "Foto do último procedimento";
          photo.src = data.foto_jpeg;
          details.append(photo);
        }
        if (!details.hasChildNodes()) details.textContent = "Sem detalhes do procedimento registrados.";
      } catch {
        if (signal.aborted) return;
        details.textContent = "Não foi possível carregar todos os dados. ";
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "text-button";
        retry.textContent = "Tentar novamente";
        retry.addEventListener("click", () => void update(true));
        details.append(retry);
      }
    }

    function onChange(event) {
      if (event.target === client || event.target === date || event.target === time) void update();
    }
    form.addEventListener("change", onChange);
    void update();
    return () => {
      request?.abort();
      form.removeEventListener("change", onChange);
      section.remove();
    };
  }

  function sync() {
    const form = root.querySelector("form[data-appointment-id]");
    if (form === activeForm) return;
    cleanup?.();
    activeForm = form;
    cleanup = form ? attach(form) : undefined;
  }
  new MutationObserver(sync).observe(root, { childList: true, subtree: true });
  sync();
}
