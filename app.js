/* ── Lightbox evidencia ──────────────────────────────────── */
(function initEvLightbox_() {
  const lb      = document.getElementById('ev-lightbox');
  const lbImg   = document.getElementById('ev-lightbox-img');
  const lbClose = document.getElementById('ev-lightbox-close');
  if (!lb || !lbImg) return;

  window.openEvLightbox_ = function(src) {
    lbImg.src = src;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  window.closeEvLightbox_ = function() {
    lb.classList.remove('open');
    lbImg.src = '';
    document.body.style.overflow = '';
  };

  lb.addEventListener('click', closeEvLightbox_);
  lbClose.addEventListener('click', function(e) {
    e.stopPropagation();
    closeEvLightbox_();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && lb.classList.contains('open')) closeEvLightbox_();
  });
})();

  
/* ================== CONFIGURACIÓN ================== */
const API_BASE = 'https://script.google.com/macros/s/AKfycbxODAokpEb3RRzeVlrriddyzbYxRwcLPh2ymehmBU_iM7zx4hLCWwcuHH5mV1qcIc0xAw/exec';
const BUILDERBOT_ENDPOINT = 'https://app.builderbot.cloud/api/v2/ff37a123-12b0-4fdc-9866-f3e2daf389fb/messages';
const BUILDERBOT_API_KEY  = 'bb-7f9ef630-5cfc-4ba4-9258-5e7cecbb4f65';

/* ================== SONIDOS ================== */
const SOUNDS = {
  question: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Pay_fail_ls2aif.mp3',
  info: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Default_notification_pkp4wr.mp3',
  success: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Pay_success_t5aawh.mp3',
  error: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Low_battery_d5qua1.mp3',
  warning: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Low_battery_d5qua1.mp3',
  login: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Siri_star_g1owy4.mp3',
  logout: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Siri_End_kelv02.mp3',
  back: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Keyboard_Enter_b9k2dc.mp3',
  menu: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Namedrop_Popup_ale2zy.mp3' // ← NUEVO
};
function playSoundOnce(url){
  try{
    const a = new Audio(url);
    a.preload = 'auto';
    a.play().catch(()=>{});
  }catch(e){}
}
if (window.Swal && typeof Swal.fire === 'function'){
  const __fire = Swal.fire.bind(Swal);
  Swal.fire = function(options = {}, ...rest){
    try{
      const icon = options.icon || options.type;
      if (icon && SOUNDS[icon]) playSoundOnce(SOUNDS[icon]);
    }catch(e){}
    return __fire(options, ...rest);
  }
}

/* ================== LOADER ================== */
const loader = document.getElementById('loader');
let loadingCount = 0;
let loaderTimer = null;
// NUEVO: bandera para suprimir el loader global en flujos específicos
let suppressLoader = false;

function startLoading(){
  if (suppressLoader) return;        // si está activa, no mostrar loader global
  loadingCount++;
  if (loadingCount === 1){
    loaderTimer = setTimeout(()=>{ loader.classList.remove('hidden'); loaderTimer = null; }, 120);
  }
}
function stopLoading(){
  if (suppressLoader) return;        // si está activa, ignorar cierres
  if (loadingCount === 0) return;
  loadingCount--;
  if (loadingCount === 0){
    if (loaderTimer){ clearTimeout(loaderTimer); loaderTimer = null; }
    loader.classList.add('hidden');
  }
}

/* ================== API ================== */
async function apiGet(action, params = {}){
  startLoading();
  try{
    const url = new URL(API_BASE);
    url.search = new URLSearchParams({ action, ...params }).toString();
    const r = await fetch(url.toString(), { method: 'GET' });
    const j = await r.json();
    if(!j.ok) throw new Error(j.error || 'Error');
    return j.data;
  } finally { stopLoading(); }
}
async function apiPost(action, body = {}){
  startLoading();
  try{
    const url = API_BASE + '?action=' + encodeURIComponent(action);
    const r = await fetch(url, {
      method:'POST',
      headers: { 'Content-Type':'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if(!j.ok) throw new Error(j.error || 'Error');
    return j.data;
  } finally { stopLoading(); }
}

/* ================== BUILDERBOT ================== */
function normalizeNumber57(raw){
  let num = String(raw || '').replace(/\D/g,'');
  if(!num) return '';
  if(num.length === 10 && !num.startsWith('57')) num = '57' + num;
  if(!(num.length === 12 && num.startsWith('57'))) return '';
  return num;
}
function sendBuilderbotMessage(destino, mensaje){
  const numberField = String(destino || '').trim();
  if(!numberField){ console.warn('Destino vacío'); return; }
  fetch(BUILDERBOT_ENDPOINT, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'x-api-builderbot':BUILDERBOT_API_KEY },
    body: JSON.stringify({
      messages: { content: mensaje },
      number: numberField,
      checkIfExists: false
    })
  }).catch(err => console.warn('Error BuilderBot', err));
}

/* ================== RECUPERAR CONTRASEÑA ================== */
let RECUP_SUPERVISORES = [];

function firstTwoWordsIfMoreThan3(fullName){
  const parts = String(fullName || '')
    .trim()
    .replace(/\s+/g,' ')
    .split(' ')
    .filter(Boolean);

  if(parts.length > 3){
    return (parts[0] || '') + ' ' + (parts[1] || '');
  }
  return parts.join(' ');
}

function openRecuperarModal(){
  const modal = document.getElementById('modal-recuperar');
  if(!modal) return;

  modal.classList.remove('hidden');

  // efecto
  requestAnimationFrame(()=> modal.classList.add('open'));

  // enfoque en buscador
  const search = document.getElementById('recuperar-search');
  if(search){
    search.value = '';
    setTimeout(()=> search.focus(), 60);
  }
}

function closeRecuperarModal(){
  const modal = document.getElementById('modal-recuperar');
  if(!modal) return;

  modal.classList.remove('open');
  setTimeout(()=>{
    modal.classList.add('hidden');
  }, 180);
}

function renderRecuperarList(items){
  const wrap = document.getElementById('recuperar-list');
  if(!wrap) return;

  wrap.innerHTML = '';

  if(!items.length){
    wrap.innerHTML = '<p class="muted center" style="margin:10px 0;">No hay supervisores disponibles.</p>';
    return;
  }

  items.forEach(item=>{
    const btn = document.createElement('button');
    btn.className = 'rec-btn';
    btn.type = 'button';
    btn.textContent = item.nombre || '';

    btn.dataset.pass = item.contrasena || '';
    btn.dataset.tel  = item.telefono || '';
    btn.dataset.nom  = item.nombre || '';

    btn.addEventListener('click', async ()=>{
      playSoundOnce(SOUNDS.info);

      // IMPORTANTE: cerrar modal para que se vea la alerta
      closeRecuperarModal();

      const nombre = btn.dataset.nom || '';
      const contrasena = btn.dataset.pass || '';
      const telefonoRaw = btn.dataset.tel || '';
      const tel = normalizeNumber57(telefonoRaw);

      const rs = await Swal.fire({
        icon:'info',
        title:'Confirmación',
        text:'¿Deseas recuperar tu contraseña?',
        showConfirmButton:true,
        confirmButtonText:'Recuperar',
        showDenyButton:true,
        denyButtonText:'Cerrar'
      });

      if(rs.isConfirmed){
        if(!tel){
          Swal.fire({
            icon:'warning',
            title:'Teléfono inválido',
            text:'No se encontró un número válido para enviar la contraseña.'
          });
          return;
        }

        const nombreCorto = firstTwoWordsIfMoreThan3(nombre);

        const mensaje =
          'Hola *' + nombreCorto + '*\n' +
          'Esta es tu contraseña: *' + contrasena + '*\n' +
          '> Gobierno Digital';

        // misma lógica de envío que aprobación: BuilderBot
        sendBuilderbotMessage(tel, mensaje);

        await Swal.fire({
          icon:'success',
          title:'Contraseña enviada',
          text:'Revisa tu WhatsApp.',
          timer: 2600,
          showConfirmButton:false
        });
      }else{
        // Si el usuario cerró la alerta, devolvemos a abrir el modal (más cómodo)
        openRecuperarModal();
        renderRecuperarList(RECUP_SUPERVISORES);
      }
    });

    wrap.appendChild(btn);
  });
}

async function cargarListaSupervisoresParaRecuperar(){
  const list = await apiGet('listSupervisoresRecuperar', {});
  RECUP_SUPERVISORES = Array.isArray(list) ? list : [];
  renderRecuperarList(RECUP_SUPERVISORES);
}

/* Buscar en la lista (client-side) */
document.getElementById('recuperar-search')?.addEventListener('input', ()=>{
  const q = (document.getElementById('recuperar-search').value || '').trim().toLowerCase();
  const filtered = RECUP_SUPERVISORES.filter(x => String(x.nombre || '').toLowerCase().includes(q));
  renderRecuperarList(filtered);
});

/* Botón "Recuperar Contraseña" en Login */
document.getElementById('btn-recuperar')?.addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.question);
  await cargarListaSupervisoresParaRecuperar();
  openRecuperarModal();
});

/* Cerrar modal */
document.getElementById('recuperar-cerrar')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  closeRecuperarModal();
});

/* Cerrar al tocar fondo (backdrop) */
document.getElementById('modal-recuperar')?.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'modal-recuperar'){
    playSoundOnce(SOUNDS.back);
    closeRecuperarModal();
  }
});
  
/* ================== ESTADO ================== */
let currentUser = null;  // { cedula, supervisor, firmaId, imagenId }
let supervisorNombreCompleto = ''; // Col C

/* ================== VISTAS ================== */
function showView(id){
  for(const el of document.querySelectorAll('.view')) el.classList.remove('active');
  const v = document.getElementById(id);
  if(v) v.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ================== LOGIN ================== */
const loginCedula = document.getElementById('login-cedula');
document.getElementById('toggle-cedula').addEventListener('click', ()=>{
  const oculto = loginCedula.type === 'password';
  loginCedula.type = oculto ? 'text' : 'password';
  const nuevoIcono = oculto
    ? 'https://res.cloudinary.com/dqqeavica/image/upload/v1764084782/Ocultar_lgdxpd.png'
    : 'https://res.cloudinary.com/dqqeavica/image/upload/v1764084782/Mostrar_yymceh.png';
  const accion = oculto ? 'Ocultar' : 'Mostrar';
  document.getElementById('toggle-cedula').setAttribute('aria-label', accion + ' cédula');
  document.getElementById('toggle-cedula').innerHTML = '<img src="'+nuevoIcono+'" alt="'+accion+'">';
});
document.getElementById('btn-login').addEventListener('click', async ()=>{
 
  const cedula = (loginCedula.value||'').trim();
  if(!/^\d{6,10}$/.test(cedula)){
    Swal.fire({icon:'warning',title:'¿Deseas Iniciar Sesión?',text:'Ingresa tu Contraseña'}); return;
  }
  try{
    const res = await apiGet('loginSupervisor', { cedula });
    if(!res || !res.encontrado){
      // Preparar datos para WhatsApp (se ejecutan solo si el usuario confirma)
      const soporte = '573103230712';
      const mensaje = 'Buen día *Oscar*%0A%0ANo tengo acceso a la app de Supervisión.%0A' +
        'Mi contraseña: *' + cedula + '*%0A' +
        'Te dejo mis datos a continuación:%0A*Nombre Completo:*%0A*Celular:*';
      const esMovil = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
      const urlWA = esMovil
        ? 'whatsapp://send?phone=' + soporte + '&text=' + mensaje
        : 'https://api.whatsapp.com/send?phone=' + soporte + '&text=' + mensaje;

      // Nueva alerta con dos opciones
      const rs = await Swal.fire({
        icon: 'error',
        title: 'NO TIENES ACCESO',
        text: 'Toma una de las opciones',
        showConfirmButton: true,
        confirmButtonText: 'Solicitar Acceso',
        showDenyButton: true,
        denyButtonText: 'Rectificar / Salir'
      });

      if (rs.isConfirmed){
        // Ejecuta la acción existente: abrir WhatsApp
        window.open(urlWA, '_blank');
        await Swal.fire({
          icon: 'success',
          title: 'Se abrió WhatsApp',
          text: 'Solicita tu habilitación por ese medio.',
          timer: 6000,
          showConfirmButton: false
        });
        return;
      } else if (rs.isDenied){
        // Borra el input y cierra
        loginCedula.value = '';
        return;
      }
    }
    
    // res: { encontrado, supervisor, firmaId, imagenId }
    currentUser = { cedula, supervisor: res.supervisor || '', firmaId: res.firmaId || '', imagenId: res.imagenId || '', telefono: res.telefono || '' };
    supervisorNombreCompleto = res.supervisor || '';

    // Mostrar DRIVE HACIENDA solo para LUZ HAYDEE ORTEGA MAYORGA
    const driveHaciendaBtn = document.getElementById('go-drive-hacienda');
    if(driveHaciendaBtn){
      driveHaciendaBtn.style.display =
        supervisorNombreCompleto.toUpperCase().includes('LUZ HAYDEE ORTEGA MAYORGA')
          ? '' : 'none';
    }

     // Sonido de login al iniciar sesión
  playSoundOnce(SOUNDS.login);
    
    if(!currentUser.firmaId){
      await Swal.fire({ icon:'success', title:`${supervisorNombreCompleto} completa tu registro`, text:'Solo debes ingresar la imagen de tu firma.' });
      showView('view-completar');
    }else{
      renderInicio();
      showView('view-inicio');
    }
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});
document.getElementById('btn-logout').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.logout);
  currentUser = null; supervisorNombreCompleto = '';
  loginCedula.value = '';
  showView('view-login');
});

/* ================== INICIO ================== */
function driveThumbById(id){ return id ? ('https://drive.google.com/thumbnail?sz=w1000&id='+id) : ''; }
function renderInicio(){
  // Avatar
  const imgEl   = document.getElementById('inicio-avatar-img');
  const emojiEl = document.getElementById('inicio-avatar-emoji');
  const hasImagen = !!currentUser?.imagenId;

  // prepara handlers antes de asignar src
  imgEl.onload = () => { imgEl.style.display=''; emojiEl.style.display='none'; };
  imgEl.onerror = () => { imgEl.style.display='none'; emojiEl.style.display=''; };

  if(hasImagen){
    imgEl.style.display='none';           // oculto hasta que cargue
    emojiEl.style.display='none';         // oculto mientras intenta
    imgEl.src = driveThumbById(currentUser.imagenId);
  }else{
    imgEl.style.display='none';
    emojiEl.style.display='';
  }

  // Nombre y rol
  document.getElementById('inicio-nombre').textContent = supervisorNombreCompleto;
  const rolEl = document.getElementById('inicio-rol');
  if(rolEl) rolEl.textContent = 'SUPERVISOR(A)';

  // Firma (igual que antes)
  const firmaEl = document.getElementById('inicio-firma');
  const hasFirma = !!currentUser?.firmaId;
  if(hasFirma){
    firmaEl.src = driveThumbById(currentUser.firmaId);
    firmaEl.style.display='';
  }else{
    firmaEl.style.display='none';
  }
}

/* ================== OVERLAY MENÚ ================== */
const overlay = document.getElementById('overlay');

// Botón MENÚ: sonido 'menu' + abrir
document.getElementById('btn-open-menu').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.menu);
  overlay.classList.add('open');
});

// Botón ATRÁS dentro del panel: sonido 'back' + cerrar
document.getElementById('btn-ovl-back').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  overlay.classList.remove('open');
});

// Clic en el scrim (fondo oscuro): sonido 'back' + cerrar
document.getElementById('ovlClose').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  overlay.classList.remove('open');
});

  // Inicializar comportamiento del menú por categorías
