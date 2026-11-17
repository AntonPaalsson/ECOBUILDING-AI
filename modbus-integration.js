(() => {
  const el = id => document.getElementById(id);
  const text = value => String(value ?? '').trim();
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const nodes = (doc,name) => [...doc.getElementsByTagNameNS('*',name)];
  const xml = content => { const doc = new DOMParser().parseFromString(content,'application/xml'); if(doc.querySelector('parsererror'))throw Error('Ogiltig Excel-XML.'); return doc; };
  const node = (tag,content,cls) => { const n=document.createElement(tag);n.textContent=content;if(cls)n.className=cls;return n; };
  const pointTypes = ['Analog Input','Analog Output','Digital Input','Digital Output','Multistate Input','Multistate Output'];
  const dataTypes = ['Digital coil','16 bit signed','16 bit unsigned','32 bit signed','32 bit unsigned'];
  const roles = [
    ['type','Punkttyp','A'],['name','Name','C'],['description','Description','D'],['address','Registeradress','F'],
    ['format','Registertyp','G'],['read','Läsfunktion','H'],['write','Skrivfunktion','I'],['gain','Gain','K'],['offset','Offset','L'],['unit','Note 1 · Enhet','M'],['note','Note 2 · Källnotering','N']
  ];
  let points=[],excluded=[],sourceName='',sourceSystem='',revision=0,downloadUrl=null,page=0,template=null;
  const pageSize=30;
  function cellText(cell,strings) {
    if(cell.getAttribute('t')==='s')return strings[Number(nodes(cell,'v')[0]?.textContent)]??'';
    if(cell.getAttribute('t')==='inlineStr')return nodes(cell,'t').map(t=>t.textContent).join('');
    return nodes(cell,'v')[0]?.textContent??'';
  }
  async function readWorkbook(buffer) {
    const zip=await JSZip.loadAsync(buffer);
    const read=async path=>{const part=zip.file(path);if(!part)throw Error('Excel-delen saknas: '+path);return xml(await part.async('text'));};
    const strings=zip.file('xl/sharedStrings.xml')?nodes(await read('xl/sharedStrings.xml'),'si').map(si=>nodes(si,'t').map(t=>t.textContent).join('')):[];
    const book=await read('xl/workbook.xml'),rels=nodes(await read('xl/_rels/workbook.xml.rels'),'Relationship'),sheets=[];
    for(const sheet of nodes(book,'sheet')) {
      const target=rels.find(r=>r.getAttribute('Id')===sheet.getAttribute('r:id'))?.getAttribute('Target');if(!target)continue;
      const path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^xl\//,'');
      const doc=await read(path);
      sheets.push({name:sheet.getAttribute('name'),path,doc,rows:nodes(doc,'row').map(row=>({number:Number(row.getAttribute('r')),node:row,values:Object.fromEntries(nodes(row,'c').map(c=>[c.getAttribute('r').replace(/\d/g,''),cellText(c,strings)]))}))});
    }
    return {zip,sheets};
  }
  function infer(description,address,type,remarks) {
    const match=text(address).match(/^([0134])x(\d+)$/i);if(!match)return null;
    const group=Number(match[1]),register=Number(match[2]);
    const sourceType=text(type).toLowerCase().replace(/\s+/g,' ');
    let format;
    if(sourceType==='1 bit')format='Digital coil';
    else if(sourceType==='signed 16 bit')format='16 bit signed';
    else if(sourceType==='unsigned 16 bit')format='16 bit unsigned';
    else if(sourceType==='unsigned 32 bit')format='32 bit unsigned';
    else if(sourceType==='signed 32 bit')format='32 bit signed';
    if(!format)return null;
    if(format==='Digital coil' && ![0,1].includes(group) || format!=='Digital coil' && [0,1].includes(group))return null;
    const states=text(remarks).split('*').map(text).filter(v=>v && !/^NULL$/i.test(v));
    const multistate=group>=3 && states.length>=2;
    const output=[0,4].includes(group);
    const pointType=(format==='Digital coil'?'Digital':multistate?'Multistate':'Analog')+(output?' Output':' Input');
    const factor=text(remarks).match(/\bfactor\s+(\d+(?:[.,]\d+)?)/i);
    const unit=text(remarks).match(/(?:^|\s)(°C|Pa|kPa|bar|l\/s|m³\/h|m3\/h|kWh|kW|Hz|rpm|%|min|sek|s|h)(?=\s|$)/i)?.[1]??'';
    return {description:text(description),address:text(address),sourceType:text(type),remarks:text(remarks),unit,group,register,format,pointType,read:{0:1,1:2,3:4,4:3}[group],write:output?(group===0?5:format.startsWith('32')?16:6):'',factor:factor?Number(factor[1].replace(',','.')):1,offset:0,include:true,customName:false};
  }
  function suggestedName(point,system) {
    const base=point.description.normalize('NFC').replace(/[^\p{L}\p{N}_-]+/gu,'_').replace(/^_+|_+$/g,'').slice(0,75)||'Register';
    return (system?system+'-':'')+base+'_'+point.group+'x'+String(point.register).padStart(4,'0');
  }
  function gain(point) {
    return el('modbusScale').value==='divide'?1/point.factor:el('modbusScale').value==='multiply'?point.factor:1;
  }
  function register(point) { return point.register+Number(el('modbusAddressOffset').value); }
  function selected(){return points.filter(p=>p.include);}
  function mapping(){return Object.fromEntries(roles.map(([role])=>[role,el('modbusColumn-'+role).value]));}
  function errors() {
    const result=[],names=new Set(),map=mapping();
    if(!selected().length)result.push('Välj minst en punkt.');
    if(!map.address)result.push('Välj mallens kolumn för registeradress.');
    if(new Set(Object.values(map)).size!==roles.length)result.push('Varje exportfält måste ha en egen kolumn.');
    for(const p of selected()) {
      if(!p.name || /[\\/\t\r\n]/.test(p.name))result.push('Ogiltigt eller tomt namn på rad '+p.row+'.');
      if(names.has(p.name.toUpperCase()))result.push('Dubbelt namn: '+p.name);names.add(p.name.toUpperCase());
      if(!Number.isInteger(register(p))||register(p)<0||register(p)>65535)result.push('Registeradress utanför 0–65535: '+p.address);
      if(!Number.isFinite(gain(p))||p.factor<=0)result.push('Ogiltig skalning: '+p.name);
      if(!pointTypes.includes(p.pointType)||!dataTypes.includes(p.format))result.push('Okänd punkttyp eller registertyp: '+p.name);
      if(p.pointType.endsWith('Input') && p.write!=='')result.push('Input-punkt får inte ha skrivfunktion: '+p.name);
      if(p.pointType.endsWith('Output') && ![5,6,15,16].includes(Number(p.write)))result.push('Skrivfunktion saknas: '+p.name);
      if(p.pointType.startsWith('Digital') !== (p.format==='Digital coil'))result.push('Punkttyp och registertyp stämmer inte ihop: '+p.name);
      if(p.pointType.endsWith('Output') && p.format.startsWith('32') && Number(p.write)!==16)result.push('32-bitars Output kräver skrivfunktion 16: '+p.name);
    }
    return [...new Set(result)];
  }
  function invalidate() {
    revision++; if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=null;el('modbusDownload').classList.add('hidden');
    const issues=errors();el('modbusExport').disabled=Boolean(issues.length);
    el('modbusValidation').textContent=issues.length?issues.slice(0,5).join(' '):selected().length+' punkter klara för testexport.';
    const addressGroups=new Map();for(const p of selected()){const key=p.group+':'+register(p);if(!addressGroups.has(key))addressGroups.set(key,[]);addressGroups.get(key).push(p);}
    const duplicates=[...addressGroups.values()].filter(group=>group.length>1);
    el('modbusWarnings').textContent=duplicates.map(group=>'Adressen '+group[0].address+' används av flera källrader: '+group.map(p=>p.row+' '+p.description).join(' / ')+'. Kontrollera mot produktens registerlista.').join('\n');
    el('modbusWarnings').classList.toggle('hidden',!duplicates.length);
  }
  function render() {
    const query=el('modbusSearch').value.toLocaleLowerCase('sv-SE');
    const filtered=points.filter(p=>[p.name,p.description,p.address,p.remarks].join(' ').toLocaleLowerCase('sv-SE').includes(query));
    page=Math.max(0,Math.min(page,Math.ceil(filtered.length/pageSize)-1));
    const fragment=document.createDocumentFragment();
    for(const p of filtered.slice(page*pageSize,(page+1)*pageSize)) {
      const tr=document.createElement('tr');
      const edit=(value,change,number=false)=>{const input=document.createElement('input');input.type=number?'number':'text';input.value=value;input.addEventListener('change',()=>{change(input.value);invalidate();});return input;};
      const select=(value,values,change)=>{const input=document.createElement('select');values.forEach(v=>input.add(new Option(v||'Ingen',v)));input.value=String(value);input.addEventListener('change',()=>{change(input.value);invalidate();render();});return input;};
      const td=child=>{const cell=document.createElement('td');cell.append(typeof child==='string'?document.createTextNode(child):child);tr.append(cell);return cell;};
      const check=document.createElement('input');check.type='checkbox';check.checked=p.include;check.setAttribute('aria-label','Exportera '+p.name);check.addEventListener('change',()=>{p.include=check.checked;invalidate();});td(check);
      td(p.sheet+' · '+p.row);td(edit(p.name,v=>{p.name=text(v);p.customName=true;}));
      td(p.description).append(node('p',p.remarks,'small'));
      td(p.address+' → '+register(p));
      td(select(p.pointType,pointTypes,v=>{p.pointType=v;if(v.endsWith('Input'))p.write='';else if(p.write==='')p.write=p.group===0?5:p.format.startsWith('32')?16:6;}));
      td(select(p.format,dataTypes,v=>{p.format=v;if(p.pointType.endsWith('Output')&&v.startsWith('32'))p.write=16;}));
      td(select(p.read,['1','2','3','4'],v=>p.read=Number(v)));
      td(select(p.write,['','5','6','15','16'],v=>p.write=v===''?'':Number(v)));
      td(String(gain(p)));fragment.append(tr);
    }
    el('modbusRows').replaceChildren(fragment);el('modbusPage').textContent=filtered.length?`${page*pageSize+1}–${Math.min((page+1)*pageSize,filtered.length)} av ${filtered.length}`:'Inga punkter';
    el('modbusPrevious').disabled=page===0;el('modbusNext').disabled=(page+1)*pageSize>=filtered.length;
  }
  async function load(file) {
    el('modbusStatus').textContent='Läser registerlista…';el('modbusExport').disabled=true;
    try {
      const book=await readWorkbook(await file.arrayBuffer());points=[];excluded=[];sourceSystem='';sourceName=file.name;
      for(const sheet of book.sheets) {
        let columns;
        for(const row of sheet.rows) {
          const cells=Object.entries(row.values);
          const systemCell=cells.find(([,v])=>/^System$/i.test(text(v)));
          if(systemCell && !sourceSystem)sourceSystem=text(cells[cells.indexOf(systemCell)+1]?.[1]);
          if(!columns) {
            const description=cells.find(([,v])=>/^Description$/i.test(text(v))),address=cells.find(([,v])=>/^Adress|^Address/i.test(text(v))),type=cells.find(([,v])=>/^Type$/i.test(text(v))),remarks=cells.find(([,v])=>/^Remarks$/i.test(text(v)));
            if(description&&address&&type)columns={description:description[0],address:address[0],type:type[0],remarks:remarks?.[0]};
            continue;
          }
          const d=row.values[columns.description],a=row.values[columns.address],t=row.values[columns.type],r=row.values[columns.remarks];
          if(!text(a)&&!text(t))continue;
          const p=infer(d,a,t,r);
          if(!p||!text(d)){excluded.push(`${sheet.name} rad ${row.number}: ${text(d)} · ${text(a)} · ${text(t)}`);continue;}
          points.push({...p,sheet:sheet.name,row:row.number});
        }
      }
      if(!points.length)throw Error('Inga stödda register hittades. Rubrikerna Description, Adress/Address, Type och Remarks förväntas.');
      el('modbusSystem').value=sourceSystem;for(const p of points)p.name=suggestedName(p,sourceSystem);
      page=0;el('modbusFilename').textContent=file.name;
      el('modbusStatus').textContent=`${points.length} punkter inlästa · ${excluded.length} rader kunde inte mappas.`;
      el('modbusExcluded').textContent=excluded.join('\n');el('modbusExcludedPanel').classList.toggle('hidden',!excluded.length);
      el('modbusPreview').classList.remove('hidden');render();invalidate();
    } catch(error){points=[];el('modbusPreview').classList.add('hidden');el('modbusStatus').textContent=error.message;invalidate();}
  }
  async function getTemplate() {
    if(!template) {
      const bytes=Uint8Array.from(atob(window.ECO_MODBUS_TEMPLATE_BASE64),c=>c.charCodeAt(0));
      template=await readWorkbook(bytes);
      for(const type of pointTypes)if(!template.sheets[0].rows.some(r=>r.values.A==='Modbus '+type+' Point'))throw Error('Mallen saknar '+type+'.');
    }
    return template;
  }
  function setCell(doc,row,column,value) {
    let cell=nodes(row,'c').find(c=>c.getAttribute('r').replace(/\d/g,'')===column);
    if(!cell){cell=doc.createElementNS(ns,'c');cell.setAttribute('r',column+row.getAttribute('r'));row.append(cell);}
    cell.replaceChildren();cell.removeAttribute('t');
    if(value===''||value===undefined)return;
    if(typeof value==='number'){const v=doc.createElementNS(ns,'v');v.textContent=String(value);cell.append(v);}
    else {cell.setAttribute('t','inlineStr');const inline=doc.createElementNS(ns,'is'),t=doc.createElementNS(ns,'t');t.textContent=value;inline.append(t);cell.append(inline);}
  }
  async function exportWorkbook() {
    const issues=errors();if(issues.length)throw Error(issues.join(' '));
    const base=await getTemplate(),zip=await JSZip.loadAsync(await base.zip.generateAsync({type:'uint8array'}));
    const sheet=base.sheets[0],doc=xml(new XMLSerializer().serializeToString(sheet.doc)),data=nodes(doc,'sheetData')[0],map=mapping();data.replaceChildren();
    const selectedPoints=selected();
    selectedPoints.forEach((p,index)=>{
      const source=sheet.rows.find(r=>r.values.A==='Modbus '+p.pointType+' Point');
      const row=doc.importNode(source.node,true);row.setAttribute('r',String(index+1));
      for(const cell of nodes(row,'c'))cell.setAttribute('r',cell.getAttribute('r').replace(/\d/g,'')+(index+1));
      const values={type:'Modbus '+p.pointType+' Point',name:p.name,description:p.description,address:register(p),format:p.format,read:Number(p.read),write:p.write===''?'':Number(p.write),gain:gain(p),offset:p.offset,unit:p.unit,note:p.remarks};
      for(const [role,col]of Object.entries(map))setCell(doc,row,col,values[role]);
      // Spreadsheet cell order must follow A..O, even when a formerly blank cell is added.
      [...row.children].sort((a,b)=>a.getAttribute('r').replace(/\d/g,'').localeCompare(b.getAttribute('r').replace(/\d/g,''))).forEach(c=>row.append(c));data.append(row);
    });
    nodes(doc,'dimension')[0]?.setAttribute('ref','A1:O'+selectedPoints.length);
    for(const selection of nodes(doc,'selection')){selection.setAttribute('activeCell','A1');selection.setAttribute('sqref','A1');}
    zip.file(sheet.path,new XMLSerializer().serializeToString(doc));
    return zip.generateAsync({type:'blob',compression:'DEFLATE'});
  }
  for(const [role,label,value]of roles) {
    const wrapper=node('label',label),select=document.createElement('select');select.id='modbusColumn-'+role;
    select.add(new Option('Välj kolumn',''));for(const c of 'ABCDEFGHIJKLMNO')select.add(new Option(c,c));select.value=value;
    select.addEventListener('change',invalidate);wrapper.append(select);el('modbusColumnMapping').append(wrapper);
  }
  el('modbusPick').addEventListener('click',()=>el('modbusFile').click());
  el('modbusFile').addEventListener('change',()=>{if(el('modbusFile').files[0])load(el('modbusFile').files[0]);});
  el('modbusSystem').addEventListener('change',()=>{const system=text(el('modbusSystem').value);for(const p of points)if(!p.customName)p.name=suggestedName(p,system);render();invalidate();});
  for(const id of ['modbusScale','modbusAddressOffset'])el(id).addEventListener('change',()=>{render();invalidate();});
  el('modbusSearch').addEventListener('input',()=>{page=0;render();});
  el('modbusPrevious').addEventListener('click',()=>{page--;render();});el('modbusNext').addEventListener('click',()=>{page++;render();});
  el('modbusAll').addEventListener('change',()=>{for(const p of points)p.include=el('modbusAll').checked;render();invalidate();});
  el('modbusExport').addEventListener('click',async()=>{
    const current=revision;el('modbusExport').disabled=true;el('modbusStatus').textContent='Skapar testexport…';
    try {
      const blob=await exportWorkbook();if(current!==revision)return;
      if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=URL.createObjectURL(blob);
      const link=el('modbusDownload');link.href=downloadUrl;link.download=(text(el('modbusSystem').value)||sourceName.replace(/\.xlsx$/i,''))+'_Modbus.xlsx';link.classList.remove('hidden');link.click();
      el('modbusStatus').textContent=selected().length+' punkter exporterade enligt Modbusmallens struktur.';
    }catch(error){el('modbusStatus').textContent=error.message;}finally{el('modbusExport').disabled=Boolean(errors().length);}
  });
  el('navModbusShortcut').addEventListener('click',()=>{el('modbusModeButton').click();el('navModbusShortcut').blur();});
  el('modbusModeButton').addEventListener('click',()=>{
    for(const id of ['systemSelectionHero','workflow','dkAlarmPanel','ioPanel','pdfTestPanel'])el(id).classList.add('wizard-hidden');
    document.querySelector('.workflow-page-navigation').classList.add('hidden');el('modbusPanel').classList.remove('hidden');el('modbusModeButton').setAttribute('aria-selected','true');
    for(const id of ['integrationButton','reviewModeButton','ioModeButton','pdfModeButton'])el(id).setAttribute('aria-selected','false');window.scrollTo({top:0});
  });
  for(const id of ['integrationButton','reviewModeButton','ioModeButton','pdfModeButton'])el(id).addEventListener('click',()=>{
    el('modbusPanel').classList.add('hidden');el('modbusModeButton').setAttribute('aria-selected','false');
    if(id==='pdfModeButton')el('pdfTestPanel').classList.remove('wizard-hidden');
    else if(id==='ioModeButton')el('ioPanel').classList.remove('wizard-hidden');
    else {
      for(const target of ['systemSelectionHero','workflow'])el(target).classList.remove('wizard-hidden');
      document.dispatchEvent(new CustomEvent('workflow-page-refresh'));
    }
  });
})();
