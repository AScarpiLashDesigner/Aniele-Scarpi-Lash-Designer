const fields = [
  ["volume", "Volume", "Ex.: Volume inglês 5D W"],
  ["mapping", "Mapping", "Ex.: Gatinho, Boneca ou Esquilo"],
  ["numeracoes", "Numerações (mm)", "Ex.: 8 – 9 – 10 – 11 – 12"]
];
const photoLimit = 500000;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function formatDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value.split("-").reverse().join("/") : value || "Não informado";
}

function maintenanceDate(date, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;
  const result = new Date(date + "T12:00:00Z");
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

async function preparePhoto(file) {
  if (file.size > 30 * 1024 * 1024) throw new Error("Escolha uma foto de até 30 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error("Não foi possível abrir a foto. Escolha uma imagem JPEG, PNG ou WebP.");
    }
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    for (const size of [1280, 960, 640]) {
      const scale = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL("image/jpeg", 0.82);
      if (photo.startsWith("data:image/jpeg;base64,") && photo.length <= photoLimit) return photo;
    }
    throw new Error("Não foi possível reduzir a foto. Escolha outra imagem.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function procedureForm(db, ownerId, appointment) {
  const details = element("details", null, "as-procedure-details");
  details.append(element("summary", "Informações do procedimento"));
  const form = element("form", null, "as-procedure-form");
  const controls = element("fieldset");
  controls.disabled = true;
  const status = element("p");
  status.setAttribute("role", "status");
  const inputs = {};
  for (const [name, label, placeholder] of fields) {
    const field = element("label", label);
    const input = element("input");
    input.type = "text";
    input.maxLength = 200;
    input.placeholder = placeholder;
    inputs[name] = input;
    field.append(input);
    controls.append(field);
  }
  const photoLabel = element("label", "Foto do procedimento (opcional)");
  const file = element("input");
  file.type = "file";
  file.accept = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
  photoLabel.append(file);
  const preview = element("img");
  preview.alt = "Foto do procedimento de cílios";
  preview.hidden = true;
  const remove = element("button", "Remover foto");
  remove.type = "button";
  remove.hidden = true;
  const save = element("button", "Salvar procedimento");
  save.type = "submit";
  controls.append(photoLabel, preview, remove, save);
  form.append(status, controls);
  details.append(form);

  const key = { owner_id: ownerId, atendimento_id: appointment.id, cliente_id: appointment.clientId };
  const query = () => db.from("procedimentos_studio");
  let photo = null;
  let revision = null;
  let loaded = false;
  let loading = false;

  function displayPhoto(value) {
    photo = value;
    preview.hidden = !value;
    remove.hidden = !value;
    if (value) preview.src = value;
    else preview.removeAttribute("src");
  }

  details.addEventListener("toggle", async () => {
    if (!details.open || loaded || loading) return;
    loading = true;
    status.textContent = "Carregando informações…";
    try {
      const { data, error } = await query().select("volume,mapping,numeracoes,foto_jpeg,revisao").match(key).maybeSingle();
      if (error) throw error;
      for (const [name] of fields) inputs[name].value = data?.[name] || "";
      displayPhoto(data?.foto_jpeg || null);
      revision = data?.revisao ?? null;
      loaded = true;
      controls.disabled = false;
      status.textContent = "";
    } catch {
      status.textContent = "Não foi possível carregar. Feche e abra esta seção para tentar novamente.";
    } finally {
      loading = false;
    }
  });

  file.addEventListener("change", async () => {
    const selected = file.files[0];
    if (!selected) return;
    controls.disabled = true;
    status.textContent = "Preparando foto…";
    try {
      displayPhoto(await preparePhoto(selected));
      status.textContent = "Foto pronta. Salve o procedimento para guardar.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      file.value = "";
      controls.disabled = false;
    }
  });

  remove.addEventListener("click", () => {
    displayPhoto(null);
    status.textContent = "Salve o procedimento para confirmar a remoção da foto.";
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!loaded || controls.disabled) return;
    const values = Object.fromEntries(fields.map(([name]) => [name, inputs[name].value.trim()]));
    values.foto_jpeg = photo;
    values.revisao = (revision ?? 0) + 1;
    controls.disabled = true;
    status.textContent = "Salvando…";
    try {
      const request = revision === null
        ? query().insert({ ...key, ...values })
        : query().update(values).match({ ...key, revisao: revision });
      const { data, error } = await request.select("revisao").maybeSingle();
      if (error && error.code !== "23505") throw error;
      if (!data) {
        status.textContent = "Este procedimento mudou em outra aba ou dispositivo. Reabra a ficha para conferir a versão mais recente.";
        return;
      }
      revision = data.revisao;
      status.textContent = "Procedimento salvo.";
    } catch {
      status.textContent = "Não foi possível salvar. Confira a conexão e tente novamente.";
    } finally {
      controls.disabled = false;
    }
  });
  return details;
}

export async function showProcedureHistory(db, target, client, user) {
  const section = element("section", null, "as-procedure-history");
  section.append(element("h2", "Histórico de procedimentos"));
  const message = element("p", "Carregando atendimentos…");
  message.setAttribute("role", "status");
  section.append(message);
  target.replaceChildren(section);
  try {
    const { data, error } = await db.from("agenda_studio").select("data").eq("owner_id", user.id).maybeSingle();
    if (error) throw error;
    const raw = data?.data || {};
    const agenda = typeof raw === "string" ? JSON.parse(raw) : raw;
    const phone = String(client.phone || "").replace(/\D/g, "");
    const clients = Array.isArray(agenda.clients) ? agenda.clients : [];
    const exact = clients.find(item => item.id === client.id);
    const legacy = phone.length >= 10
      ? clients.filter(item => String(item.phone || "").replace(/\D/g, "") === phone)
      : [];
    const clientId = exact?.id ?? (legacy.length === 1 ? legacy[0].id : client.id);
    const list = (Array.isArray(agenda.appointments) ? agenda.appointments : [])
      .filter(item => item.clientId === clientId)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.time || "").localeCompare(String(a.time || "")));
    if (!list.length) {
      message.textContent = "Nenhum atendimento registrado para esta cliente.";
      return;
    }
    message.textContent = list.length + " atendimento(s) registrado(s)";
    for (const appointment of list) {
      const card = element("article", null, "as-procedure-card");
      card.append(element("strong", formatDate(appointment.date) + " · " + (appointment.time || "Horário não informado")));
      function field(label, value) {
        const paragraph = element("p");
        paragraph.append(element("strong", label + ": "), document.createTextNode(value));
        card.append(paragraph);
      }
      field("Técnica", appointment.technique || "Não informada");
      field("Status", appointment.status || "Não informado");
      if (appointment.duration) field("Duração", appointment.duration + " minutos");
      if (appointment.notes) field("Observações", appointment.notes);
      if (appointment.maintenanceOf) field("Manutenção de", formatDate(appointment.maintenanceOf));
      if (appointment.status === "Realizado") {
        const days = Number(appointment.days) || Number(client.days) ||
          Number(clients.find(item => item.id === appointment.clientId)?.days) || 21;
        field("Próxima manutenção prevista", formatDate(maintenanceDate(appointment.date, days)));
      } else if (appointment.maintenance) {
        field("Manutenção", appointment.maintenance);
      }
      if (appointment.id && appointment.clientId) card.append(procedureForm(db, user.id, appointment));
      section.append(card);
    }
  } catch {
    message.textContent = "Não foi possível carregar o histórico. Reabra a ficha para tentar novamente.";
  }
}