(function initOverlayCategories(){
  const catButtons    = Array.from(document.querySelectorAll('.menu-cat-btn'));
  const catContainers = Array.from(document.querySelectorAll('.menu-cat-options'));

  function hideAllCategories(){
    catContainers.forEach(c =>{ c.style.display = 'none'; c.classList.remove('showing'); });
    catButtons.forEach(b => b.classList.remove('active'));
  }

  function showCategory(catId){
    hideAllCategories();
    const cont = document.getElementById(catId);
    const btn  = catButtons.find(b => b.dataset.cat === catId);
    if(cont){ cont.style.display = 'flex'; cont.offsetHeight; cont.classList.add('showing'); }
    if(btn)  { btn.classList.add('active'); }
  }

  catButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.cat;
      if(!id) return;
      try{ if(typeof playSoundOnce==='function') playSoundOnce(SOUNDS.back); }catch(_){}
      const cont = document.getElementById(id);
      const isOpen = cont && cont.style.display === 'flex';
      isOpen ? hideAllCategories() : showCategory(id);
    });
  });

  hideAllCategories();

  const openBtn = document.getElementById('btn-open-menu');
  if(openBtn){ openBtn.addEventListener('click', ()=>{ hideAllCategories(); }); }
})();


/* Sonido 'logout' al seleccionar cualquiera de las opciones del overlay.
   Ubicar este bucle inmediatamente después de los listeners anteriores. */
['go-actualizar','go-contratistas','go-revision','go-firmados','go-planes-pagos','go-requerimientos','go-comunicados','go-soporte', 'go-directorio', 'go-secop2', 'go-drive-hacienda']
  .forEach(id => {
    const el = document.getElementById(id);
    if(el){
      el.addEventListener('click', ()=>{
        playSoundOnce(SOUNDS.logout);
        // El overlay se cierra en cada acción (si aún no lo cierras en otro lugar)
        overlay.classList.remove('open');
      });
    }
  });

/* ================== COMPLETAR REGISTRO ================== */
// Previsualización simple (si compresión falla, usa original)
let regFirmaDataUrl = ''; let regImagenDataUrl = '';
document.getElementById('reg-firma').addEventListener('change', async (e)=>{
  const file = e.target.files && e.target.files[0];
  const prev = document.getElementById('reg-firma-preview');
  if(!file){ regFirmaDataUrl=''; prev.style.display='none'; prev.src=''; return; }
  try{
    const reader = new FileReader();
    reader.onload = ev => { regFirmaDataUrl = ev.target.result; prev.src = regFirmaDataUrl; prev.style.display='block'; };
    reader.readAsDataURL(file);
  }catch(_){
    regFirmaDataUrl=''; prev.style.display='none';
  }
});
document.getElementById('reg-imagen').addEventListener('change', async (e)=>{
  const file = e.target.files && e.target.files[0];
  const prev = document.getElementById('reg-imagen-preview');
  if(!file){ regImagenDataUrl=''; prev.style.display='none'; prev.src=''; return; }
  try{
    const reader = new FileReader();
    reader.onload = ev => { regImagenDataUrl = ev.target.result; prev.src = regImagenDataUrl; prev.style.display='block'; };
    reader.readAsDataURL(file);
  }catch(_){
    regImagenDataUrl=''; prev.style.display='none';
  }
});
document.getElementById('btn-reg-guardar').addEventListener('click', async ()=>{
  if(!currentUser){ Swal.fire({icon:'warning',title:'Sesión inválida'}); return; }
  if(!regFirmaDataUrl){ Swal.fire({icon:'warning',title:'Firma requerida'}); return; }
  try{
    const r = await apiPost('completarRegistroSupervisor', {
      cedula: currentUser.cedula,
      firmaDataUrl: regFirmaDataUrl,
      imagenDataUrl: regImagenDataUrl || ''
    });
    currentUser.firmaId = r?.firmaId || currentUser.firmaId;
    currentUser.imagenId = r?.imagenId || currentUser.imagenId;
    Swal.fire({icon:'success',title:'Registro completado',timer:1800,showConfirmButton:false});
    renderInicio(); showView('view-inicio');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});
document.getElementById('btn-reg-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-login');
});

/* ================== ACTUALIZAR ================== */
let updFirmaDataUrl=''; let updImagenDataUrl='';
document.getElementById('upd-firma').addEventListener('change', async (e)=>{
  const file = e.target.files && e.target.files[0];
  const prev = document.getElementById('upd-firma-preview');
  if(!file){ updFirmaDataUrl=''; prev.style.display='none'; prev.src=''; return; }
  try{
    const reader = new FileReader();
    reader.onload = ev => { updFirmaDataUrl = ev.target.result; prev.src = updFirmaDataUrl; prev.style.display='block'; };
    reader.readAsDataURL(file);
  }catch(_){ updFirmaDataUrl=''; prev.style.display='none'; }
});
document.getElementById('upd-imagen').addEventListener('change', async (e)=>{
  const file = e.target.files && e.target.files[0];
  const prev = document.getElementById('upd-imagen-preview');
  if(!file){ updImagenDataUrl=''; prev.style.display='none'; prev.src=''; return; }
  try{
    const reader = new FileReader();
    reader.onload = ev => { updImagenDataUrl = ev.target.result; prev.src = updImagenDataUrl; prev.style.display='block'; };
    reader.readAsDataURL(file);
  }catch(_){ updImagenDataUrl=''; prev.style.display='none'; }
});
document.getElementById('go-actualizar').addEventListener('click', ()=>{ overlay.classList.remove('open'); showView('view-actualizar'); });
document.getElementById('btn-upd-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});
document.getElementById('btn-upd-guardar').addEventListener('click', async ()=>{
  if(!currentUser){ Swal.fire({icon:'warning',title:'Sesión inválida'}); return; }
  if(!updFirmaDataUrl && !updImagenDataUrl){ Swal.fire({icon:'info',title:'Sin cambios'}); return; }
  try{
    const r = await apiPost('actualizarPerfilSupervisor', {
      cedula: currentUser.cedula,
      firmaDataUrl: updFirmaDataUrl || '',
      imagenDataUrl: updImagenDataUrl || ''
    });
    if(r?.firmaId) currentUser.firmaId = r.firmaId;
    if(r?.imagenId) currentUser.imagenId = r.imagenId;
    Swal.fire({icon:'success',title:'Perfil actualizado',timer:1800,showConfirmButton:false});
    renderInicio(); showView('view-inicio');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});

  document.getElementById('go-drive-hacienda')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  overlay.classList.remove('open');
  window.open('https://drive.google.com/drive/folders/1M6-wSvyAXzMqGSKC_oHya1j63QkgwTyZ?usp=sharing', '_blank');
});

