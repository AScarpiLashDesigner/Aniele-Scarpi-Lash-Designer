(() => {
  const catalogUrl = new URL("../index.html", document.currentScript.src);
  const normalize = text => text.trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const maintenancePrefix = /^manuten[cç][aã]o\s*[-–—:]\s*/i;
  let catalogRequest;

  function publicPrice(text) {
    const match = text.match(/R\$\s*([\d.]+,\d{2})/);
    return match ? Number(match[1].replace(/\./g, "").replace(",", ".")) : null;
  }

  function catalog() {
    return catalogRequest ??= fetch(catalogUrl).then(async response => {
      if (!response.ok) throw Error("Tabela de preços indisponível.");
      const page = new DOMParser().parseFromString(await response.text(), "text/html");
      return Array.from(page.querySelectorAll("#servicos .cards > .card"), card => ({
        name: card.querySelector("h3")?.textContent.trim(),
        full: publicPrice(card.querySelector(".preco")?.textContent ?? ""),
        maintenance: publicPrice(card.querySelector(".manutencao")?.textContent ?? ""),
      })).filter(entry => entry.name && entry.full !== null);
    }).catch(() => {
      catalogRequest = undefined;
      return [];
    });
  }

  async function suggest(technique) {
    const name = technique.trim();
    const maintenance = maintenancePrefix.test(name);
    const entry = (await catalog()).find(item => normalize(item.name) === normalize(name.replace(maintenancePrefix, "")));
    return (maintenance ? entry?.maintenance : entry?.full) ?? null;
  }

  function suggestedMaintenance(technique) {
    const name = technique.trim().replace(maintenancePrefix, "");
    return name && normalize(name) !== "manutencao" ? "Manutenção — " + name : "Manutenção";
  }

  const bound = new WeakSet();
  function bind(form) {
    if (!form || bound.has(form)) return;
    const { technique, price, status } = form.elements;
    if (!technique || !price) return;
    bound.add(form);
    const options = form.querySelector("#techniques");
    catalog().then(entries => {
      if (!options || !entries.length) return;
      for (const name of [...entries.map(entry => entry.name), ...entries.map(entry => suggestedMaintenance(entry.name))]) {
        const option = document.createElement("option");
        option.value = name;
        options.append(option);
      }
    });
    let manual = false;
    async function prefill() {
      const selected = technique.value;
      const value = await suggest(selected);
      if (!manual && technique.value === selected) price.value = value ?? "";
    }
    price.addEventListener("input", () => { manual = true; });
    technique.addEventListener("input", prefill);
    if (!price.value && status.value === "Agendado") prefill();
  }

  window.AS_prices = { bind, suggest, suggestedMaintenance };
})();
