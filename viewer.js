const el = id => document.getElementById(id);
const model = el('model');
const angles = {Perspektif:'35deg 65deg', Ön:'0deg 90deg', Üst:'0deg 0.1deg'};
let revision = -1;
let defaultRadius = 1;
let renderError = '';
function chooseView(name) {
  model.cameraTarget = 'auto auto auto';
  model.cameraOrbit = angles[name] + ' auto';
  model.fieldOfView = 'auto';
  el('viewname').textContent = name;
  document.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('selected', b.dataset.v === name));
}
document.querySelectorAll('[data-v]').forEach(b => b.onclick = () => chooseView(b.dataset.v));
el('fit').onclick = () => chooseView('Perspektif');
el('plus').onclick = () => model.zoom(1);
el('minus').onclick = () => model.zoom(-1);
el('full').onclick = () => document.fullscreenElement ? document.exitFullscreen() : el('stage').requestFullscreen();
model.addEventListener('load', () => {
  renderError = '';
  model.jumpCameraToGoal();
  defaultRadius = model.getCameraOrbit().radius;
  el('error').textContent = '';
});
model.addEventListener('error', () => {
  renderError = 'Model açılamadı. WebGL destekli bir tarayıcı kullan ve Blender’daki dokuların erişilebilir olduğunu kontrol et.';
  el('error').textContent = renderError;
});
model.addEventListener('camera-change', event => {
  el('percent').textContent = Math.round(100 * defaultRadius / model.getCameraOrbit().radius) + '%';
  if (event.detail.source === 'user-interaction') {
    el('viewname').textContent = 'Serbest görünüm';
    document.querySelectorAll('[data-v]').forEach(b => b.classList.remove('selected'));
  }
});
async function sync() {
  try {
    const response = await fetch('status', {cache:'no-store'});
    if (!response.ok) throw Error();
    const info = await response.json();
    if (info.error) { el('error').textContent = info.error; return; }
    if (revision !== info.revision) {
      revision = info.revision;
      renderError = '';
      model.src = 'stand.glb?v=' + revision;
      el('name').textContent = info.name;
      el('kind').textContent = 'Blender · Dokulu model';
    }
    el('error').textContent = renderError;
  } catch {
    el('error').textContent = 'Blender bağlantısı kesildi. Blender’dan önizlemeyi tekrar açabilirsin.';
  } finally {
    setTimeout(sync, 1500);
  }
}
async function loadParts() {
  const parts = model.dataset.parts.split(',');
  const buffers = [];
  try {
    for (const [index, file] of parts.entries()) {
      el('error').textContent = 'Stand yükleniyor · ' + (index + 1) + ' / ' + parts.length;
      const response = await fetch(file);
      if (!response.ok) throw Error(file);
      buffers.push(await response.arrayBuffer());
    }
    const url = URL.createObjectURL(new Blob(buffers, { type: 'model/gltf-binary' }));
    const release = () => URL.revokeObjectURL(url);
    model.addEventListener('load', release, {once:true});
    model.addEventListener('error', release, {once:true});
    model.src = url;
  } catch (error) {
    el('error').textContent = 'Model parçası yüklenemedi: ' + error.message;
  }
}
customElements.whenDefined('model-viewer').then(() => {
  if (model.dataset.parts) loadParts();
  else if (!model.hasAttribute('src')) sync();
});