/* ================== CONTRATISTAS ================== */
let CONTR_DATA=[];
document.getElementById('go-contratistas').addEventListener('click', async ()=>{
  overlay.classList.remove('open');
  await cargarContratistas();
  showView('view-contratistas');
});
async function cargarContratistas(){
  try{
    const list=await apiGet('listContratistasSupervisor', { supervisor: supervisorNombreCompleto });
    CONTR_DATA=Array.isArray(list)?list:[];
    pintarContratistas(CONTR_DATA);
    actualizarResumenContratistas(CONTR_DATA);
  }catch(e){
    CONTR_DATA=[]; pintarContratistas(CONTR_DATA); actualizarResumenContratistas(CONTR_DATA);
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}
function actualizarResumenContratistas(list){
  const box=document.getElementById('contr-count');
  if(!list.length){ box.style.display='none'; box.textContent=''; return; }
  box.textContent=String(list.length);
  box.style.display='inline-block';
}
function pintarContratistas(list){
  const wrap=document.getElementById('contr-list');
  wrap.innerHTML='';
  if(!list.length){ wrap.innerHTML='<p class="muted center">No hay contratistas.</p>'; return; }
  for(const c of list){
    const div=document.createElement('div'); div.className='item-card';
      // Supervisor (CM) oculto (por si necesitas usarlo luego sin reconsultar)
  const supHidden = document.createElement('input');
  supHidden.type = 'hidden';
  supHidden.className = 'plan-supervisor-cm';
  supHidden.value = String(c.supervisor || '');
  div.appendChild(supHidden);
   const header=document.createElement('div'); header.className='item-header';
const title=document.createElement('p'); title.className='item-title'; title.textContent=(c.nombre||'');
header.appendChild(title);
div.appendChild(header);

    const pNombre = document.createElement('p'); pNombre.className = 'item-sub'; pNombre.textContent = (c.nombre || ''); div.appendChild(pNombre);
    const pDoc=document.createElement('p'); pDoc.className='item-sub'; pDoc.textContent='CC / NIT: '+(c.documento||''); div.appendChild(pDoc);
    const pSec=document.createElement('p'); pSec.className='item-sub'; pSec.textContent='SECRETARÍA: '+(c.secretaria||''); div.appendChild(pSec);
    const pSup=document.createElement('p'); 
pSup.className='item-sub'; 
pSup.innerHTML='SUPERVISOR: '+(c.supervisor||'');
div.appendChild(pSup);
    div.appendChild(pSup);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'contr-actions';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'left-group';

    const rightGroup = document.createElement('div');
    rightGroup.className = 'right-group';

    // Botón grande: Mostrar detalles (queda en el grupo izquierdo)
    const btnDetalles = document.createElement('button');
    btnDetalles.textContent = 'MOSTRAR DETALLES';
    btnDetalles.addEventListener('click', ()=> {
      playSoundOnce(SOUNDS.logout);
      mostrarDetallesContratista(c.documento);
    });
    leftGroup.appendChild(btnDetalles);

    // Botón grande: Descargar Informe (queda después de MOSTRAR DETALLES en el grupo izquierdo)
   const btnDescargar = document.createElement('button');
btnDescargar.textContent = 'DESCARGAR INFORME';
btnDescargar.addEventListener('click', async ()=> {
  // Detectar móvil vs escritorio
  const isMobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
  playSoundOnce(SOUNDS.info);

  try{
    const nombre = String(c.nombre || '').trim();
    const contrato = String(c.contrato || '').trim();

    // IMPORTANTE: en PC intentamos no encadenar demasiadas esperas antes de abrir.
    // 1) Pedimos la URL al backend
    const data = await apiGet('descargarInformeContratista', {
      documento: c.documento,
      contrato: contrato,
      nombre: nombre
    });

    if(!data?.created || !data?.exportUrl){
      Swal.fire({icon:'info',title:'Sin datos para descargar'});
      return;
    }

    const url = data.exportUrl;

    if (isMobile){
      // En móvil funciona bien abrir en nueva pestaña
      window.open(url, '_blank');
    } else {
      // En escritorio: tres estrategias seguras, elige la que prefieras:

      // A) Navegar en la misma pestaña (menos bloqueo, descarga directa)
      // location.href = url;

      // B) Crear un <a> temporal y disparar click programático dentro del mismo gesto
      const a = document.createElement('a');
      a.href = url;
      a.target = '_self';           // misma pestaña ayuda a evitar bloqueo
      a.rel = 'noopener';
      // a.download = data.name || ''; // puedes probar, pero en export de Sheets no siempre respeta
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // C) Fallback con iframe oculto (evita pop‑up en algunos navegadores)
      // const iframe = document.createElement('iframe');
      // iframe.style.display = 'none';
      // iframe.src = url;
      // document.body.appendChild(iframe);
      // setTimeout(()=> document.body.removeChild(iframe), 15000);
    }
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});
leftGroup.appendChild(btnDescargar);

    // Ícono WhatsApp (grupo derecho)
    const btnWhatsapp = document.createElement('button');
    btnWhatsapp.className = 'btn-icon';
    btnWhatsapp.innerHTML = '<img src="https://res.cloudinary.com/dqqeavica/image/upload/v1759166341/WhatsApp_mljaqm.webp" alt="WhatsApp">';
    btnWhatsapp.setAttribute('aria-label','Abrir chat de WhatsApp');
    btnWhatsapp.addEventListener('click', ()=>{
      let tel=String(c.telefono||'').replace(/\D/g,'');
      if(!tel){ Swal.fire({icon:'info',title:'Sin teléfono'}); return; }
      if(!tel.startsWith('57')) tel='57'+tel;
      if(!/^57\d{10}$/.test(tel)){ Swal.fire({icon:'warning',title:'Teléfono inválido'}); return; }
      window.open('https://wa.me/'+tel,'_blank');
    });

    // Ícono Drive (grupo derecho)
    const btnDrive = document.createElement('button');
    btnDrive.className = 'btn-icon';
    btnDrive.innerHTML = '<img src="https://res.cloudinary.com/dqqeavica/image/upload/v1763997280/DRIVE_bycgsc.webp" alt="Drive">';
    btnDrive.setAttribute('aria-label','Abrir carpeta Drive');
    btnDrive.addEventListener('click', ()=>{
      if(c.carpetaContratista){
        window.open('https://drive.google.com/drive/folders/'+c.carpetaContratista,'_blank');
      } else {
        Swal.fire({icon:'info',title:'Sin carpeta'});
      }
    });

    rightGroup.appendChild(btnWhatsapp);
    rightGroup.appendChild(btnDrive);

    actionsRow.appendChild(leftGroup);
    actionsRow.appendChild(rightGroup);
    div.appendChild(actionsRow);
    wrap.appendChild(div);
  }
}
document.getElementById('contr-filter').addEventListener('input',()=>{
  const q=document.getElementById('contr-filter').value.trim().toLowerCase();
  const filtered=CONTR_DATA.filter(c=>{
    return [c.nombre,c.documento,c.secretaria,c.supervisor,c.telefono].some(v=>String(v||'').toLowerCase().includes(q));
  });
  pintarContratistas(filtered); actualizarResumenContratistas(filtered);
});
document.getElementById('contr-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== DETALLES ================== */
async function mostrarDetallesContratista(documento){
  try{
    const d=await apiGet('detallesContratistaSupervisor',{documento});
    const body=document.getElementById('detalles-body');
    body.innerHTML='';
    if(!d){ body.innerHTML='<p class="muted center">No encontrado.</p>'; }
    else {
      const lines=[
        `<b>NOMBRE:</b> ${d.nombre||''}`,
        `<b>CC / NIT:</b> ${d.documento||''} <b>de:</b> ${d.expedida||''}`,
        `<b>TELEFONO:</b> ${d.telefono||'SIN REGISTRO'}`,
        `<b>CORREO:</b> ${d.correo||'SIN REGISTRO'}`,
        `<b>CUENTA:</b> ${d.cuenta||''} ${d.tipoCuenta||''} ${d.banco||''}`,
        `<b>EPS:</b> ${d.eps||''}`,
        `<b>AFP:</b> ${d.pension||''}`,
        `<b>ARL:</b> ${d.arl||''}`,
        `<b>SECRETARÍA:</b> ${d.secretaria||''}`,
        `<b>SUPERVISOR:</b> ${d.supervisor||''}`,
        `<b>CONTRATO:</b> ${d.contrato||''} <b>de:</b> ${d.fechaContrato||''}`,
        `<b>OBJETO:</b> ${d.objeto||''}`,
        `<b>FECHA DE INICIO:</b> ${d.fechaInicio||''}`,
        `<b>FECHA DE TERMINO:</b> ${d.fechaTermino||''}`,
        `<b>VALOR INICIAL:</b> ${d.valor||''}`,
        `<b>MRA:</b> ${d.mra||''}`,
        `<b>VALOR FINAL:</b> ${d.valorFinal||''}`,
        `<b>CDP:</b> ${d.cdp||''}`,
        `<b>RP:</b> ${d.rp||''}`,
        `<b>CDP ADICIÓN:</b> ${d.cdpAdicion||''}`,
        `<b>RP ADICIÓN:</b> ${d.rpAdicion||''}`,
        `<b>REGIMEN:</b> ${d.regimen||''}`
      ];
      for(let i=1;i<=26;i++){
        const val=d['obligacion'+i];
        if(val && val!=='-'){ lines.push(`<b>OBLIGACIÓN ${i}:</b> ${val}`); }
      }
      body.innerHTML=lines.map(l=>`<p>${l}</p>`).join('');
    }
    showView('view-detalles');
  }catch(e){ Swal.fire({icon:'error',title:'Error',text:e.message}); }
}
document.getElementById('detalles-ocultar').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-contratistas');
});

/* ================== REVISIÓN ================== */
/* Convierte "dd/mm/yyyy" o "dd/mm/yyyy HH:mm:ss" a timestamp para ordenar */
function parseFechaRadicacion(str){
  if(!str) return 0;
  const s = String(str).trim();
  const partes = s.split(/\s+/);
  const fecha = (partes[0] || '').split('/');
  if(fecha.length !== 3) return 0;
  const d = parseInt(fecha[0],10);
  const m = parseInt(fecha[1],10);
  const y = parseInt(fecha[2],10);
  if(!d || !m || !y) return 0;
  let h=0, mi=0, se=0;
  if(partes[1]){
    const t = partes[1].split(':');
    h  = parseInt(t[0]||'0',10) || 0;
    mi = parseInt(t[1]||'0',10) || 0;
    se = parseInt(t[2]||'0',10) || 0;
  }
  return new Date(y, m-1, d, h, mi, se).getTime();
}

let CUENTAS_DATA=[];
document.getElementById('go-revision').addEventListener('click', async ()=>{
  overlay.classList.remove('open');
  await cargarCuentas();
  if (!CUENTAS_DATA || CUENTAS_DATA.length === 0){
    await Swal.fire({
      icon:'success',
      title:'¡Estás al día!',
      text:'No tienes CUENTAS pendientes por revisar',
      timer: 3200,
      showConfirmButton: false
    });
    showView('view-inicio');
    return;
  }
  showView('view-revision');
});
  
async function cargarCuentas(){
  try{
    const list=await apiGet('listCuentasIngresadas',{ supervisor: supervisorNombreCompleto });
    CUENTAS_DATA=Array.isArray(list)?list:[];

    // Orden por fecha de radicación (antigua → reciente)
    CUENTAS_DATA.sort((a,b)=> parseFechaRadicacion(a.fechaRadicacion) - parseFechaRadicacion(b.fechaRadicacion));

    // Priorizar a OSCAR MAURICIO POLANIA GUERRA al inicio
    const PRIORITARIO = 'OSCAR MAURICIO POLANIA GUERRA';
    CUENTAS_DATA.sort((a, b) => {
      const aPrio = String(a.nombre || '').trim().toUpperCase() === PRIORITARIO ? 0 : 1;
      const bPrio = String(b.nombre || '').trim().toUpperCase() === PRIORITARIO ? 0 : 1;
      return aPrio - bPrio;
    });

    pintarCuentas(CUENTAS_DATA);
    actualizarResumenCuentas(CUENTAS_DATA);
  }catch(e){
    CUENTAS_DATA=[]; pintarCuentas(CUENTAS_DATA); actualizarResumenCuentas(CUENTAS_DATA);
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}


function actualizarResumenCuentas(list){
  const box=document.getElementById('cuentas-count');
  if(!list.length){ box.style.display='none'; box.textContent=''; return; }
  box.textContent=String(list.length); box.style.display='inline-block';
}
function pintarCuentas(list){
  const wrap=document.getElementById('cuentas-list');
  wrap.innerHTML='';
  if(!list.length){ wrap.innerHTML='<p class="muted center">No hay cuentas.</p>'; return; }

  for(const c of list){
    const div=document.createElement('div'); div.className='item-card';

    const header=document.createElement('div'); header.className='item-header';
    const title=document.createElement('p'); title.className='item-title'; title.textContent=(c.nombre||''); header.appendChild(title);
    div.appendChild(header);

    const pDoc=document.createElement('p'); pDoc.className='item-sub'; pDoc.textContent='CC / NIT: '+(c.documento||''); div.appendChild(pDoc);
    const pInf=document.createElement('p'); pInf.className='item-sub'; pInf.textContent='INFORME: '+(c.informe||'')+' de: '+(c.totalInformes||''); div.appendChild(pInf);

    const pContrato = document.createElement('p');
pContrato.className = 'item-sub';
pContrato.textContent = 'CONTRATO: ' + (c.contrato || '');
div.appendChild(pContrato);

     // ✅ NUEVO: FECHA DE RADICACIÓN debajo de CONTRATO (rojo + latido)
    const pRad = document.createElement('p');
    pRad.className = 'item-sub rad-latido';
    pRad.textContent = 'FECHA DE RADICACIÓN: ' + (c.fechaRadicacion || '');
    div.appendChild(pRad);

    const btnRow=document.createElement('div'); btnRow.className='btn-row';

    // Botón REVISAR (como lo tienes)
    const btnRevisar=document.createElement('button'); btnRevisar.textContent='REVISAR';
    btnRevisar.addEventListener('click', ()=> {
      playSoundOnce(SOUNDS.logout);
      abrirRevisionCuenta(c.documento);
    });
    btnRow.appendChild(btnRevisar);

    div.appendChild(btnRow);
    wrap.appendChild(div);
  }
}
document.getElementById('cuentas-filter').addEventListener('input',()=>{
  const q=document.getElementById('cuentas-filter').value.trim().toLowerCase();
  const filtered=CUENTAS_DATA.filter(c=>{
    return [c.nombre,c.documento,c.contrato,c.informe,c.totalInformes].some(v=>String(v||'').toLowerCase().includes(q));
  });
  pintarCuentas(filtered); actualizarResumenCuentas(filtered);
});
document.getElementById('revision-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});



function resetToggleSections(){
  const defs = [
    ['btn-toggle-contrato','sec-contrato','Ver Información del Contrato','Ocultar Información del Contrato'],
    ['btn-toggle-informe','sec-informe','Ver Relación de Informe y Pago','Ocultar Relación de Informe y Pago'],
    ['btn-toggle-planilla','sec-planilla','Ver Relación de Planilla','Ocultar Relación de Planilla'],
    ['btn-toggle-planilla2','sec-planilla2','Ver Relación de Planilla Anexa','Ocultar Relación de Planilla Anexa'],
    ['btn-toggle-actividades','sec-actividades','Ver Relación de Actividades','Ocultar Relación de Actividades']
  ];
  defs.forEach(([btnId,secId,showTxt,hideTxt])=>{
    const sec=document.getElementById(secId); const btn=document.getElementById(btnId);
    if(sec) sec.classList.add('hidden'); if(btn) btn.textContent=showTxt;
  });
}
(function bindToggles(){
  const defs = [
    ['btn-toggle-contrato','sec-contrato','Ver Información del Contrato','Ocultar Información del Contrato'],
    ['btn-toggle-informe','sec-informe','Ver Relación de Informe y Pago','Ocultar Relación de Informe y Pago'],
    ['btn-toggle-planilla','sec-planilla','Ver Relación de Planilla','Ocultar Relación de Planilla'],
    ['btn-toggle-planilla2','sec-planilla2','Ver Relación de Planilla Anexa','Ocultar Relación de Planilla Anexa'],
    ['btn-toggle-actividades','sec-actividades','Ver Relación de Actividades','Ocultar Relación de Actividades']
  ];
  defs.forEach(([btnId,secId,showTxt,hideTxt])=>{
    const sec=document.getElementById(secId); const btn=document.getElementById(btnId);
    if(!btn || !sec) return; if(btn.dataset.bound) return; btn.dataset.bound='1';
    btn.addEventListener('click',()=>{
      const visible=!sec.classList.contains('hidden');
      if(visible){ sec.classList.add('hidden'); btn.textContent=showTxt; }
      else{ sec.classList.remove('hidden'); btn.textContent=hideTxt; }
    });
  });
})();

let REV_CUENTA=null;
async function abrirRevisionCuenta(documento){
  try{
    const data = await apiGet('revisarCuentaDataSupervisor', {
  documento,
  supervisor: supervisorNombreCompleto
});
    if(!data){ Swal.fire({icon:'info',title:'No encontrado'}); return; }
    REV_CUENTA=data;
    resetToggleSections();
    renderRevisionCuenta();
    showView('view-revisar-cuenta');
  }catch(e){ Swal.fire({icon:'error',title:'Error',text:e.message}); }
}
function formatInfoList(arr){ return arr.map(x=>`<p>${x}</p>`).join(''); }
function renderRevisionCuenta(){
  const c=REV_CUENTA?.contratista; const cu=REV_CUENTA?.cuenta;
  document.getElementById('rc-title').textContent='REVISIÓN DE CUENTA N° '+(cu?.informe||'')+' de '+(c?.nombre||'');
  const obsEl = document.getElementById('rc-observaciones');
  if (obsEl) obsEl.value = '';
  const rcBody=document.getElementById('rc-body');
  rcBody.innerHTML = formatInfoList([ `<b>DOCUMENTO:</b> ${c?.documento||''}`, `<b>SECRETARÍA:</b> ${c?.secretaria||''}`, `<b>SUPERVISOR:</b> ${c?.supervisor||''}` ]);

  document.getElementById('sec-contrato').innerHTML = formatInfoList([
    `<b>CONTRATO N°:</b> ${c?.contrato||''}`,
    `<b>OBJETO:</b> ${c?.objeto||''}`,
    `<b>FECHA DE CONTRATO:</b> ${c?.fechaContrato||''}`,
    `<b>FECHA DE INICIO:</b> ${c?.fechaInicio||''}`,
    `<b>FECHA DE TERMINO:</b> ${c?.fechaTermino||''}`,
    `<b>VALOR INICIAL:</b> ${c?.valor || '-'}`,
    `<b>MRA:</b> ${c?.mra||''}`,
    `<b>VALOR FINAL:</b> ${c?.valorFinal||''}`,
    `<b>CDP:</b> ${c?.cdp||''}`,
    `<b>RP:</b> ${c?.rp||''}`,
    `<b>CDP ADICIÓN:</b> ${c?.cdpAdicion||''}`,
    `<b>RP ADICIÓN:</b> ${c?.rpAdicion||''}`,
    `<b>SECRETARÍA:</b> ${c?.secretaria||''}`,
    `<b>SUPERVISOR:</b> ${c?.supervisor||''}`,
  ]);

 document.getElementById('sec-informe').innerHTML = [
    `<h4 style="margin:4px 0;color:var(--primary)">RELACIÓN DE INFORME</h4>`,
    `<p><b>FECHA DE RADICACIÓN:</b> ${cu?.fechaRadicacion||''}</p>`,
    `<p><b>INFORME:</b> ${cu?.informe||''} de ${cu?.totalInformes||''}</p>`,
    `<p><b>INICIO DE PERIODO RATIFICADO:</b> ${cu?.inicioRatificar||''}</p>`,
    `<p><b>FIN DE PERIODO RATIFICADO:</b> ${cu?.finRatificar||''}</p>`,
    `<h4 style="margin:14px 0 4px;color:var(--primary)">RELACIÓN DE PAGO</h4>`,
    `<p><b>N° FACTURA DIGITAL:</b> ${cu?.facturaDigital || 'N/A'}</p>`,
    `<p><b>SALDO ACTUAL:</b> ${cu?.saldoActual||''}</p>`,
    `<p><b>VALOR COBRADO:</b> ${cu?.menos||''}</p>`,
    `<p><b>NUEVO SALDO:</b> ${cu?.nuevoSaldo||''}</p>`
  ].join('');

  document.getElementById('sec-planilla').innerHTML = [
    `<h4 style="margin:4px 0;color:var(--primary)">RELACIÓN DE PLANILLA</h4>`,
    `<p><b>PLANILLA N°:</b> ${cu?.planilla||''} de ${cu?.mesPlanilla||''}</p>`,
    `<p><b>BASE DE COTIZACIÓN:</b> ${cu?.base||''}</p>`,
    `<p><b>APORTES A SALUD:</b> ${cu?.salud||''}</p>`,
    `<p><b>APORTES A PENSIÓN:</b> ${cu?.fondo||''}</p>`,
    `<p><b>APORTES A ARL:</b> ${cu?.riesgos||''}</p>`,
    `<p><b>APORTES FPS:</b> ${cu?.solidario||''} ${cu?.aporte||''}</p>`
  ].join('');

  document.getElementById('sec-planilla2').innerHTML = [
    `<h4 style="margin:4px 0;color:var(--primary)">RELACIÓN DE PLANILLA ANEXA</h4>`,
    `<p><b>PLANILLA ANEXA N°:</b> ${cu?.planilla2||''} de ${cu?.mesPlanilla2||''}</p>`,
    `<p><b>BASE DE COTIZACIÓN:</b> ${cu?.base2||''}</p>`,
    `<p><b>APORTES A SALUD:</b> ${cu?.salud2||''}</p>`,
    `<p><b>APORTES A PENSIÓN:</b> ${cu?.fondo2||''}</p>`,
    `<p><b>APORTES A ARL:</b> ${cu?.riesgos2||''}</p>`,
    `<p><b>APORTES FPS:</b> ${cu?.solidario2||''} ${cu?.aporte2||''}</p>`
  ].join('');

  const blocksWrap=document.getElementById('actividades-blocks');
  blocksWrap.innerHTML='';
  const actividades=REV_CUENTA?.actividades||[];
  const evidencias=REV_CUENTA?.evidencias||[];
  const obligaciones=REV_CUENTA?.obligaciones||[];
  const total=obligaciones.length;
  function extraerDriveId(url){
    if(!url) return '';
    const primera=String(url).trim().split(/\s+/)[0];
    const patrones=[ /\/d\/([A-Za-z0-9_-]{10,})/, /id=([A-Za-z0-9_-]{10,})/, /\/file\/d\/([A-Za-z0-9_-]{10,})/, /open\?[^#]*id=([A-Za-z0-9_-]{10,})/ ];
    for(const rx of patrones){ const m=primera.match(rx); if(m) return m[1]; }
    return '';
  }
  function evidenciaThumb(url){ const id=extraerDriveId(url); return id ? 'https://drive.google.com/thumbnail?sz=w1000&id='+id : url; }
  function evidenciaFull(url){
    if(!url) return '';
    const primera=String(url).trim().split(/\s+/)[0];
    const patrones=[ /\/d\/([A-Za-z0-9_-]{10,})/, /id=([A-Za-z0-9_-]{10,})/, /\/file\/d\/([A-Za-z0-9_-]{10,})/, /open\?[^#]*id=([A-Za-z0-9_-]{10,})/ ];
    let id=''; for(const rx of patrones){ const m=primera.match(rx); if(m){ id=m[1]; break; } }
    return id ? 'https://drive.google.com/uc?export=view&id='+id : primera;
  }
    function abrirZoomEvidencia(src) {
    if (typeof openEvLightbox_ === 'function') {
      openEvLightbox_(src);
    }
  }
  for(let i=1;i<=total;i++){
    const oblig=obligaciones[i-1]; const act=actividades[i-1]; const evid=evidencias[i-1];
    if(![oblig,act,evid].some(v=>v && v!=='-')) continue;
    const block=document.createElement('div'); block.className='oblig-block';
    const titulo=document.createElement('p'); titulo.className='oblig-title'; titulo.textContent='OBLIGACIÓN N° '+i; block.appendChild(titulo);
    if(oblig && oblig !== '-'){
  const ob = document.createElement('p');
  ob.className = 'oblig-sub';
  ob.style.fontWeight = '900';  // ✅ obligación completa en negrilla
  ob.textContent = String(oblig);
  block.appendChild(ob);
}
 if(act && act !== '-'){
  const ac = document.createElement('p');
  ac.className = 'oblig-sub';
  ac.style.whiteSpace = 'pre-line'; // ✅ respeta saltos de línea (\n)

  // ✅ "Actividades:" en negrilla + texto con saltos de línea
  const b = document.createElement('b');
  b.textContent = 'Actividades: ';
  ac.appendChild(b);

  const span = document.createElement('span');
  // ✅ Detectar URLs en el texto y convertirlas en enlaces clicables
  const texto = String(act);
  const regexUrl = /(https?:\/\/[^\s]+)/g;
  let ultimoIndice = 0;
  let match;
  while ((match = regexUrl.exec(texto)) !== null) {
    if (match.index > ultimoIndice) {
      span.appendChild(document.createTextNode(texto.substring(ultimoIndice, match.index)));
    }
    // Limpiar signos de puntuación finales que no son parte de la URL
    let urlLimpia = match[0];
    const puntFinal = urlLimpia.match(/[.,;:!?)\]]+$/);
    if (puntFinal) urlLimpia = urlLimpia.slice(0, -puntFinal[0].length);

    const enlace = document.createElement('a');
    enlace.href = urlLimpia;
    enlace.textContent = urlLimpia;
    enlace.target = '_blank';
    enlace.rel = 'noopener noreferrer';
    enlace.style.color = '#1d4ed8';
    enlace.style.textDecoration = 'underline';
    enlace.style.wordBreak = 'break-all';
    span.appendChild(enlace);

    if (puntFinal) span.appendChild(document.createTextNode(puntFinal[0]));
    ultimoIndice = match.index + match[0].length;
  }
  if (ultimoIndice < texto.length) {
    span.appendChild(document.createTextNode(texto.substring(ultimoIndice)));
  }
  ac.appendChild(span);

  block.appendChild(ac);
}
    if(evid && evid!=='-'){
      const evDiv=document.createElement('div'); evDiv.className='evidence-grid';
      const img=document.createElement('img'); img.className='evidence-thumb'; img.src=evidenciaThumb(evid); img.alt='Evidencia '+i;
      img.addEventListener('click', ()=> openEvLightbox_(evidenciaThumb(evid)));
      evDiv.appendChild(img); block.appendChild(evDiv);
    }
    blocksWrap.appendChild(block);
    }


// === Mostrar/ocultar y parametrizar botones (Carpeta + Observaciones) ===
const cuentaBtn = document.getElementById('btn-abrir-carpeta-cuenta');
const obsBtn    = document.getElementById('btn-ver-observaciones');

const idCuenta = String(cu?.idCuenta || '').trim();
const obsTxtRaw = (cu && typeof cu.observacionesSeguimiento !== 'undefined')
  ? String(cu.observacionesSeguimiento || '').trim()
  : '';

const obsTxt = obsTxtRaw ? obsTxtRaw : 'Sin observaciones anteriores';

// helper: clonar para limpiar listeners previos
function resetBtnById(btnId){
  const btn = document.getElementById(btnId);
  if(!btn || !btn.parentNode) return btn;
  const nb = btn.cloneNode(true);
  btn.parentNode.replaceChild(nb, btn);
  return nb;
}

// ---- Carpeta
if(cuentaBtn){
  if(idCuenta){
    let btn = resetBtnById('btn-abrir-carpeta-cuenta');
    btn.classList.remove('hidden');
    btn.addEventListener('click', ()=>{
      playSoundOnce(SOUNDS.menu);
      window.open('https://drive.google.com/drive/folders/' + idCuenta, '_blank');
    });
  }else{
    cuentaBtn.classList.add('hidden');
  }
}

// ---- Observaciones (CL)
if(obsBtn){
  let btn = resetBtnById('btn-ver-observaciones');
  btn.classList.remove('hidden');
  btn.addEventListener('click', async ()=>{
    playSoundOnce(SOUNDS.info);
    await Swal.fire({
      icon:'success',
      title:'OBSERVACIONES DE SEGUIMIENTO',
      text: obsTxt,
      confirmButtonText:'Cerrar'
    });
  });
}
}
  
document.getElementById('rc-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-revision');
});
  
document.getElementById('rc-guardar').addEventListener('click', async ()=>{
  if(!REV_CUENTA?.cuenta){ Swal.fire({icon:'warning',title:'Sin cuenta cargada'}); return; }
  const documento = String(REV_CUENTA.contratista.documento || '').trim();
  const nombre    = REV_CUENTA.contratista.nombre;
  const informe = String(REV_CUENTA.cuenta.informe || '').trim();
  const supervisor = supervisorNombreCompleto;
  const grupoId = 'L5yaZR3aSHUGenlpJAAbXk'; // grupo de contratación
  const telContratistaRaw = REV_CUENTA.contratista.telefono;
  const observ = (document.getElementById('rc-observaciones').value || '').trim();
  const telContratista = normalizeNumber57(telContratistaRaw);

  // Alerta con 4 opciones (Aprobar, Devolver, Incompleta, Cancelar)
  const rs = await Swal.fire({
    icon:'success',
    title:`Haz revisado la cuenta N° ${informe} de ${nombre}`,
    html: `
      <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:10px;">
        <button id="opt-aprobar" class="swal2-confirm swal2-styled" style="flex:1 1 45%;">Aprobar</button>
        <button id="opt-devolver" class="swal2-deny swal2-styled" style="flex:1 1 45%;">Devolver</button>
        <button id="opt-incompleta" class="swal2-cancel swal2-styled" style="flex:1 1 45%;">Incompleta</button>
        <button id="opt-cancelar" class="swal2-cancel swal2-styled danger" style="flex:1 1 45%;">Cancelar</button>
      </div>
    `,
    showConfirmButton: false,
    showDenyButton: false,
    showCancelButton: false,
    didOpen: (el)=>{
      function pieSupervisor(){ return supervisor === 'ANA JUDITH GAMBOA MANTILLA' ? '> Alcaldesa' : '> Supervisor(a)'; }

      function msgAprobadoContratista(){
        return (
          '> Estado 1️⃣\n' +
          'Estimado(a) *'+nombre+'*' + '\n\n' +
          '¡He solicitado al área de contratación aplicar el segundo filtro a tu *Cuenta N° '+informe+'*!' + '\n\n' +
          'Espera atentamente el siguiente estado de cuenta.' + '\n\n' +
          'Cordialmente,' + '\n\n' +
          '*'+supervisor+'*' + '\n' + pieSupervisor()
        );
      }

      function msgAprobadoGrupo(){
        return (
          '🔎 Buen día *Equipo de Contratación* 🔍' + '\n\n' +
          '¡Por favor solicito la revisión de la *Cuenta N° '+informe+'*! Del contratista *'+nombre+'*.' + '\n\n' +
          'Cordialmente,' + '\n\n' +
          '*'+supervisor+'*' + '\n' + pieSupervisor()
        );
      }

      function msgDevueltaContratista(){
        return (
          'Estimado(a) *'+nombre+'*' + '\n\n' +
          'Se ha devuelto tu *Cuenta N° '+informe+'* por esta inconsistencia:' + '\n\n' +
          '*'+(observ || 'Sin observaciones')+'*' + '\n\n' +
          'Toma la opción *CORREGIR CUENTA* desde la *App Contratista* y haz las correcciones teniendo en cuenta las observaciones anteriores.' + '\n' +
          'Una vez corregida y guardada, toma nuevamente la opción *REPORTAR CUENTA*.' + '\n\n' +
          'Cordialmente,' + '\n\n' +
          '*'+supervisor+'*' + '\n' + pieSupervisor()
        );
      }

      function msgIncompleta(){
        return (
          'Estimado(a) *'+nombre+'*' + '\n\n' +
          'En tu *Cuenta N° '+informe+'* no encuentro el(los) siguiente(s) soporte(s):' + '\n\n' +
          '*'+(observ || 'Sin observaciones')+'*' + '\n\n' +
          'Toma la opción *CORREGIR CUENTA* en la *App Contratista* y carga el(los) soporte(s) restante(s) teniendo en cuenta las observaciones anteriores.' + '\n' +
          'Una vez corregida y guardada con lo solicitado, vuelve a tomar la opción *REPORTAR CUENTA*.' + '\n\n' +
          'Cordialmente,' + '\n\n' +
          '*'+supervisor+'*' + '\n' + pieSupervisor()
        );
      }

             // Aprobar (sin loader global durante la firma, pero con loader al recargar listas)
el.querySelector('#opt-aprobar')?.addEventListener('click', async ()=>{
  try{
    const resp = await apiPost('aprobarCuentaSupervisor', { documento, informe, supervisor });

    if(telContratista){ sendBuilderbotMessage(telContratista, msgAprobadoContratista()); }
    sendBuilderbotMessage(grupoId, msgAprobadoGrupo());

    Swal.close();

    await Swal.fire({
      icon:'success',
      title:'Cuenta Aprobada',
      timer:1800,
      showConfirmButton:false
    });

    await cargarCuentas();
    showView('view-revision');
  }catch(e){
    Swal.close();
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});
      
      // Devolver (mantiene lógica existente)
      el.querySelector('#opt-devolver')?.addEventListener('click', async ()=>{
        try{
         await apiPost('devolverCuentaSupervisor',{
  documento,
  informe,
  observaciones: observ,
  supervisor
});
          if(telContratista){ sendBuilderbotMessage(telContratista, msgDevueltaContratista()); }
          Swal.close();
          Swal.fire({icon:'success',title:'Cuenta Devuelta',timer:1800,showConfirmButton:false});
          await cargarCuentas(); showView('view-revision');
        }catch(e){ Swal.close(); Swal.fire({icon:'error',title:'Error',text:e.message}); }
      });

      // Incompleta (solo envía mensaje; NO llama backend)
      el.querySelector('#opt-incompleta')?.addEventListener('click', async ()=>{
  try{
    await apiPost('marcarCuentaIncompletaSupervisor', {
  documento,
  informe,
  observaciones: observ,
  supervisor
});
    if(telContratista){ sendBuilderbotMessage(telContratista, msgIncompleta()); }
    Swal.close();
    Swal.fire({icon:'success',title:'Cuenta marcada como INCOMPLETA',timer:2200,showConfirmButton:false});
    await cargarCuentas();
    showView('view-revision');
  }catch(e){
    Swal.close();
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});

      // Cancelar
      el.querySelector('#opt-cancelar')?.addEventListener('click', ()=>{
        Swal.close();
      });
    }
  });
});

  /* ================== SUPERVISIÓN FIRMADOS ================== */
let FIRMADOS_DATA = [];

function formatFechaHora12SegFrom24(str){
  // Entrada: "3/02/2026 18:24:20"  (d/m/yyyy H:mm:ss)
  // Salida:  "3/02/2026 6:24:20 PM"
  const s = String(str || '').trim();
  const m = s.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if(!m) return s;

  const fecha = m[1];
  let hh = parseInt(m[2],10);
  const mm = m[3];
  const ss = m[4];

  if(isNaN(hh)) return s;

  const ampm = (hh >= 12) ? 'PM' : 'AM';
  let h12 = hh % 12;
  if(h12 === 0) h12 = 12;

  return `${fecha} ${h12}:${mm}:${ss} ${ampm}`;
}

document.getElementById('go-firmados')?.addEventListener('click', async ()=>{
  overlay.classList.remove('open');
  playSoundOnce(SOUNDS.logout);

  await cargarFirmados();
  showView('view-firmados');
});

async function cargarFirmados(){
  try{
    const list = await apiGet('listFirmasSupervisor', { supervisor: supervisorNombreCompleto });
    FIRMADOS_DATA = Array.isArray(list) ? list : [];
    pintarFirmados(FIRMADOS_DATA);
    actualizarResumenFirmados(FIRMADOS_DATA);
  }catch(e){
    FIRMADOS_DATA = [];
    pintarFirmados(FIRMADOS_DATA);
    actualizarResumenFirmados(FIRMADOS_DATA);
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}

function actualizarResumenFirmados(list){
  const box = document.getElementById('firmados-count');
  if(!list.length){ box.style.display='none'; box.textContent=''; return; }
  box.textContent = String(list.length);
  box.style.display = 'inline-block';
}

function pintarFirmados(list){
  const wrap = document.getElementById('firmados-list');
  wrap.innerHTML = '';

  if(!list.length){
    wrap.innerHTML = '<p class="muted center">No hay informes firmados.</p>';
    return;
  }

  for(const f of list){
    const div = document.createElement('div');
    div.className = 'item-card';

    const p1 = document.createElement('p');
    p1.className = 'item-sub';
    p1.innerHTML =
  `<b>ID_FIRMA:</b> ${f.idFirma || ''}     <b>FECHA / HORA DE FIRMA:</b> ${formatFechaHora12SegFrom24(f.fechaHora)}`;
    div.appendChild(p1);

    const p2 = document.createElement('p');
    p2.className = 'item-sub';
    p2.innerHTML =
  `<b>CONTRATISTA:</b> ${f.contratista || ''}     <b>DOCUMENTO:</b> ${f.documento || ''}`;
    div.appendChild(p2);

    const p3 = document.createElement('p');
    p3.className = 'item-sub';
    p3.innerHTML =
  `<b>CONTRATO:</b> ${f.contrato || ''}     <b>INFORME:</b> ${f.informe || ''}     <b>RADICADO:</b> ${f.radicado || ''}`;
    div.appendChild(p3);

    wrap.appendChild(div);
  }
}

document.getElementById('firmados-filter')?.addEventListener('input', ()=>{
  const q = (document.getElementById('firmados-filter').value || '').trim().toLowerCase();
  const filtered = FIRMADOS_DATA.filter(f=>{
    return [
      f.idFirma,
      f.fechaHora,
      f.contratista,
      f.documento,
      f.contrato,
      f.informe,
      f.radicado
    ].some(v => String(v||'').toLowerCase().includes(q));
  });

  pintarFirmados(filtered);
  actualizarResumenFirmados(filtered);
});

document.getElementById('firmados-volver')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

document.getElementById('firmados-descargar')?.addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.info);
  try{
    const data = await apiGet('descargarFirmasSupervisor', { supervisor: supervisorNombreCompleto });
    if(!data?.created || !data?.exportUrl){
      Swal.fire({icon:'info',title:'Sin datos para descargar'});
      return;
    }

    const url = data.exportUrl;
    const isMobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);

    if(isMobile){
      window.open(url,'_blank');
    }else{
      const a = document.createElement('a');
      a.href = url;
      a.target = '_self';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});

  /* ================== PLAN DE PAGOS ================== */

  document.getElementById('go-planes-pagos').addEventListener('click', async ()=>{
  overlay.classList.remove('open');
  await cargarPlanesPagos();
  if (!PLANES_PAGOS_DATA || PLANES_PAGOS_DATA.length === 0){
    await Swal.fire({
      icon:'success',
      title:'¡Estás al día!',
      text:'No tienes PLANES DE PAGO por aceptar e informar',
      timer: 3400,
      showConfirmButton: false
    });
    showView('view-inicio');
    return;
  }
  showView('view-planes-pagos');
});
  
let PLANES_PAGOS_DATA = [];

async function cargarPlanesPagos(){
  try{
    const list = await apiGet('listPlanesPagos', { supervisor: supervisorNombreCompleto });
    PLANES_PAGOS_DATA = Array.isArray(list) ? list : [];

    // Orden por fecha de radicación (antigua → reciente)
    PLANES_PAGOS_DATA.sort((a,b)=> parseFechaRadicacion(a.fechaRadicacion) - parseFechaRadicacion(b.fechaRadicacion));

    // Priorizar a OSCAR MAURICIO POLANIA GUERRA al inicio
    const PRIORITARIO = 'OSCAR MAURICIO POLANIA GUERRA';
    PLANES_PAGOS_DATA.sort((a, b) => {
      const aPrio = String(a.nombre || '').trim().toUpperCase() === PRIORITARIO ? 0 : 1;
      const bPrio = String(b.nombre || '').trim().toUpperCase() === PRIORITARIO ? 0 : 1;
      return aPrio - bPrio;
    });

    pintarPlanesPagos(PLANES_PAGOS_DATA);
    actualizarResumenPlanesPagos(PLANES_PAGOS_DATA);
  }catch(e){
    PLANES_PAGOS_DATA = [];
    pintarPlanesPagos(PLANES_PAGOS_DATA);
    actualizarResumenPlanesPagos(PLANES_PAGOS_DATA);
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}

function actualizarResumenPlanesPagos(list){
  const box = document.getElementById('planes-count');
  if(!list.length){ box.style.display='none'; box.textContent=''; return; }
  box.textContent = String(list.length);
  box.style.display='inline-block';
}

function pintarPlanesPagos(list){
  const wrap = document.getElementById('planes-list');
  wrap.innerHTML='';
  if(!list.length){
    wrap.innerHTML='<p class="muted center">No hay cuentas en Plan de Pagos.</p>';
    return;
  }
  for(const c of list){
  const div=document.createElement('div'); div.className='item-card';

  // Encabezado + ícono carpeta (arriba a la derecha)
  const headRow = document.createElement('div');
  headRow.className = 'plan-card-head';

  const header=document.createElement('div'); header.className='item-header';
  const title=document.createElement('p'); title.className='item-title'; title.textContent=(c.nombre||'');
  header.appendChild(title);

  const folderWrap = document.createElement('div');
  folderWrap.className = 'plan-folder';

  const btnCarpeta = document.createElement('button');
  btnCarpeta.className = 'btn-icon';
  btnCarpeta.setAttribute('aria-label','Abrir carpeta de CUENTA en Drive');
  btnCarpeta.title = 'Abrir carpeta de CUENTA en Drive';
  btnCarpeta.innerHTML = '<img src="https://res.cloudinary.com/dqqeavica/image/upload/v1764111247/carpeta_drive_epbrhp.webp" alt="CUENTA">';

  const idCuenta = String(c.idCuenta || '').trim();
  if(idCuenta){
    btnCarpeta.addEventListener('click', ()=> {
      playSoundOnce(SOUNDS.menu);
      window.open('https://drive.google.com/drive/folders/' + idCuenta, '_blank');
    });
    folderWrap.appendChild(btnCarpeta);
  }

  headRow.appendChild(header);
  headRow.appendChild(folderWrap);
  div.appendChild(headRow);

  const pDoc=document.createElement('p'); pDoc.className='item-sub'; pDoc.textContent='CC / NIT: '+(c.documento||''); div.appendChild(pDoc);
  const pInf=document.createElement('p'); pInf.className='item-sub'; pInf.textContent='INFORME: '+(c.informe||'')+' de: '+(c.totalInformes||''); div.appendChild(pInf);

  const pContrato = document.createElement('p');
  pContrato.className = 'item-sub';
  pContrato.textContent = 'CONTRATO: ' + (c.contrato || '');
  div.appendChild(pContrato);

  const pEgreso=document.createElement('p');
  pEgreso.className='item-sub';
  pEgreso.textContent='FECHA EGRESO: ' + (c.fechaEgreso || 'Primera Cuenta');
  div.appendChild(pEgreso);

  const pHint = document.createElement('p');
  pHint.className = 'plan-hint';
  pHint.textContent = 'El informe se guarda automáticamente en la 📁 del contratista, No olvides hacer clic en cerrar proceso.';
  div.appendChild(pHint);

  const btnRow=document.createElement('div'); 
  btnRow.className='btn-row';

  const btnFirmar = document.createElement('button');
  btnFirmar.textContent = 'FIRMAR INFORME';
  btnFirmar.addEventListener('click', async ()=> {
    const prevSuppress = suppressLoader;
    suppressLoader = true;

    Swal.fire({
      title: 'FIRMANDO DOCUMENTO....',
      html: 'El Informe de Supervisión se está firmando y subiendo automáticamente en la carpeta del contratista, por favor espera unos segundos.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try{
      const supervisor = supervisorNombreCompleto;

      const resp = await apiPost('firmarInformePlanPagoSupervisor', {
        documento: c.documento,
        informe: c.informe,
        supervisor
      });

      if(!resp || !resp.base64){
        throw new Error('No se recibió el PDF para descargar.');
      }

      const byteChars = atob(resp.base64);
      const byteNumbers = new Array(byteChars.length);
      for(let i=0;i<byteChars.length;i++){
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const blob = new Blob([byteArray], { type: resp.mimeType || 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = resp.fileName || 'INF_SUP_CTA.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(()=> URL.revokeObjectURL(url), 20000);

      Swal.close();
    }catch(e){
      Swal.close();
      Swal.fire({icon:'error',title:'Error',text:e.message});
    }finally{
      suppressLoader = prevSuppress;
    }
  });
  btnRow.appendChild(btnFirmar);

  const btnCerrar=document.createElement('button');
  btnCerrar.textContent='CERRAR PROCESO';
  btnCerrar.addEventListener('click', ()=> {
    playSoundOnce(SOUNDS.logout);
    cerrarProcesoPlanPago(c.documento, c.informe);
  });
  btnRow.appendChild(btnCerrar);

  div.appendChild(btnRow);
  wrap.appendChild(div);
}
}

document.getElementById('planes-filter').addEventListener('input', ()=>{
  const q=document.getElementById('planes-filter').value.trim().toLowerCase();
  const filtered = PLANES_PAGOS_DATA.filter(c=>{
    return [c.nombre,c.documento,c.contrato,c.informe,c.totalInformes].some(v=>String(v||'').toLowerCase().includes(q));
  });
  pintarPlanesPagos(filtered);
  actualizarResumenPlanesPagos(filtered);
});

  document.getElementById('planes-secop2')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  window.open(
    'https://community.secop.gov.co/STS/Users/Login/Index?SkinName=CCE&currentLanguage=es-CO&Page=login&Country=CO',
    '_blank',
    'noopener'
  );
});

document.getElementById('planes-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

async function cerrarProcesoPlanPago(documento, informe){
  try{
    // Obtener detalles del contratista para mensajes
    const det = await apiGet('detallesContratistaSupervisor', { documento });
    if(!det){ Swal.fire({icon:'warning',title:'Contratista no encontrado'}); return; }
    const nombre = det.nombre || '';
    const telRaw = det.telefono || '';
    const telContratista = normalizeNumber57(telRaw);
    const supervisor = supervisorNombreCompleto;
    function pieSupervisor(){ return supervisor === 'ANA JUDITH GAMBOA MANTILLA' ? '> Alcaldesa' : '> Supervisor(a)'; }

     const dqUrl = await apiGet('getCuentaPdfUrlDQ', { documento, informe, supervisor });

    const msgContratista =
      '> Estado 3️⃣\n' +
      'Estimado(a) *'+nombre+'*' + '\n\n' +
      '¡He aceptado tu *Plan de Pagos* de la *Cuenta N° '+informe+'* en el SECOP II!' + '\n\n' +
      'Mientras el proceso se digitaliza al 100%, te comparto el *Informe de Supervisión* para descargar: ' + (dqUrl || 'N/A') + '\n\n' +
      'Presenta los dos paquetes completos al encargado de nuestra secretaria para radicarlos en el área de contratación.' + '\n\n' +
      'Cordialmente,' + '\n\n' +
      '*'+supervisor+'*' + '\n' + pieSupervisor();

    const msgGrupo =
      '📋 Buen día *Equipo de Contabilidad* 📋' + '\n\n' +
      '¡Por favor solicito la emisión de la orden de pago para la *Cuenta N° '+informe+'*! Del contratista *'+nombre+'*.' + '\n\n' +
      'Cordialmente,' + '\n\n' +
      '*'+supervisor+'*' + '\n' + pieSupervisor();

    // Enviar mensajes
    const grupoId = 'GMnAsKZXoG8LUjtxNdw830'; // GRUPO DE CONTABILIDAD
    if(telContratista){ sendBuilderbotMessage(telContratista, msgContratista); }
    sendBuilderbotMessage(grupoId, msgGrupo);

    // Actualizar estado en la hoja
    await apiPost('cerrarPlanPagoSupervisor', { documento, informe, supervisor });

    Swal.fire({icon:'success',title:'Proceso Cerrado',timer:1800,showConfirmButton:false});
    await cargarPlanesPagos();
    showView('view-planes-pagos');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}

/* ================== REQUERIMIENTOS ================== */
let REQ_DATA=[];
document.getElementById('go-requerimientos').addEventListener('click', async ()=>{
  overlay.classList.remove('open');
  await cargarReqBase();
  showView('view-requerimientos');
});
async function cargarReqBase(){
  try{
    const list=await apiGet('listContratistasSupervisor', { supervisor: supervisorNombreCompleto });
    REQ_DATA=Array.isArray(list)?list:[];
    pintarReq(REQ_DATA); actualizarResumenReq(REQ_DATA);
  }catch(e){
    REQ_DATA=[]; pintarReq(REQ_DATA); actualizarResumenReq(REQ_DATA);
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}
function actualizarResumenReq(list){
  const box=document.getElementById('req-count');
  if(!list.length){ box.style.display='none'; box.textContent=''; return; }
  box.textContent=String(list.length); box.style.display='inline-block';
}
function pintarReq(list){
  const wrap=document.getElementById('req-list'); wrap.innerHTML='';
  if(!list.length){ wrap.innerHTML='<p class="muted center">No hay contratistas.</p>'; return; }
  for(const c of list){
    const div=document.createElement('div'); div.className='item-card';
    const header=document.createElement('div'); header.className='item-header';
    const title=document.createElement('p'); title.className='item-title'; title.textContent=(c.nombre||'');
    header.appendChild(title); div.appendChild(header);

    const btnRow=document.createElement('div'); btnRow.className='btn-row';
    const btnRedact=document.createElement('button'); btnRedact.textContent='REDACTAR';
    btnRedact.addEventListener('click',(e)=>{
      e.preventDefault(); e.stopPropagation();
      playSoundOnce(SOUNDS.logout);
      abrirModalReq(c);
    });
    btnRow.appendChild(btnRedact);
    div.appendChild(btnRow);
    wrap.appendChild(div);
  }
}
document.getElementById('req-filter').addEventListener('input',()=>{
  const q=document.getElementById('req-filter').value.trim().toLowerCase();
  const filtered=REQ_DATA.filter(c=>[c.nombre,c.documento,c.secretaria,c.supervisor,c.telefono].some(v=>String(v||'').toLowerCase().includes(q)));
  pintarReq(filtered); actualizarResumenReq(filtered);
});
document.getElementById('req-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

let MODAL_TARGET=null;
function abrirModalReq(c){
  MODAL_TARGET=c;
  const ta=document.getElementById('modal-req-text');
  ta.value='';
  document.getElementById('modal-requerimiento').classList.remove('hidden');
  ta.focus();
}
function cerrarModalReq(){
  document.getElementById('modal-requerimiento').classList.add('hidden');
  MODAL_TARGET=null;
}
document.getElementById('modal-req-cancelar').addEventListener('click', cerrarModalReq);
document.getElementById('modal-req-enviar').addEventListener('click', ()=>{
  const txt=(document.getElementById('modal-req-text').value||'').trim();
  if(!MODAL_TARGET){ return; }
  if(!txt){
    Swal.fire({icon:'warning',title:'Texto requerido'}); return;
  }
  const tel = normalizeNumber57(MODAL_TARGET.telefono);
  const nombre = (MODAL_TARGET.nombre || '').trim();
  const pie = supervisorNombreCompleto === 'ANA JUDITH GAMBOA MANTILLA' ? '> Alcaldesa' : '> Supervisor(a)';
  const mensaje =
    'Estimado(a) *' + nombre + '*\n\n' +
    'Tenemos el siguiente requerimiento:\n\n*' + txt + '*\n\n' +
    'Cordialmente,\n\n*' + supervisorNombreCompleto + '*\n' + pie;
  if(tel){ sendBuilderbotMessage(tel, mensaje); }
  cerrarModalReq();
  Swal.fire({icon:'success',title:'Requerimiento enviado',timer:1800,showConfirmButton:false});
});

/* ================== COMUNICADOS ================== */
document.getElementById('go-comunicados').addEventListener('click', ()=>{ overlay.classList.remove('open'); showView('view-comunicados'); });
document.getElementById('comunicado-enviar').addEventListener('click', async ()=>{
  const txt=(document.getElementById('comunicado-text').value||'').trim();
  if(!txt){ Swal.fire({icon:'warning',title:'Texto requerido'}); return; }
  try{
    await apiPost('guardarComunicadoSupervisor',{
      supervisor: supervisorNombreCompleto,
      comunicado: txt,
      imagenId: currentUser?.imagenId || ''  // guardamos ID (no URL)
    });
    Swal.fire({icon:'success',title:'COMUNICADO CARGADO CON ÉXITO',timer:4000,showConfirmButton:false});
    document.getElementById('comunicado-text').value='';
    renderInicio(); showView('view-inicio');
  }catch(e){ Swal.fire({icon:'error',title:'Error',text:e.message}); }
});
document.getElementById('comunicado-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== SOPORTE ================== */
document.getElementById('go-soporte').addEventListener('click', ()=>{ overlay.classList.remove('open'); showView('view-soporte'); });
document.getElementById('soporte-enviar').addEventListener('click', async ()=>{
  const txt = (document.getElementById('soporte-text').value || '').trim();
  if(!txt){ Swal.fire({icon:'warning', title:'Texto requerido'}); return; }
  try{
    await apiPost('guardarSoporteSupervisor',{
      supervisor: supervisorNombreCompleto,
      soporte: txt,
      celular: ''
    });

    // Mensaje 1 → teléfono del supervisor logueado
    const telSupervisor = normalizeNumber57(currentUser?.telefono || '');
    const nombreCorto = firstTwoWordsIfMoreThan3(supervisorNombreCompleto);
    if(telSupervisor){
      const msg1 =
        'Estimado(a) *' + nombreCorto + '*\n' +
        '¡He recibido tu solicitud!\n' +
        'Te ayudaré en el menor tiempo posible.\n' +
        'Cordialmente,\n' +
        '*Oscar Polania*\n' +
        '> Desarrollador Gobierno Digital';
      sendBuilderbotMessage(telSupervisor, msg1);
    }

    // Mensaje 2 → directo a Oscar
    const msg2 =
      'Hola *Oscar*\n' +
      'Tienes una nueva solicitud:\n' +
      '*Supervisor(a):* ' + supervisorNombreCompleto + '\n' +
      '*Solicitud:*\n' +
      txt;
    sendBuilderbotMessage('573103230712', msg2);

    Swal.fire({ icon:'success', title:'SOLICITUD CARGADA CON ÉXITO', timer:5000, showConfirmButton:false });
    document.getElementById('soporte-text').value = '';
    renderInicio(); showView('view-inicio');
  }catch(e){ Swal.fire({icon:'error', title:'Error', text:e.message}); }
});
  
  document.getElementById('soporte-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== DIRECTORIO INSTITUCIONAL ================== */
  // Navegación al Directorio (reutilizando la vista y lógica ya definidas más abajo)
document.getElementById('go-directorio')?.addEventListener('click', async ()=>{
  overlay.classList.remove('open');
  playSoundOnce(SOUNDS.login);
  if(!currentUser){
    Swal.fire({icon:'warning', title:'Sesión inválida'});
    return;
  }
  try{
    const list = await apiGet('listDirectorio', {});
    renderDirectorio(Array.isArray(list) ? list : []);
    showView('view-directorio');
  }catch(e){
    Swal.fire({icon:'error', title:'Error', text:String(e.message||e)});
  }
});

    /* ================== IR A SECOP II ================== */

  document.getElementById('go-secop2')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  overlay.classList.remove('open');
  window.open(
    'https://community.secop.gov.co/STS/Users/Login/Index?SkinName=CCE&currentLanguage=es-CO&Page=login&Country=CO',
    '_blank',
    'noopener'
  );
});

/* ================== PWA AVANZADO ================== */
let deferredPrompt = null;
let __installStartShown = false;    // bandera: ya mostramos "App instalándose"
let __installSuccessShown = false;  // bandera: ya mostramos "Instalación exitosa"

function isStandalone(){
  const dmStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const dmInstalled  = window.matchMedia('(display-mode: installed)').matches;
  const iosStandalone = (window.navigator.standalone === true);
  return dmStandalone || dmInstalled || iosStandalone;
}
function isIOS(){
  return /(iphone|ipad|ipod)/i.test(navigator.userAgent || '');
}
function isMarkedInstalled(){
  try{ return localStorage.getItem('pwaInstalledFlag') === '1'; }catch(_){ return false; }
}
function markInstalled(){
  try{ localStorage.setItem('pwaInstalledFlag', '1'); }catch(_){}
}
function clearInstalledMark(){
  try{ localStorage.removeItem('pwaInstalledFlag'); }catch(_){}
}
async function detectInstalled(){
  if (isStandalone()) return true;
  if (typeof navigator.getInstalledRelatedApps === 'function'){
    try{
      const apps = await navigator.getInstalledRelatedApps();
      const found = apps.some(a =>
        a.platform === 'webapp' &&
        typeof a.url === 'string' &&
        /manifest\.webmanifest$/.test(a.url)
      );
      if (found){
        markInstalled();
        return true;
      } else {
        clearInstalledMark();
      }
    }catch(_){}
  }
  return isMarkedInstalled();
}
function updateInstallButtonsVisibility(){
  const btn1 = document.getElementById('btn-instalar');
  const canPrompt = !!deferredPrompt;
  const installed = isMarkedInstalled() || isStandalone();
  const shouldShow = !installed && (canPrompt || isIOS());
  if(btn1) btn1.style.display = shouldShow ? '' : 'none';
}

window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  updateInstallButtonsVisibility();
});

window.addEventListener('appinstalled', ()=>{
  markInstalled();
  deferredPrompt = null;
  updateInstallButtonsVisibility();
});

document.getElementById('btn-instalar').addEventListener('click', async ()=>{
  // Flujo iOS: se respeta exactamente tu alerta e instrucciones
  if(isIOS()){
    Swal.fire({
      icon:'info',
      title: '¡Para Instalar en tu Iphone!',
  html: `
    <div style="text-align:center; margin-top:8px;">
      <img
        src="https://res.cloudinary.com/dqqeavica/image/upload/v1765745210/instalacion_ios_ysbhnd.gif"
        alt="Instalación de IOS"
        style="width:180px; max-width:70vw; height:auto; display:block; margin:0 auto 12px;"
      >
      <div style="margin-top:10px;">
        <b>1.</b> Toca Compartir.<br><b>2.</b> Elige "Agregar a pantalla de inicio".<br><b>3.</b> Confirma "Agregar".
      </div>
    </div>
  `,
    });
    return;
  }
  // Android: requiere beforeinstallprompt (deferredPrompt)
  if(!deferredPrompt){
    Swal.fire({icon:'info',title:'Instalación no disponible todavía'});
    return;
  }

  const dp = deferredPrompt;
  dp.prompt();                           // muestra diálogo nativo de instalación
  const choice = await dp.userChoice;    // espera la elección del usuario
  deferredPrompt = null;                 // limpia el prompt (solo se usa una vez)

  if (choice.outcome === 'accepted'){
    // Primera alerta (Android): confirma inicio de instalación por 6 segundos
    markInstalled();
    __installStartShown = true;
    Swal.fire({
  icon: 'success',
  title: '¡App instalándose!',
  html: `
    <div style="text-align:center; margin-top:8px;">
      <img
        src="https://res.cloudinary.com/dqqeavica/image/upload/v1765740540/instalacion_lydtcl.gif"
        alt="Instalando app"
        style="width:180px; max-width:70vw; height:auto; display:block; margin:0 auto 12px;"
      >
      <div>Debes esperar unos segundos mientras el sistema instala la App.</div>
      <div style="margin-top:10px;">
        <b>Al desaparecer este aviso, puedes salir de esta vista. La App aparecerá en la pantalla principal de este dispositivo.</b>
      </div>
    </div>
  `,
  timer: 12000,
  showConfirmButton: false
});
  } else {
    Swal.fire({icon:'info',title:'Instalación cancelada'});
  }

  updateInstallButtonsVisibility();
});

async function initPWAVista(){
  const installed = await detectInstalled();
  if (installed){
    showView('view-login');
  } else {
    showView('view-instalar');
    updateInstallButtonsVisibility();
  }
}
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}
window.addEventListener('load', initPWAVista);
  
  
// Helper para IDs con prefijo "add-"
function $id(base) {
  return document.getElementById('add-' + base) || document.getElementById(base);
}

  /* ================== CALENDARIO INSTITUCIONAL ================== */

const CAL_API_ACTION_LIST = 'listEventosCalendario';
const CAL_API_ACTION_SAVE = 'guardarEventoCalendario';
const CAL_API_ACTION_GET  = 'getEventoCalendario';

let CAL_EVENTS = [];
let CAL_CURRENT_VIEW = 'month';
let CAL_CURRENT_DATE = new Date();
let CAL_SELECTED_EVENT = null;

const CAL_MONTHS_SHORT = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const CAL_WEEKDAYS_SHORT = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];

function calPad2(n){
  return String(n).padStart(2,'0');
}
function calFormatDMY(d){
  if(!d) return '';
  const dd = calPad2(d.getDate());
  const mm = calPad2(d.getMonth()+1);
  const yy = d.getFullYear();
  return dd + '/' + mm + '/' + yy;
}
function calParseDMY(str){
  if(!str) return null;
  const p = String(str).split('/');
  if(p.length !== 3) return null;
  const d = parseInt(p[0],10);
  const m = parseInt(p[1],10);
  const y = parseInt(p[2],10);
  if(!d || !m || !y) return null;
  const dt = new Date(y,m-1,d);
  if(isNaN(dt.getTime())) return null;
  return dt;
}
function calMinutesFromTimeStr(str){
  if(!str) return 0;
  const p = String(str).split(':');
  const h = parseInt(p[0]||'0',10);
  const m = parseInt(p[1]||'0',10);
  if(isNaN(h) || isNaN(m)) return 0;
  return h*60 + m;
}
function calHMFromAmPm(str){
  if(!str) return {h:0,m:0};
  const s = String(str).trim().toUpperCase();
  const parts = s.split(' ');
  const hm = (parts[0]||'').split(':');
  let h = parseInt(hm[0]||'0',10);
  const m = parseInt(hm[1]||'0',10);
  const ampm = parts[1] || 'AM';
  if(ampm === 'PM' && h < 12) h += 12;
  if(ampm === 'AM' && h === 12) h = 0;
  return {h:isNaN(h)?0:h, m:isNaN(m)?0:m};
}
function calAmPmFromHM(h,m){
  let hh = h;
  let sufijo = 'AM';
  if(h >= 12){
    sufijo = 'PM';
    if(h > 12) hh = h - 12;
  }
  if(h === 0){ hh = 12; sufijo = 'AM'; }
  return calPad2(hh) + ':' + calPad2(m) + ' ' + sufijo;
}

function calStatusColorClass(estado, secretaria){
  const v = String(secretaria || '').trim().toUpperCase();
  const st = String(estado || '').trim().toUpperCase();

  let base;
  if (v === 'DESPACHO MUNICIPAL'){
    base = 'sec-despacho';
  }else if (v === 'SECRETARÍA DE GOBIERNO Y SERVICIOS ADMINISTRATIVOS'){
    base = 'sec-gobierno';
  }else if (v === 'SECRETARÍA DE HACIENDA'){
    base = 'sec-hacienda';
  }else if (v === 'SECRETARÍA DE EDUCACIÓN, DESARROLLO ECONÓMICO Y SOCIAL'){
    base = 'sec-educacion';
  }else if (v === 'SECRETARÍA DE PLANEACIÓN E INFRAESTRUCTURA'){
    base = 'sec-planeacion';
  }else if (v === 'SECRETARÍA DE ASUNTOS AGROPECUARIOS'){
    base = 'sec-agro';
  }else if (v === 'SECRETARÍA DE SALUD'){
    base = 'sec-salud';
  }else{
    base = 'sec-default';
  }

  if (st === 'COMPLETADO'){
    return 'cal-event-chip ' + base + '-filled';
  }
  if (st === 'PROGRAMADO'){
    return 'cal-event-chip ' + base;
  }
  return 'cal-event-chip ' + base;
}
  
function calEventMatchesFilter(ev, query){
  if(!query) return true;
  const q = query.toLowerCase();
  return [
    ev.nombreEvento,
    ev.secretaria,
    ev.nombre,
    ev.lugar,
    ev.detalles
  ].some(v => String(v||'').toLowerCase().includes(q));
}

function calUpdateTitle(){
  const titleEl = document.getElementById('cal-title-text');
  if(!titleEl) return;
  if(CAL_CURRENT_VIEW === 'year'){
    titleEl.textContent = CAL_CURRENT_DATE.getFullYear();
    return;
  }
  if(CAL_CURRENT_VIEW === 'week'){
    const start = calStartOfWeek(CAL_CURRENT_DATE);
    const end = calEndOfWeek(CAL_CURRENT_DATE);
    const label = CAL_MONTHS_SHORT[start.getMonth()] + ' ' + start.getDate() +
      ' – ' + CAL_MONTHS_SHORT[end.getMonth()] + ' ' + end.getDate() +
      ' ' + end.getFullYear();
    titleEl.textContent = label;
    return;
  }
  if(CAL_CURRENT_VIEW === 'day'){
    const d = CAL_CURRENT_DATE;
    const label = d.getDate() + ' ' + CAL_MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    titleEl.textContent = label;
    return;
  }
  const d = CAL_CURRENT_DATE;
  titleEl.textContent = d.toLocaleDateString('es-CO', { month:'long', year:'numeric' }).toUpperCase();
}

function calStartOfWeek(d){
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = dt.getDay();
  const diff = (day + 7 - 0) % 7;
  dt.setDate(dt.getDate() - diff);
  return dt;
}
function calEndOfWeek(d){
  const start = calStartOfWeek(d);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return end;
}

function calRender(){
  const cont = document.getElementById('cal-container');
  if(!cont) return;
  const filterVal = document.getElementById('cal-filter-input')?.value.trim().toLowerCase() || '';
  cont.innerHTML = '';
  calUpdateTitle();

  if(CAL_CURRENT_VIEW === 'month'){
    calRenderMonth(cont, filterVal);
  }else if(CAL_CURRENT_VIEW === 'week'){
    calRenderWeek(cont, filterVal);
  }else if(CAL_CURRENT_VIEW === 'day'){
    calRenderDay(cont, filterVal);
  }else if(CAL_CURRENT_VIEW === 'year'){
    calRenderYear(cont, filterVal);
  }
}

function calEventsOnDay(isoDMY){
  return CAL_EVENTS.filter(ev => ev.fechaEvento === isoDMY);
}

function calRenderMonth(cont, filterVal){
  const header = document.createElement('div');
  header.className = 'cal-weekdays';
  CAL_WEEKDAYS_SHORT.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-weekday';
    el.textContent = d;
    header.appendChild(el);
  });
  cont.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'cal-month-grid';

  const year = CAL_CURRENT_DATE.getFullYear();
  const month = CAL_CURRENT_DATE.getMonth();
  const firstDay = new Date(year,month,1);
  const startWeekDay = firstDay.getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();

  const prevMonthDays = (startWeekDay + 7 - 0) % 7;
  const totalCells = prevMonthDays + daysInMonth;
  const cells = totalCells <= 35 ? 35 : 42;

  const todayDMY = calFormatDMY(new Date());

  for(let i=0; i<cells; i++){
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    const dayOffset = i - prevMonthDays + 1;
    let cellDate;
    let inThisMonth = true;

    if(dayOffset < 1){
      cellDate = new Date(year, month, dayOffset);
      inThisMonth = false;
    }else if(dayOffset > daysInMonth){
      cellDate = new Date(year, month, dayOffset);
      inThisMonth = false;
    }else{
      cellDate = new Date(year, month, dayOffset);
    }

    const iso = calFormatDMY(cellDate);
    if(!inThisMonth) cell.classList.add('other-month');

    const headerNum = document.createElement('div');
    headerNum.className = 'cal-day-number';

    if(iso === todayDMY){
      headerNum.classList.add('today');
      headerNum.textContent = cellDate.getDate();
    }else{
      headerNum.textContent = cellDate.getDate();
    }

    cell.appendChild(headerNum);

    const events = calEventsOnDay(iso).filter(ev => calEventMatchesFilter(ev, filterVal));
    events.sort((a,b)=>{
      const ma = calMinutesFromTimeStr(a.horaInicio24 || '');
      const mb = calMinutesFromTimeStr(b.horaInicio24 || '');
      return ma - mb;
    });

        events.forEach(ev => {
      const chip = document.createElement('div');
      chip.className = calStatusColorClass(ev.estado, ev.secretaria);
      chip.classList.add('cal-event-chip');

      const title = document.createElement('span');
title.className = 'cal-evt-title';
title.textContent = ev.nombreEvento || '';

      const time = document.createElement('span');
      time.className = 'cal-evt-time';
      time.textContent = (ev.horaInicioAMPM || '') + ' - ' + (ev.horaTerminacionAMPM || '');

      chip.appendChild(title);
      chip.appendChild(time);

      chip.addEventListener('click', ()=> calOpenEventForEdit(ev.codigo));
      cell.appendChild(chip);
    });

    grid.appendChild(cell);
  }
  cont.appendChild(grid);
}

function calRenderDay(cont, filterVal){
  const header = document.createElement('div');
  header.className = 'cal-day-header-row';
  const d = CAL_CURRENT_DATE;
  header.textContent = d.toLocaleDateString('es-CO',{ weekday:'long', day:'numeric', month:'long', year:'numeric' }).toUpperCase();
  cont.appendChild(header);

  const body = document.createElement('div');
  body.className = 'cal-day-body';

  const iso = calFormatDMY(d);
  const events = calEventsOnDay(iso).filter(ev => calEventMatchesFilter(ev, filterVal));
  events.sort((a,b)=>{
    const ma = calMinutesFromTimeStr(a.horaInicio24 || '');
    const mb = calMinutesFromTimeStr(b.horaInicio24 || '');
    return ma - mb;
  });

  if(!events.length){
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Sin eventos para este día.';
    body.appendChild(p);
  }else{
        events.forEach(ev => {
      const chip = document.createElement('div');
      chip.className = calStatusColorClass(ev.estado, ev.secretaria);
      chip.classList.add('cal-event-chip');

      const title = document.createElement('span');
     title.className = 'cal-evt-title';
     title.textContent = ev.nombreEvento || '';

      const time = document.createElement('span');
      time.className = 'cal-evt-time';
      time.textContent = (ev.horaInicioAMPM || '') + ' - ' + (ev.horaTerminacionAMPM || '');

      const desc = document.createElement('div');
      desc.style.fontSize = '.72rem';
      desc.textContent = ev.nombreEvento || '';

      chip.appendChild(title);
      chip.appendChild(time);
      chip.appendChild(desc);

      chip.addEventListener('click', ()=> calOpenEventForEdit(ev.codigo));
      body.appendChild(chip);
    });
  }

  cont.appendChild(body);
}

function calRenderWeek(cont, filterVal){
  const start = calStartOfWeek(CAL_CURRENT_DATE);
  const end = calEndOfWeek(CAL_CURRENT_DATE);

  const header = document.createElement('div');
  header.className = 'cal-week-header-row';
  header.textContent = 'Semana del ' +
    start.getDate() + ' ' + CAL_MONTHS_SHORT[start.getMonth()] +
    ' al ' +
    end.getDate() + ' ' + CAL_MONTHS_SHORT[end.getMonth()] +
    ' ' + end.getFullYear();
  cont.appendChild(header);

  const body = document.createElement('div');
  body.className = 'cal-week-body';

  for(let i=0;i<7;i++){
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = calFormatDMY(d);

    const row = document.createElement('div');
    row.style.borderRadius = '10px';
    row.style.padding = '6px 8px';
    row.style.background = '#f9fafb';
    row.style.marginBottom = '6px';

    const head = document.createElement('div');
    head.style.display = 'flex';
    head.style.alignItems = 'center';
    head.style.justifyContent = 'space-between';

    const left = document.createElement('span');
    left.style.fontWeight = '700';
    left.style.fontSize = '.8rem';
    left.textContent = CAL_WEEKDAYS_SHORT[d.getDay()] + ' ' + d.getDate() + ' ' + CAL_MONTHS_SHORT[d.getMonth()];

    head.appendChild(left);
    row.appendChild(head);

    const evs = calEventsOnDay(iso).filter(ev => calEventMatchesFilter(ev, filterVal));
    evs.sort((a,b)=>{
      const ma = calMinutesFromTimeStr(a.horaInicio24 || '');
      const mb = calMinutesFromTimeStr(b.horaInicio24 || '');
      return ma - mb;
    });

    if(!evs.length){
      const p = document.createElement('p');
      p.className = 'muted';
      p.style.fontSize = '.72rem';
      p.textContent = 'Sin eventos';
      row.appendChild(p);
    }else{
            evs.forEach(ev => {
        const chip = document.createElement('div');
        chip.className = calStatusColorClass(ev.estado, ev.secretaria);
        chip.classList.add('cal-event-chip');

        const title = document.createElement('span');
        title.className = 'cal-evt-title';
        title.textContent = ev.secretaria || '';

        const time = document.createElement('span');
        time.className = 'cal-evt-time';
        time.textContent = (ev.horaInicioAMPM || '') + ' - ' + (ev.horaTerminacionAMPM || '');

        chip.appendChild(title);
        chip.appendChild(time);
        chip.addEventListener('click', ()=> calOpenEventForEdit(ev.codigo));
        row.appendChild(chip);
      });
    }

    body.appendChild(row);
  }

  cont.appendChild(body);
}

function calRenderYear(cont, filterVal){
  const grid = document.createElement('div');
  grid.className = 'cal-year-grid';

  const year = CAL_CURRENT_DATE.getFullYear();
  const eventsByMonth = {};
  CAL_EVENTS.forEach(ev => {
    const d = calParseDMY(ev.fechaEvento);
    if(!d || d.getFullYear() !== year) return;
    const m = d.getMonth();
    if(!eventsByMonth[m]) eventsByMonth[m] = [];
    if(calEventMatchesFilter(ev, filterVal)){
      eventsByMonth[m].push(ev);
    }
  });

  for(let m=0;m<12;m++){
    const box = document.createElement('div');
    box.className = 'cal-year-month';

    const h4 = document.createElement('h4');
    h4.textContent = new Date(year,m,1).toLocaleDateString('es-CO',{ month:'long' }).toUpperCase();
    box.appendChild(h4);

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    CAL_WEEKDAYS_SHORT.forEach(d => {
      const th = document.createElement('th');
      th.textContent = d.charAt(0);
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const first = new Date(year,m,1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year,m+1,0).getDate();

    let day = 1;
    let done = false;
    while(!done){
      const tr = document.createElement('tr');
      for(let wd=0; wd<7; wd++){
        const td = document.createElement('td');
        if(wd < startDay && day === 1){
          td.textContent = '';
        }else if(day > daysInMonth){
          td.textContent = '';
          done = true;
        }else{
          td.textContent = day;
          const dmy = calFormatDMY(new Date(year,m,day));
          const hasEvent = (eventsByMonth[m]||[]).some(ev => ev.fechaEvento === dmy);
          if(hasEvent){
            const dot = document.createElement('span');
            dot.className = 'cal-year-dot';
            td.appendChild(dot);
          }
          day++;
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    box.appendChild(table);
    grid.appendChild(box);
  }

  cont.appendChild(grid);
}

/* Navegación y vistas */

document.getElementById('go-calendario')?.addEventListener('click', async ()=>{
  overlay.classList.remove('open');
  await calLoadEvents();
  CAL_CURRENT_VIEW = 'month';
  CAL_CURRENT_DATE = new Date();
  calSyncViewButtons();
  showView('view-calendario');
  calRender();
});

document.getElementById('cal-btn-back')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

document.getElementById('cal-btn-today')?.addEventListener('click', ()=>{
  CAL_CURRENT_DATE = new Date();
  calRender();
});

document.getElementById('cal-prev')?.addEventListener('click', ()=>{
  if(CAL_CURRENT_VIEW === 'year'){
    CAL_CURRENT_DATE.setFullYear(CAL_CURRENT_DATE.getFullYear()-1);
  }else if(CAL_CURRENT_VIEW === 'month'){
    CAL_CURRENT_DATE.setMonth(CAL_CURRENT_DATE.getMonth()-1);
  }else if(CAL_CURRENT_VIEW === 'week'){
    CAL_CURRENT_DATE.setDate(CAL_CURRENT_DATE.getDate()-7);
  }else if(CAL_CURRENT_VIEW === 'day'){
    CAL_CURRENT_DATE.setDate(CAL_CURRENT_DATE.getDate()-1);
  }
  calRender();
});
document.getElementById('cal-next')?.addEventListener('click', ()=>{
  if(CAL_CURRENT_VIEW === 'year'){
    CAL_CURRENT_DATE.setFullYear(CAL_CURRENT_DATE.getFullYear()+1);
  }else if(CAL_CURRENT_VIEW === 'month'){
    CAL_CURRENT_DATE.setMonth(CAL_CURRENT_DATE.getMonth()+1);
  }else if(CAL_CURRENT_VIEW === 'week'){
    CAL_CURRENT_DATE.setDate(CAL_CURRENT_DATE.getDate()+7);
  }else if(CAL_CURRENT_VIEW === 'day'){
    CAL_CURRENT_DATE.setDate(CAL_CURRENT_DATE.getDate()+1);
  }
  calRender();
});

function calSyncViewButtons(){
  ['cal-view-day','cal-view-week','cal-view-month','cal-view-year'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.remove('active');
  });
  if(CAL_CURRENT_VIEW === 'day') document.getElementById('cal-view-day')?.classList.add('active');
  if(CAL_CURRENT_VIEW === 'week') document.getElementById('cal-view-week')?.classList.add('active');
  if(CAL_CURRENT_VIEW === 'month') document.getElementById('cal-view-month')?.classList.add('active');
  if(CAL_CURRENT_VIEW === 'year') document.getElementById('cal-view-year')?.classList.add('active');
}

document.getElementById('cal-view-day')?.addEventListener('click', ()=>{
  CAL_CURRENT_VIEW = 'day';
  calSyncViewButtons();
  calRender();
});
document.getElementById('cal-view-week')?.addEventListener('click', ()=>{
  CAL_CURRENT_VIEW = 'week';
  calSyncViewButtons();
  calRender();
});
document.getElementById('cal-view-month')?.addEventListener('click', ()=>{
  CAL_CURRENT_VIEW = 'month';
  calSyncViewButtons();
  calRender();
});
document.getElementById('cal-view-year')?.addEventListener('click', ()=>{
  CAL_CURRENT_VIEW = 'year';
  calSyncViewButtons();
  calRender();
});

document.getElementById('cal-filter-toggle')?.addEventListener('click', ()=>{
  const input = document.getElementById('cal-filter-input');
  if(!input) return;
  const visible = input.style.display !== 'none';
  if(visible){
    input.style.display = 'none';
    input.value = '';
    calRender();
  }else{
    input.style.display = '';
    input.focus();
  }
});
document.getElementById('cal-filter-input')?.addEventListener('input', ()=>{
  calRender();
});

async function calLoadEvents(){
  try{
    const list = await apiGet(CAL_API_ACTION_LIST, {});
    CAL_EVENTS = Array.isArray(list) ? list.map(ev => calNormalizeEvent(ev)) : [];
    console.log('CAL_EVENTS normalized:', CAL_EVENTS);  // ← log 2
  }catch(e){
    CAL_EVENTS = [];
    Swal.fire({icon:'error',title:'Error cargando calendario',text:String(e.message||e)});
  }
}

function calNormalizeEvent(ev){
  const out = Object.assign({}, ev||{});
  out.codigo = String(out.codigo||'');
  out.fechaEvento = String(out.fechaEvento||'');
  out.nombreEvento = String(out.nombreEvento||'');
  out.secretaria = String(out.secretaria||'');
  out.estado = String(out.estado||'').toUpperCase() || 'PROGRAMADO';
  out.horaInicioAMPM = String(out.horaInicio||'');
  out.horaTerminacionAMPM = String(out.horaTerminacion||'');
  const hi = calHMFromAmPm(out.horaInicioAMPM);
  const hf = calHMFromAmPm(out.horaTerminacionAMPM);
  out.horaInicio24 = calPad2(hi.h) + ':' + calPad2(hi.m);
  out.horaTerminacion24 = calPad2(hf.h) + ':' + calPad2(hf.m);
  return out;
}

/* Formulario Registrar / Editar evento */

document.getElementById('cal-btn-new')?.addEventListener('click', ()=>{
  CAL_SELECTED_EVENT = null;
  calResetEventoForm();
  document.getElementById('evento-title').textContent = 'REGISTRAR EVENTO';
  showView('view-evento');
});

document.getElementById('evento-volver')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-calendario');
});

function calResetEventoForm(){
  document.getElementById('evento-codigo').value = '';
  document.getElementById('nombreEvento').value = '';
  document.getElementById('fechaEvento').value = '';
  document.getElementById('horaInicio').value = '';
  document.getElementById('horaTerminacion').value = '';
  document.getElementById('secretaria').value = '';
  document.getElementById('otros').value = '';
  document.getElementById('lugar').value = '';
  document.getElementById('detalles').value = '';
  document.getElementById('publicacion').value = '';
  document.getElementById('nombre').value = '';
  document.getElementById('contacto').value = '';
  document.getElementById('cargo').value = '';
  const checks = document.querySelectorAll('#requerimientos input[type="checkbox"]');
  checks.forEach(ch => ch.checked = false);
}

function calFillEventoForm(ev){
  // Asegurar que fechaEvento y publicacion queden en dd/mm/aaaa
  function ensureDMY(v){
    if (!v) return '';
    if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())){
      const dd = String(v.getDate()).padStart(2,'0');
      const mm = String(v.getMonth()+1).padStart(2,'0');
      const yy = v.getFullYear();
      return dd + '/' + mm + '/' + yy;
    }
    const s = String(v);
    // Si ya viene como dd/mm/aaaa, se respeta
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s.trim())) return s.trim();
    // Intentar parsear otras formas
    const d = new Date(s);
    if (!isNaN(d.getTime())){
      const dd = String(d.getDate()).padStart(2,'0');
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const yy = d.getFullYear();
      return dd + '/' + mm + '/' + yy;
    }
    return s;
  }

  document.getElementById('evento-codigo').value = ev.codigo || '';
  document.getElementById('nombreEvento').value = ev.nombreEvento || '';
  document.getElementById('fechaEvento').value = ensureDMY(ev.fechaEvento || '');
  document.getElementById('horaInicio').value = ev.horaInicio24 || '';
  document.getElementById('horaTerminacion').value = ev.horaTerminacion24 || '';
  document.getElementById('secretaria').value = ev.secretaria || '';
  document.getElementById('otros').value = ev.otros || '';
  document.getElementById('lugar').value = ev.lugar || '';
  document.getElementById('detalles').value = ev.detalles || '';
  document.getElementById('publicacion').value = ensureDMY(ev.publicacion || '');
  document.getElementById('nombre').value = ev.nombre || '';
  document.getElementById('contacto').value = ev.contacto || '';
  document.getElementById('cargo').value = ev.cargo || '';

  const checks = document.querySelectorAll('#requerimientos input[type="checkbox"]');
  checks.forEach(ch => {
    const labelVal = ch.value;
    const src = String(ev.requerimientos||'');
    ch.checked = src.indexOf(labelVal) !== -1;
  });
}

async function calOpenEventForEdit(codigo){
  try{
    const data = await apiGet(CAL_API_ACTION_GET, { codigo });
    if(!data){
      Swal.fire({icon:'info',title:'Evento no encontrado'});
      return;
    }
    const ev = calNormalizeEvent(data);
    CAL_SELECTED_EVENT = ev;
    calFillEventoForm(ev);
    document.getElementById('evento-title').textContent = 'EDITAR EVENTO';
    showView('view-evento');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:String(e.message||e)});
  }
}

/* Picker fechas formulario */

function calInitSimplePicker(dSelId,mSelId,aSelId){
  const dSel = document.getElementById(dSelId);
  const mSel = document.getElementById(mSelId);
  const aSel = document.getElementById(aSelId);
  if(dSel && !dSel.childElementCount){
    for(let d=1; d<=31; d++){
      const opt = document.createElement('option');
      opt.value = calPad2(d);
      opt.textContent = opt.value;
      dSel.appendChild(opt);
    }
  }
  if(mSel && !mSel.childElementCount){
    const mesesNombres=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    for(let i=0;i<12;i++){
      const opt = document.createElement('option');
      opt.value = calPad2(i+1);
      opt.textContent = mesesNombres[i];
      mSel.appendChild(opt);
    }
  }
  if(aSel && !aSel.childElementCount){
    const fixedYear = 2026;
    const opt = document.createElement('option');
    opt.value = String(fixedYear);
    opt.textContent = String(fixedYear);
    opt.selected = true;
    aSel.appendChild(opt);
  }
}

calInitSimplePicker('evtDia','evtMes','evtAnio');
calInitSimplePicker('pubDia','pubMes','pubAnio');

document.getElementById('fechaEvento')?.addEventListener('click', ()=>{
  const m = document.getElementById('eventoFechaModal');
  if(m){
    m.style.display = 'flex';
    m.setAttribute('aria-hidden','false');
  }
});
document.getElementById('evtFechaCancelar')?.addEventListener('click', ()=>{
  const m = document.getElementById('eventoFechaModal');
  if(m){
    m.style.display = 'none';
    m.setAttribute('aria-hidden','true');
  }
});
document.getElementById('evtFechaOk')?.addEventListener('click', ()=>{
  const d = document.getElementById('evtDia')?.value || '01';
  const m = document.getElementById('evtMes')?.value || '01';
  const y = document.getElementById('evtAnio')?.value || String(new Date().getFullYear());
  document.getElementById('fechaEvento').value = d + '/' + m + '/' + y;
  const modal = document.getElementById('eventoFechaModal');
  if(modal){
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden','true');
  }
});

document.getElementById('publicacion')?.addEventListener('click', ()=>{
  const m = document.getElementById('publicacionFechaModal');
  if(m){
    m.style.display = 'flex';
    m.setAttribute('aria-hidden','false');
  }
});
document.getElementById('pubFechaCancelar')?.addEventListener('click', ()=>{
  const m = document.getElementById('publicacionFechaModal');
  if(m){
    m.style.display = 'none';
    m.setAttribute('aria-hidden','true');
  }
});
document.getElementById('pubFechaOk')?.addEventListener('click', ()=>{
  const d = document.getElementById('pubDia')?.value || '01';
  const m = document.getElementById('pubMes')?.value || '01';
  const y = document.getElementById('pubAnio')?.value || String(new Date().getFullYear());
  document.getElementById('publicacion').value = d + '/' + m + '/' + y;
  const modal = document.getElementById('publicacionFechaModal');
  if(modal){
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden','true');
  }
});

// AUTOCOMPLETE RESPONSABLE (simple, sin AbortController)
function bindResponsablesQuery(){
  const input = document.getElementById('nombre');          // Responsable
  const list  = document.getElementById('dl-responsables'); // datalist
  const contactoInput = document.getElementById('contacto'); // Contacto (automático)
  if(!input || !list || !contactoInput) return;

  let t = null;

  // Cargar sugerencias desde la hoja CONTRATISTAS (columna B, devuelve también teléfono)
  input.addEventListener('input', ()=>{
    const q = input.value.trim();

    // Siempre que cambia el texto, limpiamos el contacto hasta que haya match
    contactoInput.value = '';

    // Si el usuario aún no ha escrito nada, no consultamos
    if(t) clearTimeout(t);
    if(!q){
      list.innerHTML = '';
      return;
    }

    t = setTimeout(async ()=>{
      try{
        const url = new URL(API_BASE);
        url.search = new URLSearchParams({
          action: 'getResponsablesCalendario',
          query: q
        }).toString();

        const r = await fetch(url.toString(), { method:'GET' });
        const j = await r.json();
        const data = (j && j.ok && Array.isArray(j.data)) ? j.data : [];

        list.innerHTML = '';
        data.forEach(item=>{
          const opt = document.createElement('option');
          opt.value = item.nombre;                        // texto visible
          opt.setAttribute('data-contacto', item.contacto || '');
          list.appendChild(opt);
        });

        // Después de recargar el datalist, intentamos rellenar contacto
        // si el valor escrito ya coincide exactamente con alguna opción.
        rellenarContactoDesdeDatalist(input.value, list, contactoInput);
      }catch(_){}
    }, 200);
  });

  // También al salir del campo o al confirmar manualmente
  input.addEventListener('change', ()=>{
    rellenarContactoDesdeDatalist(input.value, list, contactoInput);
  });
}

// Función auxiliar: busca el option por value y copia data-contacto a Contacto
function rellenarContactoDesdeDatalist(valor, list, contactoInput){
  const val = String(valor || '').trim();
  if(!val) return;

  const opt = Array.from(list.querySelectorAll('option')).find(o => o.value === val);
  if(!opt) return;

  const telRaw = opt.getAttribute('data-contacto') || '';
  const tel    = telRaw.replace(/\D/g, '');   // debe quedar 3103230712

  contactoInput.value = tel;
}

bindResponsablesQuery();
  
/* Guardar evento */
document.getElementById('evento-guardar')?.addEventListener('click', async ()=>{
  const codigo = document.getElementById('evento-codigo').value.trim();
  const nombreEvento = document.getElementById('nombreEvento').value.trim();
  const fechaEvento = document.getElementById('fechaEvento').value.trim();
  const horaInicio = document.getElementById('horaInicio').value.trim();
  const horaTerminacion = document.getElementById('horaTerminacion').value.trim();
  const secretaria = document.getElementById('secretaria').value;
  const otros = document.getElementById('otros').value.trim();
  const lugar = document.getElementById('lugar').value.trim();
  const detalles = document.getElementById('detalles').value.trim();
  const publicacion = document.getElementById('publicacion').value.trim();
  const responsable = document.getElementById('nombre').value.trim();
  const contacto = document.getElementById('contacto').value.trim();
  const cargo = document.getElementById('cargo').value.trim();

  if(!nombreEvento || !fechaEvento || !horaInicio || !horaTerminacion || !secretaria){
    Swal.fire({icon:'warning',title:'Campos requeridos',text:'Nombre, fecha, horas y secretaría son obligatorios.'});
    return;
  }

  const checks = document.querySelectorAll('#requerimientos input[type="checkbox"]');
  const reqs = [];
  checks.forEach(ch => { if(ch.checked) reqs.push(ch.value); });
  const requerimientosStr = reqs.join(', ');

  const allFilled = Boolean(
    nombreEvento &&
    fechaEvento &&
    horaInicio &&
    horaTerminacion &&
    secretaria &&
    detalles &&
    requerimientosStr &&
    otros &&
    lugar &&
    publicacion &&
    responsable &&
    contacto &&
    cargo
  );
  const estado = allFilled ? 'COMPLETADO' : 'PROGRAMADO';

  const body = {
    codigo,
    nombreEvento,
    fechaEvento,
    horaInicio,
    horaTerminacion,
    detalles,
    requerimientos: requerimientosStr,
    otros,
    lugar,
    publicacion,
    nombre: responsable,
    contacto,
    secretaria,
    cargo,
    estado
  };

  try{
    const res = await apiPost(CAL_API_ACTION_SAVE, body);
    if(!res || !res.success){
      Swal.fire({icon:'error',title:'Error al guardar',text:res && res.message ? res.message : 'Intenta nuevamente.'});
      return;
    }
    await calLoadEvents();
    Swal.fire({icon:'success',title:'Evento guardado',timer:1800,showConfirmButton:false});
    showView('view-calendario');
    calRender();
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:String(e.message||e)});
  }
});

  // Botón WhatsApp en formulario de Evento (usa el campo "contacto")
