(() => {
  const norm = value => String(value ?? '').trim().normalize('NFC');
  const upper = value => norm(value).toUpperCase();
  const formatSchool = value => { const text=norm(value).toLocaleLowerCase('sv-SE');return text.charAt(0).toLocaleUpperCase('sv-SE')+text.slice(1); };
  const formatFs = value => { const text=upper(value).replace(/^FS[\s_-]*/,'');return text?'FS'+text:''; };
  function inferUsage(serves, components) {
    const text=[serves,...components.filter(c=>c.include!==false).flatMap(c=>c.occurrences.map(o=>o.line?.text??''))].join(' ');
    const areas=[[/kylrum|frysrum|kyl-\s*(?:eller|och)\s*frys/i,'INNERVÄGGAR(kyl- eller frysrym)'],[/hissmaskinrum|soprum|ventilerat golv|kontinuerlig drift/i,'FLÄKT I KONTERNUERLIG DRIFT(Hissmaskinrum, soprum eller ventilerat golv m.m)'],[/rökevakuering/i,'RÖKEVAKUERINGSFLÄKT'],[/luftridå|\bentré/i,'LUFTRIDÅVÄRMARE(Oavsett om komponenter är kopplade till AS eller via fältbuss ska taggar programmeras i DUC/PLC enligt nedan)'],[/teknikutrymme|undercentral|fläktrum|elcentral/i,'TEKNIKUTRYMME(UC, fläktrum, elcentral m.m)'],[/keramik/i,'KERAMIKUGN'],[/dragskåp|giftskåp/i,'DRAGSKÅP OCH GIFTSKÅP'],[/svets|lödsug|lödrum/i,'SVETS/LÖDSUG']].filter(([pattern])=>pattern.test(text));
    return {kitchen:/kök|spiskåpa/i.test(text),serviceArea:areas.length===1?areas[0][1]:''};
  }
  const systemExpression = /\b(?:LB|TA|FA|UC|VPU|VS|VP|VV|KV|KB|MV)\d{1,3}\b/gi;
  const componentExpression = /^(?:(?:TF|FF|GT|GF|GP|GQ|GX|GN|GM|SV|ST|SO|SN|LV|P)(?:\d+[A-Zxypn]*|x|pn)(?:_(?:TF|FF|GT|GF|GP|GQ|GX|GN|GM|SV|ST|SO|SN|LV|P)\d+[A-Zxypn]*)*|PVÅ|RVÅ|VÅ|VVX|FFX|ID)/i;
  const bare = name => upper(name).replace(/^(?:LB|TA|FA|UC|VPU|VS|VP|VV|KV|KB|MV)\d{1,3}[-_]/i,'');
  function root(tag) { return bare(tag).match(componentExpression)?.[0] ?? ''; }
  function equivalent(value) {
    return upper(value).replace(/^GT11_(?:GT71|GQ11)$/,'GT11').replace(/^GT31_GT71$/,'GT31').replace(/^GF41$/,'GF11').replace(/^GF42$/,'GF12');
  }
  function matches(pattern, actual) {
    const p=equivalent(pattern),a=equivalent(actual);
    if(p===a)return true;
    const expression=String(pattern).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/pn/gi,'[A-Z0-9]+').replace(/[xy]/gi,'[A-Z0-9]');
    if(new RegExp('^'+expression+'$','i').test(actual))return true;
    return a.split('_').includes(p);
  }
  function typeFor(name) {
    return /^(LB|TA)/i.test(name)?'LBXX':/^FA/i.test(name)?'FAXX':/^UC/i.test(name)?'UCXX':/^VPU/i.test(name)?'VPUXX':/^VS/i.test(name)?'VSXX':'';
  }
  function infer(filename, data) {
    const lines=data.pages.flatMap(page=>page.lines.map(line=>({page:page.number,text:line.text,line})));
    const filenameSystem=filename.match(systemExpression)?.[0];
    const headers=lines.filter(l=>/^\s*(?:SYSTEM\b|driftkort\b)/i.test(l.text)).flatMap(l=>(l.text.match(systemExpression)??[]).map(name=>({name:upper(name),page:l.page,text:l.text})));
    const headerNames=[...new Set(headers.map(h=>h.name))];
    let names=headerNames.length>1?headerNames:filenameSystem?[upper(filenameSystem)]:headerNames;
    if(names.some(name=>/^(UC|VPU)/.test(name)))names=names.filter(name=>!/^(VP|VS|VV|KV|KB)\d/.test(name));
    if(!names.length)names=[''];
    const labelValue = (expression, valid = () => true, scope = lines) => {
      for(const [index,line]of scope.entries()) {
        const match=line.text.match(expression);if(!match)continue;
        let value=norm(match[1]).replace(/^[:\t ]+/,'');
        if(!value && scope[index+1]?.page===line.page)value=norm(scope[index+1].text);
        // Only use the value cell next to the label, not unrelated text in a
        // neighbouring drawing/function column at the same vertical position.
        value=norm(value.split('\t')[0]);
        if(value && valid(value))return {value,page:line.page,text:line.text};
      }
      return {value:'',page:1,text:''};
    };
    const duc=labelValue(/\b(?:DUC(?:\s*\/\s*PLC)?|PLC|DUC[- ]?namn)\s*:?\s*(.*)$/i,v=>/^[A-ZÅÄÖ0-9_.-]+$/i.test(v)&&v.length>2&&!/^(NAMN|MODELL|PLC|DUC)$/i.test(v));
    const cabinet=labelValue(/\bApparatskåp\s*:?\s*(.*)$/i,v=>/^AS[_-]?[A-Z0-9]+$/i.test(v));
    if(!cabinet.value){const match=lines.find(l=>/\bAS[_-][A-Z0-9]+/i.test(l.text));if(match)Object.assign(cabinet,{value:match.text.match(/\bAS[_-][A-Z0-9]+/i)[0],page:match.page,text:match.text});}
    const serves=labelValue(/\bBetjänar(?:område|\s*\/\s*Placering)?\s*:?\s*(.*)$/i,v=>v.length>2&&!/^(Apparatskåp|DUC|PLC)/i.test(v));
    const school=labelValue(/\b(?:Skolans namn|Skolnamn|Skola|Fastighetsnamn|Objektnamn)\s*:\s*(.*)$/i);
    if(!school.value){const match=lines.find(l=>/\b[A-ZÅÄÖ][A-ZÅÄÖa-zåäö-]+SKOLAN\b/i.test(l.text));if(match)Object.assign(school,{value:match.text.match(/\b[A-ZÅÄÖ][A-ZÅÄÖa-zåäö-]+SKOLAN\b/i)[0],page:match.page,text:match.text});}
    const fs=filename.match(/^(\d{3,6})[-_]/)?.[1]??lines.map(l=>l.text.match(/\bSYSTEM\s+(\d{3,6})[-_]/i)?.[1]).find(Boolean)??'';
    return names.map(name=>{
      const matchingPages=headers.filter(h=>h.name===name).map(h=>h.page);
      const scope=lines.filter(l=>matchingPages.includes(l.page));
      const localDuc=names.length===1?duc:labelValue(/\b(?:DUC(?:\s*\/\s*PLC)?|PLC|DUC[- ]?namn)\s*:?\s*(.*)$/i,v=>/^[A-ZÅÄÖ0-9_.-]+$/i.test(v)&&v.length>2&&!/^(NAMN|MODELL|PLC|DUC)$/i.test(v),scope);
      const localServes=names.length===1?serves:labelValue(/\bBetjänar(?:område|\s*\/\s*Placering)?\s*:?\s*(.*)$/i,v=>v.length>2&&!/^(Apparatskåp|DUC|PLC)/i.test(v),scope);
      const localCabinet=names.length===1?cabinet:labelValue(/\bApparatskåp\s*:?\s*(.*)$/i,v=>/^AS[_-]?[A-Z0-9]+$/i.test(v),scope);
      const relevant=names.length===1?data.components:data.components.map(c=>({...c,occurrences:c.occurrences.filter(o=>matchingPages.includes(o.page))})).filter(c=>c.occurrences.length);
      const map=new Map();
      for(const item of relevant) {
        const prefix=item.name.match(systemExpression)?.[0];
        const aggregate=/^(UC|VPU)/.test(name);
        if(prefix && upper(prefix)!==name && !aggregate)continue;
        const component=root(item.name);if(!component)continue;
        const systemRef=aggregate&&prefix&&upper(prefix)!==name?upper(prefix):'';
        const key=systemRef+':'+component;
        if(!map.has(key))map.set(key,{name:component,systemRef,include:true,occurrences:[]});map.get(key).occurrences.push(...item.occurrences);
      }
      const references=[...new Set(lines.flatMap(l=>l.text.match(systemExpression)??[]).map(upper))].filter(p=>p!==name);
      return {name,originalName:name,tagPrefix:name,type:typeFor(name),duc:localDuc.value,cabinet:localCabinet.value,serves:localServes.value,...inferUsage(localServes.value,[...map.values()]),include:true,confirmed:false,components:[...map.values()],alarms:data.alarms.filter(a=>names.length===1||matchingPages.includes(a.page)).map(a=>({...a,include:Boolean(a.priority&&a.category)})),references,subsystemNames:/^(UC|VPU)/.test(name)?references.filter(p=>/^(VP|VS|VV|KV|KB)\d/.test(p)).join(', '):'',evidence:{name:headers.find(h=>h.name===name)??{page:1,text:filename},duc:localDuc,cabinet:localCabinet,serves:localServes},school:formatSchool(school.value),fsName:formatFs(fs)};
    });
  }
  function itemComponent(item) {
    const sections=item.sections??(item.section?[item.section]:[]);
    const names=sections.map(section=>section.match(/Komponent(?:er)?\s*:?\s*([A-ZÅÄÖ][A-ZÅÄÖ0-9_xypn]*)/i)?.[1]).filter(Boolean);
    return names.length?names:[];
  }
  window.ECO_FI_CORE={infer,root,bare,matches,equivalent,typeFor,itemComponent,formatFs,formatSchool,inferUsage};
})();
