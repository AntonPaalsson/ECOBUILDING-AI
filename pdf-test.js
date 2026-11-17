(() => {
  const el = id => document.getElementById(id);
  const clean = value => String(value ?? '').trim().normalize('NFC');
  const root = '(?:TF|FF|GT|GF|GP|GQ|GX|GN|GM|SV|ST|SO|LV|P)\\d+[A-Z]?';
  const componentPattern = new RegExp('(?<![A-ZÅÄÖ0-9_])(?:(?<system>(?:LB|TA|FA|VS|VV|VP|VPU|UC|KA|MV|KB|KV)\\d+)[-–])?(?<component>' + root + '(?:_' + root + ')*|RVÅ|PVÅ|VÅ|VVX|FFX)(?<suffix>(?:_[A-ZÅÄÖ0-9]+)*)(?![A-ZÅÄÖ0-9_])', 'gi');
  let pdf = null, task = null, pageData = [], components = [], alarms = [], selected = null, renderTask = null, version = 0, renderVersion = 0;
  let library, textChecks = [];
  const node = (tag, text, className) => { const n = document.createElement(tag); n.textContent = text; if (className) n.className = className; return n; };
  const loadScript = src => new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = () => { script.remove(); reject(Error('Kunde inte ladda det lokala PDF-biblioteket.')); }; document.head.append(script); });
  function getLibrary() {
    if (!library) library = (async () => {
      await loadScript('vendor/pdfjs/pdf.js');
      // Local file URLs cannot start a browser worker. PDF.js supports its own
      // in-process worker fallback; loading the handler explicitly also avoids
      // cross-origin module imports when index.html is opened from disk.
      if (location.protocol === 'file:') await loadScript('vendor/pdfjs/pdf.worker.js');
      else window.pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(new URL('vendor/pdfjs/pdf.worker.js', document.baseURI));
      return window.pdfjsLib;
    })().catch(error => { library = null; throw error; });
    return library;
  }
  function linesFromItems(items, viewport, lib) {
    const positioned = items.filter(item => typeof item.str === 'string' && item.str.trim()).map(item => {
      const transform = lib.Util.transform(viewport.transform, item.transform);
      return { text: item.str, x: transform[4], y: transform[5], width: item.width, height: Math.max(item.height, 3) };
    }).sort((a,b) => a.y - b.y || a.x - b.x);
    const lines = [];
    for (const item of positioned) {
      let line = lines.at(-1);
      if (!line || Math.abs(line.y - item.y) > Math.max(2, Math.min(item.height * .3, 5))) { line = { y:item.y, items:[] }; lines.push(line); }
      line.items.push(item);
    }
    return lines.map(line => {
      line.items.sort((a,b) => a.x - b.x);
      let text = '', previous;
      for (const item of line.items) {
        const gap = previous ? item.x - previous.x - previous.width : 0;
        text += (previous && gap > Math.max(1.5, item.height * .2) ? '\t' : '') + item.text;
        previous = item;
      }
      return { ...line, text:clean(text) };
    });
  }
  function extract(pages) {
    const map = new Map(), alarmMap = new Map();
    for (const page of pages) {
      page.lines.forEach((line,index) => {
        const matches = [...line.text.matchAll(componentPattern)];
        for (const match of matches) {
          const name = ((match.groups.system ? match.groups.system + '-' : '') + match.groups.component).toUpperCase();
          if (!map.has(name)) map.set(name, { name, confirmed:false, occurrences:[] });
          map.get(name).occurrences.push({ page:page.number, line, tag:match[0] });
          if (!/(?:_L|_SL|_BL)$/i.test(match[0])) continue;
          // A tag at the beginning of a row is a candidate, not proof of a
          // table row. Keep source context and explicitly mark missing fields.
          if (line.text.slice(0, match.index).trim()) continue;
          const source = [line.text.slice(match.index)];
          for (let offset = 1; offset <= 5 && page.lines[index+offset]; offset++) {
            const next = page.lines[index+offset].text;
            if ([...next.matchAll(componentPattern)].some(m => /(?:_L|_SL|_BL)$/i.test(m[0]))) break;
            source.push(next);
          }
          const tokens = source.join('\t').split(/\t|\s{2,}/).map(clean).filter(Boolean);
          const priority = tokens.find(t => /^[ABC]$/.test(t)) ?? '';
          const category = tokens.find(t => /^\d{2}$/.test(t)) ?? '';
          const tag = match[0].toUpperCase();
          const alarmKey = page.number + ':' + tag;
          if (!alarmMap.has(alarmKey)) alarmMap.set(alarmKey, { tag, priority, category, page:page.number, line, source:source.join('\n') });
        }
      });
    }
    return { components:[...map.values()].sort((a,b) => a.name.localeCompare(b.name,'sv',{numeric:true})), alarms:[...alarmMap.values()] };
  }
  function renderComponents() {
    const query = el('pdfComponentSearch').value.toLocaleUpperCase('sv-SE');
    const filtered = components.filter(c => c.name.includes(query));
    const fragment = document.createDocumentFragment();
    for (const component of filtered) {
      const row = node('article','', 'pdf-component');
      const heading = node('div','', 'pdf-component-heading');
      heading.append(node('strong',component.name));
      const label = node('label',''); const confirmed = document.createElement('input'); confirmed.type = 'checkbox'; confirmed.className = 'checkbox checkbox-success'; confirmed.checked = component.confirmed;
      confirmed.addEventListener('change', () => { component.confirmed = confirmed.checked; });
      label.append(confirmed,document.createTextNode(' Bekräftad')); heading.append(label); row.append(heading);
      const pages = [...new Set(component.occurrences.map(o => o.page))];
      const refs = node('div','', 'pdf-page-links');
      for (const number of pages) { const button = node('button','Sida ' + number, 'button'); button.type='button'; button.addEventListener('click', () => { selected = component; el('pdfPage').value = String(number); renderPage(); }); refs.append(button); }
      row.append(node('p',component.occurrences.length + ' textträffar · ingen symbol-/kopplingsverifiering', 'small'),refs);
      const context = node('details',''); context.append(node('summary','Visa textunderlag'),node('pre',component.occurrences[0].line.text)); row.append(context); fragment.append(row);
    }
    if (!filtered.length) fragment.append(node('p',components.length ? 'Inga komponenter matchar sökningen.' : 'Inga komponentbeteckningar hittades i PDF-texten. Kontrollera sidan visuellt.'));
    el('pdfComponentList').replaceChildren(fragment);
    el('pdfComponentCount').textContent = components.length + ' unika komponentbeteckningar hittade.';
    el('pdfCopyComponents').disabled = !components.length;
  }
  function renderAlarms() {
    const fragment = document.createDocumentFragment();
    for (const alarm of alarms) {
      const row = node('article','', 'pdf-component');
      const head = node('div','', 'pdf-component-heading'); head.append(node('strong',alarm.tag));
      const reference = node('button','Sida ' + alarm.page,'button'); reference.type='button'; reference.addEventListener('click', () => { selected = { occurrences:[{page:alarm.page,line:alarm.line}] }; el('pdfPage').value=String(alarm.page); renderPage(); }); head.append(reference); row.append(head);
      const fields = node('div','', 'pdf-alarm-fields');
      for (const [key,title] of [['tag','Larmtagg'],['priority','Klass'],['category','Kategori']]) {
        const label = node('label',title); const input = document.createElement('input'); input.type='text'; input.value=alarm[key]; input.addEventListener('input', () => { alarm[key]=clean(input.value); }); label.append(input); fields.append(label);
      }
      row.append(fields,node('p',alarm.priority && alarm.category ? 'Klass/kategori föreslagen från text. Bekräfta mot PDF-sidan.' : 'Ofullständig larmrad – klass eller kategori kunde inte läsas säkert.', 'small'));
      const context = node('details',''); context.append(node('summary','Visa textunderlag'),node('pre',alarm.source)); row.append(context); fragment.append(row);
    }
    if (!alarms.length) fragment.append(node('p','Inga larmrader hittades i PDF-texten. Det betyder inte att driftkortet saknar larm.'));
    el('pdfAlarmList').replaceChildren(fragment); el('pdfAlarmCount').textContent=alarms.length + ' larmförslag. Fälten kan justeras före kopiering.';
    el('pdfCopyAlarms').disabled = !alarms.length;
  }
  function renderTextChecks() {
    const scrollTop = el('pdfCheckList').scrollTop;
    const fragment = document.createDocumentFragment();
    for (const finding of textChecks) {
      const card = node('article','', 'pdf-component');
      const heading = node('div','', 'pdf-component-heading');
      heading.append(node('strong',finding.type),node('span',finding.decision === 'confirmed' ? 'Bekräftat fel' : finding.decision === 'dismissed' ? 'Avfärdat' : 'Kontrollera','badge badge-' + (finding.decision === 'confirmed' ? 'error' : finding.decision === 'dismissed' ? 'info' : 'warning')));
      card.append(heading,node('p','Hittat: '+finding.actual),node('p','Förslag: '+finding.suggestion),node('p',finding.explanation,'small'));
      const actions = node('div','', 'pdf-page-links');
      const page = node('button','Visa sida '+finding.page,'button');page.type='button';page.addEventListener('click',()=>{
        selected={occurrences:[{page:finding.page,line:finding.line}]};el('pdfPage').value=String(finding.page);renderPage();
      });actions.append(page);
      for (const [value,title] of [['confirmed','Bekräfta fel'],['dismissed','Avfärda'],['pending','Behåll förslag']]) {
        const button=node('button',title,'button');button.type='button';button.setAttribute('aria-pressed',String(finding.decision===value));
        button.addEventListener('click',()=>{finding.decision=value;renderTextChecks();});actions.append(button);
      }
      const context=node('details','');context.append(node('summary','Visa textunderlag'),node('pre',finding.line.text));
      card.append(actions,context);fragment.append(card);
    }
    if(!textChecks.length) fragment.append(node('p','Inga träffar i den enkla textkontrollen. Det betyder inte att driftkortet är felfritt.'));
    el('pdfCheckList').replaceChildren(fragment);
    el('pdfCheckList').scrollTop = scrollTop;
    el('pdfChecksTab').textContent='Textkontroll ('+textChecks.length+')';
    el('pdfCheckCount').textContent=textChecks.length+' förslag · '+textChecks.filter(f=>f.decision==='confirmed').length+' bekräftade · '+textChecks.filter(f=>f.decision==='dismissed').length+' avfärdade.';
    el('pdfCopyChecks').disabled=!textChecks.length;
  }
  async function renderPage() {
    if (!pdf) return;
    const request = ++renderVersion;
    if (renderTask) { renderTask.cancel(); try { await renderTask.promise; } catch {} }
    const number = Number(el('pdfPage').value) || 1, current = pdf;
    try {
      const page = await current.getPage(number);
      if (request !== renderVersion || current !== pdf) return;
      const base = page.getViewport({scale:1});
      const width = Math.max(280,el('pdfCanvasWrap').clientWidth - 24);
      const scale = Math.min(2, width / base.width) * Number(el('pdfZoom').value);
      const viewport = page.getViewport({scale});
      const canvas=el('pdfCanvas'), ctx=canvas.getContext('2d'), ratio=Math.min(devicePixelRatio || 1,2);
      canvas.width=Math.ceil(viewport.width*ratio); canvas.height=Math.ceil(viewport.height*ratio);
      canvas.style.width=viewport.width+'px'; canvas.style.height=viewport.height+'px';
      renderTask = page.render({canvasContext:ctx,viewport,transform:[ratio,0,0,ratio,0,0]}); await renderTask.promise;
      if (request !== renderVersion) return;
      if(selected) {
        ctx.save(); ctx.scale(ratio*scale,ratio*scale); ctx.fillStyle='rgba(255,165,0,.25)'; ctx.strokeStyle='#f58a08'; ctx.lineWidth=1/scale;
        for(const o of selected.occurrences.filter(o=>o.page===number)) {
          const items=o.line.items; const x=Math.min(...items.map(i=>i.x)), y=Math.min(...items.map(i=>i.y-i.height));
          const w=Math.max(...items.map(i=>i.x+i.width))-x, h=Math.max(...items.map(i=>i.height));
          ctx.fillRect(x-2,y-2,w+4,h+4);ctx.strokeRect(x-2,y-2,w+4,h+4);
        }
        ctx.restore();
      }
      el('pdfPageText').value=pageData[number-1]?.lines.map(l=>l.text).join('\n') ?? '';
      el('pdfPageStatus').textContent='Sida '+number+' av '+pdf.numPages+(pageData[number-1]?.lines.length ? '' : ' · Ingen läsbar text. OCR/bildtolkning krävs.');
      el('pdfPrevious').disabled=number===1;el('pdfNext').disabled=number===pdf.numPages;
    } catch(error) { if(error.name!=='RenderingCancelledException' && request===renderVersion) el('pdfPageStatus').textContent='Kunde inte visa sidan: '+error.message; }
  }
  async function load(file) {
    const request=++version; ++renderVersion;
    if(renderTask) { renderTask.cancel(); try {await renderTask.promise;}catch{} }
    if(task) { try { await task.destroy(); } catch {} }
    task=null;pdf=null;pageData=[];components=[];alarms=[];selected=null;textChecks=[];
    el('pdfWorkspace').classList.add('hidden'); el('pdfProgress').classList.remove('hidden');el('pdfProgress').value=0;
    el('pdfFilename').textContent=file.name;el('pdfStatus').textContent='Läser PDF…';
    try {
      if(!/\.pdf$/i.test(file.name)) throw Error('Välj en PDF-fil.');
      const lib=await getLibrary(); if(request!==version)return;
      task=lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,cMapUrl:new URL('vendor/pdfjs/cmaps/',document.baseURI).href,cMapPacked:true,standardFontDataUrl:new URL('vendor/pdfjs/standard_fonts/',document.baseURI).href,wasmUrl:new URL('vendor/pdfjs/wasm/',document.baseURI).href});
      task.onPassword=(_update,reason)=> { el('pdfStatus').textContent='PDF-filen är lösenordsskyddad. Välj en olåst kopia.'; task.destroy(); };
      pdf=await task.promise;
      for(let number=1;number<=pdf.numPages;number++) {
        if(request!==version)return;
        const page=await pdf.getPage(number);const content=await page.getTextContent();
        pageData.push({number,lines:linesFromItems(content.items,page.getViewport({scale:1}),lib)});
        el('pdfProgress').value=number/pdf.numPages*100;el('pdfStatus').textContent='Läser sida '+number+' av '+pdf.numPages+'…';
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      if(request!==version)return;
      ({components,alarms}=extract(pageData)); renderComponents();renderAlarms();
      textChecks=window.ECO_PDF_TEXT_CHECK.scan(pageData,alarms,window.ECO_FRAMEWORK?.notificationClasses ?? {});renderTextChecks();
      el('pdfPage').replaceChildren(...pageData.map(p=>new Option(String(p.number),String(p.number))));
      el('pdfWorkspace').classList.remove('hidden');
      const empty=pageData.filter(p=>!p.lines.length).length;
      el('pdfStatus').textContent=pdf.numPages+' sidor · '+components.length+' komponentbeteckningar · '+alarms.length+' larmförslag.'+(empty ? ' '+empty+' sidor saknar textlager och kräver OCR/bildtolkning.' : ' Kontrollera fynden mot PDF-sidorna.');
      await renderPage();
    } catch(error) { if(request===version) el('pdfStatus').textContent='Kunde inte läsa PDF: '+error.message; }
    finally { if(request===version)el('pdfProgress').classList.add('hidden'); }
  }
  el('navPdfShortcut').addEventListener('click',()=>{el('pdfModeButton').click();el('navPdfShortcut').blur();});
  el('pdfModeButton').addEventListener('click',()=>{
    for(const id of ['systemSelectionHero','workflow','dkAlarmPanel','ioPanel']) el(id).classList.add('wizard-hidden');
    document.querySelector('.workflow-page-navigation').classList.add('hidden');
    el('pdfTestPanel').classList.remove('hidden');
    for(const id of ['integrationButton','reviewModeButton','ioModeButton']){el(id).classList.remove('active');el(id).setAttribute('aria-selected','false');}
    el('pdfModeButton').setAttribute('aria-selected','true');window.scrollTo({top:0});
    if(pdf)renderPage();
  });
  for(const id of ['integrationButton','reviewModeButton','ioModeButton'])el(id).addEventListener('click',()=>{
    el('pdfTestPanel').classList.add('hidden');el('pdfModeButton').setAttribute('aria-selected','false');
    for(const panel of ['systemSelectionHero','workflow','ioPanel'])el(panel).classList.remove('wizard-hidden');
    // The existing workflow owns visibility when returning to its pages.
    if(id!=='ioModeButton') document.dispatchEvent(new CustomEvent('workflow-page-refresh'));
  });
  el('pdfPick').addEventListener('click',()=>el('pdfFile').click());
  el('pdfFile').addEventListener('change',()=>{const file=el('pdfFile').files[0];if(file)load(file);});
  el('pdfDrop').addEventListener('dragover',event=>{event.preventDefault();el('pdfDrop').classList.add('drag');});
  el('pdfDrop').addEventListener('dragleave',()=>el('pdfDrop').classList.remove('drag'));
  el('pdfDrop').addEventListener('drop',event=>{event.preventDefault();el('pdfDrop').classList.remove('drag');if(event.dataTransfer.files[0])load(event.dataTransfer.files[0]);});
  el('pdfPrevious').addEventListener('click',()=>{el('pdfPage').value=String(Number(el('pdfPage').value)-1);renderPage();});
  el('pdfNext').addEventListener('click',()=>{el('pdfPage').value=String(Number(el('pdfPage').value)+1);renderPage();});
  el('pdfPage').addEventListener('change',renderPage);el('pdfZoom').addEventListener('change',renderPage);
  let searchTimer;el('pdfComponentSearch').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(renderComponents,120);});
  const resultTabs = [['pdfComponentsTab','pdfComponents'],['pdfAlarmsTab','pdfAlarms'],['pdfChecksTab','pdfChecks'],['pdfTextTab','pdfText']];
  for(const [tab,panel] of resultTabs)el(tab).addEventListener('click',()=>{
    for(const [other,target] of resultTabs){el(other).setAttribute('aria-selected',String(other===tab));el(target).classList.toggle('hidden',target!==panel);}
  });
  async function copy(rows) {
    try { await navigator.clipboard.writeText(rows.map(r=>r.map(v=>String(v).replace(/[\t\r\n]/g,' ')).join('\t')).join('\n'));el('pdfStatus').textContent='Kopierat. Klistra in i Excel för att granska fynden.'; }
    catch {el('pdfStatus').textContent='Kunde inte kopiera. Tillåt urklipp i webbläsaren.';}
  }
  el('pdfCopyComponents').addEventListener('click',()=>copy([['Komponent','Sidor','Bekräftad','Textunderlag'],...components.map(c=>[c.name,[...new Set(c.occurrences.map(o=>o.page))].join(', '),c.confirmed?'Ja':'Nej',c.occurrences[0].line.text])]));
  el('pdfCopyAlarms').addEventListener('click',()=>copy([['Tagg','Klass','Kategori','Sida','Textunderlag'],...alarms.map(a=>[a.tag,a.priority,a.category,a.page,a.source])]));
  el('pdfCopyChecks').addEventListener('click',()=>copy([['Typ','Hittat','Förslag','Sida','Beslut','Textunderlag'],...textChecks.map(f=>[f.type,f.actual,f.suggestion,f.page,{pending:'Kontrollera',confirmed:'Bekräftat fel',dismissed:'Avfärdat'}[f.decision],f.line.text])]));
})();