(function bindEventoWhatsappButton(){
  const btn = document.getElementById('contacto-wa-btn');
  const contactoInput = document.getElementById('contacto');
  if(!btn || !contactoInput) return;

  btn.addEventListener('click', ()=>{
    const raw = contactoInput.value || '';
    const tel = normalizeNumber57(raw);
    if(!tel){
      Swal.fire({icon:'info',title:'Sin teléfono válido',text:'No hay un número de contacto válido para este evento.'});
      return;
    }
    const url = 'https://wa.me/' + tel;
    window.open(url,'_blank');
  });
})();

  // ================== DIRECTORIO INSTITUCIONAL ==================
const ICON_DIR_MAPS   = 'https://res.cloudinary.com/dqqeavica/image/upload/v1760108968/ubicacion_zicnod.png';
const ICON_DIR_MAIL   = 'https://res.cloudinary.com/dqqeavica/image/upload/v1766266810/correo_czyyra.webp';
const ICON_DIR_WA     = 'https://res.cloudinary.com/dqqeavica/image/upload/v1759166341/WhatsApp_mljaqm.webp';
const ICON_DIR_TEL    = 'https://res.cloudinary.com/dqqeavica/image/upload/v1759952569/Llamada_hra2ch.webp';
const ICON_DIR_SHARE  = 'https://res.cloudinary.com/dqqeavica/image/upload/v1766267125/compartir_szoxv7.webp';

