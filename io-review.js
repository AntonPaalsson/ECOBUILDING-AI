(() => {
  const el = id => document.getElementById(id);
  const api = window.ECO_IO_RULES;
  const norm = value => String(value ?? '').trim().normalize('NFC');
  const header = value => norm(value).toUpperCase().replace(/[\s_-]/g, '');
  let sheets = [], results = [], active = false, page = 0;
  const pageSize = 20;
  const xml = text => { const doc = new DOMParser().parseFromString(text, 'application/xml'); if (doc.querySelector('parsererror')) throw Error('Ogiltig XML i Excel-filen.'); return doc; };
  const nodes = (doc, name) => [...doc.getElementsByTagNameNS('*', name)];
  function cellValue(cell, strings) {
    if (cell.getAttribute('t') === 's') return strings[Number(nodes(cell, 'v')[0]?.textContent)] ?? '';
    return cell.getAttribute('t') === 'inlineStr' ? nodes(cell, 't').map(n => n.textContent).join('') : nodes(cell, 'v')[0]?.textContent ?? '';
  }
  async function load(file) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const read = async path => { const part = zip.file(path); if (!part) throw Error('Excel-delen saknas: ' + path); return xml(await part.async('text')); };
    const strings = zip.file('xl/sharedStrings.xml') ? nodes(await read('xl/sharedStrings.xml'), 'si').map(si => nodes(si, 't').map(t => t.textContent).join('')) : [];
    const rels = nodes(await read('xl/_rels/workbook.xml.rels'), 'Relationship');
    const output = [];
    for (const sheet of nodes(await read('xl/workbook.xml'), 'sheet')) {
      const target = rels.find(r => r.getAttribute('Id') === sheet.getAttribute('r:id'))?.getAttribute('Target');
      if (!target) continue;
      const doc = await read(target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^xl\//, ''));
      let columns;
      for (const row of nodes(doc, 'row')) {
        const cells = nodes(row, 'c');
        if (!columns) {
          const candidate = Object.fromEntries(cells.map(c => [header(cellValue(c, strings)), c.getAttribute('r').replace(/\d/g, '')]));
          if (candidate.NAME && candidate.TYPE) columns = candidate;
          continue;
        }
        const values = Object.fromEntries(cells.map(c => [c.getAttribute('r').replace(/\d/g, ''), cellValue(c, strings)]));
        const data = Object.fromEntries(Object.entries(columns).map(([key, col]) => [key, values[col] ?? '']));
        if (Object.values(data).some(Boolean)) output.push({ sheet: sheet.getAttribute('name'), row: row.getAttribute('r'), data });
      }
    }
    if (!output.length) throw Error('Hittar inga datarader med rubrikerna NAME och TYPE.');
    return output;
  }
  const typeRules = {
    '3.1': ['bacnet.schedule.BACnetDigitalSchedule'],
    '3.2': ['bacnet.point.analog.Value'],
    '3.3': ['bacnet.point.analog.Input', 'bacnet.point.analog.Value'],
    '3.4': ['bacnet.point.digital.Input', 'bacnet.point.digital.Value'],
    '3.5': ['bacnet.point.digital.Value', 'bacnet.point.digital.Output'],
    '3.6': ['bacnet.point.digital.Value'],
  };
  function inspect(entry) {
    const d = entry.data, name = norm(d.NAME), bac = norm(d.BACNETNAME);
    const checks = [];
    const add = (check, actual, expected, kind, message) => checks.push({ ...entry, name, check, actual: String(actual ?? ''), expected: String(expected ?? ''), kind, message });
    const compare = (check, actual, expected) => add(check, actual, expected, norm(actual) === norm(expected) ? 'good' : 'bad', norm(actual) === norm(expected) ? 'Stämmer' : 'Avviker');
    if (/NotificationClass|bacnet\.File/i.test(d.TYPE) || api.isNonFrameworkProperty(name)) {
      add('Ramverk', d.TYPE, '', 'included', 'Ingår * Metadata'); return checks;
    }
    compare('BACnetName = Name', bac, name);
    const prefix = name.match(/^(?:AS[_-][A-Z0-9]+|KA\d+_[A-Z0-9]+|[A-ZÅÄÖ]+\d+|SOL)[-_]/i)?.[0] ?? '';
    const tag = name.slice(prefix.length);
    const systemId = /^LB/i.test(prefix) ? 'airTreatment' : /^FA/i.test(prefix) ? 'separateFans' : /^KA/i.test(prefix) ? 'cooling' : /^VPU/i.test(prefix) ? 'heatPump' : /^(VV|KV)/i.test(prefix) ? 'hotWater' : /^(UC|VS|VP|MV|KB)/i.test(prefix) ? 'heating' : /^AS|^SOL/i.test(prefix) ? 'apparatus' : '';
    const systems = window.ECO_FRAMEWORK_SYSTEMS?.systems ?? [];
    const items = (systemId ? systems.filter(s => s.id === systemId) : systems).flatMap(s => s.items ?? []);
    const equivalent = tag.replace(/^TF1_TF2_/i, 'TF1_').replace(/^FF1_FF2_/i, 'FF1_').replace(/^ST21_ST22_/i, 'ST21_');
    const matches = items.filter(rule => api.frameworkPatternMatches(rule.tag, tag) || api.frameworkPatternMatches(rule.tag, equivalent));
    const nameResult = api.reviewDescription(name);
    add('Name mot ramverket', name, matches.length ? matches.map(r => r.tag).join(' / ') : '', matches.length ? 'good' : nameResult.kind, matches.length ? 'Stämmer' : nameResult.reason || nameResult.label);
    if (bac && bac !== name) {
      const result = api.reviewDescription(bac);
      add('BACnetName mot ramverket', bac, '', result.kind, result.reason || result.label);
    }
    for (const [field, key] of [['NOTE1 / Enhet', 'unit'], ['NOTE2 / Inställningsvärde', 'defaultValue']]) {
      const expected = [...new Set(matches.map(r => r[key]).filter(v => v !== null && v !== undefined && v !== '').map(String))];
      if (!expected.length) { add(field, d[field.startsWith('NOTE1') ? 'NOTE1' : 'NOTE2'], '', 'included', 'Inget krav i regelunderlaget'); continue; }
      const actual = norm(d[field.startsWith('NOTE1') ? 'NOTE1' : 'NOTE2']);
      add(field, actual, expected.join(' / '), expected.some(v => norm(v) === actual) ? 'good' : 'bad', expected.some(v => norm(v) === actual) ? 'Stämmer' : 'Avviker');
    }
    const defaults = [...new Set(matches.map(r => r.defaultValue).filter(v => v !== null && v !== undefined && v !== '').map(String))];
    const valueField = norm(d.RELINQUISHDEFAULT) ? 'RELINQUISHDEFAULT' : 'VALUE';
    const numeric = text => { const m = norm(text).replace(',', '.').match(/^[-+]?\d+(?:\.\d+)?(?:\s*[^\d].*)?$/); return m ? Number.parseFloat(norm(text).replace(',', '.')) : NaN; };
    if (defaults.length) {
      const fixed = defaults.filter(v => Number.isFinite(numeric(v)) || /^(true|false|on|off)$/i.test(v));
      const pass = fixed.some(v => norm(v) === norm(d[valueField]) || Number.isFinite(numeric(v)) && numeric(v) === numeric(d[valueField]));
      add(valueField === 'VALUE' ? 'Value (RelinquishDefault saknas)' : 'RelinquishDefault', d[valueField], defaults.join(' / '), pass ? 'good' : fixed.length === defaults.length ? 'bad' : 'typo', pass ? 'Stämmer' : fixed.length === defaults.length ? 'Avviker' : 'Projektberoende – kontrollera manuellt');
    }
    const configs = [...new Set(matches.map(r => r.configuredAccordingTo).filter(Boolean))];
    const allowedTypes = [...new Set(configs.flatMap(c => typeRules[c.match(/^\d+\.\d+/)?.[0]] ?? []))];
    if (matches.length) add('TYPE / Konfigureras enligt', d.TYPE, configs.join(' / ') + (allowedTypes.length ? ' → ' + allowedTypes.join(' / ') : ''), allowedTypes.includes(d.TYPE) ? 'good' : 'typo', allowedTypes.includes(d.TYPE) ? 'Stämmer' : 'Kontrollera objekttyp mot ramverkets avsnitt');
    const alarm = configs.some(c => /^3\.6\b/.test(c)) || /_L$/i.test(tag) || norm(d.EVENTDETECTIONENABLE).toLowerCase() === 'true';
    if (alarm) {
      const events = norm(d.EVENTENABLE).toLowerCase().split(/[,;\s]+/).filter(Boolean).sort();
      const expected = ['to-offnormal', 'to-fault', 'to-normal'].sort();
      add('EventEnable', d.EVENTENABLE, expected.join(', '), JSON.stringify(events) === JSON.stringify(expected) ? 'good' : 'bad', JSON.stringify(events) === JSON.stringify(expected) ? 'Stämmer' : 'Larm ska aktivera alla tre händelser');
      add('EventDetectionEnable', d.EVENTDETECTIONENABLE, 'True', /^true$/i.test(norm(d.EVENTDETECTIONENABLE)) ? 'good' : 'bad', /^true$/i.test(norm(d.EVENTDETECTIONENABLE)) ? 'Stämmer' : 'Ska vara True på larm');
      const duc = norm(el('ioDuc').value), school = norm(el('ioSchool').value);
      const messages = ['ALARMMESSAGE', 'RESETMESSAGE', 'FAULTMESSAGE'].map(k => norm(d[k]));
      const equal = messages.every(m => m && m === messages[0]);
      add('AlarmMessage = ResetMessage = FaultMessage', messages.join(' | '), 'Samma meddelande i alla tre fält', equal ? 'good' : 'bad', equal ? 'Stämmer' : 'Meddelandena saknas eller skiljer sig');
      for (const field of ['ALARMMESSAGE', 'RESETMESSAGE', 'FAULTMESSAGE']) {
        const message = norm(d[field]);
        const contains = duc && school && message.toLowerCase().includes(duc.toLowerCase()) && message.toLowerCase().includes(school.toLowerCase());
        const faultText = message.replace(duc, '').replace(school, '').replace(/[,\s.]/g, '');
        add(field + ' / Fel + DUC + skola', message, `Felbeskrivning + ${duc || 'DUC-namn'} + ${school || 'skolnamn'}`, !duc || !school ? 'typo' : contains && faultText ? 'good' : 'bad', !duc || !school ? 'Ange DUC-namn och skolnamn för kontroll' : contains && faultText ? 'Stämmer' : 'Saknar felbeskrivning, DUC-namn eller skolnamn');
      }
    }
    return checks;
  }
  function render() {
    const query = el('ioSearch').value.toLowerCase(), filter = el('ioFilter').value;
    const groups = new Map();
    for (const result of results) {
      const key = result.sheet + ':' + result.row;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(result);
    }
    const filtered = [...groups.values()].filter(checks =>
      (filter === 'all' || checks.some(r => r.kind === filter)) &&
      checks.some(r => [r.name, r.check, r.actual, r.expected, r.message].join(' ').toLowerCase().includes(query)));
    page = Math.max(0, Math.min(page, Math.ceil(filtered.length / pageSize) - 1));
    el('ioPrevious').disabled = page === 0;
    el('ioNext').disabled = (page + 1) * pageSize >= filtered.length;
    el('ioPage').textContent = filtered.length ? 'Taggar ' + (page * pageSize + 1) + '–' + Math.min((page + 1) * pageSize, filtered.length) + ' av ' + filtered.length : 'Inga resultat';
    const fragment = document.createDocumentFragment();
    const node = (tag, text, className) => { const n = document.createElement(tag); n.textContent = text; if (className) n.className = className; return n; };
    for (const checks of filtered.slice(page * pageSize, (page + 1) * pageSize)) {
      const first = checks[0], bad = checks.filter(r => r.kind === 'bad').length, warning = checks.filter(r => r.kind === 'typo').length;
      const card = document.createElement('article'); card.className = 'io-card';
      const heading = document.createElement('header');
      heading.append(node('h3', first.name), node('span', first.sheet + ' · Rad ' + first.row, 'small'));
      card.append(heading, node('p', bad || warning ? bad + ' fel · ' + warning + ' att kontrollera' : checks.every(r => r.kind === 'included') ? 'Metadata' : 'Alla kontroller stämmer', bad ? 'io-card-error' : warning ? 'io-card-warning' : 'io-card-success'));
      const ordered = [...checks].sort((a,b) => ({bad:0,typo:1,good:2,included:3}[a.kind] - {bad:0,typo:1,good:2,included:3}[b.kind]));
      for (const r of ordered) {
        const detail = document.createElement('details'); detail.className = 'io-check io-' + r.kind;
        const summary = document.createElement('summary'); summary.append(node('strong', r.check), node('span', r.message)); detail.append(summary);
        const values = document.createElement('dl');
        values.append(node('dt','Aktuellt'), node('dd',r.actual || '—'), node('dt','Förväntat'), node('dd',r.expected || '—'));
        detail.append(values); card.append(detail);
      }
      fragment.append(card);
    }
    el('ioRows').replaceChildren(fragment);
  }
  el('ioModeButton').addEventListener('click', () => {
    active = true;
    el('systemSelectionHero').classList.add('hidden'); el('workflow').classList.add('hidden'); el('ioPanel').classList.remove('hidden');
    for (const id of ['integrationButton', 'reviewModeButton']) { el(id).classList.remove('active'); el(id).setAttribute('aria-selected', 'false'); }
    el('ioModeButton').classList.add('active'); el('ioModeButton').setAttribute('aria-selected', 'true');
  });
  for (const id of ['integrationButton', 'reviewModeButton']) el(id).addEventListener('click', () => {
    if (!active) return; active = false; el('ioPanel').classList.add('hidden'); el('systemSelectionHero').classList.remove('hidden'); el('ioModeButton').classList.remove('active'); el('ioModeButton').setAttribute('aria-selected', 'false');
  });
  el('ioFile').addEventListener('change', async () => {
    sheets = []; results = []; render(); el('ioRun').disabled = true; el('ioCopy').disabled = true;
    const file = el('ioFile').files[0]; if (!file) return;
    el('ioStatus').textContent = 'Läser Excel…';
    try { sheets = await load(file); el('ioFilename').textContent = file.name; el('ioStatus').textContent = `${sheets.length} objektrader inlästa.`; el('ioRun').disabled = false; } catch (error) { el('ioStatus').textContent = error.message; }
  });
  el('ioRun').addEventListener('click', async () => {
    el('ioRun').disabled = true; el('ioStatus').textContent = 'Granskar…'; results = [];
    try {
      for (let i = 0; i < sheets.length; i++) { results.push(...inspect(sheets[i])); if (i % 40 === 0) await new Promise(resolve => setTimeout(resolve, 0)); }
      render(); const counts = kind => results.filter(r => r.kind === kind).length;
      el('ioStatus').textContent = `${sheets.length} objekt · ${counts('good')} kontroller stämmer · ${counts('bad')} fel · ${counts('typo')} att kontrollera · ${counts('included')} utan krav/metadata.`;
      el('ioCopy').disabled = false;
    } catch (error) { el('ioStatus').textContent = error.message; } finally { el('ioRun').disabled = false; }
  });
  let searchTimer;
  el('ioSearch').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { page = 0; render(); }, 120); });
  el('ioFilter').addEventListener('change', () => { page = 0; render(); });
  el('ioPrevious').addEventListener('click', () => { page--; render(); });
  el('ioNext').addEventListener('click', () => { page++; render(); });
  el('ioCopy').addEventListener('click', async () => {
    const rows = [['Blad', 'Rad', 'Name', 'Kontroll', 'Aktuellt', 'Förväntat', 'Bedömning'], ...results.map(r => [r.sheet, r.row, r.name, r.check, r.actual, r.expected, r.message])];
    try { await navigator.clipboard.writeText(rows.map(row => row.map(v => String(v).replace(/[\t\r\n]/g, ' ')).join('\t')).join('\n')); el('ioStatus').textContent = 'Resultatet har kopierats. Klistra in i Excel.'; } catch { el('ioStatus').textContent = 'Kunde inte kopiera. Tillåt urklipp i webbläsaren.'; }
  });
})();
