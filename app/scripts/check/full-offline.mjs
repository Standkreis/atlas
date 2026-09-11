// Explicit downloader on a small real region. Transport/storage faults stay inside owned Chrome.
import assert from 'node:assert/strict'
import { browserJourney, q } from './journey.mjs'

const [base = 'http://localhost:3002', locale = 'en'] = process.argv.slice(2)
await browserJourney(base, async ({ send, evaluate, wait, click, viewport, requests }) => {
  await viewport(locale === 'en' ? 390 : 1280)
  await send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin: base })
  await send('Page.navigate', { url: `${base}/${locale}/onboarding` })
  await wait(`${q('[data-testid=welcome-next]')} && Object.keys(${q('[data-testid=welcome-next]')}).some(k => k.startsWith('__reactProps'))`)
  await click('[data-testid=welcome-next]')
  const search = async name => {
    await wait(q('[data-testid=region-search]'))
    await evaluate(`(() => { const i = ${q('[data-testid=region-search]')}; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(name)}); i.dispatchEvent(new Event('input',{bubbles:true})) })()`)
    await wait(`${q('[data-testid=region-result]')}?.textContent.includes(${JSON.stringify(name)})`)
    return evaluate(`${q('[data-testid=region-result]')}.dataset.region`)
  }
  const regionId = await search('Sonneberg')
  await click('[data-testid=region-result]'); await click('[data-testid=region-next]'); await click('[data-testid=tiles-next]')
  await click('[data-testid=ready-next]'); await click('[data-testid=go]'); await wait(q('[data-testid=grid]'))
  await click('[data-testid=tab-you]'); await wait(q('[data-testid=offline-download]'))
  await wait('!!navigator.serviceWorker.controller')
  await wait(`JSON.parse(localStorage.getItem('dex.queries')||'null')?.json?.clientState?.queries?.some(q=>q.queryKey[0].join('.')==='dex.set'&&q.state.data?.species?.length)`)
  const pack = await evaluate(`(() => {
    const queries=JSON.parse(localStorage.getItem('dex.queries')).json.clientState.queries;
    const set=queries.find(q=>q.queryKey[0].join('.')==='dex.set'&&q.state.data?.species?.length).state.data;
    const me=queries.find(q=>q.queryKey[0].join('.')==='identity.me').state.data;
    const urls=[...new Set(set.species.map(t=>t.leadSmall??t.lead?.url??null).filter(Boolean))].sort();
    const version=encodeURIComponent(me.catalogueVersion).replaceAll('%','_');
    return {urls,taxa:set.species.length,withoutImage:set.species.filter(t=>!(t.leadSmall??t.lead?.url)).length,
      cache:'dex-pack-v2-'+version+'-'+me.region.id,marker:'dex.offline.ready.v2.'+version+'.'+me.region.id};
  })()`)
  assert.ok(pack.urls.length > 0 && pack.urls.length <= pack.taxa)
  const state = () => evaluate(`(async () => {
    const p=${JSON.stringify(pack)},names=(await caches.keys()).filter(n=>n.startsWith('dex-pack-'));
    const entries=names.includes(p.cache)?await(await caches.open(p.cache)).keys():[];
    let bytes=0,ok=0; for(const k of entries){const r=await(await caches.open(p.cache)).match(k);if(r.ok)ok++;bytes+=(await r.arrayBuffer()).byteLength}
    const marker=JSON.parse(localStorage.getItem(p.marker)||'null');
    return {names,urls:entries.map(k=>k.url).sort(),bytes,ok,marker,status:${q('[data-testid=offline-download]')}?.dataset.status,line:${q('[data-testid=offline-download-line]')}?.textContent};
  })()`)
  const noPack = async () => assert.equal(await evaluate(`(async()=>!(await caches.keys()).some(n=>n.startsWith('dex-pack-'))&&!Object.keys(localStorage).some(n=>n.startsWith('dex.offline.ready.')))()`), true)
  await noPack()
  const estimate = (await state()).line
  await click('[data-testid=change-region]'); await click('[data-testid=region-add]')
  const secondRegion = await search('Hamburg')
  await click('[data-testid=region-result]'); await wait(`document.querySelectorAll('[data-testid=region-row]').length===2`)
  await click(`[data-testid=region-row][data-region="${secondRegion}"] [data-testid=region-pick]`)
  await wait(`!${q('[data-testid=region-sheet]')}`); await noPack()
  await click('[data-testid=change-region]'); await click(`[data-testid=region-row][data-region="${regionId}"] [data-testid=region-pick]`)
  await wait(`!${q('[data-testid=region-sheet]')}`); await noPack()
  await wait(`${q('[data-testid=offline-download-line]')}?.textContent===${JSON.stringify(estimate)}`)
  const workers=[]
  for(const target of (await send('Target.getTargets')).targetInfos.filter(t=>t.type==='service_worker'&&t.url.startsWith(base))) {
    const {sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true})
    workers.push(sessionId);await send('Network.enable',{},sessionId)
  }
  assert.ok(workers.length)
  // Hold the actual downloader's fetches until Cancel is clicked, without replacing responses.
  await evaluate(`(() => { const original=window.fetch; window.__releasePack=null; const gate=new Promise(r=>window.__releasePack=r); const urls=${JSON.stringify(pack.urls)}; window.fetch=async(...args)=>{if(urls.includes(String(args[0])))await gate;return original(...args)};window.__restorePackFetch=()=>{window.fetch=original} })()`)
  requests.clear()
  await click('[data-testid=offline-download-button]')
  await wait(`${q('[data-testid=offline-download]')}.dataset.status==='running'`)
  await click('[data-testid=offline-download-button]')
  await evaluate('window.__releasePack();window.__restorePackFetch()')
  await wait(`${q('[data-testid=offline-download]')}.dataset.status==='stopped'`, 'cancel settles after in-flight requests', 120000)
  assert.equal((await state()).marker, null)
  const cancelled = await state()
  assert.ok(cancelled.urls.length < pack.urls.length)
  // Throw the same browser exception as a full storage quota, without consuming disk space.
  await evaluate(`(() => { const put=Cache.prototype.put;Cache.prototype.put=async()=>{throw new DOMException('Injected quota failure','QuotaExceededError')};window.__restorePackPut=()=>{Cache.prototype.put=put} })()`)
  await click('[data-testid=offline-download-button]')
  await wait(`${q('[data-testid=offline-download]')}.dataset.status==='failed'`, 'quota failure is visible', 120000)
  assert.equal((await state()).marker, null)
  await evaluate('window.__restorePackPut()')
  const saved = (await state()).urls
  const missing = pack.urls.find(url=>!saved.includes(url))
  assert.ok(missing)
  const block = async urls => { await send('Network.setBlockedURLs',{urls});for(const worker of workers)await send('Network.setBlockedURLs',{urls},worker) }
  const blocked=['*api.gbif.org/*','*tile.openstreetmap.org/*',`${base}/api/tiles/*`]
  // Eliminate a successful opportunistic worker copy for the selected failing response.
  await evaluate(`(async()=>{if(await caches.has('dex-images'))await(await caches.open('dex-images')).delete(${JSON.stringify(missing)})})()`)
  await block([...blocked,missing]); await click('[data-testid=offline-download-button]')
  await wait(`${q('[data-testid=offline-download]')}.dataset.status==='failed'`, 'transport failure is visible', 120000)
  assert.equal((await state()).marker, null)
  await block(blocked); await click('[data-testid=offline-download-button]')
  await wait(`${q('[data-testid=offline-download]')}.dataset.status==='ready'`, 'actual explicit download completes', 240000)
  const complete = await state()
  assert.deepEqual(complete.urls,pack.urls); assert.equal(complete.ok,pack.urls.length)
  assert.deepEqual(complete.names,[pack.cache]);assert.equal(complete.marker.version,2);assert.deepEqual(complete.marker.urls,pack.urls)
  const leads=[...requests.values()].filter(r=>pack.urls.includes(r.url))
  console.log(JSON.stringify({explicitPack:{locale,region:'Sonneberg',taxa:pack.taxa,imageLess:pack.withoutImage,uniqueLeads:pack.urls.length,estimate,storedResponseBytes:complete.bytes,pageAttempts:leads.filter(r=>!r.worker).length,upstreamCompleted:leads.filter(r=>!r.cached&&r.completed).length,upstreamEncodedBytes:leads.filter(r=>!r.cached).reduce((n,r)=>n+r.bytes,0),measurement:'incremental cancel/quota/transport/resume; cached SW responses excluded',cancelledAfter:cancelled.urls.length}}))
  await evaluate(`(async()=>{const p=${JSON.stringify(pack)};await(await caches.open(p.cache)).delete(p.urls[0]);if(await caches.has('dex-images'))await(await caches.open('dex-images')).delete(p.urls[0]);document.dispatchEvent(new Event('visibilitychange'))})()`)
  await wait(`${q('[data-testid=offline-download]')}.dataset.status==='idle'`, 'evicted response invalidates readiness')
  await click('[data-testid=offline-download-button]');await wait(`${q('[data-testid=offline-download]')}.dataset.status==='ready'`, 'eviction repairs',120000)
  assert.deepEqual((await state()).urls,pack.urls)
  await click('[data-testid=tab-dex]');await wait(q('[data-testid=grid] a'));await send('Page.reload');await wait(q('[data-testid=grid] a'))
  const cells=await evaluate(`document.querySelectorAll('[data-testid=grid] [data-taxon]').length`)
  await evaluate(`(async()=>{if(await caches.has('dex-images'))for(const url of ${JSON.stringify(pack.urls)})await(await caches.open('dex-images')).delete(url)})()`)
  const network=async offline=>{const p={offline,latency:0,downloadThroughput:-1,uploadThroughput:-1};await send('Network.emulateNetworkConditions',p);for(const w of workers)await send('Network.emulateNetworkConditions',p,w)}
  await network(true)
  assert.equal(await evaluate(`fetch('/api/trpc/identity.me').then(()=>false,()=>true)`),true)
  await send('Page.reload');await wait(q('[data-testid=grid] a'))
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid=grid] [data-taxon]').length`),cells)
  await wait(`[...document.querySelectorAll('[data-testid=grid] img')].some(i=>i.naturalWidth>0)`)
  await click('[data-testid=tab-you]');await wait(`${q('[data-testid=offline-download]')}.dataset.status==='ready'`)
  await network(false);await evaluate(`window.dispatchEvent(new Event('online'))`)
  await wait(`fetch('/api/health').then(r=>r.ok,()=>false)`)
  console.log(JSON.stringify({offlineJourney:'pass',locale,cancelResume:true,quotaFailure:true,transportFailure:true,evictionRepair:true,pageAndWorkerOffline:true,reconnect:true,secondRegionImplicitPack:false}))
})