function normalizePhoneDigits(raw){
  return String(raw || '').replace(/\D/g,'');
}

function openWhatsAppFromNumber(raw){
  const digits = normalizePhoneDigits(raw);
  if(!digits) return;
  let num = digits;
  if(/^\d{10}$/.test(num)){
    num = '57' + num;
  }
  const url = 'https://wa.me/' + num;
  window.open(url, '_blank');
}

function openTelFromNumber(raw){
  const digits = normalizePhoneDigits(raw);
  if(!digits) return;
  window.location.href = 'tel:' + digits;
}

function buildShareText(item){
  const nombre   = item.nombre   || '';
  const dir      = item.direccion|| '';
  const maps     = item.maps     || '';
  const correo   = item.correo   || '';
  const wa       = item.whatsapp || '';
  const tel      = item.telefono || '';

  const waDigits = normalizePhoneDigits(wa);
  const waUrl    = waDigits ? ('wa.me/' + waDigits) : '';

  return (
    '*INFORMACIÓN DE CONTACTO:*\n\n' +
    '*CONTACTO:* ' + (nombre || '-') + '\n' +
    '*DIRECCIÓN:* ' + (dir || '-') + '\n' +
    '*UBICACIÓN:* ' + (maps || '-') + '\n' +
    '*CORREO:* ' + (correo || '-') + '\n' +
    '*WHATSAPP:* ' + (waUrl || '-') + '\n' +
    '*TELEFONO:* ' + (tel || '-')
  );
}

