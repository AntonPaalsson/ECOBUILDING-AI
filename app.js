(() => {
  const byId = (id) => document.getElementById(id);
  const fileInput = byId("file");
  const dropArea = byId("drop");
  const framework = window.ECO_FRAMEWORK ?? {
    tags: [],
    notificationClasses: {},
    terms: [],
  };
  const airTreatmentTags = window.ECO_AIR_TREATMENT_TAGS ?? [];
  const frameworkSystems = window.ECO_FRAMEWORK_SYSTEMS?.systems ?? [];
  const systemPrefixPattern = /^(?:LB[A-Z0-9]{1,3}|AS[_-][A-Z]\d{2,4}|AS\d{1,3}|BEL_[A-Z0-9]+|(?:VV|VP|VS)\d{1,3}_MQ\d{1,3}|KA\d{1,3}_(?:B\d{1,3}|A\d{3,5})|(?:VS|MV|VV|KV|FA|MQ|KB|VPU)\d{1,3})-/i;
  const projectQuestions = [
    { id: "ducName", label: "Vad heter DUC:en i BACnet/IP Network?", type: "text", placeholder: "DUCNAMN", hint: "Namnet direkt under BACnet/IP Network i EBO sökvägen." },
    { id: "schoolName", label: "Skolans namn", type: "text", placeholder: "Exempelskolan" },
    { id: "sportsHall", label: "Betjänar aggregatet en idrottshall?", type: "yesNo", evidence: ["TKVD"], controls: ["idrottshall"], sections: { yes: ["idrottshall"] } },
    { id: "kitchen", label: "Betjänar aggregatet kök?", type: "yesNo", evidence: ["GT31_GT71", "GP11_BB", "GP11_BL", "GP11_BH", "GP12_BB", "GP12_BL", "GP12_BH"], controls: ["betjänar kök"], sections: { yes: ["betjänar kök", "komponent gt31"] } },
    { id: "controlMode", label: "Är aggregatet frånluftsreglerat eller flödesreglerat?", type: "choice", options: [["exhaust", "Frånluftsreglerat"], ["flow", "Flödesreglerat"], ["other", "Annat / inget av dessa"]], controls: ["komponent gt21", "flödesreglerat", "komponent gf41", "komponent gf42"], sections: { exhaust: ["komponent gt21"], flow: ["flödesreglerat", "komponent gf41", "komponent gf42"] } },
    { id: "recovery", label: "Vilken värmeåtervinning finns?", type: "choice", options: [["rotary", "Roterande"], ["liquid", "Vätskeburen"], ["plate", "Plattvärmeväxlare"], ["none", "Ingen av dessa"]], evidenceGroups: { rotary: ["RVÅ_"], liquid: ["SV61_", "VÅ_"], plate: ["PVÅ_", "ST41_"] }, controls: ["roterande återvinning", "vätskeburen värmeåtervinning", "plattvärmeväxlare"], sections: { rotary: ["roterande återvinning"], liquid: ["vätskeburen värmeåtervinning"], plate: ["plattvärmeväxlare"] } },
    { id: "battery", label: "Vilken typ av värme-/kylbatteri finns?", type: "choice", options: [["water", "Vätskeburen luftvärmare"], ["electric", "Elbatteri"], ["sabo", "SABO-kopplat kylbatteri"], ["cooling", "Annat kylbatteri"], ["combined", "Kombinerat värme-/kylbatteri"], ["none", "Inget av dessa"]], evidenceGroups: { water: ["SV31_"], electric: ["LV1_"], sabo: ["SV51_", "P2_"], cooling: ["SV22_"], combined: ["SV21_"] }, controls: ["vätskeburen luftvärmare", "elbatteri", "kylbatteri ej vid sabo", "kylbatteri är sabo", "kombinerat värme/kylbatteri"], sections: { water: ["vätskeburen luftvärmare"], electric: ["elbatteri"], sabo: ["kylbatteri är sabo"], cooling: ["kylbatteri ej vid sabo"], combined: ["kombinerat värme/kylbatteri"] } },
    { id: "p3Speed", label: "Är P3 varvtalsstyrd?", type: "yesNo", evidence: ["P3_SS"], controls: ["om p3 varvtals"], sections: { yes: ["om p3 varvtals"] } },
    { id: "electricAirHeat", label: "Finns elluftvärme?", type: "yesNo", evidence: ["GT11_GT71_BL_L", "GP11_LL_L"], controls: ["elluftvärme"], sections: { yes: ["elluftvärme", "komponent gt11"] } },
    { id: "co2Sensor", label: "Finns kombinerad temperatur-/CO₂-givare i frånluftskanalen?", type: "yesNo", evidence: ["GT11_GQ11_X1", "GT11_GQ11_Y1"], controls: ["kombinerad temp/co2"], sections: { yes: ["kombinerad temp/co2", "komponent gt11"] } },
    { id: "smokeExhaust", label: "Betjänar någon fläkt rökevakuering?", type: "yesNo", evidence: ["FFX_SB_L"], controls: ["rökevakuering"], sections: { yes: ["rökevakuering"] } },
    { id: "st21Series", label: "Ligger ST21 och ST22 i serie?", type: "yesNo", evidence: ["ST21_ST22_"], controls: ["komponent st21", "komponent st22"], sections: { yes: ["komponent st21", "komponent st22"] } },
    { id: "fireDamperCount", label: "Hur många brand-/brandgasspjäll finns?", type: "count", prefix: "ST6", controls: ["fler än ett brand"] },
    { id: "fireDamperModules", label: "Används brandspjällsmoduler?", type: "yesNo", evidence: ["ST6XX_KOMM_L"], controls: ["brandspjällsmoduler"], sections: { yes: ["brandspjällsmoduler"] } },
    { id: "pressureDamperCount", label: "Hur många tryckavlastningsspjäll finns?", type: "count", prefix: "ST7", controls: ["fler än ett tryck"] },
    { id: "unitAggregate", label: "Är det ett enhetsaggregat?", type: "yesNo", evidence: ["SL_A_L", "SL_B_L"], controls: ["enhetsaggregat"], sections: { yes: ["enhetsaggregat"] } },
    { id: "weldingFume", label: "Finns svets-/lödsug ansluten?", type: "yesNo", evidence: [], controls: [], sections: {} },
    { id: "missingComponents", label: "Finns det komponenter på driftkortet som saknas helt i tagglistan?", type: "yesNo", evidence: [], controls: [], sections: {} },
  ];
  const nonFrameworkProperties = new Set(
    [
      "Def.-data",
      "Anvisning",
      "Framsteg",
      "IPLinkKonfig",
      "Område",
      "Projektering",
      "Restsminne",
      "Tillstånd",
      "Trend",
      "Slå",
      "Slå om",
    ].map(normalize),
  );

  let sourceFile;
  let workbookZip;
  let worksheetXml;
  let worksheetPath;
  let stylesXml;
  let headerRow;
  let nameColumn;
  let descriptionColumn;
  let assessmentColumn;
  let reviewedRows = [];
  let reviewCompleted = false;
  let selectedTagGroups = new Set();
  let userSelectedMissingGroups = new Set();
  let questionAnswers = {};
  let selectedFrameworkSystemId = "airTreatment";
  let airTreatmentStarted = false;
  let activeWorkflowStep = 1;
  let workflowMode = "xml";
  let activeSystemPrefix = "";
  const tgmlPositionOverrides = new Map();
  let generatedObjectSetForPreview = null;
  const systemTagKeysCache = new Map();
  const relevantFrameworkTagsCache = new Map();
  const frameworkPatternCache = new Map();
  const templateBindingCache = new Map();

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "");
  }

  function normalizeTag(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9_]+/g, "")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  function getFrameworkSystem(systemId = selectedFrameworkSystemId) {
    return frameworkSystems.find((system) => system.id === systemId) ?? null;
  }

  function getSystemItems(systemId = selectedFrameworkSystemId) {
    if (systemId === "airTreatment") return airTreatmentTags;
    return getFrameworkSystem(systemId)?.items ?? [];
  }

  function getQuestionsForSystem() {
    if (!selectedFrameworkSystemId) return [];
    if (selectedFrameworkSystemId === "airTreatment") {
      return workflowMode === "review"
        ? []
        : projectQuestions.filter((question) => question.id === "ducName" || question.id === "schoolName");
    }
    return [];
  }

  function inferFrameworkSystemId() {
    const tags = getTagKeys();
    const prefixes = getSystemPrefixes();
    const hasApparatusPrefix = reviewedRows.some((item) => {
      const token = item.description.trim().split(/\s+/)[0];
      return /^AS[_-][A-Z]\d{2,4}-/i.test(token) || /^AS\d{1,3}-/i.test(token);
    });
    if (prefixes.some((prefix) => /^LB/i.test(prefix))) return "airTreatment";
    if (prefixes.some((prefix) => /^FA/i.test(prefix))) return "separateFans";
    if (prefixes.some((prefix) => /^KA/i.test(prefix))) return "cooling";
    if (prefixes.some((prefix) => /_MQ\d+$/i.test(prefix)) || prefixes.some((prefix) => /^MQ/i.test(prefix))) return "meters";
    if (hasApparatusPrefix) return "";
    if (prefixes.some((prefix) => /^(?:VS|MV|VP|VPU|KB)/i.test(prefix))) {
      const heatPumpEvidence = ["ELP1_", "VPU", "ACK_", "KOMP"].some((token) => hasTagPrefix(tags, token));
      return heatPumpEvidence ? "heatPump" : "";
    }
    if (prefixes.some((prefix) => /^VV/i.test(prefix))) return "hotWater";
    if (prefixes.some((prefix) => /^KV/i.test(prefix))) return "";
    return "";
  }

  function updateFrameworkSystemOptions() {
    const select = byId("frameworkSystem");
    if (!select) return;
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Välj systemtyp";
    select.appendChild(placeholder);
    for (const system of frameworkSystems) {
      const option = document.createElement("option");
      option.value = system.id;
      option.textContent = system.label;
      select.appendChild(option);
    }
    const inferred = inferFrameworkSystemId();
    const current = selectedFrameworkSystemId || select.value;
    selectedFrameworkSystemId = frameworkSystems.some((system) => system.id === current)
      ? current
      : inferred;
    select.value = selectedFrameworkSystemId;
    updateSystemSelectionView();
  }

  function updateSystemSelectionView() {
    const reviewOnly = workflowMode === "review";
    const workflowVisible = reviewOnly || airTreatmentStarted;
    byId("systemSelectionTitle").textContent = reviewOnly ? "Granska tagglista" : "Luftbehandling";
    byId("systemSelectionDescription").textContent = reviewOnly
      ? "Tagglistan jämförs mot ramverket."
      : "Ange antal system/driftkort för XML-exporten.";
    byId("workflow").classList.toggle("hidden", !workflowVisible);
    byId("airTreatmentSetup").classList.toggle("hidden", reviewOnly || airTreatmentStarted);
    byId("selectedSystemTitle").classList.toggle("hidden", reviewOnly);
    byId("systemProfilesPanel").classList.toggle("hidden", reviewOnly || !reviewedRows.length);
    byId("tagListFormatControl").classList.toggle("hidden", !reviewOnly);
    byId("fsNameControl").classList.toggle("hidden", reviewOnly);
    byId("workflowDescription").classList.toggle("hidden", reviewOnly);
    byId("workflowDescription").innerHTML = reviewOnly
      ? 'Ladda upp en tagglista som Excel-fil för granskning mot ramverket. <b>"Name"</b> korrigeras där en matchning finns och <b>"Description"</b> bevaras.'
      : 'Ladda upp tagglistan som Excelfil. Programmet använder en gemensam ventilationsmall för jämförelsen mot ramverket. <b>"Name"</b> korrigeras till ramverkets taggbeteckning där en matchning finns, en bedömning läggs till och <b>"Description"</b> samt larmklasser bevaras.';
    byId("step2Button").disabled = reviewOnly || !airTreatmentStarted;
    updateTopTabState();
    byId("continueAirTreatment").disabled = !getRequestedSystemCount();
    byId("airTemplateStatus").textContent = getRequestedSystemCount()
      ? `${getRequestedSystemCount()} system/driftkort väljs efter uppladdning av tagglistan.`
      : "Ange ett giltigt antal system/driftkort."
  }

  function getRequestedSystemCount() {
    const input = byId("systemCount");
    const count = Number(input?.value);
    return Number.isInteger(count) && count > 0 && input.checkValidity() ? count : 0;
  }

  function getSystemProfileSelections() {
    return [...document.querySelectorAll(".system-profile-row")].map((row) => ({
      systemPrefix: row.querySelector("[data-profile-prefix]").value,
      components: [...(document.querySelector(`[data-component-profile="${CSS.escape(row.querySelector("[data-profile-prefix]").value)}"]`)?.querySelectorAll("[data-library-component]:checked") ?? [])]
        .map((input) => input.value),
    }));
  }

  function getProfileForSystemPrefix(systemPrefix) {
    return getSystemProfileSelections().find((profile) => profile.systemPrefix === systemPrefix) ?? null;
  }

  function renderSystemProfiles() {
    const panel = byId("systemProfilesPanel");
    const container = byId("systemProfiles");
    const previous = getSystemProfileSelections();
    const prefixes = getSystemPrefixes();
    const count = getRequestedSystemCount();
    container.replaceChildren();
    panel.classList.toggle("hidden", workflowMode === "review" || !reviewedRows.length || selectedFrameworkSystemId !== "airTreatment");
    if (workflowMode === "review" || !reviewedRows.length || selectedFrameworkSystemId !== "airTreatment") return;

    for (let index = 0; index < count; index++) {
      const row = document.createElement("div");
      row.className = "system-profile-row";
      const number = document.createElement("strong");
      number.textContent = `XML ${index + 1}`;

      const prefixLabel = document.createElement("label");
      prefixLabel.textContent = "Systemnamn";
      const prefixSelect = document.createElement("select");
      prefixSelect.dataset.profilePrefix = "";
      const prefixPlaceholder = document.createElement("option");
      prefixPlaceholder.value = "";
      prefixPlaceholder.textContent = "Välj system";
      prefixSelect.appendChild(prefixPlaceholder);
      for (const prefix of prefixes) {
        const option = document.createElement("option");
        option.value = prefix;
        option.textContent = prefix;
        prefixSelect.appendChild(option);
      }
      prefixSelect.value = prefixes.includes(previous[index]?.systemPrefix) ? previous[index].systemPrefix : "";
      prefixLabel.appendChild(prefixSelect);
      row.append(number, prefixLabel);
      container.appendChild(row);
    }
    renderComponentLibraryPanel();
    renderBindingOverview();
    syncPrimarySystemPrefix();
    updateSystemProfilesStatus();
    renderTgmlPreview();
  }

  function renderComponentLibraryPanel() {
    const panel = byId("componentLibraryPanel");
    const container = byId("componentLibraryProfiles");
    if (!panel || !container) return;
    const profiles = getSystemProfileSelections();
    container.replaceChildren();
    const show = workflowMode !== "review" && reviewedRows.length > 0 && profiles.length > 0;
    panel.classList.toggle("hidden", !show);
    if (!show) return;

    const catalog = window.ECO_COMPONENT_LIBRARY ?? [];
    const originalAnswers = { ...questionAnswers };
    const originalGroups = selectedTagGroups;
    for (const profile of profiles) {
      if (!profile.systemPrefix) continue;
      questionAnswers = { ...originalAnswers };
      applyTagListAnswers(getTagKeysForSystem(profile.systemPrefix));
      selectedTagGroups = resolveActiveTagGroups(profile.systemPrefix);
      const section = document.createElement("details");
      section.className = "component-profile-list";
      const summary = document.createElement("summary");
      summary.textContent = `${profile.systemPrefix} · ${catalog.length} komponenter i biblioteket`;
      section.appendChild(summary);

      const search = document.createElement("input");
      search.type = "search";
      search.className = "component-library-search";
      search.placeholder = "Sök komponent";
      search.setAttribute("aria-label", `Sök komponent för ${profile.systemPrefix}`);
      section.appendChild(search);

      const choices = document.createElement("div");
      choices.className = "component-library-choices";
      choices.dataset.componentProfile = profile.systemPrefix;
      const tagRows = getFrameworkTagRowsForSystem(profile.systemPrefix);
      const profileTagKeys = new Set([
        ...tagRows.map((row) => {
          const token = (row.name || row.description.trim().split(/\s+/)[0] || "").split(/\s+/)[0];
          return normalizeTag(token.replace(systemPrefixPattern, ""));
        }).filter(Boolean),
        ...getRawGfComponentTagKeys(profile.systemPrefix),
      ]);
      for (const item of catalog) {
        const verifiedBindings = item.objectsetBindings ?? [];
        const availableBindings = verifiedBindings.filter((binding, index) =>
          Boolean(item.piXml?.[index] && item.propertyReferenceXml?.[index]),
        );
        const bindingStatuses = availableBindings.map((binding) => ({
          binding,
          target: resolveTemplateBinding(binding, tagRows),
        }));
        const matchedBindings = bindingStatuses.filter((entry) => entry.target);
        const missingBindings = bindingStatuses.filter((entry) => !entry.target);
        const variantAllowed = !isExcludedGt11Variant(item.name, profileTagKeys) && !isExcludedGt31Variant(item.name);
        const ready = Boolean(item.safeToAdd && matchedBindings.length && variantAllowed);
        const option = document.createElement("div");
        option.className = "component-library-option";
        option.dataset.search = `${item.name} ${item.category} ${item.binds.join(" ")}`.toLocaleLowerCase("sv-SE");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = item.name;
        checkbox.dataset.libraryComponent = "";
        checkbox.disabled = !ready;
        checkbox.checked = ready && profile.components.includes(item.name);
        if (ready) checkbox.title = `${matchedBindings.length} bindningar kan skapas; ${missingBindings.length} saknas i tagglistan och utelämnas.`;
        const description = document.createElement("div");
        description.className = "component-library-description";
        description.innerHTML = `<strong></strong><small class="component-binding-count"></small><details class="component-binding-details"><summary>Visa bindningar</summary><ul></ul></details>`;
        description.querySelector("strong").textContent = `${item.name} · ${item.category}`;
        const count = description.querySelector(".component-binding-count");
        if (item.safeToAdd) {
          count.textContent = `${matchedBindings.length} kan bindas · ${missingBindings.length} saknas i tagglistan${variantAllowed ? "" : " · utesluten enligt vald variant"}`;
          count.classList.add(missingBindings.length ? "has-missing-bindings" : "all-bindings-match");
          const details = description.querySelector(".component-binding-details");
          details.querySelector("summary").textContent = `Visa bindningar (${bindingStatuses.length})`;
          const list = details.querySelector("ul");
          for (const { binding, target } of bindingStatuses) {
            const entry = document.createElement("li");
            entry.className = target ? "binding-match" : "binding-missing";
            entry.textContent = target
              ? `${binding} → ${target.objectName}${target.property ? ` · ${target.property}` : ""}`
              : `${binding} · saknas i tagglistan och utelämnas i XML`;
            list.appendChild(entry);
          }
        } else {
          count.textContent = "Bindningar behöver mappas och verifieras först";
          count.classList.add("unverified-bindings");
          description.querySelector(".component-binding-details").remove();
        }
        option.append(checkbox, description);
        choices.appendChild(option);
      }
      search.addEventListener("input", () => {
        const query = search.value.trim().toLocaleLowerCase("sv-SE");
        for (const option of choices.children) option.hidden = query && !option.dataset.search.includes(query);
      });
      section.appendChild(choices);
      container.appendChild(section);
    }
    questionAnswers = originalAnswers;
    selectedTagGroups = originalGroups;
  }

  function getTemplateBindingCandidates(templateId) {
    if (templateBindingCache.has(templateId)) return templateBindingCache.get(templateId);
    const source = getSelectedObjectSetTemplate();
    if (!source) return [];
    const objectSet = parseXml(source);
    if (xmlHasParseError(objectSet)) return [];
    const graphicOi = [...objectSet.getElementsByTagNameNS("*", "OI")]
      .find((oi) => ["LBXX BILD", `${templateId} BILD`].includes(oi.getAttribute("NAME")));
    const graphicType = [...objectSet.getElementsByTagNameNS("*", "ObjectType")]
      .find((type) => type.getAttribute("Name") === graphicOi?.getAttribute("TYPE"));
    if (!graphicOi || !graphicType) return [];
    const propertyNames = new Set([...graphicType.getElementsByTagNameNS("*", "PropertyReference")]
      .map((property) => property.getAttribute("Name")));
    const candidates = [...graphicOi.getElementsByTagNameNS("*", "PI")].flatMap((pi) => {
      const binding = pi.getAttribute("Name");
      const hasApplicationReference = [...pi.getElementsByTagNameNS("*", "Reference")]
        .some((reference) => /\/Application\/LBXX(?:-[^/]+)?(?:\/|$)/i.test(reference.getAttribute("Object") ?? ""));
      if (!binding || !hasApplicationReference || !propertyNames.has(binding)) return [];
      return [{ binding, component: binding.split(".")[0], source: "mall", active: true }];
    });
    templateBindingCache.set(templateId, candidates);
    return candidates;
  }

  function renderBindingOverview() {
    const panel = byId("bindingOverviewPanel");
    const container = byId("bindingOverviewProfiles");
    if (!panel || !container) return;
    const profiles = getSystemProfileSelections();
    container.replaceChildren();
    const show = workflowMode !== "review" && reviewedRows.length > 0 && profiles.length > 0;
    panel.classList.toggle("hidden", !show);
    if (!show) return;

    const catalog = window.ECO_COMPONENT_LIBRARY ?? [];
    const originalAnswers = { ...questionAnswers };
    const originalGroups = selectedTagGroups;
    for (const profile of profiles) {
      if (!profile.systemPrefix) continue;
      questionAnswers = { ...originalAnswers };
      applyTagListAnswers(getTagKeysForSystem(profile.systemPrefix));
      selectedTagGroups = resolveActiveTagGroups(profile.systemPrefix);
      const rows = getSystemTagRows(profile.systemPrefix);
      const exportRows = getFrameworkTagRowsForSystem(profile.systemPrefix);
      const exportRowSet = new Set(exportRows);
      const rowByTag = new Map();
      const rowKeys = new Map();
      for (const row of rows) {
        const descriptionTag = row.description.trim().split(/\s+/)[0] ?? "";
        const nameTag = row.name.trim().split(/\s+/)[0] ?? "";
        const keys = new Set([descriptionTag, nameTag]
          .map((tag) => normalizeTag(tag.replace(systemPrefixPattern, "")))
          .filter(Boolean));
        rowKeys.set(row, keys);
        for (const key of keys) if (!rowByTag.has(key)) rowByTag.set(key, row);
      }

      const candidates = getTemplateBindingCandidates("LBXX").map((candidate) => ({ ...candidate }));
      const templateNames = new Set(candidates.map((candidate) => candidate.binding.toUpperCase()));
      const tagKeys = new Set([
        ...exportRows.map((row) => {
          const token = (row.name || row.description.trim().split(/\s+/)[0] || "").split(/\s+/)[0];
          return normalizeTag(token.replace(systemPrefixPattern, ""));
        }).filter(Boolean),
        ...getRawGfComponentTagKeys(profile.systemPrefix),
      ]);
      for (const item of catalog) {
        if (!item.safeToAdd) continue;
        const variantAllowed = !isExcludedGt11Variant(item.name, tagKeys) && !isExcludedGt31Variant(item.name);
        for (const [index, binding] of (item.objectsetBindings ?? []).entries()) {
          if (templateNames.has(binding.toUpperCase())) continue;
          if (!item.piXml?.[index] || !item.propertyReferenceXml?.[index]) continue;
          candidates.push({
            binding,
            component: item.name,
            source: "library",
            active: profile.components.includes(item.name),
            variantAllowed,
          });
        }
      }

      const mappedRows = new Map(rows.map((row) => [row, []]));
      const unmatchedActive = [];
      for (const candidate of candidates) {
        if (candidate.source === "library" && !candidate.variantAllowed) continue;
        const tagTarget = resolveTemplateBinding(candidate.binding, rows);
        const exportTarget = resolveTemplateBinding(candidate.binding, exportRows);
        if (!tagTarget) {
          if (candidate.active) unmatchedActive.push(candidate);
          continue;
        }
        const targetKey = normalizeTag(tagTarget.objectName.replace(systemPrefixPattern, ""));
        const row = rowByTag.get(targetKey);
        if (!row) {
          if (candidate.active) unmatchedActive.push(candidate);
          continue;
        }
        mappedRows.get(row).push({ ...candidate, tagTarget, exportTarget });
      }

      const boundNow = rows.filter((row) => exportRowSet.has(row) && mappedRows.get(row).some((entry) => entry.active && entry.exportTarget)).length;
      const libraryChoice = rows.filter((row) => exportRowSet.has(row) &&
        !mappedRows.get(row).some((entry) => entry.active && entry.exportTarget) &&
        mappedRows.get(row).some((entry) => entry.source === "library" && !entry.active && entry.exportTarget)).length;
      const unbound = rows.filter((row) => exportRowSet.has(row) && !mappedRows.get(row).some((entry) => entry.exportTarget)).length;

      const section = document.createElement("details");
      section.className = "binding-overview-profile";
      const summary = document.createElement("summary");
      summary.textContent = `${profile.systemPrefix} · ${rows.length} taggar · ${boundNow} kan bindas nu · ${libraryChoice} kräver komponentval · ${unbound} saknar bindning`;
      section.appendChild(summary);

      const search = document.createElement("input");
      search.type = "search";
      search.className = "binding-overview-search";
      search.placeholder = "Sök tagg eller bindning";
      search.setAttribute("aria-label", `Sök tagg eller bindning för ${profile.systemPrefix}`);
      section.appendChild(search);

      const tableWrap = document.createElement("div");
      tableWrap.className = "binding-overview-table-wrap";
      const table = document.createElement("table");
      table.className = "binding-overview-table";
      const thead = document.createElement("thead");
      const header = document.createElement("tr");
      for (const title of ["Tagg", "Description", "Bindning", "Bedömning"]) {
        const th = document.createElement("th");
        th.textContent = title;
        header.appendChild(th);
      }
      thead.appendChild(header);
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      for (const row of rows) {
        const matches = mappedRows.get(row);
        const activeMatches = matches.filter((entry) => entry.active && entry.exportTarget);
        const libraryMatches = matches.filter((entry) => entry.source === "library" && !entry.active && entry.exportTarget);
        const inExport = exportRowSet.has(row);
        const tr = document.createElement("tr");
        tr.className = !inExport ? "binding-row-outside" : activeMatches.length ? "binding-row-available" : libraryMatches.length ? "binding-row-selectable" : "binding-row-missing";
        tr.dataset.search = `${row.name} ${row.description} ${matches.map((entry) => `${entry.binding} ${entry.component}`).join(" ")}`.toLocaleLowerCase("sv-SE");
        const tagCell = document.createElement("td");
        tagCell.textContent = row.name || row.description.trim().split(/\s+/)[0] || "";
        const descriptionCell = document.createElement("td");
        descriptionCell.textContent = row.description;
        const bindingsCell = document.createElement("td");
        const details = document.createElement("details");
        details.className = "binding-row-details";
        const detailsSummary = document.createElement("summary");
        detailsSummary.textContent = matches.length ? `Visa ${matches.length} träff${matches.length === 1 ? "" : "ar"}` : "Visa status";
        details.appendChild(detailsSummary);
        const list = document.createElement("ul");
        for (const entry of matches) {
          const item = document.createElement("li");
          const canExport = Boolean(entry.exportTarget);
          item.className = !canExport ? "binding-detail-outside" : entry.active ? "binding-detail-active" : "binding-detail-library";
          const sourceLabel = entry.source === "mall" ? "Mall" : entry.active ? `Vald komponent · ${entry.component}` : `Komponentbibliotek · ${entry.component}`;
          const target = entry.tagTarget;
          item.textContent = `${entry.binding} · ${sourceLabel} → ${target.objectName}${target.property ? ` · ${target.property}` : ""}${canExport ? "" : " · utelämnas ur XML"}`;
          list.appendChild(item);
        }
        if (!matches.length) {
          const item = document.createElement("li");
          item.className = inExport ? "binding-detail-missing" : "binding-detail-outside";
          item.textContent = inExport ? "Ingen verifierad bindning i den gemensamma ventilationsmallen eller biblioteket." : "Taggen ingår inte i ramverkets exporturval.";
          list.appendChild(item);
        }
        details.appendChild(list);
        bindingsCell.appendChild(details);
        const statusCell = document.createElement("td");
        if (!inExport) {
          statusCell.className = "binding-status-outside";
          statusCell.textContent = "Utanför ramverkets exporturval";
        } else if (activeMatches.length) {
          statusCell.className = "binding-status-available";
          statusCell.textContent = `${activeMatches.length} bindning${activeMatches.length === 1 ? "" : "ar"} kan skapas`;
        } else if (libraryMatches.length) {
          statusCell.className = "binding-status-selectable";
          statusCell.textContent = `Välj komponent i biblioteket (${libraryMatches.length})`;
        } else {
          statusCell.className = "binding-status-missing";
          statusCell.textContent = "Ingen verifierad bindning";
        }
        tr.append(tagCell, descriptionCell, bindingsCell, statusCell);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      tableWrap.appendChild(table);
      section.appendChild(tableWrap);

      const missingSection = document.createElement("details");
      missingSection.className = "binding-unmatched-list";
      const missingSummary = document.createElement("summary");
      missingSummary.textContent = `Aktiva mall-/komponentbindningar utan taggträff (${unmatchedActive.length})`;
      missingSection.appendChild(missingSummary);
      const missingList = document.createElement("ul");
      for (const candidate of unmatchedActive) {
        const item = document.createElement("li");
        item.textContent = `${candidate.binding} · ${candidate.source === "mall" ? "Mall" : candidate.component} · saknas i tagglistan`;
        missingList.appendChild(item);
      }
      if (!unmatchedActive.length) {
        const item = document.createElement("li");
        item.textContent = "Alla aktiva bindningar har en motsvarande tagg i listan.";
        missingList.appendChild(item);
      }
      missingSection.appendChild(missingList);
      section.appendChild(missingSection);

      search.addEventListener("input", () => {
        const query = search.value.trim().toLocaleLowerCase("sv-SE");
        for (const row of tbody.rows) row.hidden = Boolean(query && !row.dataset.search.includes(query));
      });
      container.appendChild(section);
    }
    questionAnswers = originalAnswers;
    selectedTagGroups = originalGroups;
  }

  function syncPrimarySystemPrefix() {
    const primary = getSystemProfileSelections()[0]?.systemPrefix ?? "";
    const select = byId("systemPrefix");
    if (select && [...select.options].some((option) => option.value === primary)) select.value = primary;
  }

  function areSystemProfilesComplete() {
    const profiles = getSystemProfileSelections();
    const count = getRequestedSystemCount();
    const prefixes = profiles.map((profile) => profile.systemPrefix);
    return count > 0 && profiles.length === count && profiles.every((profile) => profile.systemPrefix) && new Set(prefixes).size === prefixes.length;
  }

  function updateSystemProfilesStatus() {
    const count = getRequestedSystemCount();
    const prefixes = getSystemPrefixes();
    const profiles = getSystemProfileSelections();
    const duplicate = new Set(profiles.map((profile) => profile.systemPrefix).filter(Boolean)).size !== profiles.filter((profile) => profile.systemPrefix).length;
    byId("systemProfilesStatus").textContent = !count
      ? "Ange först antal system/driftkort."
      : prefixes.length < count
        ? `Tagglistan innehåller ${prefixes.length} identifierade systemprefix, men ${count} valdes. Minska antalet eller kontrollera tagglistan.`
        : duplicate
          ? "Varje XML måste ha ett eget systemnamn."
          : areSystemProfilesComplete()
          ? `${count} system/driftkort har kopplats till den gemensamma ventilationsmallen.`
      : `Välj systemnamn för alla ${count} XML.`;
  }

  function getAirTreatmentTemplateId() {
    if (selectedFrameworkSystemId !== "airTreatment") return "";
    return window.ECO_EBO_OBJECTSET_TEMPLATE ? "LBXX" : "";
  }

  function getSelectedObjectSetTemplate() {
    return getAirTreatmentTemplateId() ? window.ECO_EBO_OBJECTSET_TEMPLATE : "";
  }

  function applyTagListAnswers(tagKeys = getTagKeys()) {
    if (selectedFrameworkSystemId !== "airTreatment") return;
    const xmlFields = new Set(["ducName", "schoolName", "missingComponents"]);
    for (const question of projectQuestions) {
      if (xmlFields.has(question.id)) continue;
      const answer = inferQuestionAnswer(question, tagKeys);
      if (answer !== null && (questionAnswers[question.id] === undefined || questionAnswers[question.id] === "")) {
        questionAnswers[question.id] = answer;
      }
    }
    if (questionAnswers.electricAirHeat === "yes" && questionAnswers.co2Sensor === "yes") {
      questionAnswers.gt11Naming = hasTagPrefix(tagKeys, "GT11_GT71_") ? "GT11_GT71" : "GT11_GQ11";
    }
  }

  function columnIndex(reference) {
    const letters = reference.match(/[A-Z]+/i)?.[0] ?? "";
    return [...letters.toUpperCase()].reduce(
      (number, letter) => number * 26 + letter.charCodeAt(0) - 64,
      0,
    ) - 1;
  }

  function readCell(cell, sharedStrings) {
    const type = cell.getAttribute("t");
    if (type === "s") {
      const value = cell.getElementsByTagNameNS("*", "v")[0];
      return value ? (sharedStrings[Number(value.textContent)] ?? "") : "";
    }
    if (type === "inlineStr") {
      return [...cell.getElementsByTagNameNS("*", "t")]
        .map((text) => text.textContent)
        .join("");
    }
    return cell.getElementsByTagNameNS("*", "v")[0]?.textContent ?? "";
  }

  function similarity(left, right) {
    if (!left || !right) return 0;
    const matrix = Array.from({ length: left.length + 1 }, (_, row) => [row]);
    for (let column = 0; column <= right.length; column++) {
      matrix[0][column] = column;
    }
    for (let row = 1; row <= left.length; row++) {
      for (let column = 1; column <= right.length; column++) {
        const cost = left[row - 1] === right[column - 1] ? 0 : 1;
        matrix[row][column] = Math.min(
          matrix[row - 1][column] + 1,
          matrix[row][column - 1] + 1,
          matrix[row - 1][column - 1] + cost,
        );
      }
    }
    return 1 - matrix[left.length][right.length] / Math.max(left.length, right.length);
  }

  function closestTag(value) {
    return getRelevantFrameworkTags()
      .map((tag) => ({ tag, score: similarity(value, normalize(tag)) }))
      .sort((a, b) => b.score - a.score)[0];
  }

  function isAlarmClass(description) {
    return /^\s*\d{2}\s+(?:[ABC]\s*-?\s*LARM|FASTIGHETSLARM|ENERGILARM|MÄTARLARM)\b/i.test(
      String(description ?? ""),
    );
  }

  function isNonFrameworkProperty(description) {
    const value = String(description ?? "").trim();
    return (
      nonFrameworkProperties.has(normalize(value)) ||
      /^(?:LB\d+-)?[A-Z0-9_-]+\((?:actValue|BACInfo)\)$/i.test(value)
    );
  }

  function isStandardTagListReview() {
    return workflowMode === "review" && byId("tagListFormat")?.value === "standard";
  }

  function getTagListReviewValue(item) {
    return isStandardTagListReview() ? String(item.sourceName ?? "") : String(item.description ?? "");
  }

  function reviewDescription(description) {
    const text = String(description ?? "").trim();
    if (!text) {
      return { kind: "bad", label: "Tom beskrivning", reason: "Description saknas" };
    }
    if (isNonFrameworkProperty(text)) {
      return { kind: "included", label: "Ingår * Metadata", reason: "" };
    }

    const notification = text.match(
      /^\s*(\d{2})\s*(?:[-–:]\s*)?(?:([ABC])[- ]?LARM|FASTIGHETSLARM|ENERGILARM|MÄTARLARM)?\s*(.*)$/i,
    );
    const expectedClass = notification && framework.notificationClasses[notification[1]];
    if (expectedClass) {
      const label = notification[3].trim();
      if (normalize(label) === normalize(expectedClass)) {
        return {
          kind: "good",
          label: "Stämmer",
          reason: `Larmklass ${notification[1]}: ${expectedClass}`,
        };
      }
      if (similarity(normalize(label), normalize(expectedClass)) >= 0.72) {
        return {
          kind: "typo",
          label: "Kontrollera stavning",
          reason: `Larmklass ${notification[1]} förväntar “${expectedClass}”`,
        };
      }
      return {
        kind: "bad",
        label: "Avvikelse",
        reason: `Larmklass ${notification[1]} förväntar “${expectedClass}”`,
      };
    }

    // Descriptions may start with a tag followed by explanatory text.
    const token = (text.match(/^[^\s]+/)?.[0] ?? "").replace(/[,:;]$/, "");
    const tag = token.replace(systemPrefixPattern, "");
    const normalizedTag = normalize(tag);
    const frameworkTag = normalizeTag(tag);
    // A tag can be a valid framework tag even when its conditional component
    // group is inactive for the answers in this project. Keep applicability
    // rules for the missing-tag suggestions, but don't call a known framework
    // tag a spelling error just because that group wasn't selected.
    if (getAllFrameworkTags().some((candidate) => frameworkPatternMatches(candidate, frameworkTag))) {
      return {
        kind: "good",
        label: "Stämmer",
        reason: `Taggen ${tag} finns i ramverket`,
      };
    }

    const match = closestTag(normalizedTag);
    if (match?.score >= 0.78) {
      return {
        kind: "typo",
        label: "Möjligt stavfel",
        reason: `Liknar ${match.tag}`,
      };
    }
    if (framework.terms.some((term) => normalize(term) === normalize(text))) {
      return { kind: "good", label: "Stämmer", reason: "Termen finns i ramverket" };
    }
    return {
      kind: "bad",
      label: "Saknas i ramverket",
      reason: `Ingen match för ${tag || text}`,
    };
  }

  function parseXml(xml) {
    return new DOMParser().parseFromString(xml, "application/xml");
  }

  async function parseWorkbook(file) {
    byId("error").textContent = "";
    generatedObjectSetForPreview = null;
    sourceFile = file;
    byId("filename").textContent = file.name;
    workbookZip = await JSZip.loadAsync(file);

    const workbookXml = parseXml(await workbookZip.file("xl/workbook.xml").async("text"));
    const relationshipsXml = parseXml(
      await workbookZip.file("xl/_rels/workbook.xml.rels").async("text"),
    );
    const firstSheet = workbookXml.getElementsByTagNameNS("*", "sheet")[0];
    if (!firstSheet) throw new Error("Arbetsboken saknar blad.");

    const relationshipId = firstSheet.getAttribute("r:id");
    const relationship = [...relationshipsXml.getElementsByTagNameNS("*", "Relationship")]
      .find((item) => item.getAttribute("Id") === relationshipId);
    if (!relationship) throw new Error("Kunde inte hitta arbetsbladet.");

    const target = relationship.getAttribute("Target");
    worksheetPath = target.startsWith("/")
      ? target.slice(1)
      : `xl/${target.replace(/^xl\//, "")}`;
    worksheetXml = parseXml(await workbookZip.file(worksheetPath).async("text"));
    stylesXml = parseXml(await workbookZip.file("xl/styles.xml").async("text"));

    const sharedStringsFile = workbookZip.file("xl/sharedStrings.xml");
    let sharedStrings = [];
    if (sharedStringsFile) {
      const sharedXml = parseXml(await sharedStringsFile.async("text"));
      sharedStrings = [...sharedXml.getElementsByTagNameNS("*", "si")].map((item) =>
        [...item.getElementsByTagNameNS("*", "t")]
          .map((text) => text.textContent)
          .join(""),
      );
    }

    const rows = [...worksheetXml.getElementsByTagNameNS("*", "row")];
    headerRow = rows[0];
    if (!headerRow) throw new Error("Arbetsbladet saknar rubrikrad.");
    const headers = new Map(
      [...headerRow.getElementsByTagNameNS("*", "c")].map((cell) => [
        normalize(readCell(cell, sharedStrings)),
        columnIndex(cell.getAttribute("r")),
      ]),
    );
    nameColumn = headers.get("NAME");
    descriptionColumn = headers.get("DESCRIPTION");
    if (nameColumn === undefined || descriptionColumn === undefined) {
      throw new Error("Första bladet måste ha rubrikerna Name och Description.");
    }
    assessmentColumn = Math.max(...headers.values()) + 1;

    reviewedRows = rows.slice(1).flatMap((row, index) => {
      const cells = [...row.getElementsByTagNameNS("*", "c")];
      const values = new Map(
        cells.map((cell) => [columnIndex(cell.getAttribute("r")), readCell(cell, sharedStrings)]),
      );
      const description = values.get(descriptionColumn) ?? "";
      const sourceName = values.get(nameColumn) ?? "";
      const reviewValue = workflowMode === "review" && byId("tagListFormat")?.value === "standard"
        ? sourceName
        : description;
      if (!description.trim() && !(workflowMode === "review" && byId("tagListFormat")?.value === "standard" && sourceName.trim())) return [];
      const isProperty = isNonFrameworkProperty(reviewValue);
      const isAlarm = isAlarmClass(reviewValue);
      return [{
        row,
        cells,
        sourceName,
        description,
        name: workflowMode === "review" && byId("tagListFormat")?.value === "standard"
          ? sourceName
          : isProperty || isAlarm
          ? description
          : description.trim().split(/\s+/)[0],
        rowNumber: Number(row.getAttribute("r")) || index + 2,
        result: isProperty
          ? {
              kind: "included",
              label: "Ingår * Metadata",
              reason: "",
            }
          : reviewDescription(reviewValue),
      }];
    });
    systemTagKeysCache.clear();
    relevantFrameworkTagsCache.clear();
    selectedTagGroups = new Set();
    userSelectedMissingGroups = new Set();
    questionAnswers = {};
    reviewCompleted = false;
    invalidateEboDownload();
    updateFrameworkSystemOptions();
    updateGT11NamingQuestion();
    renderTagGroupQuestions();
    updateSystemPrefixOptions();
    renderSystemProfiles();
    updateStep2Availability();
    byId("results").classList.remove("hidden");
    byId("reviewContent").classList.add("hidden");
  }

  function renderResults() {
    const counts = { good: 0, typo: 0, bad: 0, included: 0 };
    const tableBody = byId("rows");
    tableBody.replaceChildren();

    renderMissingTags();

    for (const item of reviewedRows) {
      counts[item.result.kind]++;
      const row = document.createElement("tr");
      row.className = item.result.kind;
      const values = [
        item.rowNumber,
        item.name,
        item.description,
        item.result.reason
          ? `${item.result.label} · ${item.result.reason}`
          : item.result.label,
      ];
      values.forEach((value, index) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        if (index === 3) cell.className = "status";
        row.appendChild(cell);
      });
      tableBody.appendChild(row);
    }

    byId("greenCount").textContent = counts.good;
    byId("yellowCount").textContent = counts.typo;
    byId("redCount").textContent = counts.bad;
    byId("includedCount").textContent = counts.included;
    byId("results").classList.remove("hidden");
    if (workflowMode !== "review") renderTgmlPreview();
  }

  async function startReview() {
    if (byId("runReview").disabled) return;
    generatedObjectSetForPreview = null;
    const originalAnswers = { ...questionAnswers };
    const activeGroupsByPrefix = new Map();
    const allActiveGroups = new Set();
    const profiles = workflowMode === "review" ? [] : getSystemProfileSelections();
    const runButton = byId("runReview");
    const buttonLabel = runButton.textContent;
    const inputs = [...document.querySelectorAll("#ruleQuestions input, #ruleQuestions select, #systemProfiles select")];
    runButton.disabled = true;
    runButton.textContent = "Förbereder granskning…";
    inputs.forEach((input) => { input.disabled = true; });
    try {
      for (const profile of profiles) {
        activeSystemPrefix = profile.systemPrefix;
        questionAnswers = { ...originalAnswers };
        applyTagListAnswers(getTagKeysForSystem(profile.systemPrefix));
        const groups = resolveActiveTagGroups(profile.systemPrefix);
        activeGroupsByPrefix.set(profile.systemPrefix, groups);
        for (const group of groups) allActiveGroups.add(group);
      }
      selectedTagGroups = allActiveGroups.size ? allActiveGroups : resolveActiveTagGroups();
      const total = reviewedRows.length;
      for (let index = 0; index < total; index++) {
        const item = reviewedRows[index];
        if (workflowMode === "review") {
          const reviewValue = getTagListReviewValue(item);
          // Use the same alarm-class parser as the assessment. It also accepts
          // the category variants that are not caught by the stricter tag helper.
          const alarmCategory = reviewDescription(item.description).reason.startsWith("Larmklass ");
          if (isStandardTagListReview()) {
            // Larmkategorier ska alltid få Description som Name, oavsett listformat.
            item.name = alarmCategory
              ? item.description
              : item.sourceName ?? "";
          } else {
            const description = String(item.description ?? "").trim();
            item.name = isNonFrameworkProperty(description) || alarmCategory
              ? description
              : description.split(/\s+/)[0] ?? description;
          }
          item.result = reviewDescription(reviewValue);
        } else if (item.result.kind !== "included") {
          const token = item.description.trim().split(/\s+/)[0] ?? "";
          const prefix = token.match(systemPrefixPattern)?.[0]?.slice(0, -1).toUpperCase() ?? "";
          const profile = workflowMode === "review" ? null : getProfileForSystemPrefix(prefix);
          activeSystemPrefix = profile?.systemPrefix ?? "";
          questionAnswers = { ...originalAnswers };
          if (profile) {
            applyTagListAnswers(getTagKeysForSystem(profile.systemPrefix));
            selectedTagGroups = activeGroupsByPrefix.get(profile.systemPrefix) ?? selectedTagGroups;
            item.name = correctedName(item);
          } else {
            selectedTagGroups = allActiveGroups;
            item.name = item.description.trim().split(/\s+/)[0] ?? item.description;
          }
          item.result = reviewDescription(item.description);
        }
        if ((index + 1) % 25 === 0 && index + 1 < total) {
          runButton.textContent = `Granskar ${index + 1} av ${total}…`;
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      }
    } finally {
      questionAnswers = originalAnswers;
      activeSystemPrefix = "";
      selectedTagGroups = allActiveGroups.size ? allActiveGroups : resolveActiveTagGroups();
      systemTagKeysCache.clear();
      relevantFrameworkTagsCache.clear();
      inputs.forEach((input) => { input.disabled = false; });
      runButton.textContent = buttonLabel;
      runButton.disabled = false;
    }
    renderResults();
    byId("reviewContent").classList.remove("hidden");
    reviewCompleted = true;
    renderBindingOverview();
    updateStep2Availability();
  }

  function renderTagGroupQuestions() {
    const container = byId("tagGroupChoices");
    container.replaceChildren();
    const questions = byId("ruleQuestions");
    questions.replaceChildren();
    byId("tagListFormatControl").classList.toggle("hidden", workflowMode !== "review");
    const tagKeys = getTagKeys();
    applyTagListAnswers(tagKeys);

    for (const question of getQuestionsForSystem()) {
      const currentAnswer = questionAnswers[question.id];
      const suggested = currentAnswer !== undefined && currentAnswer !== ""
        ? currentAnswer
        : inferQuestionAnswer(question, tagKeys);
      questionAnswers[question.id] = suggested ?? "";
      const row = document.createElement("label");
      row.className = "rule-question";
      const title = document.createElement("span");
      title.textContent = question.label;
      let control;

      if (question.type === "text") {
        control = document.createElement("input");
        control.type = "text";
        control.placeholder = question.placeholder ?? "Skriv svar";
        control.required = true;
        control.autocomplete = "off";
        control.pattern = "[^/\\\\]+";
        control.value = suggested ?? "";
      } else if (question.type === "count") {
        control = document.createElement("input");
        control.type = "number";
        control.min = "0";
        control.step = "1";
        control.placeholder = "Ange antal, även 0";
        control.value = suggested ?? "";
      } else {
        control = document.createElement("select");
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Välj svar";
        control.appendChild(placeholder);
        const choices = question.type === "yesNo"
          ? [["yes", "Ja"], ["no", "Nej"]]
          : question.options;
        for (const [value, text] of choices) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = text;
          control.appendChild(option);
        }
        control.value = suggested ?? "";
      }

      control.dataset.questionId = question.id;
      control.addEventListener("change", () => {
        questionAnswers[question.id] = question.type === "text" ? control.value.trim() : control.value;
        byId("reviewContent").classList.add("hidden");
        reviewCompleted = false;
        invalidateEboDownload();
        if (question.id === "missingComponents") {
          if (control.value !== "yes") userSelectedMissingGroups.clear();
          container.classList.toggle("hidden", control.value !== "yes");
          const prompt = byId("missingComponentQuestion");
          prompt.replaceChildren();
          if (control.value === "yes") {
            const instruction = document.createElement("p");
            instruction.textContent = "Välj de komponentgrupper som finns på driftkortet men saknas helt i tagglistan.";
            prompt.appendChild(instruction);
            renderMissingComponentChoices();
          }
        }
        updateQuestionGate();
      });
      row.append(title, control);
      if (question.hint) {
        const hint = document.createElement("small");
        hint.textContent = question.hint;
        row.appendChild(hint);
      }
      if (suggested !== null) {
        const hint = document.createElement("small");
        hint.textContent = "Utläst från tagglistan; ändra vid behov.";
        row.appendChild(hint);
      }
      questions.appendChild(row);
    }

    byId("missingComponentQuestion").replaceChildren();
    byId("tagGroupChoices").classList.add("hidden");
    updateQuestionGate();
  }

  function inferQuestionAnswer(question, tagKeys) {
    if (question.type === "count") {
      const instances = new Set();
      const prefix = normalizeTag(question.prefix);
      for (const tag of tagKeys) {
        if (!tag.startsWith(prefix)) continue;
        const instance = tag.match(/^(ST[67][A-Z0-9]+)(?=_|$)/)?.[1];
        if (instance && !/(?:XX|PN|X)$/.test(instance)) instances.add(instance);
      }
      // Start at zero when no instance tags are present; the user can adjust it.
      return String(instances.size);
    }
    if (question.id === "controlMode") {
      const exhaust = hasTagPrefix(tagKeys, "GT21_");
      const flow = hasTagPrefix(tagKeys, "GF11_") || hasTagPrefix(tagKeys, "GF12_");
      return exhaust === flow ? null : (exhaust ? "exhaust" : "flow");
    }
    if (question.evidenceGroups) {
      const found = Object.entries(question.evidenceGroups)
        .filter(([, prefixes]) => prefixes.some((prefix) => hasTagPrefix(tagKeys, prefix)))
        .map(([value]) => value);
      return found.length === 1 ? found[0] : null;
    }
    if (question.evidence?.some((pattern) => hasTagPrefix(tagKeys, pattern))) return "yes";
    return null;
  }

  function hasTagPrefix(tagKeys, prefix) {
    const normalizedPrefix = normalizeTag(prefix);
    return [...tagKeys].some((tag) => tag.startsWith(normalizedPrefix));
  }

  function renderMissingComponentChoices() {
    const container = byId("tagGroupChoices");
    container.replaceChildren();
    const sections = [...new Set(
      getSystemItems().flatMap((item) => item.sections ?? (item.section ? [item.section] : [])),
    )].filter((section) => !/^generella taggar/i.test(section));
    const detected = getDetectedSections();

    for (const section of sections) {
      const label = document.createElement("label");
      label.className = "tag-group-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = section;
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) userSelectedMissingGroups.add(section);
        else userSelectedMissingGroups.delete(section);
        updateQuestionGate();
      });
      const text = document.createElement("span");
      text.textContent = detected.has(section) ? `${section} · taggar finns redan i listan` : section;
      label.append(checkbox, text);
      container.appendChild(label);
    }
    if (!container.children.length) {
      const empty = document.createElement("p");
      empty.textContent = "Inga ytterligare tagggrupper saknas helt i listan.";
      byId("missingComponentQuestion").appendChild(empty);
    }
  }

  function updateQuestionGate() {
    const incomplete = (workflowMode !== "review" && !selectedFrameworkSystemId) ||
      (workflowMode !== "review" && selectedFrameworkSystemId === "airTreatment" && reviewedRows.length > 0 && !areSystemProfilesComplete()) ||
      getQuestionsForSystem().some((question) => {
      if (questionAnswers[question.id] === undefined || questionAnswers[question.id] === "") return true;
      const control = document.querySelector(`[data-question-id="${question.id}"]`);
      if (question.type === "text") return !questionAnswers[question.id].trim() || !control?.checkValidity();
      if (question.type === "count") return !control?.checkValidity();
      return false;
    });
    byId("runReview").disabled = incomplete;
    updateStep2Availability();
  }

  function updateGT11NamingQuestion() {
    const questions = byId("ruleQuestions");
    let row = byId("gt11NamingRow");
    const needed = questionAnswers.electricAirHeat === "yes" && questionAnswers.co2Sensor === "yes";
    if (!needed) {
      row?.remove();
      delete questionAnswers.gt11Naming;
      return;
    }
    if (row) return;
    row = document.createElement("label");
    row.id = "gt11NamingRow";
    row.className = "rule-question";
    const title = document.createElement("span");
    title.textContent = "Vilket namn gäller för gemensamma GT11-taggar?";
    const select = document.createElement("select");
    select.innerHTML = '<option value="">Välj svar</option><option value="GT11_GT71">GT11_GT71</option><option value="GT11_GQ11">GT11_GQ11</option>';
    select.addEventListener("change", () => {
      questionAnswers.gt11Naming = select.value;
      byId("reviewContent").classList.add("hidden");
      updateQuestionGate();
    });
    row.append(title, select);
    questions.appendChild(row);
  }

  function getDetectedSections(systemPrefix = "") {
    const sections = new Set();
    const tagKeys = systemPrefix ? getTagKeysForSystem(systemPrefix) : getTagKeys();
    for (const item of getSystemItems()) {
      if (frameworkTagPresent(item.tag, tagKeys)) {
        for (const section of item.sections ?? (item.section ? [item.section] : [])) sections.add(section);
      }
    }
    return sections;
  }

  function resolveActiveTagGroups(systemPrefix = "") {
    const detectedSections = getDetectedSections(systemPrefix);
    const sections = new Set(detectedSections);
    const allSections = [...new Set(getSystemItems().flatMap((item) => item.sections ?? (item.section ? [item.section] : [])))];
    for (const section of allSections) {
      if (/^generella taggar/i.test(section)) sections.add(section);
    }
    return sections;
  }

  function renderMissingTags() {
    const missingTags = [];
    const seen = new Set();
    const originalAnswers = { ...questionAnswers };
    const originalGroups = selectedTagGroups;
    const profiles = workflowMode === "review"
      ? [null]
      : selectedFrameworkSystemId === "airTreatment" ? getSystemProfileSelections() : [null];
    for (const profile of profiles) {
      activeSystemPrefix = profile?.systemPrefix ?? "";
      if (profile) {
        questionAnswers = { ...originalAnswers };
        applyTagListAnswers(getTagKeysForSystem(profile.systemPrefix));
        selectedTagGroups = resolveActiveTagGroups(profile.systemPrefix);
      }
      const tagKeys = profile ? getTagKeysForSystem(profile.systemPrefix) : getTagKeys();
      for (const item of getSystemItems()) {
        const sections = item.sections ?? (item.section ? [item.section] : []);
        const isSelected = sections.some((section) => selectedTagGroups.has(section));
        const isAlwaysApplicable = sections.some((section) => /^generella taggar/i.test(section));
        if (!(isAlwaysApplicable || isSelected)) continue;
        if (selectedFrameworkSystemId === "airTreatment" && !isCandidateApplicable(item)) continue;
        const expectedTag = expectedTagName(item);
        const key = normalizeTag(`${profile?.systemPrefix ?? ""}${expectedTag}`);
        if (seen.has(key) || frameworkTagPresent(expectedTag, tagKeys)) continue;
        seen.add(key);
        missingTags.push({ ...item, expectedTag: profile ? `${profile.systemPrefix}-${expectedTag}` : expectedTag });
      }
    }
    questionAnswers = originalAnswers;
    activeSystemPrefix = "";
    selectedTagGroups = originalGroups;
    const missingTagsList = byId("missingTagsList");
    missingTagsList.replaceChildren();
    byId("missingTagsCount").textContent = missingTags.length;
    if (missingTags.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.textContent = "Alla taggar i ramverket finns med i tagglistan.";
      emptyItem.className = "missing-tags-empty";
      missingTagsList.appendChild(emptyItem);
    } else {
      for (const item of missingTags) {
        const listItem = document.createElement("li");
        const tag = document.createElement("strong");
        tag.textContent = item.expectedTag;
        const description = document.createElement("span");
        description.textContent = item.description;
        const context = document.createElement("small");
        context.textContent = [
          ...(item.sections ?? []),
          item.configuredAccordingTo,
          item.note,
        ].filter(Boolean).join(" · ");
        listItem.append(tag, description);
        if (context.textContent) listItem.appendChild(context);
        missingTagsList.appendChild(listItem);
      }
    }
  }

  function isCandidateApplicable(item) {
    return true;
  }

  function expectedTagName(item) {
    let tag = item.tag;
    const currentTagKeys = activeSystemPrefix ? getTagKeysForSystem(activeSystemPrefix) : getTagKeys();
    if (/^TF1_/i.test(tag) && hasTagPrefix(currentTagKeys, "TF1_TF2_")) {
      tag = tag.replace(/^TF1_/i, "TF1_TF2_");
    }
    if (/^FF1_/i.test(tag) && hasTagPrefix(currentTagKeys, "FF1_FF2_")) {
      tag = tag.replace(/^FF1_/i, "FF1_FF2_");
    }
    const inSection = (needle) => (item.sections ?? []).some((section) =>
      normalize(section).includes(normalize(needle)),
    );
    if (hasTagPrefix(currentTagKeys, "GT31_GT71_") && inSection("Komponent GT31") && /^GT31_/i.test(tag)) {
      tag = tag.replace(/^GT31_/i, "GT31_GT71_");
    }
    if (hasTagPrefix(currentTagKeys, "GF11_") && inSection("Komponent GF41") && /^GF41_(?!MV(?:_|$))/i.test(tag)) {
      tag = tag.replace(/^GF41_/i, "GF11_");
    }
    if (hasTagPrefix(currentTagKeys, "GF12_") && inSection("Komponent GF42") && /^GF42_(?!MV(?:_|$))/i.test(tag)) {
      tag = tag.replace(/^GF42_/i, "GF12_");
    }
    if (hasTagPrefix(currentTagKeys, "GT11_GT71_") && inSection("Komponent GT11") && /^GT11_/i.test(tag)) {
      tag = tag.replace(/^GT11_/i, "GT11_GT71_");
    }
    if (hasTagPrefix(currentTagKeys, "GT11_GQ11_") && inSection("Komponent GT11") && /^GT11_/i.test(tag)) {
      tag = tag.replace(/^GT11_/i, "GT11_GQ11_");
    }
    if (hasTagPrefix(currentTagKeys, "ST21_ST22_") && /Komponent ST2[12]/i.test((item.sections ?? []).join(" ")) && /^ST2[12]_/i.test(tag)) {
      tag = tag.replace(/^ST2[12]_/i, "ST21_ST22_");
    }
    if (hasTagPrefix(currentTagKeys, "ST6XX_") && /^ST6pn_/i.test(tag) && /fler än ett brand/i.test(item.note ?? "")) {
      tag = tag.replace(/^ST6pn_/i, "ST6xx_");
    }
    if (hasTagPrefix(currentTagKeys, "ST7XX_") && /^ST7pn_/i.test(tag) && /fler än ett tryck/i.test(item.note ?? "")) {
      tag = tag.replace(/^ST7pn_/i, "ST7xx_");
    }
    return tag;
  }

  function getRelevantFrameworkTags() {
    const cacheKey = JSON.stringify([
      selectedFrameworkSystemId,
      activeSystemPrefix,
      [...selectedTagGroups].sort(),
      projectQuestions.map((question) => [question.id, questionAnswers[question.id] ?? ""]),
    ]);
    if (relevantFrameworkTagsCache.has(cacheKey)) return relevantFrameworkTagsCache.get(cacheKey);
    let result;
    if (selectedFrameworkSystemId && selectedFrameworkSystemId !== "airTreatment") {
      result = [...new Set(getSystemItems().map((item) => item.tag))];
    } else if (selectedTagGroups.size === 0) {
      result = [...new Set([...framework.tags, ...airTreatmentTags.map((item) => item.tag)])];
    } else {
      const airTagKeys = new Set(airTreatmentTags.map((item) => normalizeTag(item.tag)));
      const otherFrameworkTags = framework.tags.filter((tag) => !airTagKeys.has(normalizeTag(tag)));
      const applicableAirTags = airTreatmentTags
        .filter((item) =>
          (item.sections ?? []).some((section) => selectedTagGroups.has(section)) &&
          isCandidateApplicable(item),
        )
        .map((item) => expectedTagName(item));
      result = [...new Set([...otherFrameworkTags, ...applicableAirTags])];
    }
    if (relevantFrameworkTagsCache.size > 64) relevantFrameworkTagsCache.clear();
    relevantFrameworkTagsCache.set(cacheKey, result);
    return result;
  }

  function getAllFrameworkTags() {
    return [...new Set([
      ...framework.tags,
      ...airTreatmentTags.map((item) => item.tag),
      ...getSystemItems().map((item) => item.tag),
      ...getRelevantFrameworkTags(),
    ])];
  }

  function correctedName(item) {
    const description = String(item.description ?? "").trim();
    if (!description || isNonFrameworkProperty(description) || isAlarmClass(description)) return description;
    const token = (description.match(/^[^\s]+/)?.[0] ?? "").replace(/[,:;]$/, "");
    const prefix = token.match(systemPrefixPattern)?.[0] ?? "";
    const sourceTag = token.slice(prefix.length);
    if (/^(?:TF1_TF2|FF1_FF2)_/i.test(sourceTag)) {
      const equivalent = sourceTag.replace(/^(TF1_TF2|FF1_FF2)_/i, (_, fans) => `${fans.startsWith("FF") ? "FF1" : "TF1"}_`);
      if (getRelevantFrameworkTags().some((candidate) => frameworkPatternMatches(candidate, equivalent))) {
        return `${prefix}${sourceTag}`;
      }
    }
    // Keep concrete GX71/GX72 running numbers instead of writing the framework wildcard back.
    if (/^GX7[12]_(?:SL|L)$/i.test(sourceTag)) return `${prefix}${sourceTag}`;
    // SN1x is a framework placeholder for the actual running number (11–14).
    // Keep the concrete name from the source list instead of writing SN1x back.
    if (/^SN1[1-4]_/i.test(sourceTag)) return `${prefix}${sourceTag}`;
    const canonicalTag = getRelevantFrameworkTags().find((candidate) =>
      frameworkPatternMatches(candidate, sourceTag),
    );
    return `${prefix}${canonicalTag ?? sourceTag}`;
  }

  function getTagKeys() {
    return new Set([
      ...getRawGfComponentTagKeys(),
      ...reviewedRows
        .filter((item) => !isNonFrameworkProperty(getTagListReviewValue(item)) && !isAlarmClass(getTagListReviewValue(item)))
        .map((item) => {
          const token = getTagListReviewValue(item).trim().split(/\s+/)[0];
          const tag = token.replace(systemPrefixPattern, "");
          return normalizeTag(tag);
        })
        .filter(Boolean),
    ]);
  }

  function getSystemPrefixes() {
    return [...new Set(reviewedRows.flatMap((item) => {
      const value = getTagListReviewValue(item);
      if (isNonFrameworkProperty(value) || isAlarmClass(value)) return [];
      const token = value.trim().split(/\s+/)[0];
      const prefix = token.match(systemPrefixPattern)?.[0];
      const systemName = prefix?.slice(0, -1).toUpperCase();
      return systemName && !/^AS(?:[_-]A|\d)/i.test(systemName) ? [systemName] : [];
    }))].sort();
  }

  function updateSystemPrefixOptions() {
    const select = byId("systemPrefix");
    if (!select) return;
    const previous = select.value;
    const prefixes = getSystemPrefixes();
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = prefixes.length ? "Välj system" : "Ladda upp en tagglista i steg 1";
    select.appendChild(placeholder);
    for (const prefix of prefixes) {
      const option = document.createElement("option");
      option.value = prefix;
      option.textContent = prefix;
      select.appendChild(option);
    }
    select.value = prefixes.includes(previous) ? previous : (prefixes.length === 1 ? prefixes[0] : "");
  }

  function updateStep2Availability() {
    const button = byId("buildEboXml");
    if (!button) return;
    if (workflowMode === "review") {
      button.disabled = true;
      return;
    }
    const fsName = byId("fsName").value.trim();
    const systemPrefix = byId("systemPrefix").value;
    const ducName = String(questionAnswers.ducName ?? "").trim();
    const schoolName = String(questionAnswers.schoolName ?? "").trim();
    const profiles = getSystemProfileSelections();
    const allProfilesHaveTemplates = profiles.length > 0 && Boolean(getAirTreatmentTemplateId());
    const ready = selectedFrameworkSystemId === "airTreatment" && areSystemProfilesComplete() && allProfilesHaveTemplates && reviewCompleted && Boolean(ducName) && Boolean(fsName) && Boolean(schoolName) && Boolean(systemPrefix) &&
      /^[A-Za-z0-9_-]+$/.test(fsName) && byId("fsName").checkValidity();
    button.disabled = !ready;
    byId("step2Status").textContent = selectedFrameworkSystemId && selectedFrameworkSystemId !== "airTreatment"
      ? "XML-mallen stöder för närvarande endast luftbehandling."
      : !reviewedRows.length
      ? "Ladda upp tagglistan och starta granskningen i steg 1."
      : !reviewCompleted
        ? "Komplettera uppgifterna och starta granskningen i steg 1."
        : !ducName
          ? "Ange DUC-namnet i steg 1."
          : !schoolName
              ? "Ange skolans namn i steg 1."
          : !fsName
            ? "Ange FS-namnet där objektsetet ska importeras."
            : !areSystemProfilesComplete()
              ? "Välj systemnamn för varje XML i steg 1."
            : !allProfilesHaveTemplates
              ? "Den gemensamma ventilationsmallen saknas."
            : ready
              ? "Redo att skapa XML med bindningarna från mallen."
              : "Kontrollera FS-namnet.";
  }

  function getTagKeysForSystem(systemPrefix) {
    const cacheKey = String(systemPrefix ?? "").toUpperCase();
    if (systemTagKeysCache.has(cacheKey)) return systemTagKeysCache.get(cacheKey);
    const keys = new Set([
      ...getRawGfComponentTagKeys(systemPrefix),
      ...reviewedRows.flatMap((item) => {
      const value = getTagListReviewValue(item);
      if (isAlarmClass(value) || isNonFrameworkProperty(value)) return [];
      const token = value.trim().split(/\s+/)[0];
      const sourcePrefix = token.match(systemPrefixPattern)?.[0]?.slice(0, -1).toUpperCase();
      if (sourcePrefix && sourcePrefix !== systemPrefix) return [];
      const name = item.name || token;
      return [normalizeTag(name.replace(systemPrefixPattern, ""))];
      }).filter(Boolean),
    ]);
    systemTagKeysCache.set(cacheKey, keys);
    return keys;
  }

  function getRawGfComponentTagKeys(systemPrefix = "") {
    return new Set(reviewedRows.flatMap((item) => {
      const value = getTagListReviewValue(item);
      if (isAlarmClass(value) || isNonFrameworkProperty(value)) return [];
      const token = value.trim().split(/\s+/)[0];
      const sourcePrefix = token.match(systemPrefixPattern)?.[0]?.slice(0, -1).toUpperCase();
      if (systemPrefix && sourcePrefix && sourcePrefix !== systemPrefix) return [];
      const tag = normalizeTag(token.replace(systemPrefixPattern, ""));
      return /^(?:GF11|GF12|GF41|GF42)(?:_|$)/.test(tag) ? [tag] : [];
    }));
  }

  function isEquipmentName(name) {
    return (
      /^[A-ZÅÄÖ]{1,5}\d/i.test(name) ||
      /^[A-ZÅÄÖ]{2,5}Å$/i.test(name) ||
      /^[A-ZÅÄÖ]{2,4}X$/i.test(name) ||
      name === "PVA" ||
      name === "RVA"
    );
  }

  function componentExists(name, tagKeys) {
    if (!isEquipmentName(name)) return true;
    const key = normalizeTag(name);
    if (key === "GX71" || key === "GX72") return true;
    if (key === "FFX") {
      return [...tagKeys].some((tag) => /^FF(?:[2-9]|[1-9]\d+)(?:_|$)/.test(normalizeTag(tag)));
    }
    const hasTagRoot = (root) => [...tagKeys].some((tag) => {
      const normalized = normalizeTag(tag);
      if (root === "GT11" && /^GT11_(?:GT71|GQ11)(?:_|$)/.test(normalized)) return false;
      return normalized === root || normalized.startsWith(`${root}_`);
    });
    if (["GT11", "GT11_GT71", "GT11_GQ11"].includes(key)) {
      const hasPlain = hasTagRoot("GT11");
      const hasElectric = hasTagRoot("GT11_GT71");
      const hasCombined = hasTagRoot("GT11_GQ11");
      if (key === "GT11") return hasPlain && !hasElectric && !hasCombined;
      if (key === "GT11_GT71") return hasElectric;
      return hasCombined;
    }
    if (key === "ST6XX" || key === "ST7XX") {
      return [...tagKeys].some((tag) => normalizeTag(tag).startsWith(`${key}_`));
    }
    if (key === "ST6PN" || key === "ST7PN") {
      const prefix = key.slice(0, 3);
      return [...tagKeys].some((tag) => {
        const normalized = normalizeTag(tag);
        return new RegExp(`^${prefix}(?!XX)[A-Z0-9]+_`).test(normalized);
      });
    }
    const wildcardPattern = new RegExp(
      `^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/X/g, "[A-Z0-9]")}(?=_|$)`,
    );
    return [...tagKeys].some((tag) => {
      if (!wildcardPattern.test(tag)) return false;
      const suffix = tag.slice(key.length).replace(/^_/, "").split("_")[0];
      return !/^[A-Z]{1,5}\d/.test(suffix);
    });
  }

  function isExcludedGt11Variant(name, tagKeys) {
    const key = normalizeTag(name);
    if (!["GT11", "GT11_GT71", "GT11_GQ11"].includes(key)) return false;
    const hasTagRoot = (root) => [...tagKeys].some((tag) => {
      const normalized = normalizeTag(tag);
      if (root === "GT11" && /^GT11_(?:GT71|GQ11)(?:_|$)/.test(normalized)) return false;
      return normalized === root || normalized.startsWith(`${root}_`);
    });
    return !hasTagRoot(key);
  }

  function isExcludedGt31Variant(name) {
    const key = normalizeTag(name);
    const tagKeys = activeSystemPrefix ? getTagKeysForSystem(activeSystemPrefix) : getTagKeys();
    if (key === "GT31_GT71") return !hasTagPrefix(tagKeys, "GT31_GT71_");
    if (key === "GT31") return hasTagPrefix(tagKeys, "GT31_GT71_");
    return false;
  }

  function isAlwaysIncludedGxTag(name) {
    return /^(?:GX71|GX72|GX71_GX72)(?:_|$)/.test(normalizeTag(name));
  }

  function frameworkTagPresent(name, tagKeys) {
    return [...tagKeys].some((tag) => frameworkPatternMatches(name, tag));
  }

  function frameworkPatternMatches(pattern, value) {
    const normalizedPattern = normalizeTag(pattern);
    const normalizedInput = normalizeTag(value);
    if (normalizedPattern === "ST7PN_TKMO" && /^ST7\d+_ST7\d+_TKMO$/.test(normalizedInput)) {
      return true;
    }
    const source = String(pattern);
    let expression = "";
    for (let index = 0; index < source.length; index++) {
      const character = source[index];
      if (source.slice(index, index + 2) === "pn") {
        expression += "[A-Z0-9]+";
        index++;
      } else if (character === "x" || character === "y") {
        expression += "[A-Z0-9]";
      } else if (character === "_") {
        expression += "_";
      } else {
        expression += normalizeTag(character).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
    }
    expression = expression.replace(/_+/g, "_").replace(/^_|_$/g, "");
    let matcher = frameworkPatternCache.get(expression);
    if (!matcher) {
      matcher = new RegExp(`^${expression}$`);
      frameworkPatternCache.set(expression, matcher);
    }
    const normalizedValue = normalizedInput;
    // Framework suffixes use a single-fan root; double fans add TF1_TF2 or FF1_FF2.
    return matcher.test(normalizedValue) || (
      /^(?:TF1_TF2|FF1_FF2)_/i.test(normalizedValue) &&
      matcher.test(normalizedValue.replace(/^(TF1_TF2|FF1_FF2)_/i, (_, fans) => `${fans.startsWith("FF") ? "FF1" : "TF1"}_`))
    );
  }

  async function renderTgmlPreview(objectSetOverride = null) {
    const preview = byId("tgmlPreview");
    try {
      const profiles = getSystemProfileSelections();
      const requestedPrefix = byId("systemPrefix")?.value || activeSystemPrefix;
      const previewProfile = profiles.find((profile) => profile.systemPrefix === requestedPrefix) ?? profiles[0] ?? null;
      const source = getSelectedObjectSetTemplate();
      const objectSet = objectSetOverride || generatedObjectSetForPreview || (source ? parseXml(source) : null);
      if (!objectSet) {
        preview.replaceChildren();
        return;
      }
      if (xmlHasParseError(objectSet)) return;
      const graphicOis = [...objectSet.getElementsByTagNameNS("*", "OI")]
        .filter((oi) => /BILD/i.test(oi.getAttribute("NAME")));
      const types = [...objectSet.getElementsByTagNameNS("*", "ObjectType")];
      const graphicType = graphicOis
        .map((oi) => types.find((type) => type.getAttribute("Name") === oi.getAttribute("TYPE")))
        .find((type) => type?.getAttribute("Base")?.toLowerCase().includes("tgml.tgml"))
        || types.find((type) => type.getAttribute("Base")?.toLowerCase().includes("tgml.tgml"));
      const fileContents = graphicType?.getElementsByTagNameNS("*", "FileContents")[0];
      if (!fileContents) return;
      const tgmlText = await decompressBase64Gzip(fileContents.textContent);
      const tgml = parseXml(tgmlText);
      if (xmlHasParseError(tgml)) return;
      const prefixes = getSystemPrefixes();
      const selectedPrefix = previewProfile?.systemPrefix || byId("systemPrefix")?.value || (prefixes.length === 1 ? prefixes[0] : "");
      const hasTagList = !generatedObjectSetForPreview && !objectSetOverride && reviewCompleted && reviewedRows.length > 0;
      const tagKeys = hasTagList
        ? selectedPrefix ? getTagKeysForSystem(selectedPrefix) : getTagKeys()
        : null;
      const positionKeys = getTgmlPositionKeys(tgml.documentElement);
      const svg = convertTgmlToSvg(tgml.documentElement, tagKeys, positionKeys);
      preview.replaceChildren(svg);
      enableTgmlDragging(svg);
      updateTgmlPositionControls();
    } catch (error) {
      console.warn("TGML-förhandsvisningen kunde inte uppdateras.", error);
    }
  }

  function getTgmlPositionKeys(tgmlRoot) {
    const keys = new WeakMap();
    const occurrences = new Map();
    for (const child of [...tgmlRoot.getElementsByTagNameNS("*", "Component")]) {
      const name = child.getAttribute("Name") || "";
      if (!name || (!isEquipmentName(mapGraphicComponentName(name)) && !isVerifiedLibraryComponent(name))) continue;
      const normalized = normalizeTag(name);
      const occurrence = occurrences.get(normalized) ?? 0;
      occurrences.set(normalized, occurrence + 1);
      keys.set(child, `component-${normalized}-${occurrence}`);
    }
    return keys;
  }

  function updateTgmlPositionControls() {
    const resetButton = byId("resetTgmlPositions");
    if (resetButton) resetButton.disabled = tgmlPositionOverrides.size === 0;
  }

  function enableTgmlDragging(svg) {
    let activeDrag;
    const pointInSvg = (event) => {
      const matrix = svg.getScreenCTM();
      if (!matrix) return null;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      return point.matrixTransform(matrix.inverse());
    };

    svg.addEventListener("pointerdown", (event) => {
      const movable = event.target.closest?.("[data-position-key]");
      if (!movable || event.button !== 0) return;
      const point = pointInSvg(event);
      if (!point) return;
      event.preventDefault();
      const key = movable.getAttribute("data-position-key");
      const position = tgmlPositionOverrides.get(key) || { x: 0, y: 0 };
      activeDrag = { movable, key, startX: point.x, startY: point.y, initialX: position.x, initialY: position.y };
      movable.classList.add("is-dragging");
      svg.setPointerCapture(event.pointerId);
    });

    svg.addEventListener("pointermove", (event) => {
      if (!activeDrag) return;
      const point = pointInSvg(event);
      if (!point) return;
      const x = activeDrag.initialX + point.x - activeDrag.startX;
      const y = activeDrag.initialY + point.y - activeDrag.startY;
      activeDrag.movable.setAttribute("transform", `translate(${x} ${y})`);
      activeDrag.nextPosition = { x, y };
    });

    const finishDrag = (event) => {
      if (!activeDrag) return;
      const { movable, key, nextPosition } = activeDrag;
      movable.classList.remove("is-dragging");
      if (nextPosition) {
        tgmlPositionOverrides.set(key, nextPosition);
        invalidateEboDownload();
        updateTgmlPositionControls();
      }
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      activeDrag = null;
    };
    svg.addEventListener("pointerup", finishDrag);
    svg.addEventListener("pointercancel", finishDrag);
  }

  function convertTgmlToSvg(tgml, tagKeys, positionKeys = new WeakMap()) {
    const svgNamespace = "http://www.w3.org/2000/svg";
    const create = (name, attributes = {}) => {
      const element = document.createElementNS(svgNamespace, name);
      for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
      return element;
    };
    const width = tgml.getAttribute("Width") || "1345";
    const height = tgml.getAttribute("Height") || "720";
    const root = create("svg", { width, height, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "TGML-förhandsvisning" });
    root.appendChild(create("rect", { x: "0", y: "0", width, height, fill: tgml.getAttribute("Background") || "#fff" }));
    const skipped = new Set(["Script", "Bind", "Expose", "Metadata", "Parameter", "InitValue", "InitReference", "ObjectReference", "ObjectType", "TargetArea", "LinearGradient", "GradientStop", "Rotate", "Translate", "Scale", "Animate", "ConvertValue", "ConvertRange", "ConvertStatus"]);
    let id = 0;
    const numeric = (element, key, fallback = 0) => Number(element.getAttribute(key) || fallback);
    const getShapeBounds = (shape) => {
      if (!shape?.getBBox) return null;
      try {
        const directBounds = shape.getBBox();
        if (directBounds.width || directBounds.height) return directBounds;
      } catch {
        // Some browsers need an SVG node attached to the document before measuring it.
      }
      const measureRoot = create("svg", { width: 1, height: 1, "aria-hidden": "true" });
      measureRoot.style.position = "fixed";
      measureRoot.style.left = "-10000px";
      measureRoot.style.top = "-10000px";
      measureRoot.style.overflow = "visible";
      measureRoot.style.visibility = "hidden";
      const measuredShape = shape.cloneNode(false);
      measureRoot.appendChild(measuredShape);
      document.body.appendChild(measureRoot);
      try {
        const bounds = measuredShape.getBBox();
        return bounds.width || bounds.height ? bounds : null;
      } catch {
        return null;
      } finally {
        measureRoot.remove();
      }
    };
    const localTransform = (element, componentSpace = false, shape = null) => {
      const left = numeric(element, "Left");
      const top = numeric(element, "Top");
      const w = numeric(element, "Width", numeric(element, "ContentWidth"));
      const h = numeric(element, "Height", numeric(element, "ContentHeight"));
      const coordinateContainer = element.parentElement?.closest?.("Component, Group");
      const coordinateWidth = w || (coordinateContainer ? numeric(coordinateContainer, "ContentWidth", numeric(coordinateContainer, "Width", 0)) : 0);
      const coordinateHeight = h || (coordinateContainer ? numeric(coordinateContainer, "ContentHeight", numeric(coordinateContainer, "Height", 0)) : 0);
      const originX = componentSpace ? 0 : left;
      const originY = componentSpace ? 0 : top;
      const parts = [];
      for (const instruction of [...element.children]) {
        if (!["Rotate", "Scale", "Translate", "SkewX", "SkewY"].includes(instruction.localName)) continue;
        const raw = instruction.getAttribute("Center") || (instruction.localName === "Rotate" ? element.getAttribute("Center") : "");
        const shapeBounds = !w || !h ? getShapeBounds(shape) : null;
        let cx = shapeBounds && (!w || !h)
          ? shapeBounds.x + shapeBounds.width / 2
          : originX + w / 2;
        let cy = shapeBounds && (!w || !h)
          ? shapeBounds.y + shapeBounds.height / 2
          : originY + h / 2;
        if (raw) {
          const [rx, ry] = raw.split(",").map(Number);
          if (Number.isFinite(rx) && Number.isFinite(ry)) {
            if (Math.abs(rx) <= 1 && Math.abs(ry) <= 1) {
              if (shapeBounds?.width && shapeBounds?.height) {
                cx = shapeBounds.x + rx * shapeBounds.width;
                cy = shapeBounds.y + ry * shapeBounds.height;
              } else {
                cx = originX + rx * coordinateWidth;
                cy = originY + ry * coordinateHeight;
              }
            } else {
              cx = rx;
              cy = ry;
            }
          }
        }
        if (instruction.localName === "Rotate") parts.push(`rotate(${numeric(instruction, "Angle")} ${cx} ${cy})`);
        else if (instruction.localName === "Scale") {
          const sx = numeric(instruction, "ScaleX", 1), sy = numeric(instruction, "ScaleY", 1);
          parts.push(`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
        } else if (instruction.localName === "Translate") {
          parts.push(`translate(${numeric(instruction, "X")} ${numeric(instruction, "Y")})`);
        } else parts.push(`${instruction.localName.toLowerCase()}(${numeric(instruction, "Angle")})`);
      }
      return parts.join(" ");
    };
    const common = (element) => {
      const attrs = {};
      for (const [source, target] of [["Fill", "fill"], ["Stroke", "stroke"], ["StrokeWidth", "stroke-width"], ["StrokeDashArray", "stroke-dasharray"], ["Opacity", "opacity"]]) {
        const value = element.getAttribute(source);
        if (value && value !== "None" && !(target === "stroke-dasharray" && Number(value) === 0)) attrs[target] = value;
      }
      if (element.getAttribute("Fill") === "None") attrs.fill = "none";
      if (element.getAttribute("Stroke") === "None") attrs.stroke = "none";
      return attrs;
    };
    const transformShape = (element, shape, parent) => {
      const transform = localTransform(element, false, shape);
      if (transform) {
        const group = create("g", { transform });
        group.appendChild(shape);
        parent.appendChild(group);
      } else parent.appendChild(shape);
    };
    const renderChannelRectangles = (component, parent) => {
      const walk = (element, offsetX, offsetY, scaleX, scaleY, opacity) => {
        const x = offsetX + numeric(element, "Left") * scaleX;
        const y = offsetY + numeric(element, "Top") * scaleY;
        const elementOpacity = numeric(element, "Opacity", 1) * opacity;
        if (["Component", "Group", "Layer"].includes(element.localName)) {
          const contentWidth = Math.max(1, numeric(element, "ContentWidth", numeric(element, "Width", 1)));
          const contentHeight = Math.max(1, numeric(element, "ContentHeight", numeric(element, "Height", 1)));
          const childScaleX = scaleX * (element.localName === "Component" ? numeric(element, "Width", contentWidth) / contentWidth : 1);
          const childScaleY = scaleY * (element.localName === "Component" ? numeric(element, "Height", contentHeight) / contentHeight : 1);
          for (const child of [...element.children]) walk(child, x, y, childScaleX, childScaleY, elementOpacity);
          return;
        }
        if (element.localName === "Rectangle") {
          const fill = element.getAttribute("Fill");
          if (fill && fill.toLowerCase() !== "none") {
            const rectangle = create("rect", {
              x,
              y,
              width: numeric(element, "Width") * scaleX,
              height: numeric(element, "Height") * scaleY,
              fill,
              stroke: element.getAttribute("Stroke") || "none",
              "stroke-width": numeric(element, "StrokeWidth", 1),
              opacity: elementOpacity,
            });
            parent.appendChild(rectangle);
          }
        }
      };
      walk(component, 0, 0, 1, 1, 1);
    };
    const render = (element, parent) => {
      const tag = element.localName;
      if (skipped.has(tag) || element.getAttribute("Visibility")?.toLowerCase() === "hidden") return;
      const x = numeric(element, "Left"), y = numeric(element, "Top");
      const opacity = element.getAttribute("Opacity");
      if (["Tgml", "Group", "Component", "Layer"].includes(tag)) {
        if (tag === "Component" && /^(?:Kanal tilluft|Kanal frånluft)$/i.test(element.getAttribute("Name"))) {
          renderChannelRectangles(element, parent);
        }
        if (tag === "Component" && element.getAttribute("Name") && !element.parentElement?.closest?.("Component")) {
          const name = element.getAttribute("Name") || "";
          const mapped = mapGraphicComponentName(name);
          if (tagKeys && (isExcludedGt11Variant(name, tagKeys) || isExcludedGt31Variant(name))) return;
          if (tagKeys && isEquipmentName(mapped) && !componentExists(mapped, tagKeys) && !componentExists(name, tagKeys)) return;
        }
        const componentWidth = numeric(element, "Width", numeric(element, "ContentWidth", 1));
        const componentHeight = numeric(element, "Height", numeric(element, "ContentHeight", 1));
        const contentWidth = Math.max(1, numeric(element, "ContentWidth", componentWidth || 1));
        const contentHeight = Math.max(1, numeric(element, "ContentHeight", componentHeight || 1));
        const sizeTransform = tag === "Component"
          ? `scale(${componentWidth / contentWidth} ${componentHeight / contentHeight})`
          : "";
        const transform = [`translate(${x} ${y})`, sizeTransform, localTransform(element, true)].filter(Boolean).join(" ");
        const attrs = { transform };
        if (opacity && opacity !== "1" && opacity !== "1.0") attrs.opacity = opacity;
        const positionKey = tag === "Component" ? positionKeys.get(element) : null;
        let renderParent = parent;
        if (positionKey) {
          const position = tgmlPositionOverrides.get(positionKey) || { x: 0, y: 0 };
          const movable = create("g", {
            class: "tgml-movable",
            transform: `translate(${position.x} ${position.y})`,
            "data-position-key": positionKey,
            "aria-label": `Flytta ${element.getAttribute("Name")}`,
          });
          renderParent.appendChild(movable);
          renderParent = movable;
        }
        const group = create("g", attrs);
        renderParent.appendChild(group);
        for (const child of [...element.children]) render(child, group);
        return;
      }
      const attrs = common(element);
      let shape;
      if (tag === "Rectangle") {
        shape = create("rect", { ...attrs, x, y, width: numeric(element, "Width"), height: numeric(element, "Height"), rx: numeric(element, "RadiusX"), ry: numeric(element, "RadiusY") });
      } else if (tag === "Ellipse") {
        const w = numeric(element, "Width"), h = numeric(element, "Height");
        shape = create("ellipse", { ...attrs, cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 });
      } else if (tag === "Line") {
        shape = create("line", { ...attrs, x1: numeric(element, "X1"), y1: numeric(element, "Y1"), x2: numeric(element, "X2"), y2: numeric(element, "Y2") });
      } else if (tag === "Path") {
        shape = create("path", { ...attrs, d: element.getAttribute("PathData") || "" });
      } else if (tag === "Polygon" || tag === "Polyline") {
        shape = create(tag.toLowerCase(), { ...attrs, points: element.getAttribute("Points") || "" });
      } else if (tag === "Arc") {
        const [cx, cy] = (element.getAttribute("Center") || "0,0").split(",").map(Number);
        const rx = numeric(element, "RadiusX"), ry = numeric(element, "RadiusY");
        const start = numeric(element, "StartAngle") * Math.PI / 180, sweep = numeric(element, "SweepAngle");
        const end = start + sweep * Math.PI / 180;
        const x1 = cx + rx * Math.cos(start), y1 = cy - ry * Math.sin(start);
        const x2 = cx + rx * Math.cos(end), y2 = cy - ry * Math.sin(end);
        shape = create("path", { ...attrs, fill: "none", d: `M ${x1} ${y1} A ${rx} ${ry} 0 ${Math.abs(sweep) > 180 ? 1 : 0} ${sweep < 0 ? 0 : 1} ${x2} ${y2}` });
      } else if (tag === "Text" || tag === "TextBox") {
        const size = numeric(element, "FontSize", 12), align = (element.getAttribute("HorizontalAlign") || "Left").toLowerCase();
        const w = numeric(element, "Width"), h = numeric(element, "Height");
        const family = element.getAttribute("FontFamily") || "Arial";
        const weight = (element.getAttribute("FontWeight") || "Normal").toLowerCase();
        const style = (element.getAttribute("FontStyle") || "Normal").toLowerCase();
        const tx = x + (align === "center" ? w / 2 : align === "right" ? w : 0);
        const textAnchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
        const vertical = (element.getAttribute("VerticalAlign") || "Top").toLowerCase();
        const text = create("text", { x: tx, fill: element.getAttribute("Stroke") || element.getAttribute("Fill") || "#404040", "font-family": family, "font-size": size, "font-weight": weight, "font-style": style, "text-anchor": textAnchor });
        // TGML Bind nodes may contain script source as child content. Only render
        // the Text/TextBox node's own CDATA/text, never nested binding scripts.
        let value = [...element.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE)
          .map((node) => node.nodeValue || "")
          .join("")
          .replace(/\r/g, "")
          .trim();
        if (tag === "TextBox" && value && w > 0) {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (context) context.font = `${style} ${weight} ${size}px ${family}`;
          const widthOf = (line) => context ? context.measureText(line).width : line.length * size * 0.56;
          const lines = [];
          for (const paragraph of value.split("\n")) {
            let line = "";
            for (const word of paragraph.split(/\s+/).filter(Boolean)) {
              const candidate = line ? `${line} ${word}` : word;
              if (line && widthOf(candidate) > w) {
                lines.push(line);
                line = word;
              } else line = candidate;
            }
            if (line) lines.push(line);
          }
          const lineHeight = size * 1.15;
          const visibleLines = lines.slice(0, Math.max(1, Math.floor(h / lineHeight)));
          let baseline = y + size * 0.85;
          if (vertical === "middle" || vertical === "center") {
            text.setAttribute("dominant-baseline", "middle");
            baseline = y + h / 2 - Math.max(0, visibleLines.length - 1) * lineHeight / 2;
          } else if (vertical === "bottom") {
            baseline = y + h - Math.max(0, visibleLines.length - 1) * lineHeight;
          }
          text.setAttribute("y", baseline);
          for (const [index, line] of visibleLines.entries()) {
            const span = create("tspan", { x: tx, ...(index ? { dy: lineHeight } : {}) });
            span.textContent = line;
            text.appendChild(span);
          }
        } else {
          text.setAttribute("y", y);
          text.setAttribute("dominant-baseline", vertical === "middle" || vertical === "center" ? "middle" : vertical === "top" ? "hanging" : "auto");
          text.textContent = value;
        }
        shape = text;
      } else if (tag === "Image") {
        const data = element.textContent.replace(/\s/g, "");
        if (!data) return;
        const mime = data.startsWith("iVBOR") ? "image/png" : data.startsWith("R0lGOD") ? "image/gif" : data.startsWith("/9j/") ? "image/jpeg" : "image/png";
        shape = create("image", { x, y, width: numeric(element, "Width"), height: numeric(element, "Height"), href: `data:${mime};base64,${data}`, ...(opacity && opacity !== "1" && opacity !== "1.0" ? { opacity } : {}) });
      }
      if (shape) {
        const gradient = [...element.children].find((child) => child.localName === "LinearGradient");
        if (gradient) {
          const gradientId = `tgml-gradient-${++id}`;
          const defs = root.querySelector("defs") || root.insertBefore(create("defs"), root.firstChild);
          const start = (gradient.getAttribute("StartPoint") || "0,0").split(",");
          const end = (gradient.getAttribute("EndPoint") || "0,1").split(",");
          const gradientNode = create("linearGradient", { id: gradientId, x1: start[0], y1: start[1], x2: end[0], y2: end[1] });
          for (const stop of [...gradient.children].filter((child) => child.localName === "GradientStop")) {
            const offset = Number(stop.getAttribute("Offset"));
            gradientNode.appendChild(create("stop", { offset: offset <= 1 ? `${offset * 100}%` : stop.getAttribute("Offset"), "stop-color": stop.getAttribute("Color") || "#fff" }));
          }
          defs.appendChild(gradientNode);
          shape.setAttribute("fill", `url(#${gradientId})`);
        }
        transformShape(element, shape, parent);
      } else {
        for (const child of [...element.children]) render(child, parent);
      }
    };
    for (const child of [...tgml.children]) render(child, root);
    return root;
  }

  function columnName(index) {
    let number = index + 1;
    let name = "";
    while (number) {
      const remainder = (number - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      number = Math.floor((number - 1) / 26);
    }
    return name;
  }

  function addReviewStyles() {
    const namespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    const fills = stylesXml.getElementsByTagNameNS("*", "fills")[0];
    const cellFormats = stylesXml.getElementsByTagNameNS("*", "cellXfs")[0];
    const colors = {
      good: "FFE2F1E7",
      typo: "FFFFF0C2",
      bad: "FFF8DEDE",
      included: "FFDCE9F2",
    };
    const fillIds = {};

    for (const [kind, color] of Object.entries(colors)) {
      let fill = [...fills.children].find(
        (item) => item.getElementsByTagNameNS("*", "fgColor")[0]?.getAttribute("rgb") === color,
      );
      if (!fill) {
        fill = stylesXml.createElementNS(namespace, "fill");
        const pattern = stylesXml.createElementNS(namespace, "patternFill");
        pattern.setAttribute("patternType", "solid");
        const foreground = stylesXml.createElementNS(namespace, "fgColor");
        foreground.setAttribute("rgb", color);
        pattern.appendChild(foreground);
        const background = stylesXml.createElementNS(namespace, "bgColor");
        background.setAttribute("indexed", "64");
        pattern.appendChild(background);
        fill.appendChild(pattern);
        fills.appendChild(fill);
      }
      fills.setAttribute("count", fills.children.length);
      fillIds[kind] = [...fills.children].indexOf(fill);
    }

    const originalFormatCount = cellFormats.children.length;
    const styleIds = {};
    for (let index = 0; index < originalFormatCount; index++) {
      for (const [kind, fillId] of Object.entries(fillIds)) {
        const format = cellFormats.children[index].cloneNode(true);
        format.setAttribute("fillId", fillId);
        format.setAttribute("applyFill", "1");
        cellFormats.appendChild(format);
        styleIds[`${index}:${kind}`] = cellFormats.children.length - 1;
      }
    }
    cellFormats.setAttribute("count", cellFormats.children.length);

    for (const item of reviewedRows) {
      const rowStyle = item.result.kind;
      for (const cell of item.cells) {
        const originalStyle = Number(cell.getAttribute("s") || 0);
        cell.setAttribute("s", styleIds[`${originalStyle}:${rowStyle}`] ?? styleIds[`0:${rowStyle}`]);
      }

      let nameCell = item.cells.find(
        (cell) => columnIndex(cell.getAttribute("r")) === nameColumn,
      );
      if (!nameCell) {
        nameCell = worksheetXml.createElementNS(namespace, "c");
        nameCell.setAttribute("r", `${columnName(nameColumn)}${item.rowNumber}`);
        const nextCell = [...item.row.children]
          .filter((child) => child.localName === "c")
          .find((cell) => columnIndex(cell.getAttribute("r")) > nameColumn);
        item.row.insertBefore(nameCell, nextCell ?? null);
      }

      nameCell.replaceChildren();
      nameCell.setAttribute("t", "inlineStr");
      nameCell.setAttribute("s", styleIds[`0:${rowStyle}`]);
      const inlineString = worksheetXml.createElementNS(namespace, "is");
      const text = worksheetXml.createElementNS(namespace, "t");
      if (/^\s|\s$/.test(item.name)) text.setAttribute("xml:space", "preserve");
      text.textContent = item.name;
      inlineString.appendChild(text);
      nameCell.appendChild(inlineString);

      const assessment = item.result.reason
        ? `${item.result.label} · ${item.result.reason}`
        : item.result.label;
      setInlineCell(item.row, assessmentColumn, item.rowNumber, assessment, styleIds[`0:${rowStyle}`]);
    }

    const headerStyle = [...headerRow.children]
      .find((child) => child.localName === "c" && columnIndex(child.getAttribute("r")) === descriptionColumn)
      ?.getAttribute("s");
    setInlineCell(headerRow, assessmentColumn, Number(headerRow.getAttribute("r")) || 1, "Bedömning", headerStyle);
    expandWorksheetRange("dimension", assessmentColumn);
    expandWorksheetRange("autoFilter", assessmentColumn);
  }

  function setInlineCell(row, column, rowNumber, value, styleId) {
    let cell = [...row.children].find((child) =>
      child.localName === "c" && columnIndex(child.getAttribute("r")) === column,
    );
    if (!cell) {
      cell = worksheetXml.createElementNS(row.namespaceURI, "c");
      cell.setAttribute("r", `${columnName(column)}${rowNumber}`);
      const nextCell = [...row.children]
        .filter((child) => child.localName === "c")
        .find((candidate) => columnIndex(candidate.getAttribute("r")) > column);
      row.insertBefore(cell, nextCell ?? null);
    }
    cell.replaceChildren();
    cell.setAttribute("t", "inlineStr");
    if (styleId !== undefined) cell.setAttribute("s", styleId);
    const inlineString = worksheetXml.createElementNS(cell.namespaceURI, "is");
    const text = worksheetXml.createElementNS(cell.namespaceURI, "t");
    text.textContent = value;
    inlineString.appendChild(text);
    cell.appendChild(inlineString);
  }

  function expandWorksheetRange(elementName, lastColumn) {
    const rangeElement = worksheetXml.getElementsByTagNameNS("*", elementName)[0];
    if (!rangeElement) return;
    const range = rangeElement.getAttribute("ref");
    const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!match) return;
    const endColumn = columnIndex(match[3]);
    if (endColumn < lastColumn) {
      rangeElement.setAttribute("ref", `${match[1]}${match[2]}:${columnName(lastColumn)}${match[4]}`);
    }
  }

  async function downloadReviewedWorkbook() {
    addReviewStyles();
    workbookZip.file(worksheetPath, new XMLSerializer().serializeToString(worksheetXml));
    workbookZip.file("xl/styles.xml", new XMLSerializer().serializeToString(stylesXml));
    const blob = await workbookZip.generateAsync({ type: "blob", compression: "DEFLATE" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${sourceFile.name.replace(/\.xlsx$/i, "")}_granskad.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function mapBindingRoot(root) {
    const tagKeys = activeSystemPrefix ? getTagKeysForSystem(activeSystemPrefix) : getTagKeys();
    if (root === "TF1" && hasTagPrefix(tagKeys, "TF1_TF2_")) return "TF1_TF2";
    if (root === "FF1" && hasTagPrefix(tagKeys, "FF1_FF2_")) return "FF1_FF2";
    if (root === "GT31" && hasTagPrefix(tagKeys, "GT31_GT71_")) return "GT31_GT71";
    if (root === "GT11") {
      if (hasTagPrefix(tagKeys, "GT11_GT71_")) return "GT11_GT71";
      if (hasTagPrefix(tagKeys, "GT11_GQ11_")) return "GT11_GQ11";
    }
    if ((root === "ST21" || root === "ST22") && hasTagPrefix(tagKeys, "ST21_ST22_")) return "ST21_ST22";
    return root;
  }

  function mapGraphicComponentName(name) {
    return mapBindingRoot(name);
  }

  function isVerifiedLibraryComponent(name) {
    return (window.ECO_COMPONENT_LIBRARY ?? []).some((item) => item.safeToAdd && item.name === name);
  }

  function getSystemTagRows(systemPrefix) {
    return reviewedRows.filter((item) => {
      if (item.result.kind === "included" || isAlarmClass(item.description) || isNonFrameworkProperty(item.description)) return false;
      const sourceToken = item.description.trim().split(/\s+/)[0];
      const sourcePrefix = sourceToken.match(systemPrefixPattern)?.[0]?.slice(0, -1).toUpperCase();
      return !sourcePrefix || sourcePrefix === systemPrefix;
    });
  }

  function getFrameworkTagRowsForSystem(systemPrefix) {
    const frameworkTags = getRelevantFrameworkTags();
    return getSystemTagRows(systemPrefix).filter((row) => {
      const token = (row.name || row.description.trim().split(/\s+/)[0] || "").split(/\s+/)[0];
      const tag = token.replace(systemPrefixPattern, "");
      return isAlwaysIncludedGxTag(tag) || frameworkTags.some((frameworkTag) => frameworkPatternMatches(frameworkTag, tag));
    });
  }

  function mapBindingName(name) {
    const parts = String(name ?? "").split(".");
    for (let index = 0; index < parts.length - 1; index++) {
      const root = parts[index].toUpperCase();
      const suffix = parts[index + 1].toUpperCase();
      if (root === "GF41" && suffix !== "MV" && hasTagPrefix(activeSystemPrefix ? getTagKeysForSystem(activeSystemPrefix) : getTagKeys(), "GF11_")) {
        parts[index] = "GF11";
      } else if (root === "GF42" && suffix !== "MV" && hasTagPrefix(activeSystemPrefix ? getTagKeysForSystem(activeSystemPrefix) : getTagKeys(), "GF12_")) {
        parts[index] = "GF12";
      } else {
        parts[index] = mapBindingRoot(parts[index]);
      }
    }
    if (parts.length) parts[parts.length - 1] = mapBindingRoot(parts[parts.length - 1]);
    return parts.join(".");
  }

  function bindingTagCandidates(bindingName) {
    const value = mapBindingName(bindingName);
    const isAlarm = /(?:\.AlarmState|AlarmState)$/i.test(value);
    const isLink = /\.Link$/i.test(value);
    const stem = value.replace(/\.(?:Value|AlarmState|Link)$/i, "");
    const parts = stem.split(".").filter(Boolean);
    const candidates = [];
    for (let start = 0; start < parts.length; start++) {
      const candidate = parts.slice(start).join("_");
      if (candidate) candidates.push(candidate);
      if (/^TF1_(?!TF2_)/i.test(candidate)) candidates.push(candidate.replace(/^TF1_/i, "TF1_TF2_"));
      if (/^FF1_(?!FF2_)/i.test(candidate)) candidates.push(candidate.replace(/^FF1_/i, "FF1_FF2_"));
      if (isAlarm && candidate && !candidate.toUpperCase().endsWith("_L")) candidates.push(`${candidate}_L`);
      if (!/^GT11(?:_GT71)?_/i.test(candidate) && /^(?:RVÅ|SV31|SV41|SV61)_(?:PB|IT)$/i.test(candidate)) {
        candidates.push(`GT11_${candidate}`, `GT11_GT71_${candidate}`);
      }
    }
    return { candidates, isAlarm, isLink };
  }

  function resolveTemplateBinding(bindingName, rows) {
    const { candidates, isAlarm, isLink } = bindingTagCandidates(bindingName);
    const tagByKey = new Map();
    for (const item of rows) {
      const sourceName = (item.description.trim().split(/\s+/)[0] ?? "").replace(/[,:;]$/, "");
      const reviewedName = item.name || sourceName;
      for (const alias of new Set([sourceName, reviewedName])) {
        const key = normalizeTag(alias.replace(systemPrefixPattern, ""));
        if (key && !tagByKey.has(key)) tagByKey.set(key, sourceName);
      }
    }
    for (const candidate of candidates) {
      const key = normalizeTag(candidate);
      let sourceName = tagByKey.get(key);
      if (!sourceName) {
        const matchedKey = [...tagByKey.keys()].find((tag) =>
          frameworkPatternMatches(tag.toLowerCase(), key.toLowerCase()) ||
          frameworkPatternMatches(key.toLowerCase(), tag.toLowerCase()),
        );
        if (matchedKey) sourceName = tagByKey.get(matchedKey);
      }
      if (!sourceName) {
        const looseKey = normalize(candidate);
        const matchedKey = [...tagByKey.keys()].find((tag) => normalize(tag) === looseKey);
        if (matchedKey) sourceName = tagByKey.get(matchedKey);
      }
      if (!sourceName) continue;
      const sourceTag = sourceName.replace(systemPrefixPattern, "");
      const alarmState = isAlarm || /_L$/i.test(sourceTag);
      return {
        objectName: sourceName,
        property: isLink ? "" : alarmState ? "AlarmState" : "Value",
        isLink,
      };
    }
    return null;
  }

  function rewriteTemplateReferences(objectSet, ducName, rows) {
    let bindings = 0;
    let removedBindings = 0;
    const removedNames = new Set();
    for (const reference of [...objectSet.getElementsByTagNameNS("*", "Reference")]) {
      let path = reference.getAttribute("Object") ?? "";
      if (/DUCNAMN/i.test(path)) {
        path = path.replace(/DUCNAMN/gi, () => ducName);
        reference.setAttribute("Object", path);
      }
      path = path.replace(/\/!BACnet Interface(?=\/)/gi, "/!BACnet");
      reference.setAttribute("Object", path);
      if (!/\/Application\/LBXX(?:-[^/]+)?(?:\/|$)/i.test(path)) continue;
      const pi = reference.parentElement;
      const bindingName = pi?.localName === "PI" ? pi.getAttribute("Name") : "";
      const target = resolveTemplateBinding(bindingName, rows);
      if (!target) {
        if (pi?.localName === "PI") {
          removedNames.add(bindingName);
          pi.remove();
          removedBindings++;
        }
        continue;
      }
      path = path.replace(/(\/Application\/)LBXX(?:-[^/]+)?(?=\/|$)/i, (_match, prefix) => `${prefix}${target.objectName}`);
      if (target.isLink) path = path.replace(/\/Value$/i, "");
      reference.setAttribute("Object", path);
      if (target.property) reference.setAttribute("Property", target.property);
      else reference.removeAttribute("Property");
      bindings++;
    }
    if (removedNames.size) {
      for (const propertyReference of [...objectSet.getElementsByTagNameNS("*", "PropertyReference")]) {
        if (removedNames.has(propertyReference.getAttribute("Name"))) propertyReference.remove();
      }
    }
    return { bindings, removedBindings };
  }

  function updateObjectSetNames(objectSet, systemPrefix, templateId) {
    const newGraphicName = `${systemPrefix} BILD`;
    for (const object of objectSet.getElementsByTagNameNS("*", "OI")) {
      const name = object.getAttribute("NAME");
      if (name === templateId || name === `${templateId} BILD`) {
        object.setAttribute("NAME", name === templateId ? systemPrefix : newGraphicName);
      } else if (/^LBXX BILD$/i.test(name)) {
        object.setAttribute("NAME", newGraphicName);
      } else if (/^LBXX$/i.test(name)) {
        object.setAttribute("NAME", systemPrefix);
      }
    }
    for (const reference of objectSet.getElementsByTagNameNS("*", "Reference")) {
      const object = reference.getAttribute("Object");
      if (object === `../${templateId} BILD` || object === "../LBXX BILD") {
        reference.setAttribute("Object", `../${newGraphicName}`);
      }
    }
  }

  function updateSiteDescriptions(objectSet, fsName, schoolName, systemPrefix) {
    const description = `${fsName} ${schoolName} ${systemPrefix}`;
    for (const object of objectSet.getElementsByTagNameNS("*", "OI")) {
      const value = object.getAttribute("DESCR") ?? "";
      if (/0123\s+Exempelskolan\s+LB(?:xx|11|12|13)/i.test(value)) {
        object.setAttribute("DESCR", value.replace(/0123\s+Exempelskolan\s+LB(?:xx|11|12|13)/gi, description));
      }
    }
  }

  function updateSystemPrefixReferences(objectSet, systemPrefix) {
    for (const reference of [
      ...objectSet.getElementsByTagNameNS("*", "PropertyReference"),
      ...objectSet.getElementsByTagNameNS("*", "PI"),
    ]) {
      for (const attribute of [...reference.attributes]) {
        if (["Name", "DisplayName"].includes(attribute.name) && /^LBXX(?=\.|$)/i.test(attribute.value)) {
          attribute.value = attribute.value.replace(/^LBXX/i, systemPrefix);
        }
      }
    }
  }

  async function decompressBase64Gzip(value) {
    if (typeof DecompressionStream === "undefined") throw new Error("Webbläsaren kan inte packa upp TGML-innehållet i mallen.");
    const binary = atob(value.replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }

  async function compressToBase64Gzip(value) {
    if (typeof CompressionStream === "undefined") throw new Error("Webbläsaren kan inte packa TGML-innehållet i mallen.");
    const stream = new Blob([value]).stream().pipeThrough(new CompressionStream("gzip"));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  }

  async function createContentSpecificGraphicTypeId(originalTypeId, tgmlContent) {
    let digestBytes;
    try {
      digestBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tgmlContent)));
    } catch {
      digestBytes = new Uint8Array(20);
      if (crypto?.getRandomValues) crypto.getRandomValues(digestBytes);
      else digestBytes = Uint8Array.from({ length: 20 }, () => Math.floor(Math.random() * 256));
    }
    const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
    let buffer = 0;
    let bits = 0;
    let suffix = "";
    for (const byte of digestBytes) {
      buffer = (buffer << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        suffix += alphabet[(buffer >> bits) & 31];
      }
    }
    if (bits > 0) suffix += alphabet[(buffer << (5 - bits)) & 31];
    return `${String(originalTypeId).split(".").slice(0, -1).join(".")}.${suffix.slice(0, 32)}`;
  }

  function xmlHasParseError(documentXml) {
    return documentXml.getElementsByTagNameNS("*", "parsererror").length > 0;
  }

  async function transformTgmlTypes(objectSet, systemPrefix, tagKeys) {
    const types = [...objectSet.getElementsByTagNameNS("*", "ObjectType")];
    const mainGraphicName = `${systemPrefix} BILD`;
    const mainGraphicTypeName = [...objectSet.getElementsByTagNameNS("*", "OI")]
      .find((oi) => oi.getAttribute("NAME") === mainGraphicName)
      ?.getAttribute("TYPE");
    let hiddenComponents = 0;
    let mainGraphicTgml = "";
    const removedMainGraphicComponents = new Set();
    for (const type of types) {
      if (!type.getAttribute("Base").toLowerCase().includes("tgml.tgml")) continue;
      const fileContents = type.getElementsByTagNameNS("*", "FileContents")[0];
      if (!fileContents) continue;
      const tgml = parseXml(await decompressBase64Gzip(fileContents.textContent));
      if (xmlHasParseError(tgml)) throw new Error(`Kunde inte läsa TGML-grafiken ${type.getAttribute("DisplayName")}.`);
      if (tgmlPositionOverrides.size && type.getAttribute("Name") === mainGraphicTypeName) {
        applyTgmlPositionOverrides(tgml.documentElement);
      }
      for (const component of [...tgml.getElementsByTagNameNS("*", "Component")]) {
        const originalName = component.getAttribute("Name");
        if (!originalName) continue;
        if (isExcludedGt11Variant(originalName, tagKeys) || isExcludedGt31Variant(originalName)) {
          if (type.getAttribute("Name") === mainGraphicTypeName) {
            removedMainGraphicComponents.add(originalName);
          }
          component.remove();
          hiddenComponents++;
          continue;
        }
        const componentName = mapGraphicComponentName(originalName);
        if (isEquipmentName(componentName) && !componentExists(componentName, tagKeys) && !componentExists(originalName, tagKeys)) {
          if (type.getAttribute("Name") === mainGraphicTypeName) {
            removedMainGraphicComponents.add(originalName);
          }
          component.remove();
          hiddenComponents++;
        }
      }
      const serializedTgml = new XMLSerializer().serializeToString(tgml);
      if (type.getAttribute("Name") === mainGraphicTypeName) mainGraphicTgml = serializedTgml;
      const compressedTgml = await compressToBase64Gzip(serializedTgml);
      fileContents.replaceChildren(fileContents.ownerDocument.createCDATASection(compressedTgml));
      fileContents.setAttribute("Size", compressedTgml.length);
    }
    if (removedMainGraphicComponents.size) {
      const removedRoots = new Set([...removedMainGraphicComponents].map(normalizeTag));
      const matchesRemovedComponent = (name) => removedRoots.has(normalizeTag(String(name ?? "").split(".")[0]));
      const graphicType = types.find((type) => type.getAttribute("Name") === mainGraphicTypeName);
      for (const propertyReference of [...(graphicType?.getElementsByTagNameNS("*", "PropertyReference") ?? [])]) {
        if (matchesRemovedComponent(propertyReference.getAttribute("Name"))) propertyReference.remove();
      }
      const graphicObject = [...objectSet.getElementsByTagNameNS("*", "OI")]
        .find((oi) => oi.getAttribute("NAME") === mainGraphicName);
      for (const pi of [...(graphicObject?.getElementsByTagNameNS("*", "PI") ?? [])]) {
        if (matchesRemovedComponent(pi.getAttribute("Name"))) pi.remove();
      }
    }
    if (mainGraphicTgml) {
      const graphicType = types.find((type) => type.getAttribute("Name") === mainGraphicTypeName);
      const originalTypeId = graphicType?.getAttribute("Name");
      if (graphicType && originalTypeId) {
        const generatedTypeId = await createContentSpecificGraphicTypeId(originalTypeId, mainGraphicTgml);
        for (const element of [objectSet.documentElement, ...objectSet.getElementsByTagName("*")]) {
          for (const attribute of [...element.attributes]) {
            if (attribute.value === originalTypeId) attribute.value = generatedTypeId;
          }
        }
      }
    }
    return hiddenComponents;
  }

  async function appendSelectedLibraryComponents(objectSet, systemPrefix, selectedNames, rows) {
    const selected = [...new Set(selectedNames ?? [])];
    if (!selected.length) return 0;
    const catalog = new Map((window.ECO_COMPONENT_LIBRARY ?? []).map((item) => [item.name, item]));
    const graphicName = `${systemPrefix} BILD`;
    const graphicOi = [...objectSet.getElementsByTagNameNS("*", "OI")]
      .find((oi) => oi.getAttribute("NAME") === graphicName);
    const graphicType = [...objectSet.getElementsByTagNameNS("*", "ObjectType")]
      .find((type) => type.getAttribute("Name") === graphicOi?.getAttribute("TYPE"));
    const fileContents = graphicType?.getElementsByTagNameNS("*", "FileContents")[0];
    if (!graphicOi || !graphicType || !fileContents) throw new Error(`Kunde inte hitta TGML-grafiken för ${systemPrefix}.`);
    const tgml = parseXml(await decompressBase64Gzip(fileContents.textContent));
    if (xmlHasParseError(tgml)) throw new Error(`TGML-grafiken för ${systemPrefix} är ogiltig.`);
    const host = [...tgml.getElementsByTagNameNS("*", "Component")]
      .find((component) => component.getAttribute("Name") === "LBXX") ?? tgml.documentElement;
    const existing = new Set([...tgml.getElementsByTagNameNS("*", "Component")].map((component) => component.getAttribute("Name")));
    const existingPiNames = new Set([...graphicOi.getElementsByTagNameNS("*", "PI")].map((pi) => pi.getAttribute("Name")));
    const existingPropertyNames = new Set([...graphicType.getElementsByTagNameNS("*", "PropertyReference")]
      .map((property) => property.getAttribute("Name")));
    let added = 0;
    for (const name of selected) {
      const item = catalog.get(name);
      const bindings = item?.objectsetBindings ?? [];
      const hasVerifiedObjectSetData = bindings.length > 0 &&
        item.piXml?.length === bindings.length && item.propertyReferenceXml?.length === bindings.length;
      const tagTarget = bindings.map((binding) => resolveTemplateBinding(binding, rows)).find(Boolean) ?? null;
      if (!item || !item.safeToAdd || !hasVerifiedObjectSetData || !tagTarget) {
        throw new Error(`Komponenten ${name} kan inte bindas säkert till tagglistan för ${systemPrefix}.`);
      }
      for (let index = 0; index < bindings.length; index++) {
        const binding = bindings[index];
        if (!existingPiNames.has(binding)) {
          const piDocument = parseXml(item.piXml[index]);
          if (xmlHasParseError(piDocument) || piDocument.documentElement?.localName !== "PI") {
            throw new Error(`EBO-bindningen ${binding} för komponenten ${name} är ogiltig.`);
          }
          graphicOi.appendChild(objectSet.importNode(piDocument.documentElement, true));
          existingPiNames.add(binding);
        }
        if (!existingPropertyNames.has(binding)) {
          const propertyDocument = parseXml(item.propertyReferenceXml[index]);
          if (xmlHasParseError(propertyDocument) || propertyDocument.documentElement?.localName !== "PropertyReference") {
            throw new Error(`PropertyReference ${binding} för komponenten ${name} är ogiltig.`);
          }
          graphicType.appendChild(objectSet.importNode(propertyDocument.documentElement, true));
          existingPropertyNames.add(binding);
        }
      }
      if (existing.has(name)) continue;
      const componentDocument = parseXml(item.componentXml || item.xml);
      if (xmlHasParseError(componentDocument) || componentDocument.documentElement?.localName !== "Component") {
        throw new Error(`Bibliotekskomponenten ${name} har ogiltig TGML.`);
      }
      const component = tgml.importNode(componentDocument.documentElement, true);
      if (item.componentOrigin === "objectset") {
        const targetWidth = Number(host.getAttribute("ContentWidth") || host.getAttribute("Width") || tgml.documentElement.getAttribute("Width"));
        const targetHeight = Number(host.getAttribute("ContentHeight") || host.getAttribute("Height") || tgml.documentElement.getAttribute("Height"));
        const scaleX = targetWidth / Number(item.sourceCanvasWidth || targetWidth);
        const scaleY = targetHeight / Number(item.sourceCanvasHeight || targetHeight);
        for (const [attribute, scale] of [["Left", scaleX], ["Width", scaleX], ["Top", scaleY], ["Height", scaleY]]) {
          if (component.hasAttribute(attribute)) {
            component.setAttribute(attribute, String(Number((Number(component.getAttribute(attribute)) * scale).toFixed(3))));
          }
        }
      } else if (["Manuell styrning", "MS_L", "SO1_L"].includes(name)) {
        component.setAttribute("Left", String(20 + added * 145));
        component.setAttribute("Top", "665");
      } else if (item.componentXml) {
        component.setAttribute("Left", component.getAttribute("Left") || String(20 + added * 145));
        component.setAttribute("Top", component.getAttribute("Top") || "665");
      } else {
        component.setAttribute("Left", String(20 + added * 145));
        component.setAttribute("Top", "665");
      }
      host.appendChild(component);
      existing.add(name);
      added++;
    }
    if (added) {
      const serialized = new XMLSerializer().serializeToString(tgml);
      const compressed = await compressToBase64Gzip(serialized);
      fileContents.replaceChildren(objectSet.createCDATASection(compressed));
      fileContents.setAttribute("Size", String(compressed.length));
    }
    return added;
  }

  function applyTgmlPositionOverrides(tgmlRoot) {
    const occurrences = new Map();
    for (const component of [...tgmlRoot.getElementsByTagNameNS("*", "Component")]) {
      const name = component.getAttribute("Name") || "";
      if (!name || (!isEquipmentName(mapGraphicComponentName(name)) && !isVerifiedLibraryComponent(name))) continue;
      const normalized = normalizeTag(name);
      const occurrence = occurrences.get(normalized) ?? 0;
      occurrences.set(normalized, occurrence + 1);
      const key = `component-${normalized}-${occurrence}`;
      const position = tgmlPositionOverrides.get(key);
      if (!position) continue;
      const left = Number(component.getAttribute("Left") || 0) + position.x;
      const top = Number(component.getAttribute("Top") || 0) + position.y;
      component.setAttribute("Left", String(Number(left.toFixed(2))));
      component.setAttribute("Top", String(Number(top.toFixed(2))));
    }
  }

  async function buildEboObjectSet() {
    invalidateEboDownload();
    const profiles = getSystemProfileSelections();
    const fsName = byId("fsName").value.trim();
    const ducName = String(questionAnswers.ducName ?? "").trim();
    const schoolName = String(questionAnswers.schoolName ?? "").trim();
    if (!areSystemProfilesComplete() || !fsName || !ducName || !schoolName || !reviewCompleted) {
      throw new Error("Fyll i uppgifterna och starta granskningen i steg 1.");
    }
    const originalAnswers = { ...questionAnswers };
    const originalGroups = selectedTagGroups;
    const outputs = [];
    try {
      for (const profile of profiles) {
        activeSystemPrefix = profile.systemPrefix;
        const templateId = getAirTreatmentTemplateId();
        const source = getSelectedObjectSetTemplate();
        if (!source || !templateId) throw new Error("Den gemensamma ventilationsmallen saknas.");
        if (/^AS(?:[_-]A|\d)/i.test(profile.systemPrefix)) throw new Error("AS-system kan inte användas för att skapa XML.");

        questionAnswers = { ...originalAnswers };
        applyTagListAnswers(getTagKeysForSystem(profile.systemPrefix));
        selectedTagGroups = resolveActiveTagGroups(profile.systemPrefix);
        const systemPrefix = profile.systemPrefix;
        const objectSet = parseXml(source);
        if (xmlHasParseError(objectSet)) throw new Error("Den gemensamma EBO XML-mallen är ogiltig.");
        if (!objectSet.documentElement?.localName?.toLowerCase().includes("objectset")) {
          throw new Error("Den gemensamma mallen är inte en EBO ObjectSet-export.");
        }
        const serverPath = objectSet.getElementsByTagNameNS("*", "ServerFullPath")[0];
        if (serverPath) serverPath.setAttribute("Value", `/${fsName}`);
        updateObjectSetNames(objectSet, systemPrefix, templateId);
        updateSiteDescriptions(objectSet, fsName, schoolName, systemPrefix);

        const tagRows = getFrameworkTagRowsForSystem(systemPrefix);
        const tagKeys = new Set([
          ...tagRows.map((item) => {
            const token = (item.name || item.description.trim().split(/\s+/)[0] || "").split(/\s+/)[0];
            return normalizeTag(token.replace(systemPrefixPattern, ""));
          }).filter(Boolean),
          ...getRawGfComponentTagKeys(systemPrefix),
        ]);
        const addedComponents = await appendSelectedLibraryComponents(objectSet, systemPrefix, profile.components, tagRows);
        const bindingSummary = rewriteTemplateReferences(objectSet, ducName, tagRows);
        updateSystemPrefixReferences(objectSet, systemPrefix);
        if (!bindingSummary.bindings) {
          throw new Error(`Inga bindningar i mallen för ${systemPrefix} matchade tagglistan. Kontrollera systemprefix och taggnamn.`);
        }
        const hiddenComponents = await transformTgmlTypes(objectSet, systemPrefix, tagKeys);
        const xmlText = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(objectSet.documentElement)}`;
        const generatedObjectSet = parseXml(xmlText);
        if (xmlHasParseError(generatedObjectSet)) throw new Error(`Den genererade XML-filen för ${systemPrefix} kunde inte läsas tillbaka.`);
        outputs.push({ profile, xmlText, generatedObjectSet, bindingSummary, hiddenComponents, addedComponents });
      }
    } finally {
      questionAnswers = originalAnswers;
      activeSystemPrefix = "";
      selectedTagGroups = originalGroups;
    }

    generatedObjectSetForPreview = outputs[0].generatedObjectSet;
    await renderTgmlPreview(outputs[0].generatedObjectSet);
    let blob;
    let downloadName;
    if (outputs.length === 1) {
      blob = new Blob([outputs[0].xmlText], { type: "application/xml" });
      downloadName = `${outputs[0].profile.systemPrefix}.xml`;
    } else {
      const archive = new JSZip();
      for (const output of outputs) archive.file(`${output.profile.systemPrefix}.xml`, output.xmlText);
      blob = await archive.generateAsync({ type: "blob" });
      downloadName = `${fsName}_ObjectSets.zip`;
    }
    const link = byId("downloadEboXml");
    link.href = URL.createObjectURL(blob);
    link.dataset.objectUrl = link.href;
    link.download = downloadName;
    link.classList.remove("hidden");
    link.textContent = outputs.length === 1 ? "Hämta skapad XML" : `Hämta ${outputs.length} XML-filer (ZIP)`;
    byId("step2Status").textContent = outputs.map(({ profile, bindingSummary, hiddenComponents, addedComponents }) =>
      `${profile.systemPrefix}: ${bindingSummary.bindings} bindningar uppdaterade, ${bindingSummary.removedBindings} bindningar och ${hiddenComponents} komponenter borttagna; ${addedComponents} bibliotekskomponenter tillagda.`,
    ).join(" ");
  }

  function invalidateEboDownload() {
    const link = byId("downloadEboXml");
    if (!link) return;
    link.textContent = "Hämta skapad XML";
    if (link.dataset.objectUrl) URL.revokeObjectURL(link.dataset.objectUrl);
    delete link.dataset.objectUrl;
    link.removeAttribute("href");
    link.classList.add("hidden");
  }

  async function copyForExcel() {
    const rows = [
      ["Name", "Description"],
      ...reviewedRows.map((item) => [item.name, item.description]),
    ];
    const text = rows
      .map((row) => row.map((cell) => String(cell).replace(/[\t\r\n]+/g, " ")).join("\t"))
      .join("\r\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const temporaryInput = document.createElement("textarea");
      temporaryInput.value = text;
      temporaryInput.style.position = "fixed";
      temporaryInput.style.opacity = "0";
      document.body.appendChild(temporaryInput);
      temporaryInput.select();
      const copied = document.execCommand("copy");
      temporaryInput.remove();
      if (!copied) throw new Error("Webbläsaren tillåter inte kopiering till urklipp.");
    }

  }

  function showError(error) {
    byId("error").textContent = error.message;
    byId("results").classList.add("hidden");
  }

  function updateTopTabState() {
    const reviewOnly = workflowMode === "review";
    const stepOneActive = !reviewOnly && activeWorkflowStep === 1;
    const stepTwoActive = !reviewOnly && activeWorkflowStep === 2;
    const reviewActive = reviewOnly;
    byId("step1Button").classList.toggle("active", stepOneActive);
    byId("step2Button").classList.toggle("active", stepTwoActive);
    byId("reviewModeButton").classList.toggle("active", reviewActive);
    byId("step1Button").setAttribute("aria-selected", String(stepOneActive));
    byId("step2Button").setAttribute("aria-selected", String(stepTwoActive));
    byId("reviewModeButton").setAttribute("aria-selected", String(reviewActive));
  }

  function showStep(stepNumber) {
    activeWorkflowStep = stepNumber;
    const isStepOne = stepNumber === 1 || workflowMode === "review";
    byId("step1Panel").classList.toggle("hidden", !isStepOne);
    byId("step2Panel").classList.toggle("hidden", isStepOne);
    byId("step1Panel").setAttribute("aria-labelledby", workflowMode === "review" ? "reviewModeButton" : "step1Button");
    updateTopTabState();
  }

  function setWorkflowMode(mode) {
    workflowMode = mode;
    if (workflowMode === "review") {
      selectedFrameworkSystemId = "airTreatment";
      byId("frameworkSystem").value = "airTreatment";
    }
    questionAnswers = {};
    selectedTagGroups = new Set();
    userSelectedMissingGroups.clear();
    reviewCompleted = false;
    generatedObjectSetForPreview = null;
    invalidateEboDownload();
    byId("reviewContent").classList.add("hidden");
    if (reviewedRows.length) renderTagGroupQuestions();
    renderSystemProfiles();
    updateSystemSelectionView();
    updateStep2Availability();
    showStep(1);
  }

  byId("step1Button").addEventListener("click", () => {
    if (workflowMode !== "xml") setWorkflowMode("xml");
    else showStep(1);
  });
  byId("step2Button").addEventListener("click", () => {
    if (!byId("step2Button").disabled) showStep(2);
  });
  byId("reviewModeButton").addEventListener("click", () => setWorkflowMode("review"));
  byId("tagListFormat").addEventListener("change", () => {
    systemTagKeysCache.clear();
    relevantFrameworkTagsCache.clear();
    reviewCompleted = false;
    byId("reviewContent").classList.add("hidden");
    if (reviewedRows.length) renderTagGroupQuestions();
    updateQuestionGate();
  });
  updateFrameworkSystemOptions();
  byId("continueAirTreatment").addEventListener("click", () => {
    if (selectedFrameworkSystemId !== "airTreatment" || !getRequestedSystemCount()) return;
    airTreatmentStarted = true;
    updateSystemSelectionView();
    showStep(1);
  });
  byId("frameworkSystem").addEventListener("change", () => {
    airTreatmentStarted = false;
    selectedFrameworkSystemId = byId("frameworkSystem").value;
    questionAnswers = {};
    selectedTagGroups = new Set();
    userSelectedMissingGroups.clear();
    reviewCompleted = false;
    generatedObjectSetForPreview = null;
    invalidateEboDownload();
    byId("reviewContent").classList.add("hidden");
    byId("missingComponentQuestion").replaceChildren();
    byId("tagGroupChoices").classList.add("hidden");
    updateGT11NamingQuestion();
    renderTagGroupQuestions();
    updateSystemSelectionView();
    updateStep2Availability();
  });
  byId("systemProfiles").addEventListener("change", (event) => {
    if (!event.target.matches("[data-profile-prefix]")) return;
    selectedTagGroups = new Set();
    reviewCompleted = false;
    generatedObjectSetForPreview = null;
    invalidateEboDownload();
    syncPrimarySystemPrefix();
    updateSystemProfilesStatus();
    renderComponentLibraryPanel();
    renderBindingOverview();
    renderTagGroupQuestions();
    updateStep2Availability();
    renderTgmlPreview();
  });
  byId("componentLibraryProfiles").addEventListener("change", (event) => {
    if (!event.target.matches("[data-library-component]")) return;
    if (event.target.checked) {
      const list = event.target.closest(".component-library-choices");
      const current = (window.ECO_COMPONENT_LIBRARY ?? []).find((item) => item.name === event.target.value);
      const currentBindings = new Set(current?.objectsetBindings ?? []);
      for (const other of list.querySelectorAll("[data-library-component]:checked")) {
        if (other === event.target) continue;
        const otherItem = (window.ECO_COMPONENT_LIBRARY ?? []).find((item) => item.name === other.value);
        if ((otherItem?.objectsetBindings ?? []).some((binding) => currentBindings.has(binding))) other.checked = false;
      }
    }
    generatedObjectSetForPreview = null;
    invalidateEboDownload();
    renderBindingOverview();
    renderTgmlPreview();
  });
  byId("systemCount").addEventListener("input", () => {
    reviewCompleted = false;
    generatedObjectSetForPreview = null;
    invalidateEboDownload();
    byId("reviewContent").classList.add("hidden");
    updateSystemSelectionView();
    if (reviewedRows.length) {
      renderSystemProfiles();
      renderTagGroupQuestions();
    }
    updateStep2Availability();
  });
  byId("fsName").addEventListener("input", () => {
    generatedObjectSetForPreview = null;
    invalidateEboDownload();
    updateStep2Availability();
    renderTgmlPreview();
  });
  byId("systemPrefix").addEventListener("change", () => {
    generatedObjectSetForPreview = null;
    invalidateEboDownload();
    updateStep2Availability();
    renderTgmlPreview();
  });
  byId("resetTgmlPositions").addEventListener("click", () => {
    tgmlPositionOverrides.clear();
    generatedObjectSetForPreview = null;
    invalidateEboDownload();
    updateTgmlPositionControls();
    renderTgmlPreview();
  });
  byId("buildEboXml").addEventListener("click", () => {
    buildEboObjectSet().catch((error) => {
      byId("step2Status").textContent = `Kunde inte skapa XML: ${error.message}`;
    });
  });
  byId("runReview").addEventListener("click", () => {
    startReview().catch((error) => {
      console.error("Granskningen misslyckades:", error);
      window.alert(`Granskningen kunde inte slutföras: ${error.message}`);
    });
  });
  byId("pick").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    if (!fileInput.files[0]) return;
    try {
      await parseWorkbook(fileInput.files[0]);
    } catch (error) {
      showError(error);
    }
  });
  byId("download").addEventListener("click", () => {
    downloadReviewedWorkbook().catch((error) => {
      byId("error").textContent = `Kunde inte skapa filen: ${error.message}`;
    });
  });
  byId("copyExcel").addEventListener("click", () => {
    copyForExcel().catch((error) => {
      window.alert(error.message);
    });
  });

  renderTgmlPreview();

  dropArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropArea.classList.add("drag");
  });
  dropArea.addEventListener("dragleave", () => dropArea.classList.remove("drag"));
  dropArea.addEventListener("drop", (event) => {
    event.preventDefault();
    dropArea.classList.remove("drag");
    const file = event.dataTransfer.files[0];
    if (file) parseWorkbook(file).catch(showError);
  });
})();







