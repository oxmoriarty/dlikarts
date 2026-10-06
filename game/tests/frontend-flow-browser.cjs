// Uses the installed Playwright runtime; owns its static server for reliable tests.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const mime = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ogg':'audio/ogg','.wav':'audio/wav','.glb':'model/gltf-binary' };
const server = http.createServer((req,res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  try { if (fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
    res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  } catch { res.writeHead(404).end(); }
});
(async()=>{
  await new Promise(resolve=>server.listen(4181,'127.0.0.1',resolve));
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:844,height:390}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4181/game/?racer=quang');
    const child=()=>page.frameLocator('#landscape-view');
    await child().locator('#ready-racer-art').waitFor();
    await page.waitForTimeout(1500);
    assert.match(await child().locator('#ready-racer-art').getAttribute('src'),/quang-card/);
    const bounds=await child().locator('.ready-frame').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight};});
    assert.ok(bounds.x>=0 && bounds.y>=0 && bounds.right<=bounds.w && bounds.bottom<=bounds.h);
    await child().locator('#ready-back').click();
    await child().locator('#racers-panel').waitFor({state:'visible'});
    await child().locator('[data-racer=retree]').click();
    await child().locator('#launch-game').click();
    await child().locator('#ready-racer-art').waitFor();
    await page.waitForTimeout(1200);
    assert.match(await child().locator('#ready-racer-art').getAttribute('src'),/retree-card/);
    // Exercise the production results UI using a fixture, without running a full race.
    let frame=page.frames().find(f=>f.url().includes('/game/?'));
    await frame.evaluate(async()=>{
      document.querySelector('#start').classList.add('hidden');
      const {UI}=await import('./ui/UI.js');
      new UI().update({state:'RESULTS',racers:Array(5),time:92,displayCountdown:''},
        {position:1,lap:3,bestLap:29,nextGate:7,kart:{speed:0,item:null,driftCharge:0,boostTimer:0,tuning:{driftTiers:[]}}},
        {fps:60,ms:16,calls:0,triangles:0,geometries:0,textures:0});
    });
    await child().locator('#results.show').waitFor();
    assert.equal(await child().locator('.results-actions > *').count(),3);
    await page.screenshot({path:path.join(root,'docs/results-mobile-preview.png')});
    await child().locator('#change-racer').click();
    await child().locator('#racers-panel').waitFor({state:'visible'});
    frame=page.frames().find(f=>f.url().includes('/landing/'));
    await frame.waitForFunction(()=>document.querySelector('[data-racer=retree]')?.getAttribute('aria-pressed')==='true');
    assert.equal(await child().locator('[data-racer=retree]').getAttribute('aria-pressed'),'true');
    await child().locator('#launch-game').click();
    await child().locator('#ready-racer-art').waitFor();
    frame=page.frames().find(f=>f.url().includes('/game/?'));
    await frame.waitForFunction(()=>document.querySelector('#start-race')?.disabled===false);
    await frame.evaluate(()=>{document.querySelector('#start').classList.add('hidden');document.querySelector('#results').classList.add('show');});
    await Promise.all([frame.waitForNavigation(),child().locator('#retry').click()]);
    await child().locator('#ready-racer-art').waitFor();
    frame=page.frames().find(f=>f.url().includes('/game/?'));
    await frame.waitForFunction(()=>document.querySelector('#start-race')?.disabled===false);
    assert.ok(frame.url().includes('racer=retree'));
    await frame.evaluate(()=>{document.querySelector('#start').classList.add('hidden');document.querySelector('#results').classList.add('show');});
    await child().locator('#results-exit').click();
    await child().locator('#menu-screen').waitFor({state:'visible'});
    frame=page.frames().find(f=>f.url().includes('/landing/'));
    assert.equal(new URL(frame.url()).searchParams.get('panel'),null);
    assert.deepEqual(errors,[]);
    console.log('PASS: mobile fit, selected artwork, ready back, reselect, results UI, change-racer return, replay and exit; no page errors');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