function buildClipboardText(item){
  const nombre   = item.nombre   || '';
  const dir      = item.direccion|| '';
  const correo   = item.correo   || '';
  const wa       = item.whatsapp || '';
  const tel      = item.telefono || '';

  return (
    'CONTACTO: ' + (nombre || '-') + '\n' +
    'DIRECCIÓN: ' + (dir || '-') + '\n' +
    'CORREO: ' + (correo || '-') + '\n' +
    'WHATSAPP: ' + (wa || '-') + '\n' +
    'TELEFONO: ' + (tel || '-')
  );
}

async function showDirectorioShareDialog(item){
  const html =
    '<b>CONTACTO:</b> ' + (item.nombre || '-') + '<br>' +
    '<b>DIRECCIÓN:</b> ' + (item.direccion || '-') + '<br>' +
    '<b>CORREO:</b> ' + (item.correo || '-') + '<br>' +
    '<b>WHATSAPP:</b> ' + (item.whatsapp || '-') + '<br>' +
    '<b>TELEFONO:</b> ' + (item.telefono || '-');

  const result = await Swal.fire({
    icon:'success',
    title:'Información de Contacto',
    html:html,
    showDenyButton:true,
    showCancelButton:true,
    confirmButtonText:'Copiar Portapapeles',
    denyButtonText:'Compartir',
    cancelButtonText:'Atrás'
  });

  if(result.isConfirmed){
    const text = buildClipboardText(item);
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
      }
      await Swal.fire({
        icon:'success',
        title:'Información Copiada',
        timer:2000,
        showConfirmButton:false
      });
    }catch(e){
      await Swal.fire({
        icon:'error',
        title:'No se pudo copiar',
        text:String(e.message||e)
      });
    }
    return;
  }

  if(result.isDenied){
    const shareText = buildShareText(item);
    const esMovil = /android|iphone|ipad|mobile/i.test(navigator.userAgent || '');
    const enc = encodeURIComponent(shareText);
    const url = esMovil
      ? 'whatsapp://send?text=' + enc
      : 'https://api.whatsapp.com/send?text=' + enc;
    window.open(url,'_blank');
  }
}

