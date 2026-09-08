/* Standalone, offline-capable documentation. No backend calls or runtime packages. */
(() => {
  'use strict';
  const D = window.ARCHITECTURE_DATA, C = window.ARCHITECTURE_CONTENT;
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = { view:'overview', node:'ui', model:'Sighting', journey:'sighting', step:0, playing:false, dependency:'All', code:'areas', month:8, studied:false, wildness:'none', modelZoom:1 };
  let playTimer;
  const source = (path, line=1, label) => `<button class="source-link" data-source="${esc(path)}" data-line="${line}"><span aria-hidden="true">↗</span> ${esc(label || path.replace(/^app\//,''))}${line > 1 && !label ? `:${line}` : ''}</button>`;
  const pill = (text, color='green') => `<span class="pill ${color}">${esc(text)}</span>`;
  const head = (kicker, title, desc) => `<div class="page-heading"><div class="eyebrow">${kicker}</div><h1>${title}</h1><p class="lede">${desc}</p></div>`;
  const groupColor = group => ({personal:'green',species:'ochre',bridge:'blue',operations:'purple',client:'green',server:'blue',storage:'ochre',external:'purple'}[group] || 'green');
  const modelInfo = m => C.models[m] || ['operations', 'A persisted record in the current schema.', 'Inspect the schema fields and constraints below for the authoritative contract.'];
  const empty = text => `<div class="empty">${esc(text)}</div>`;
  const refs = paths => `<div class="references">${paths.filter(p => D.files.some(f=>f.path===p)).map(p => source(p)).join('')}</div>`;
  const fileOf = path => D.files.find(f=>f.path===path);
  const allProcedures = () => D.files.flatMap(f => f.procedures.map(p => ({ ...p, path:f.path, full:`${f.path.split('/').pop().replace('.ts','')}.${p.name}` })));

  $('#nav').innerHTML = C.chapters.map(([id,n,title])=>`<a href="#${id}" data-nav="${id}"><span>${n}</span>${title}<i aria-hidden="true">↗</i></a>`).join('');
  const stamp = new Date(D.generatedAt).toLocaleString('en-GB', {dateStyle:'medium',timeStyle:'short'});
  $('#snapshot-label').textContent = `${D.commit} · ${stamp}`;
  $('#footer-meta').textContent = `${D.counts.sourceFiles} source files indexed · Working-tree snapshot`;

  function overview() {
    return `<div class="hero"><div class="hero-copy"><div class="eyebrow"><span class="status-dot"></span> STANDKREIS DEX / ARCHITECTURE FIELD GUIDE</div><h1>A world outside.<br>A system <em>underneath.</em></h1><p>A personal collection built on open biodiversity data. Explore how a species becomes part of your atlas—and how an encounter becomes part of your story.</p><div class="hero-actions"><button class="primary" data-view="system">Explore the system <span>↗</span></button><button class="quiet" data-view="journeys">Follow a sighting →</button></div></div><div class="orbit-art" aria-hidden="true"><svg viewBox="0 0 380 360"><defs><pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#657965" opacity=".3"/></pattern></defs><rect width="380" height="360" fill="url(#dots)"/><g fill="none" stroke="#7f997a" stroke-width="1"><circle cx="190" cy="177" r="140"/><ellipse cx="190" cy="177" rx="88" ry="140"/><ellipse cx="190" cy="177" rx="140" ry="64"/><path d="M50 177h280M190 37v280"/><circle cx="190" cy="177" r="94" stroke-dasharray="3 7"/></g><path d="M190 220C139 197 130 151 133 103c50 8 98 43 57 117Z" fill="#3e6349"/><path d="M190 220c-9-45 19-87 65-105 7 48-12 89-65 105Z" fill="#a6bc82"/><path d="M190 257v-53m0 10-37-77m37 78 43-63" fill="none" stroke="#e1e8ce" stroke-width="2"/><circle cx="77" cy="95" r="6" fill="#c19b50"/><circle cx="317" cy="233" r="6" fill="#3e6349"/><circle cx="157" cy="314" r="5" fill="#7f997a"/></svg><span class="orbit-label a">OPEN KNOWLEDGE</span><span class="orbit-label b">PERSONAL DISCOVERY</span><span class="art-caption">FIELD NOTES / SYSTEM Nº 01</span></div></div>
    <div class="stats">${[[D.counts.models,'database models','models'],[D.counts.routers,'typed API routers','code'],[D.dependencies.filter(x=>x.group==='dependencies').length,'runtime packages','dependencies'],['3','device storage layers','journeys']].map(([n,label,v])=>`<button data-view="${v}"><strong>${n}</strong><span>${label}</span><i>↗</i></button>`).join('')}</div>
    <div class="section-heading"><div><span class="eyebrow">THE IDEA THAT ORGANIZES EVERYTHING</span><h2>The sighting is the atom. The dex is a view.</h2></div><span class="margin-note">Read this first ↓</span></div>
    <div class="equation"><button data-model="Plausibility"><span class="mini-icon ochre">◎</span><small>WHAT COULD BE HERE</small><h3>Regional species</h3><p>Taxon + Region + Plausibility</p></button><span class="math">+</span><button data-model="Sighting"><span class="mini-icon green">⌖</span><small>WHAT YOU HAVE ENCOUNTERED</small><h3>Your sightings</h3><p>Identity + wild Sighting records</p></button><span class="math">+</span><button data-model="Study"><span class="mini-icon blue">▤</span><small>WHAT YOU HAVE LEARNED</small><h3>Your studies</h3><p>One Study per identity and taxon</p></button><span class="math">=</span><div class="equation-result"><small>CALCULATED TOGETHER</small><h3>Your atlas</h3><p>No stored “Dex” table.</p></div></div>
    <div class="two-up"><article class="note-card"><span class="eyebrow">01 / SHARED KNOWLEDGE</span><h3>The world is imported.</h3><p>The ETL builds a plausible regional set, then enriches it with names, images, facts, ecological relationships, sounds and cited prose. That knowledge is shared across identities.</p>${source('app/etl/README.md')}</article><article class="note-card"><span class="eyebrow">02 / PERSONAL EXPERIENCE</span><h3>Your collection is recorded.</h3><p>Sightings and studies belong to an identity. Wild encounters fill the atlas; captive and cultivated encounters remain journal records. The two progress axes stay independent.</p>${source('app/prisma/schema.prisma')}</article></div>
    <div class="section-heading"><div><span class="eyebrow">LEARN BY CHANGING THE INPUT</span><h2>One species, four possible states.</h2></div>${pill('Illustrative data','ochre')}</div><div id="simulator">${simulator()}</div>
    <div class="chapter-grid">${C.chapters.slice(1).map(([id,n,title,desc])=>`<button data-view="${id}"><span class="chapter-number">${n}</span><h3>${title} ↗</h3><p>${desc}</p></button>`).join('')}</div>`;
  }
  function simulator() {
    const shares = [4,6,20,65,100,90,60,28,17,9,5,4], months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const value = shares[state.month], seen = state.wildness === 'wild';
    const status = seen ? (state.studied ? 'Seen + studied' : 'Seen') : state.studied ? 'Studied' : 'Undiscovered';
    return `<div class="sim-controls"><div><h3>Try a sample species</h3><p>These values are invented to demonstrate the rules.</p></div><label>Encounter <select id="sim-wildness"><option value="none" ${state.wildness==='none'?'selected':''}>No sighting</option>${['wild','captive','cultivated'].map(x=>`<option value="${x}" ${state.wildness===x?'selected':''}>${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></label><label class="check-label"><input id="sim-studied" type="checkbox" ${state.studied?'checked':''}> Marked studied</label><label>Month <strong>${months[state.month]}</strong><input id="sim-month" type="range" min="0" max="11" value="${state.month}" aria-label="Sample month"></label></div><div class="sim-output"><div class="sample-card ${seen?'filled':''}"><span class="sample-leaf" aria-hidden="true">❧</span><div><span class="eyebrow">ATLAS STATE</span><h3>${status}</h3><p>${state.wildness==='none'?'No encounter record.':seen?'Wild encounter contributes to discovery.':'Journal record; does not fill the atlas.'}</p></div></div><div class="season-bars" role="img" aria-label="Illustrative monthly share profile; selected month ${months[state.month]}, ${value}% of peak">${shares.map((v,i)=>`<div class="bar-column ${i===state.month?'selected':''}"><div style="height:${v}px"></div><span>${months[i][0]}</span></div>`).join('')}</div><div class="season-result"><strong>${value}% <small>of peak</small></strong>${pill(value>=25?'Passes “now only”':'Hidden by “now only”',value>=25?'green':'ochre')}<p>Whole-year membership stays the same. “Now” means ≥ 25% of peak, not encounter probability.</p></div></div>${refs(['app/src/server/routers/identity.ts','app/etl/rules.ts'])}`;
  }
  function systemMap() {
    const selected = C.nodes.find(n=>n.id===state.node), connected = new Set([state.node]);
    C.edges.forEach(([a,b])=>{ if(a===state.node)connected.add(b);if(b===state.node)connected.add(a); });
    const curves = C.edges.filter(([, ,label])=>label!=='separate device stores' && label!=='media delivery').map(([a,b,label])=>{
      const na=C.nodes.find(n=>n.id===a),nb=C.nodes.find(n=>n.id===b), same=na.x===nb.x;
      const x1=na.x+(same?125:nb.x>na.x?250:0), y1=na.y+(same?nb.y>na.y?92:0:46), x2=nb.x+(same?125:nb.x>na.x?0:250),y2=nb.y+(same?nb.y>na.y?0:92:46);
      const active=a===state.node||b===state.node;
      const path=same&&Math.abs(na.y-nb.y)>155
        ? `M${na.x},${na.y+46} C${na.x-28},${na.y+46} ${nb.x-28},${nb.y+46} ${nb.x},${nb.y+46}`
        : `M${x1},${y1} C${same?x1:(x1+x2)/2},${same?(y1+y2)/2:y1} ${same?x2:(x1+x2)/2},${same?(y1+y2)/2:y2} ${x2},${y2}`;
      return `<path class="edge ${active?'active':''}" d="${path}" marker-end="url(#arrow${active?'Active':''})"><title>${esc(label)}</title></path>`;
    }).join('');
    return `${head('02 / THE SYSTEM MAP','Small application.<br><em>Connected ecosystem.</em>','Select a component to see its responsibilities, connections and the files that implement it. The server and ETL share code and one PostgreSQL database.')}
    <div class="legend">${[['client','Browser'],['server','Application'],['storage','Storage'],['external','External / import']].map(([g,l])=>`<span><i class="legend-dot ${groupColor(g)}"></i>${l}</span>`).join('')}<span class="map-hint">Click any card to inspect</span></div>
    <div class="map-layout"><div class="map-scroll"><div class="system-canvas"><svg viewBox="0 0 920 515" aria-hidden="true"><defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#cad1c4"/></marker><marker id="arrowActive" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#457257"/></marker></defs>${curves}</svg><div class="column-label" style="left:30px">01 — ON THE DEVICE</div><div class="column-label" style="left:335px">02 — APPLICATION LOGIC</div><div class="column-label" style="left:640px">03 — DATA & RESOURCES</div>${C.nodes.map(n=>`<button class="map-node ${groupColor(n.group)} ${state.node===n.id?'selected':''} ${connected.has(n.id)?'':'dim'}" style="left:${n.x}px;top:${n.y}px" data-node="${n.id}" aria-pressed="${state.node===n.id}"><span class="node-indicator"></span><strong>${esc(n.name)}</strong><small>${esc(n.sub)}</small><span class="node-arrow">↗</span></button>`).join('')}</div></div><aside class="inspector"><span class="eyebrow">COMPONENT NOTES</span>${pill(selected.group,groupColor(selected.group))}<h2>${esc(selected.name)}</h2><p>${esc(selected.description)}</p><div class="inspector-divider"></div><h4>Why it matters</h4><p>${esc(selected.detail)}</p><h4>Connected to</h4><div class="connection-list">${[...connected].filter(id=>id!==selected.id).map(id=>`<button data-node="${id}">${esc(C.nodes.find(n=>n.id===id).name)} →</button>`).join('')}</div><h4>Open the implementation</h4>${refs(selected.refs)}</aside></div>
    <div class="two-up"><article class="note-card"><h3>The boundary is a request.</h3><p>The browser owns interaction, cached reads and unsent work. The server resolves identity, validates writes, calls providers and owns database access. The CLI imports shared data through the same schema.</p></article><article class="note-card"><h3>There are three offline layers.</h3><p>Cache Storage holds pages and images. localStorage holds selected TanStack Query results. IndexedDB holds durable pending writes and photo Blobs. Each solves a different part of an offline walk.</p><button class="text-button" data-journey="sighting">Follow the offline write path →</button></article></div>`;
  }
  function models() {
    const m=D.models.find(x=>x.name===state.model)||D.models[0], info=modelInfo(m.name);
    const related=new Set(m.fields.filter(f=>f.relation).map(f=>f.relation));
    D.models.forEach(other=>{if(other.fields.some(f=>f.relation===m.name))related.add(other.name);});
    return `${head('03 / THE PERSISTENCE CONTRACT','Meet the <em>data.</em>',`${D.models.length} Prisma models, ${D.enums.length} enums, and the relationships that hold the atlas together. Select a model for every field, key, constraint and source line.`)}
    <div class="model-toolbar"><label class="filter-search">⌕ <input id="model-search" type="search" placeholder="Find a model or field…" aria-label="Filter models by name or field"></label><span>${pill('Personal','green')} ${pill('Species','ochre')} ${pill('Media bridge','blue')} ${pill('Operations','purple')}</span></div>
    <div class="model-layout"><div class="model-list" id="model-list">${modelList('')}</div><article class="model-detail"><div class="detail-title"><div>${pill(info[0],groupColor(info[0]))}<h2>${esc(m.name)}</h2></div>${source('app/prisma/schema.prisma',m.line,'View schema ↗')}</div><h3>${esc(info[1])}</h3><p>${esc(info[2])}</p>
    ${related.size?`<div class="relation-ribbon"><span>Connected models</span>${[...related].map(n=>`<button data-model="${n}">${n} ↗</button>`).join('')}</div>`:'<div class="relation-ribbon">No Prisma relations. References, if any, are scalar values.</div>'}
    <div class="table-scroll"><table class="fields-table"><thead><tr><th>Field</th><th>Type</th><th>Contract / meaning</th></tr></thead><tbody>${m.fields.map(f=>`<tr><td>${source('app/prisma/schema.prisma',f.line,f.name)}</td><td>${f.relation?`<button class="type-link" data-model="${f.relation}">${esc(f.type)} ↗</button>`:`<code>${esc(f.type)}</code>`}</td><td>${f.attributes?`<code class="field-attributes">${esc(f.attributes)}</code>`:''}${f.description?`<p>${esc(f.description)}</p>`:f.relation?`<p>${f.type.endsWith('[]')?'Collection relation':f.type.endsWith('?')?'Optional relation':'Required relation'} to ${f.relation}.</p>`:''}</td></tr>`).join('')}</tbody></table></div>
    ${m.constraints.length?`<div class="constraints"><h4>Model constraints & indexes</h4>${m.constraints.map(c=>`<code>${esc(c)}</code>`).join('')}</div>`:''}</article></div>
    <div class="section-heading"><div><span class="eyebrow">FOLLOW THE FOREIGN KEYS</span><h2>Relationship explorer</h2></div><div><button class="icon-button" data-zoom="-0.15" aria-label="Zoom out relationship diagram">−</button><button class="icon-button" data-zoom="0.15" aria-label="Zoom in relationship diagram">+</button></div></div><p class="muted">Arrows go from the record holding a foreign key to its referenced model. Only declared Prisma relations appear; string IDs without a relation do not imply a database constraint. Select a card to inspect it above.</p><div id="er-map">${erMap(m.name)}</div>
    <div class="section-heading"><div><span class="eyebrow">FINITE VOCABULARIES</span><h2>The schema enums</h2></div></div><div class="enum-grid">${D.enums.map(e=>`<article class="note-card"><h3>${e.name}</h3><div class="enum-values">${e.values.map(v=>`<code>${v}</code>`).join('')}</div>${source('app/prisma/schema.prisma',e.line,'View definition')}</article>`).join('')}</div>
    <div class="note-banner"><strong>More than database models.</strong> The browser also has typed queue payloads, journal rows, scan answers and prose structures. Explore their complete exported definitions in the code atlas.<button class="text-button" data-code="types">Explore TypeScript types →</button></div>`;
  }
  function modelList(q) {
    const found=D.models.filter(m=>`${m.name} ${m.fields.map(f=>`${f.name} ${f.type}`).join(' ')}`.toLowerCase().includes(q.toLowerCase()));
    return found.map(m=>`<button class="model-list-item ${state.model===m.name?'selected':''}" data-model="${m.name}" aria-pressed="${state.model===m.name}"><i class="legend-dot ${groupColor(modelInfo(m.name)[0])}"></i><span>${m.name}<small>${m.fields.length} fields</small></span><span>↗</span></button>`).join('')||empty('No matching models.');
  }
  function erMap(selected) {
    const positions=new Map(D.models.map((m,i)=>[m.name,{x:35+(i%4)*250,y:35+Math.floor(i/4)*155}]));
    const height=Math.ceil(D.models.length/4)*155+10;
    const edges=D.models.flatMap(m=>m.fields.filter(f=>f.relation&&f.attributes.includes('fields:')).map(f=>({from:m.name,to:f.relation,field:f.name})));
    return `<div class="er-scroll"><div class="er-canvas" style="width:${1040*state.modelZoom}px;height:${height*state.modelZoom}px"><div style="width:1040px;height:${height}px;transform:scale(${state.modelZoom});transform-origin:top left"><svg width="1040" height="${height}" aria-hidden="true"><defs><marker id="er-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L5 3L0 6" fill="#52715a"/></marker></defs>${edges.map(e=>{const a=positions.get(e.from),b=positions.get(e.to),active=e.from===selected||e.to===selected;return `<path d="M${a.x+100} ${a.y+80} C${a.x+100} ${a.y+120},${b.x+100} ${b.y-40},${b.x+100} ${b.y}" class="edge ${active?'active':''}" marker-end="url(#er-arrow)"><title>${e.from}.${e.field} → ${e.to}</title></path>`;}).join('')}</svg>${D.models.map(m=>{const p=positions.get(m.name);return `<button style="left:${p.x}px;top:${p.y}px" class="er-node ${groupColor(modelInfo(m.name)[0])} ${selected===m.name?'selected':''}" data-model="${m.name}"><strong>${m.name}</strong><small>${m.fields.filter(f=>!f.relation).length} stored fields · ${modelInfo(m.name)[0]}</small></button>`;}).join('')}</div></div></div>`;
  }
  function journeys() {
    const j=C.journeys.find(j=>j.id===state.journey),s=j.steps[state.step];
    return `${head('04 / FOLLOW THE MOVING PARTS','From intention<br>to <em>stored state.</em>','Step through real paths in the code. These are explanatory walkthroughs; they do not execute requests or write data.')}
    <div class="journey-tabs">${C.journeys.map(x=>`<button data-journey="${x.id}" class="${x.id===j.id?'selected':''}" aria-pressed="${x.id===j.id}">${x.title}</button>`).join('')}</div>
    <div class="journey-header"><div><h2>${j.title}</h2><p>${j.sub}</p></div><button class="primary" data-play>${state.playing?'Ⅱ Pause':'▷ Play walkthrough'}</button></div>
    <div class="journey-layout"><div class="step-list">${j.steps.map((step,i)=>`<button data-step="${i}" class="${i===state.step?'selected':i<state.step?'done':''}" aria-current="${i===state.step?'step':'false'}"><span class="step-number">${i<state.step?'✓':String(i+1).padStart(2,'0')}</span><div><strong>${step[0]}</strong><small>${C.nodes.find(n=>n.id===step[3])?.sub||step[3]}</small></div></button>`).join('')}</div><article class="journey-detail"><div class="eyebrow">STEP ${String(state.step+1).padStart(2,'0')} OF ${String(j.steps.length).padStart(2,'0')}</div><div class="journey-illustration" aria-hidden="true"><div class="pulse-ring"></div><span>${({ui:'⌖',api:'⇄',db:'▤',cache:'◫',queue:'≋',services:'✳'})[s[3]]||'↗'}</span><div class="journey-line left"></div><div class="journey-line right"></div></div>${pill(C.nodes.find(n=>n.id===s[3])?.name||s[3])}<h2>${s[0]}</h2><p>${s[1]}</p>${source(s[2])}<div class="step-controls"><button class="quiet" data-step="${state.step-1}" ${state.step===0?'disabled':''}>← Previous</button><span>${state.step+1} / ${j.steps.length}</span><button class="primary" data-step="${state.step+1}" ${state.step===j.steps.length-1?'disabled':''}>Next step →</button></div></article></div>
    <div class="two-up"><article class="note-card"><span class="eyebrow">A RECORD NEEDS A TAXON</span><h3>Pending scans stay on the device.</h3><p>A photo with an unresolved species cannot be a database Sighting yet. ScanPayload carries the pending identification and proposed answer until the person confirms a species.</p>${source('app/src/components/Queue.ts')}</article><article class="note-card"><span class="eyebrow">FAILURE IS PART OF THE FLOW</span><h3>Unsent work remains visible.</h3><p>Network failures and retryable errors keep work queued. Other client errors mark a row as failed for review and retry. Photo acknowledgement is persisted before the dependent sighting is sent.</p>${source('app/src/components/Queue.ts')}</article></div>`;
  }
  function pipeline() {
    return `${head('05 / THE SPECIES PIPELINE','Open data.<br><em>Local meaning.</em>','The ETL turns broad biodiversity sources into a county-sized atlas. Shared rules connect import-time membership with runtime sorting and filtering.')}
    <div class="pipeline-intro"><span class="eyebrow">EXTRACT → TRANSFORM → LOAD</span><p>Region construction establishes membership. Enrichment attaches knowledge to those taxa. Sounds and prose are dedicated steps, not required for an atlas row to exist.</p>${source('app/etl/cli.ts')}</div>
    <div class="pipeline-stages">${C.pipeline.map(([id,n,title,input,body,output,path])=>`<article class="pipeline-stage"><div class="pipeline-number">${n}</div><div class="stage-content"><div class="stage-top"><span class="eyebrow">${id.toUpperCase()}</span><code>etl ${id}</code></div><h2>${title}</h2><p class="stage-input">${input}</p><p>${body}</p><div class="stage-output"><span>WRITES TO</span>${output}</div>${source(path)}</div></article>`).join('')}</div>
    <div class="section-heading"><div><span class="eyebrow">RULES WORTH REMEMBERING</span><h2>Membership is not seasonality.</h2></div></div><div class="three-up"><article class="note-card"><strong class="big-number">90<span>%</span></strong><h3>Coverage, within a tile</h3><p>Sort taxa with at least 10 observations by count. Keep taxa until cumulative observations reach 90% of eligible effort. This is not 90% of species.</p></article><article class="note-card"><strong class="big-number">12</strong><h3>Monthly relative shares</h3><p>For each month: taxon observations ÷ all region observations, stored per 100,000. Runtime responses expose per-mille values.</p></article><article class="note-card"><strong class="big-number">25<span>%</span></strong><h3>The “now only” threshold</h3><p>This month’s share must reach one quarter of the taxon’s peak share. It affects the displayed subset; the whole-year membership row stays.</p></article></div>${refs(['app/etl/rules.ts','app/src/domain/rules.ts','app/src/domain/observationWindow.ts'])}
    <div class="two-up"><article class="note-card"><h3>Cached, bounded, repeatable</h3><p>The fetch layer caches by URL, spaces calls by host, caps request budgets and retries failures. Region writes are transactional. Content works per taxon, with timestamps marking completion.</p>${source('app/etl/fetch.ts')}</article><article class="note-card"><h3>Prose is a separate authoring workflow</h3><p>The files driver writes prompts and reads answer files. Validation and auditing gate loading; the API driver throws rather than calling a model. This differs from the app’s live photo-identification API.</p>${source('app/etl/prose/driver.ts')}</article></div>`;
  }
  function dependencyCards(q='') {
    const category=state.dependency;
    const services=C.services.filter(s=>(category==='All'||category==='Runtime'&&s[1].includes('Runtime')||category==='Data sources'&&/ETL|Bulk/.test(s[1])||category==='Infrastructure'&&s[1]==='Infrastructure')&&s.join(' ').toLowerCase().includes(q.toLowerCase()));
    return services.map(([name,phase,desc,path,note])=>`<article class="service-card"><div class="service-top"><div class="service-monogram">${name.slice(0,2).toUpperCase()}</div>${pill(phase,/ETL|Bulk/.test(phase)?'ochre':phase==='Infrastructure'?'blue':'green')}</div><h3>${name}</h3><p>${desc}</p><p class="service-note">${note}</p>${source(path)}</article>`).join('')||empty('No matching external services.');
  }
  function packageRows(q='') {
    const deps=D.dependencies.filter(p=>`${p.name} ${C.packageRoles[p.name]||''}`.toLowerCase().includes(q.toLowerCase()));
    return deps.map(p=>`<tr><td><code>${esc(p.name)}</code><p>${esc(C.packageRoles[p.name]||'Declared in package.json; inspect imports for usage.')}</p></td><td>${pill(p.group==='dependencies'?'Runtime':'Development',p.group==='dependencies'?'green':'ochre')}</td><td><code>${esc(p.declared)}</code></td><td><code>${esc(p.resolved||'Not in lockfile')}</code></td><td><button class="text-button" data-package="${esc(p.name)}">Find uses ↗</button></td></tr>`).join('')||`<tr><td colspan="5">No matching packages.</td></tr>`;
  }
  function dependencies() {
    return `${head('06 / EXTERNAL DEPENDENCIES','What lives beyond<br><em>this repository.</em>','Separate the services the application calls, the datasets it imports, and the npm packages that make it run. Versions below come from this repository, not a live registry.')}
    <div class="filter-bar"><div class="segmented">${['All','Runtime','Data sources','Infrastructure'].map(c=>`<button data-dependency="${c}" class="${state.dependency===c?'selected':''}" aria-pressed="${state.dependency===c}">${c}</button>`).join('')}</div><label class="filter-search">⌕ <input id="dependency-search" type="search" placeholder="Filter external services…" aria-label="Filter external services"></label></div><div class="service-grid" id="dependency-cards">${dependencyCards()}</div>
    <div class="section-heading"><div><span class="eyebrow">THE DIRECT PACKAGE INVENTORY</span><h2>${D.dependencies.length} declared npm dependencies</h2></div>${source('app/package.json')}</div><p class="muted">Declared ranges are from package.json; resolved versions are from package-lock.json. This inventory covers direct dependencies. Transitive packages are left to the lockfile. “Development” describes the manifest group; for example, ffmpeg-static also supports the local sounds ETL.</p><label class="filter-search package-search">⌕ <input id="package-search" type="search" placeholder="Find a package or purpose…" aria-label="Filter npm packages"></label><div class="table-scroll"><table class="package-table"><thead><tr><th>Package / role</th><th>Declared group</th><th>Requested</th><th>Locked</th><th>Code</th></tr></thead><tbody id="package-rows">${packageRows()}</tbody></table></div>`;
  }
  function code() {
    return `${head('07 / THE CODE ATLAS','Know where<br>to <em>start reading.</em>','Browse the repository by responsibility, inspect the API surface, or find a domain type. Source buttons open the exact local snapshot with line numbers.')}
    <div class="filter-bar"><div class="segmented">${[['areas','By responsibility'],['routes','Routes & API'],['types','TypeScript types'],['files','All indexed files']].map(([id,l])=>`<button data-code="${id}" class="${state.code===id?'selected':''}" aria-pressed="${state.code===id}">${l}</button>`).join('')}</div><label class="filter-search">⌕ <input id="code-search" type="search" placeholder="Filter this index…" aria-label="Filter code index"></label></div><div id="code-content">${codeContent('')}</div>`;
  }
  function codeContent(q) {
    const match = s=>s.toLowerCase().includes(q.toLowerCase());
    if(state.code==='areas')return `<div class="area-grid">${C.areas.filter(a=>match(a.join(' '))).map(([path,name,desc])=>`<article class="note-card"><code class="area-path">${path}</code><h3>${name}</h3><p>${desc}</p><div class="area-files">${D.files.filter(f=>f.path.startsWith(path)&&!f.path.includes('.test.')).slice(0,5).map(f=>source(f.path,1,f.path.slice(path.length))).join('')}</div><button class="text-button" data-file-prefix="${path}">Browse indexed files →</button></article>`).join('')}</div>`;
    if(state.code==='files')return `<p class="muted">${D.files.filter(f=>match(f.path)).length} of ${D.files.length} indexed text files. Generated Prisma code, message JSON, binary assets, private configuration, datasets and experiment runs are excluded.</p><div class="file-list">${D.files.filter(f=>match(f.path)).map(f=>`<div>${source(f.path)}<span>${f.lines} lines · ${f.imports.length} imports</span></div>`).join('')||empty('No matching files.')}</div>`;
    if(state.code==='types') {
      const types=D.files.filter(f=>!f.path.includes('.test.')).flatMap(f=>f.types.map(t=>({...t,path:f.path}))).filter(t=>match(`${t.name} ${t.text} ${t.path}`));
      return `<p class="muted">${types.length} exported type and interface definitions. These include browser payloads, read models, ETL contracts and server DTOs. Database enums are in the Data models chapter.</p><div class="type-grid">${types.map(t=>`<details class="type-card"><summary><strong>${esc(t.name)}</strong><small>${esc(t.path.replace('app/',''))}</small></summary><pre>${esc(t.text)}</pre>${source(t.path,t.line)}</details>`).join('')||empty('No matching types.')}</div>`;
    }
    const routers=D.files.filter(f=>f.procedures.some(p=>match(`${f.path} ${p.name} ${p.text}`)));
    return `<div class="section-heading compact"><h2>${D.counts.routers} routers · ${D.counts.procedures} procedures</h2>${source('app/src/server/routers/_app.ts')}</div><p class="muted">Procedure kind and names are extracted from TypeScript syntax. Open an implementation to inspect its complete Zod input, checks and response. “publicProcedure” still receives a cookie-bound identity from the shared context.</p><div class="router-grid">${routers.map(f=>`<article class="router-card"><h3>${f.path.split('/').pop().replace('.ts','')}<small>${f.procedures.length} procedures</small></h3>${f.procedures.filter(p=>match(`${f.path} ${p.name} ${p.text}`)).map(p=>`<div>${source(f.path,p.line,p.name)}${pill(p.kind,p.kind==='query'?'green':'ochre')}</div>`).join('')}</article>`).join('')}</div><div class="section-heading"><h2>Page and HTTP entry points</h2></div><div class="table-scroll"><table><thead><tr><th>Route</th><th>Kind</th><th>Implementation</th></tr></thead><tbody>${D.routes.filter(r=>match(`${r.url} ${r.path}`)).map(r=>`<tr><td><code>${esc(r.url)}</code></td><td>${pill(r.kind==='HTTP'?`HTTP ${r.methods.join(' / ')}`:'Page',r.kind==='HTTP'?'blue':'green')}</td><td>${source(r.path)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function operations() {
    return `${head('08 / RUNNING THE SYSTEM','From the laptop<br>to <em>the field.</em>','The repository supports a server deployment and a static client export. Hosting details here are documented configuration, not a live infrastructure audit.')}
    <div class="deploy-grid"><article class="deploy-card"><span class="eyebrow">LOCAL DEVELOPMENT</span><h2>Next.js + Docker Postgres</h2><div class="deploy-flow"><span>Browser</span><i>→</i><span>Next.js</span><i>→</i><span>Postgres :5433</span></div><p>The local server hosts pages and APIs. Photos can use disk or the configured Blob store. ETL runs as TypeScript CLI commands against the chosen database.</p>${refs(['app/docker-compose.yml','app/src/server/env.ts'])}</article><article class="deploy-card dark"><span class="eyebrow">DOCUMENTED PRODUCTION</span><h2>Vercel + Neon + Blob</h2><div class="deploy-flow"><span>Vercel app</span><i>→</i><span>Neon DB</span><i>+</i><span>Private Blob</span></div><p>The Vercel build command runs the migration wrapper and application build. An hourly cron calls the guarded sweep route. Background work uses waitUntil.</p>${refs(['app/vercel.json','docs/DEPLOY.md'])}</article></div>
    <div class="two-up"><article class="note-card"><span class="eyebrow">THE STATIC EXPORT</span><h3>Same client, separate API host.</h3><p>STATIC_EXPORT switches Next’s output to export and picks .tsx routing files. HTTP route.ts handlers are omitted. The client prefixes API calls with NEXT_PUBLIC_API_URL. A Capacitor wrapper is described as a future use; no Capacitor package is declared.</p>${source('app/next.config.ts')}</article><article class="note-card"><span class="eyebrow">BACKGROUND RECOVERY</span><h3>Work resumes from persisted markers.</h3><p>The sweep uses a PostgreSQL advisory lock, restarts stale queued regions and fills taxa missing content. The cron has a time budget so a later invocation can continue. Media and expired verification-code cleanup also belong here.</p>${source('app/src/server/sweep.ts')}</article></div>
    <div class="section-heading"><div><span class="eyebrow">THE VERIFICATION CONTRACT</span><h2>Checks before a merge</h2></div>${source('.github/workflows/check.yml')}</div><div class="check-pipeline">${[['01','Typecheck','Next type generation + tsc'],['02','Lint','ESLint across the app'],['03','Tests',`${D.counts.testFiles} indexed test files`],['04','Static build','Export + worker manifest']].map(([n,t,d])=>`<article><span>${n}</span><h3>${t}</h3><p>${d}</p></article>`).join('')}</div><p class="muted">The repository’s check script is typecheck → lint → test → build:export. These are the defined checks, not a claim that this guide ran them. Offline/service-worker behavior has dedicated production-build scripts; the repository cautions against treating next dev as that verification environment.</p>
    <div class="section-heading"><div><span class="eyebrow">IMPLEMENTED / RESERVED / DOCUMENTED</span><h2>Boundaries worth knowing</h2></div></div><div class="boundary-list"><article><span>01</span><div><h3>Quest and recap work is not the collection model.</h3><p>The inspected quests page is a title shell. Study has recapPassed, but the study router only exposes mark and unmark. There is no XP or quest database model in this schema.</p>${refs(['app/src/app/[locale]/quests/page.tsx','app/src/server/routers/study.ts'])}</div></article><article><span>02</span><div><h3>Email verification does not establish an email login.</h3><p>The router includes emailStart, emailVerify and emailRemove. The implemented sign-in ceremony uses passkeys. A verified address may be described as a recovery path in product notes; a complete email recovery flow is not exposed here.</p>${source('app/src/server/routers/identity.ts')}</div></article><article><span>03</span><div><h3>Exact location and display location differ.</h3><p>Sighting stores optional exact coordinates. The journal uses place labels, maps coarsen display, and the personal data export includes exact points. Photo re-encoding strips embedded EXIF metadata.</p>${refs(['app/src/components/SightingMap.tsx','app/src/components/LogPhoto.tsx','app/src/server/routers/data.ts'])}</div></article><article><span>04</span><div><h3>The schema snapshot can include in-progress work.</h3><p>QuotaBucket, ScanWork and PhotoDeletion were present during this review. Their presence documents current working-tree design; it does not establish that their migration or all call sites have reached production.</p>${refs(['app/prisma/schema.prisma','app/src/server/quotas.ts','app/src/server/photos.ts'])}</div></article></div>
    <details class="script-inventory"><summary>All declared npm scripts</summary><div class="table-scroll"><table><thead><tr><th>Script</th><th>Command, as declared</th></tr></thead><tbody>${Object.entries(D.scripts).map(([name,cmd])=>`<tr><td><code>${esc(name)}</code></td><td><code>${esc(cmd)}</code></td></tr>`).join('')}</tbody></table></div><p>Inventory only. Repository policy freezes schema changes and reserves migration execution for the deployment build; the presence of a script does not override that rule.</p></details>`;
  }
  function about() {
    return `${head('ABOUT THIS GUIDE','A map you can<br><em>check against the terrain.</em>','Built from the local Standkreis Dex repository. This guide runs as static files without network access, a database or API keys.')}<article class="note-card about-card"><h2>What is generated?</h2><p>Every Prisma model and field, enum, router procedure, route entry, direct npm dependency, indexed source import and exported TypeScript type is extracted by app/scripts/architecture/build.mjs. Explanatory chapters are curated from source inspection.</p><h2>What does this snapshot represent?</h2><p>${esc(D.scope)} Captured ${esc(stamp)}, based on commit ${esc(D.commit)} plus local changes. Generated source metadata can be refreshed; curated explanations should be reviewed when behavior changes.</p><h2>Refresh the source inventory</h2><pre>node app/scripts/architecture/build.mjs</pre><h2>Open or serve the guide</h2><p>Open index.html directly, or from the repository root run:</p><pre>python3 -m http.server 4173 --bind 127.0.0.1 --directory docs/architecture</pre><p>Then visit http://localhost:4173. The site embeds selected source text for inspection. It is kept under docs, outside the application’s public assets.</p><h2>What is excluded?</h2><p>Environment files and credentials, user data, generated Prisma code, binary assets, ETL datasets and answer runs are not embedded. Selected public project docs are included. Dependency versions describe this lockfile; deployment status and provider availability are not verified.</p><h2>How to navigate</h2><p>Use the chapter links, select diagram nodes, follow a journey one step at a time, or search with ⌘K / Ctrl+K. Source views support line-number links; Escape closes a dialog. Browser back and forward restore chapter navigation.</p></article>`;
  }
  const views={overview,system:systemMap,models,journeys,pipeline,dependencies,code,operations,about};
  function render() {
    $('#main').innerHTML=views[state.view]();
    $('#breadcrumb').textContent=`THE CODEBASE / ${C.chapters.find(x=>x[0]===state.view)?.[2].toUpperCase()||'ABOUT THIS GUIDE'}`;
    document.querySelectorAll('[data-nav]').forEach(el=>{const active=el.dataset.nav===state.view;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    document.title=`${C.chapters.find(x=>x[0]===state.view)?.[2]||'About'} · Inside the Atlas`;
    fitSystemMap();
  }
  function fitSystemMap(){
    const canvas=$('.system-canvas');if(!canvas)return;
    const scale=Math.min(1,Math.max(.8,canvas.parentElement.clientWidth/920));
    canvas.style.transform=`scale(${scale})`;
    canvas.style.marginRight=`${920*(scale-1)}px`;
    canvas.style.marginBottom=`${515*(scale-1)}px`;
    canvas.parentElement.style.minHeight=`${515*scale}px`;
  }
  function navigate(view) { if(!views[view])return; if(state.view!==view){stopPlay();location.hash=view;}else render(); }
  function stopPlay(){clearInterval(playTimer);state.playing=false;}
  function openSource(path,line=1) {
    const f=fileOf(path);if(!f)return;
    $('#source-title').textContent=path;
    const reverse=D.files.filter(x=>x.imports.some(i=>i.target===path));
    $('#source-meta').innerHTML=`<span>${f.lines} lines</span><span>${f.imports.length} imports</span><span>${reverse.length} indexed dependents</span>${reverse.length?`<details><summary>Imported by</summary>${reverse.map(r=>source(r.path)).join('')}</details>`:''}${f.imports.length?`<details><summary>Imports</summary>${f.imports.map(i=>i.target?source(i.target,1,i.specifier):`<code>${esc(i.specifier)}</code>`).join('')}</details>`:''}`;
    $('#source-code').innerHTML=f.text.split('\n').map((s,i)=>`<div class="source-line ${i+1===Number(line)?'highlight':''}" id="source-L${i+1}"><span class="line-number">${i+1}</span><code>${esc(s)||' '}</code></div>`).join('');
    if(!$('#source-dialog').open)$('#source-dialog').showModal();
    requestAnimationFrame(()=>$('#source-code').scrollTop=Math.max(0,(Number(line)-1)*22-90));
  }
  function search(q) {
    const query=q.toLowerCase().trim();
    if(!query){$('#search-results').innerHTML=`<p class="search-help">Try “Sighting”, “identity.progress”, “offline”, “Prisma” or a filename.</p>${C.chapters.slice(1).map(([id,,name,desc])=>`<button class="search-result" data-search-view="${id}"><span>${name}</span><small>${desc} · Chapter</small></button>`).join('')}`;return;}
    const items=[];
    D.models.filter(m=>`${m.name} ${modelInfo(m.name).join(' ')}`.toLowerCase().includes(query)).forEach(m=>items.push(`<button class="search-result" data-search-model="${m.name}"><span>${m.name}</span><small>Database model · ${m.fields.length} fields</small></button>`));
    allProcedures().filter(p=>p.full.toLowerCase().includes(query)).forEach(p=>items.push(`<button class="search-result" data-source="${p.path}" data-line="${p.line}"><span>${p.full}</span><small>${p.kind} · API procedure</small></button>`));
    D.dependencies.filter(p=>`${p.name} ${C.packageRoles[p.name]||''}`.toLowerCase().includes(query)).forEach(p=>items.push(`<button class="search-result" data-package="${p.name}"><span>${p.name}</span><small>Package · ${esc(C.packageRoles[p.name]||'Declared dependency')}</small></button>`));
    C.services.filter(s=>s.join(' ').toLowerCase().includes(query)).forEach(s=>items.push(`<button class="search-result" data-source="${s[3]}"><span>${s[0]}</span><small>External service · ${s[1]}</small></button>`));
    D.files.filter(f=>f.path.toLowerCase().includes(query)).forEach(f=>items.push(`<button class="search-result" data-source="${f.path}"><span>${esc(f.path)}</span><small>Source file · ${f.lines} lines</small></button>`));
    D.files.flatMap(f=>f.types.filter(t=>t.name.toLowerCase().includes(query)).map(t=>({t,f}))).forEach(({t,f})=>items.push(`<button class="search-result" data-source="${f.path}" data-line="${t.line}"><span>${t.name}</span><small>TypeScript type · ${esc(f.path)}</small></button>`));
    $('#search-results').innerHTML=items.slice(0,70).join('')||empty('No matches. Try a model, package, procedure or filename.');
  }
  function openSearch(){search('');$('#global-search').value='';$('#search-dialog').showModal();$('#global-search').focus();}
  function showPackage(name){
    const uses=D.files.filter(f=>f.imports.some(i=>i.specifier===name||i.specifier.startsWith(`${name}/`)));
    $('#source-title').textContent=`${name} · indexed imports`;
    $('#source-meta').innerHTML=`<p>${esc(C.packageRoles[name]||'Declared dependency')} ${uses.length} direct importing files in this snapshot. CLI, configuration and transitive usage may not appear as imports.</p>`;
    $('#source-code').innerHTML=`<div class="package-uses">${uses.map(f=>source(f.path)).join('')||empty('No direct imports in the indexed source. This package may be used by commands, build configuration or other packages.')}${source('app/package.json')}</div>`;
    if(!$('#source-dialog').open)$('#source-dialog').showModal();
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('button, a');if(!b)return;
    const d=b.dataset;
    if(d.close){$(`#${d.close}`).close();return;}
    if(d.source){openSource(d.source,Number(d.line)||1);return;}
    if(d.package){showPackage(d.package);return;}
    if(d.view){navigate(d.view);return;}
    if(d.searchView){$('#search-dialog').close();navigate(d.searchView);return;}
    if(d.model||d.searchModel){state.model=d.model||d.searchModel;if($('#search-dialog').open)$('#search-dialog').close();navigate('models');if(state.view==='models')window.scrollTo({top:0,behavior:'smooth'});return;}
    if(d.node){state.node=d.node;render();return;}
    if(d.journey){stopPlay();state.journey=d.journey;state.step=0;navigate('journeys');return;}
    if(d.step!==undefined){stopPlay();const max=C.journeys.find(j=>j.id===state.journey).steps.length-1;state.step=Math.max(0,Math.min(max,Number(d.step)));render();return;}
    if('play' in d){
      if(state.playing){stopPlay();render();return;}
      const max=C.journeys.find(j=>j.id===state.journey).steps.length-1;if(state.step===max)state.step=0;
      state.playing=true;render();playTimer=setInterval(()=>{if(state.step<max)state.step++;else stopPlay();render();},4500);return;
    }
    if(d.dependency){state.dependency=d.dependency;render();return;}
    if(d.code){state.code=d.code;navigate('code');return;}
    if(d.filePrefix){state.code='files';render();$('#code-search').value=d.filePrefix;$('#code-content').innerHTML=codeContent(d.filePrefix);return;}
    if(d.zoom){state.modelZoom=Math.max(.55,Math.min(1.5,state.modelZoom+Number(d.zoom)));$('#er-map').innerHTML=erMap(state.model);return;}
    if(b.id==='search-open')openSearch();
  });
  document.addEventListener('input',e=>{
    const t=e.target;
    if(t.id==='global-search')search(t.value);
    if(t.id==='model-search')$('#model-list').innerHTML=modelList(t.value);
    if(t.id==='dependency-search')$('#dependency-cards').innerHTML=dependencyCards(t.value);
    if(t.id==='package-search')$('#package-rows').innerHTML=packageRows(t.value);
    if(t.id==='code-search')$('#code-content').innerHTML=codeContent(t.value);
    if(t.id==='sim-month'){state.month=Number(t.value);updateSim('sim-month');}
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='sim-wildness'){state.wildness=e.target.value;updateSim('sim-wildness');}
    if(e.target.id==='sim-studied'){state.studied=e.target.checked;updateSim('sim-studied');}
  });
  function updateSim(){
    // Keep the controls mounted so a range drag or keyboard sequence retains focus.
    const fragment=document.createElement('div');fragment.innerHTML=simulator();
    $('#simulator .sim-output').replaceWith(fragment.querySelector('.sim-output'));
    $('#simulator .sim-controls label:last-child strong').textContent=fragment.querySelector('.sim-controls label:last-child strong').textContent;
  }
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$('#search-dialog').open)openSearch();}});
  for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  function fromHash(){
    const v=location.hash.slice(1)||'overview';
    if(v==='main'){$('#main').focus();return;}
    state.view=views[v]?v:'overview';stopPlay();render();window.scrollTo(0,0);
  }
  window.addEventListener('hashchange',fromHash);
  window.addEventListener('resize',fitSystemMap);
  fromHash();
})();
