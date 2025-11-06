// tools/rs-map-exporter.js
// Usage in rs-map-viewer (live viewer page):
// 1) Open de viewer (je fork), ga naar een boss room.
// 2) Open DevTools console, plak dit script, Enter.
// 3) Keys: B = Boss name · S = Start corner · E = End corner · P = Preview · D = Download · X = Reset
(function () {
  const W = window, D = document;
  const THREE = W.THREE || W.three || W._THREE;
  if (!THREE) { alert("THREE not found. Open the actual WebGL viewer page."); return; }
  let renderer = W.renderer || (W.app && W.app.renderer) || (W.viewer && W.viewer.renderer);
  let scene    = W.scene    || (W.app && W.app.scene)    || (W.viewer && W.viewer.scene);
  let camera   = W.camera   || (W.app && W.app.camera)   || (W.viewer && W.viewer.camera);
  if (!renderer) { for (const k of Object.keys(W)) { const v=W[k]; if (v && v.domElement && v.render) { renderer=v; break; } } }
  if (!scene)    { for (const k of Object.keys(W)) { const v=W[k]; if (v && v.isScene) { scene=v; break; } } }
  if (!camera)   { for (const k of Object.keys(W)) { const v=W[k]; if (v && (v.isCamera||v.isPerspectiveCamera||v.isOrthographicCamera)) { camera=v; break; } } }
  if (!renderer || !scene || !camera) { alert("Could not find renderer/scene/camera on this page."); return; }

  const overlay = D.createElement('div');
  overlay.style = 'position:fixed;top:10px;right:10px;z-index:999999;background:rgba(0,0,0,.7);color:#fff;font:12px/1.3 monospace;padding:10px 12px;border-radius:10px';
  overlay.innerHTML = '<div><b>RS Map Exporter</b></div><div>Keys: [B]oss [S]tart [E]nd [P]review [D]ownload [X]reset</div><div id="rsme-status">Status: ready</div>';
  D.body.appendChild(overlay);
  const statusEl = overlay.querySelector('#rsme-status');
  const setStatus = t => statusEl.textContent = 'Status: ' + t;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  function getCanvas(){ return renderer.domElement || D.querySelector('canvas'); }
  function toMouseNDC(evt){ const c=getCanvas(); const r=c.getBoundingClientRect(); mouse.x=((evt.clientX-r.left)/r.width)*2-1; mouse.y=-((evt.clientY-r.top)/r.height)*2+1; }
  function guessMeshes(){ const m=[]; scene.traverse(o=>{ if(o.isMesh&&o.geometry) m.push(o); }); m.sort((a,b)=>{ const ca=a.geometry.index? a.geometry.index.count : (a.geometry.attributes.position?.count||0); const cb=b.geometry.index? b.geometry.index.count : (b.geometry.attributes.position?.count||0); return cb-ca; }); return m; }
  const ground = guessMeshes();

  let bossName='UnknownBoss', startWorld=null, endWorld=null, awaiting=null, previewOn=false, previewLayer=null;

  function pickPoint(evt){
    toMouseNDC(evt); raycaster.setFromCamera(mouse,camera);
    const hits = raycaster.intersectObjects(ground,true);
    return hits && hits.length ? hits[0].point.clone() : null;
  }
  function snapTile(v){ return { x:Math.round(v.x), y:Math.round(v.y), z:Math.round(v.z) }; }
  function onClick(evt){
    if(!awaiting) return;
    const p = pickPoint(evt); if(!p){ setStatus('No ground hit'); return; }
    const sn = snapTile(p);
    if(awaiting==='start'){ startWorld=sn; setStatus(`Start=(${sn.x},${sn.y})`); }
    if(awaiting==='end'){ endWorld=sn; setStatus(`End=(${sn.x},${sn.y})`); }
    awaiting=null; evt.preventDefault(); evt.stopPropagation();
  }
  function makePreview(){
    if(!startWorld||!endWorld) return null;
    const minX=Math.min(startWorld.x,endWorld.x), maxX=Math.max(startWorld.x,endWorld.x);
    const minY=Math.min(startWorld.y,endWorld.y), maxY=Math.max(startWorld.y,endWorld.y);
    const tiles=[]; for(let y=minY;y<=maxY;y++){ for(let x=minX;x<=maxX;x++){ tiles.push({x,y}); } }
    return { tiles, bounds:{minX,maxX,minY,maxY} };
  }
  function togglePreview(){
    if(previewOn){ if(previewLayer?.parentNode) previewLayer.parentNode.removeChild(previewLayer); previewLayer=null; previewOn=false; setStatus('Preview off'); return; }
    const data=makePreview(); if(!data){ setStatus('Set start & end first'); return; }
    const c=getCanvas(), r=c.getBoundingClientRect();
    const div=D.createElement('div'); div.style=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;pointer-events:none;z-index:999998;border:2px dashed rgba(0,200,255,.6)`;
    D.body.appendChild(div); previewLayer=div; previewOn=true; setStatus(`Preview ${data.tiles.length} tiles`);
  }
  function downloadJSON(){
    if(!startWorld||!endWorld){ setStatus('Set start & end first'); return; }
    const data=makePreview();
    const cam = {
      type: camera.type||'Camera',
      position: camera.position? {x:camera.position.x,y:camera.position.y,z:camera.position.z}:null,
      rotation: camera.rotation? {x:camera.rotation.x,y:camera.rotation.y,z:camera.rotation.z}:null,
      fov: camera.fov||null, near: camera.near||null, far: camera.far||null
    };
    const payload = {
      boss: bossName, createdAt: new Date().toISOString(),
      grid: { cols: data.bounds.maxX-data.bounds.minX+1, rows: data.bounds.maxY-data.bounds.minY+1 },
      bounds: data.bounds, tiles: data.tiles, worldZ: startWorld.z, camera: cam
    };
    const a=D.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    a.download=`${bossName.replace(/\s+/g,'_')}-tilemap.json`; D.body.appendChild(a); a.click(); a.remove(); setStatus('Downloaded JSON');
  }
  function onKey(evt){
    if(evt.key==='S'||evt.key==='s'){ awaiting='start'; setStatus('Click start corner'); }
    else if(evt.key==='E'||evt.key==='e'){ awaiting='end'; setStatus('Click end corner'); }
    else if(evt.key==='B'||evt.key==='b'){ const n=prompt('Boss name:',bossName||''); if(n){ bossName=n; setStatus('Boss='+bossName); } }
    else if(evt.key==='P'||evt.key==='p'){ togglePreview(); }
    else if(evt.key==='D'||evt.key==='d'){ downloadJSON(); }
    else if(evt.key==='X'||evt.key==='x'){ startWorld=endWorld=null; if(previewOn) togglePreview(); setStatus('Reset'); }
  }
  (renderer.domElement||D.querySelector('canvas')).addEventListener('click', onClick, true);
  W.addEventListener('keydown', onKey, true);
  setStatus('Ready (B/S/E/P/D/X)');
})();