function renderDirectorio(items){
  const wrap = document.getElementById('dir-list');
  if(!wrap) return;
  wrap.innerHTML = '';

  if(!items.length){
    const p = document.createElement('p');
    p.className = 'muted center';
    p.textContent = 'No hay contactos institucionales disponibles.';
    wrap.appendChild(p);
    return;
  }

  items.forEach(it => {
    const item = document.createElement('div');
    item.className = 'contact-item';

    const main = document.createElement('div');
    main.className = 'contact-main';

    const nameEl = document.createElement('div');
    nameEl.className = 'contact-name';
    nameEl.textContent = it.nombre || '';

    const addrEl = document.createElement('div');
    addrEl.className = 'contact-address';
    addrEl.textContent = it.direccion || '';

    main.appendChild(nameEl);
    main.appendChild(addrEl);
    item.appendChild(main);

    const actions = document.createElement('div');
    actions.className = 'contact-actions-row';

    if(it.maps){
      const a = document.createElement('a');
      a.href = it.maps;
      a.target = '_blank';
      a.rel = 'noopener';
      const img = document.createElement('img');
      img.src = ICON_DIR_MAPS;
      img.alt = '';
      a.appendChild(img);
      actions.appendChild(a);
    }

    if(it.correo){
      const a = document.createElement('a');
      a.href = 'mailto:' + it.correo;
      const img = document.createElement('img');
      img.src = ICON_DIR_MAIL;
      img.alt = '';
      a.appendChild(img);
      actions.appendChild(a);
    }

    if(it.whatsapp){
      const a = document.createElement('a');
      a.href = 'javascript:void(0)';
      a.addEventListener('click', ()=> openWhatsAppFromNumber(it.whatsapp));
      const img = document.createElement('img');
      img.src = ICON_DIR_WA;
      img.alt = '';
      a.appendChild(img);
      actions.appendChild(a);
    }

    if(it.telefono){
      const a = document.createElement('a');
      a.href = 'javascript:void(0)';
      a.addEventListener('click', ()=> openTelFromNumber(it.telefono));
      const img = document.createElement('img');
      img.src = ICON_DIR_TEL;
      img.alt = '';
      a.appendChild(img);
      actions.appendChild(a);
    }

    const btnShare = document.createElement('button');
    const imgShare = document.createElement('img');
    imgShare.src = ICON_DIR_SHARE;
    imgShare.alt = '';
    btnShare.appendChild(imgShare);
    btnShare.addEventListener('click', ()=> showDirectorioShareDialog(it));
    actions.appendChild(btnShare);

    item.appendChild(actions);
    wrap.appendChild(item);
  });
}

// Listener botón MENÚ → DIRECTORIO, con sonido
document.getElementById('go-directorio')?.addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);
  overlay.classList.remove('open');

  if(!currentUser){
    Swal.fire({icon:'warning', title:'Sesión inválida'}); 
    return;
  }
  try{
    const list = await apiGet('listDirectorio', {});
    renderDirectorio(Array.isArray(list) ? list : []);
    showView('view-directorio');
  }catch(e){
    Swal.fire({icon:'error', title:'Error', text:String(e.message||e)});
  }
});

// Botón Regresar en vista directorio
document.getElementById('dir-volver')?.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== AUTO-ACTUALIZACIÓN (version.json) ================== */
let __APP_VERSION_LOADED = '';
let __versionCheckInFlight = false;

async function checkAppVersion(){
  if(__versionCheckInFlight) return;
  __versionCheckInFlight = true;
  try{
    const url = 'version.json?t=' + Date.now();
    const r = await fetch(url, { cache: 'no-store' });
    if(!r.ok) return;
    const j = await r.json();
    const serverVersion = String(j.version || '').trim();
    if(!serverVersion) return;

    // Primera lectura: guardar la versión actual y pintarla en login
    if(!__APP_VERSION_LOADED){
      __APP_VERSION_LOADED = serverVersion;
      const el = document.getElementById('app-version');
      if(el) el.textContent = 'Versión ' + serverVersion;
      return;
    }

    // Lecturas posteriores: si cambió, recargar silenciosamente
    if(serverVersion !== __APP_VERSION_LOADED){
      try{
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }catch(_){}
      location.reload();
    }
  }catch(_){
    /* silencio: sin red no hay actualización */
  }finally{
    __versionCheckInFlight = false;
  }
}

// Recarga automática cuando el SW nuevo toma control (solo una vez por sesión de página)
if('serviceWorker' in navigator){
  let __reloadingFromSW = false;
  navigator.serviceWorker.addEventListener('controllerchange', ()=>{
    if(__reloadingFromSW) return;
    // Evitar loop: solo recargar si NO veníamos de una recarga reciente
    const lastReload = Number(sessionStorage.getItem('__swReloadTs') || 0);
    const now = Date.now();
    if(now - lastReload < 10000) return; // si recargamos hace menos de 10s, no recargar otra vez
    __reloadingFromSW = true;
    sessionStorage.setItem('__swReloadTs', String(now));
    location.reload();
  });
}

// Chequeo al cargar la página
window.addEventListener('load', ()=>{ checkAppVersion(); });

// Chequeo cada vez que la pestaña/PWA vuelve a estar visible (máx 1 vez cada 30s)
let __lastVersionCheck = Date.now();
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden) return;
  const now = Date.now();
  if(now - __lastVersionCheck < 30000) return;
  __lastVersionCheck = now;
  checkAppVersion();
});
