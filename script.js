const firebaseConfig = {
  apiKey: "AIzaSyBLHw-5Rdxq-2DNTJTNuXOZOfFAb68VnQI",
  authDomain: "viaje-juquilita.firebaseapp.com",
  databaseURL: "https://viaje-juquilita-default-rtdb.firebaseio.com",
  projectId: "viaje-juquilita",
  storageBucket: "viaje-juquilita.firebasestorage.app",
  messagingSenderId: "213243430629",
  appId: "1:213243430629:web:c8b3ffc05c260cd800f60c",
  measurementId: "G-S9P6FLE2YF"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const TOTAL_SEATS = 45;

document.addEventListener('DOMContentLoaded', () => {
  const busGrid = document.getElementById('busGrid');
  const seatInput = document.getElementById('seatNumber');
  const passengerForm = document.getElementById('passengerForm');
  const passengerNameInput = document.getElementById('passengerName');
  const passengerPhoneInput = document.getElementById('passengerPhone');
  const passengerTypeSelect = document.getElementById('passengerType');
  const passengerListBody = document.getElementById('passengerListBody');
  const totalRegisteredSpan = document.getElementById('totalRegistered');
  const totalCostInput = document.getElementById('totalCost');
  const pricePerPersonInput = document.getElementById('pricePerPerson');
  const costPerSeatSpan = document.getElementById('costPerSeat');
  const costPerOccupiedSpan = document.getElementById('costPerOccupied');
  const totalCollectedSpan = document.getElementById('totalCollected');
  const totalPendingSpan = document.getElementById('totalPending');
  const busShortfallSpan = document.getElementById('busShortfall');
  const paidAmountInput = document.getElementById('paidAmount');
  const paymentStatusSelect = document.getElementById('paymentStatus');
  const btnSubmitForm = document.getElementById('btnSubmitForm');
  const currentBusTitle = document.getElementById('currentBusTitle');
  const costLabelBus = document.getElementById('costLabelBus');
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');
  const globalStats = document.getElementById('globalStats');
  const connStatus = document.getElementById('connStatus');
  const countdownPill = document.getElementById('countdown');
  const departureInput = document.getElementById('departureDate');
  const filterChips = document.getElementById('filterChips');

  const seatLegend = document.getElementById('seatLegend');

  // Entrada al mar
  const seaCostInput = document.getElementById('seaCost');
  const seaBody = document.getElementById('seaBody');
  const seaChips = document.getElementById('seaChips');
  let seaData = { costo: 0, pagos: {} }; // pagos: { "autobus_1_5": { name, amount } }
  let seaFilter = 'all';
  let seaRenderPending = false;

  // Pase de lista
  const boardingList = document.getElementById('boardingList');
  let boardingData = {}; // { autobus_1: { "5": "Nombre" } }

  let paymentFilter = 'all'; // 'all' | 'Pendiente' | 'Anticipo' | 'Pagado'
  let mapFilter = null;      // null | 'libre' | 'pagado' | 'anticipo' | 'pendiente'
  let seatCounts = { libre: 0, pagado: 0, anticipo: 0, pendiente: 0 };
  let departureDate = '';    // "AAAA-MM-DDTHH:MM" guardado en Firebase

  let currentBusKey = 'autobus_1'; // 'autobus_1' o 'autobus_2'
  let selectedSeatNumber = null; // asiento marcado en el mapa
  let editingSeatNumber = null;  // asiento ocupado que se está editando

  const emptyBusData = () => ({ asientos: {}, costoTotal: 0, precioPorPersona: 0 });
  let dataAutobus1 = emptyBusData();
  let dataAutobus2 = emptyBusData();

  // Nodo del Autobús 1 (donde están tus datos actuales)
  const refBus1 = db.ref('viaje_oaxaca');
  // Nodo del Autobús 2
  const refBus2 = db.ref('viaje_oaxaca_bus2');

  // ---------- UTILIDADES ----------
  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  function el(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    if (opts.className) node.className = opts.className;
    if (opts.text !== undefined) node.textContent = opts.text;
    if (opts.onClick) node.addEventListener('click', opts.onClick);
    if (opts.colSpan) node.colSpan = opts.colSpan;
    children.forEach(c => node.appendChild(c));
    return node;
  }

  // ---------- SINCRONIZACIÓN CON FIREBASE ----------
  function readBus(snapshot) {
    const data = snapshot.val() || {};
    return {
      asientos: data.asientos || {},
      costoTotal: Number(data.costoTotal) || 0,
      precioPorPersona: Number(data.precioPorPersona) || 0
    };
  }

  // ---------- 🔐 LOGIN (solo las cuentas creadas en Firebase) ----------
  const auth = firebase.auth();
  const loginScreen = document.getElementById('loginScreen');
  const loginForm = document.getElementById('loginForm');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');
  const btnLogin = document.getElementById('btnLogin');
  const appArea = document.getElementById('appArea');
  const userChip = document.getElementById('userChip');

  const loginErrors = {
    'auth/invalid-email': 'El correo no es válido.',
    'auth/user-not-found': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/invalid-login-credentials': 'Correo o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
    'auth/network-request-failed': 'Sin internet. Revisa tu conexión.'
  };

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.textContent = '';
    btnLogin.disabled = true;
    auth.signInWithEmailAndPassword(loginEmail.value.trim(), loginPassword.value)
      .catch(err => { loginError.textContent = loginErrors[err.code] || `No se pudo entrar (${err.code}).`; })
      .finally(() => { btnLogin.disabled = false; });
  });

  document.getElementById('btnForgot').addEventListener('click', () => {
    const email = loginEmail.value.trim();
    if (!email) {
      loginError.textContent = 'Escribe tu correo arriba y vuelve a tocar "Olvidé mi contraseña".';
      return;
    }
    auth.sendPasswordResetEmail(email)
      .then(() => { loginError.textContent = '📧 Si el correo está registrado, te llegó un enlace para cambiar la contraseña.'; })
      .catch(err => { loginError.textContent = loginErrors[err.code] || `No se pudo enviar (${err.code}).`; });
  });

  document.getElementById('btnLogout').addEventListener('click', () => {
    if (confirm('¿Cerrar sesión?')) auth.signOut();
  });

  let wasLoggedIn = false;
  auth.onAuthStateChanged((user) => {
    // Al cerrar sesión se recarga la página para no dejar datos en memoria
    if (!user && wasLoggedIn) {
      location.reload();
      return;
    }
    wasLoggedIn = !!user;
    if (user) {
      loginScreen.hidden = true;
      appArea.hidden = false;
      userChip.hidden = false;
      document.getElementById('userEmail').textContent = user.email || '';
      loginPassword.value = '';
      startSync();
    } else {
      stopSync();
      loginScreen.hidden = false;
      appArea.hidden = true;
      userChip.hidden = true;
    }
  });

  // Si la cuenta no tiene permiso (no es tuya ni de tu mamá), se le saca
  function onDenied() {
    stopSync();
    wasLoggedIn = false; // no recargar, para que se vea el mensaje
    auth.signOut();
    loginError.textContent = '⛔ Esta cuenta no tiene permiso para ver el viaje.';
  }

  // ---------- SINCRONIZACIÓN EN VIVO (solo con sesión iniciada) ----------
  const syncRefs = [];
  function listen(ref, cb) {
    ref.on('value', cb, onDenied);
    syncRefs.push(ref);
  }

  function stopSync() {
    syncRefs.splice(0).forEach(ref => ref.off());
  }

  function startSync() {
    stopSync();

    listen(refBus1, (snapshot) => {
      dataAutobus1 = readBus(snapshot);
      if (currentBusKey === 'autobus_1') renderCurrentBus();
      renderGlobalStats();
      renderSea();
    });

    listen(refBus2, (snapshot) => {
      dataAutobus2 = readBus(snapshot);
      if (currentBusKey === 'autobus_2') renderCurrentBus();
      renderGlobalStats();
      renderSea();
    });

    listen(db.ref('entrada_mar'), (snap) => {
      const data = snap.val() || {};
      seaData = { costo: Number(data.costo) || 0, pagos: data.pagos || {} };
      renderSea();
    });

    listen(db.ref('abordaje'), (snap) => {
      boardingData = snap.val() || {};
      renderBoarding();
    });

    // Fecha de salida compartida (para la cuenta regresiva)
    listen(db.ref('viaje_info/fechaSalida'), (snap) => {
      departureDate = snap.val() || '';
      if (document.activeElement !== departureInput) departureInput.value = departureDate;
      updateCountdown();
    });
  }

  // Indicador de conexión en vivo
  db.ref('.info/connected').on('value', (snap) => {
    const online = snap.val() === true;
    connStatus.textContent = online ? '🟢 En línea' : '🔴 Sin conexión · se guardará al reconectar';
    connStatus.classList.toggle('offline', !online);
  });

  departureInput.addEventListener('change', () => {
    db.ref('viaje_info/fechaSalida').set(departureInput.value || null);
  });

  function updateCountdown() {
    if (!departureDate) {
      countdownPill.hidden = true;
      return;
    }
    const diff = new Date(departureDate).getTime() - Date.now();
    countdownPill.hidden = false;
    if (isNaN(diff)) {
      countdownPill.hidden = true;
    } else if (diff <= 0 && diff > -4 * 24 * 3600 * 1000) {
      countdownPill.textContent = '🎉 ¡El viaje ya comenzó!';
    } else if (diff <= 0) {
      countdownPill.textContent = '🏠 Viaje terminado';
    } else {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      countdownPill.textContent = days > 0
        ? `⏳ Faltan ${days} día${days === 1 ? '' : 's'} y ${hours} h`
        : `⏳ Faltan ${hours} h ${mins} min`;
    }
  }
  setInterval(updateCountdown, 60000);

  // Resumen de ambos autobuses
  function busTotals(data) {
    const passengers = Object.values(data.asientos || {}).filter(Boolean);
    const price = getPricePerPerson(data);
    let collected = 0;
    let pending = 0;
    let paidCount = 0;
    passengers.forEach(p => {
      const amount = Number(p.amount) || 0;
      collected += amount;
      pending += Math.max(price - amount, 0);
      if (p.payment === 'Pagado') paidCount++;
    });
    return { occupied: passengers.length, collected, pending, paidCount };
  }

  function renderGlobalStats() {
    const b1 = busTotals(dataAutobus1);
    const b2 = busTotals(dataAutobus2);
    const occupied = b1.occupied + b2.occupied;
    const stats = [
      ['👥 Pasajeros', `${occupied}/${TOTAL_SEATS * 2}`, `Bus 1: ${b1.occupied} · Bus 2: ${b2.occupied}`],
      ['💺 Lugares libres', `${TOTAL_SEATS * 2 - occupied}`, `Bus 1: ${TOTAL_SEATS - b1.occupied} · Bus 2: ${TOTAL_SEATS - b2.occupied}`],
      ['💰 Recaudado total', money(b1.collected + b2.collected), `${b1.paidCount + b2.paidCount} pagados completos`],
      ['🧾 Por cobrar total', money(b1.pending + b2.pending), `Bus 1: ${money(b1.pending)} · Bus 2: ${money(b2.pending)}`]
    ];
    globalStats.innerHTML = '';
    stats.forEach(([label, value, sub]) => {
      globalStats.appendChild(el('div', { className: 'stat' }, [
        el('div', { className: 'stat-label', text: label }),
        el('div', { className: 'stat-value', text: value }),
        el('div', { className: 'stat-sub', text: sub })
      ]));
    });
  }

  // Filtro por estado de pago
  filterChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    paymentFilter = chip.dataset.filter;
    filterChips.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
    filterPassengers();
  });

  // Mensajito flotante
  function toast(message) {
    const t = el('div', { className: 'toast', text: message });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  // 🎉 Confeti cuando alguien termina de pagar
  function celebrate() {
    const colors = ['#22c55e', '#eab308', '#2563eb', '#ef4444', '#0d9488', '#f97316'];
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti';
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 4000);
    }
  }

  // Link de WhatsApp con recordatorio de pago personalizado
  function whatsappLink(item, seatNum, balance) {
    let digits = String(item.phone || '').replace(/\D/g, '');
    if (digits.length === 10) digits = `52${digits}`; // número de México sin lada de país
    if (digits.length < 11) return null;

    const busName = currentBusKey === 'autobus_1' ? 'Autobús 1' : 'Autobús 2';
    const amount = Number(item.amount) || 0;
    const message = balance > 0
      ? `Hola ${item.name} 👋, te recordamos tu lugar en el asiento #${seatNum} del ${busName} para el viaje familiar a Oaxaca 🚌. Llevas abonado ${money(amount)} y te faltan ${money(balance)}. ¡Gracias!`
      : `Hola ${item.name} 👋, tu asiento #${seatNum} del ${busName} para el viaje familiar a Oaxaca 🚌 ya está pagado completo ✅. ¡Nos vemos en el viaje!`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  // Copiar la lista del autobús en formato para pegar en el grupo de WhatsApp
  window.copyListForWhatsApp = function() {
    const data = getActiveData();
    const seats = data.asientos || {};
    const keys = Object.keys(seats).filter(k => seats[k]).sort((a, b) => a - b);
    if (keys.length === 0) {
      toast('No hay pasajeros en este autobús.');
      return;
    }
    const busName = currentBusKey === 'autobus_1' ? 'Autobús 1' : 'Autobús 2';
    const icon = { Pagado: '✅', Anticipo: '🟡', Pendiente: '❌' };
    const totals = busTotals(data);
    const lines = [
      `🚌 *Viaje Familiar Oaxaca – ${busName}*`,
      `👥 ${keys.length}/${TOTAL_SEATS} lugares ocupados`,
      '',
      ...keys.map(k => `#${k} ${seats[k].name} ${icon[seats[k].payment] || '❌'}`),
      '',
      '✅ Pagado · 🟡 Anticipo · ❌ Pendiente',
      `💰 Recaudado: ${money(totals.collected)} · Por cobrar: ${money(totals.pending)}`
    ];
    const text = lines.join('\n');

    const done = () => toast('📋 Lista copiada, pégala en WhatsApp');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  };

  function fallbackCopy(text, done) {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      done();
    } catch (e) {
      prompt('Copia la lista:', text);
    }
    area.remove();
  }

  function getActiveData() {
    return currentBusKey === 'autobus_1' ? dataAutobus1 : dataAutobus2;
  }

  function getActiveRef() {
    return currentBusKey === 'autobus_1' ? refBus1 : refBus2;
  }

  // Precio que se le cobra a cada pasajero:
  // el "precio por persona" si está definido; si no, el costo del autobús entre 45.
  function getPricePerPerson(data = getActiveData()) {
    if (data.precioPorPersona > 0) return data.precioPorPersona;
    return data.costoTotal > 0 ? data.costoTotal / TOTAL_SEATS : 0;
  }

  // ---------- RENDER ----------
  function renderCurrentBus() {
    const activeData = getActiveData();
    const seatsData = activeData.asientos || {};

    // No sobrescribir el campo mientras el usuario está escribiendo en él
    if (document.activeElement !== totalCostInput) {
      totalCostInput.value = activeData.costoTotal > 0 ? activeData.costoTotal : '';
    }
    if (document.activeElement !== pricePerPersonInput) {
      pricePerPersonInput.value = activeData.precioPorPersona > 0 ? activeData.precioPorPersona : '';
    }
    pricePerPersonInput.placeholder = activeData.costoTotal > 0
      ? `Sugerido: ${(activeData.costoTotal / TOTAL_SEATS).toFixed(2)}`
      : 'Ej. 600';

    busGrid.innerHTML = '';
    seatCounts = { libre: 0, pagado: 0, anticipo: 0, pendiente: 0 };
    let seatCounter = 1;

    // 10 filas de 4 asientos con pasillo central
    for (let row = 0; row < 10; row++) {
      for (let col = 1; col <= 5; col++) {
        if (col === 3) {
          const aisle = document.createElement('div');
          aisle.classList.add('seat', 'aisle');
          busGrid.appendChild(aisle);
        } else {
          createSeatButton(seatCounter, seatsData);
          seatCounter++;
        }
      }
    }

    // Fila trasera de 5 asientos (41 al 45)
    for (let col = 1; col <= 5; col++) {
      createSeatButton(seatCounter, seatsData);
      seatCounter++;
    }

    updateLegendCounts();
    renderBoarding();
    updatePassengerList(seatsData);
    calculateCosts(seatsData, activeData);
    filterPassengers();
  }

  // Estado de un asiento para colorearlo en el mapa
  function seatStatus(item) {
    if (!item) return 'libre';
    if (item.payment === 'Pagado') return 'pagado';
    if (item.payment === 'Anticipo') return 'anticipo';
    return 'pendiente';
  }

  // Leyenda clicable: resalta solo los asientos de ese color (otro clic lo quita)
  seatLegend.addEventListener('click', (e) => {
    const item = e.target.closest('.legend-item');
    if (!item) return;
    mapFilter = mapFilter === item.dataset.status ? null : item.dataset.status;
    seatLegend.querySelectorAll('.legend-item').forEach(b => b.classList.toggle('active', b.dataset.status === mapFilter));
    renderCurrentBus();
  });

  function updateLegendCounts() {
    seatLegend.querySelectorAll('[data-count]').forEach(span => {
      span.textContent = seatCounts[span.dataset.count];
    });
  }

  function createSeatButton(number, seatsData) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('seat');
    btn.textContent = number;

    const status = seatStatus(seatsData[number]);
    seatCounts[status]++;
    if (seatsData[number]) {
      btn.classList.add('occupied', `status-${status}`);
      btn.title = `${seatsData[number].name || ''} · ${seatsData[number].payment || 'Pendiente'}`;
    } else {
      btn.title = 'Libre';
    }

    if (mapFilter && mapFilter !== status && number !== selectedSeatNumber) {
      btn.classList.add('dimmed');
    }

    if (number === selectedSeatNumber) {
      btn.classList.add('selected');
    }

    btn.addEventListener('click', () => {
      if (seatsData[number]) {
        editPassenger(number);
      } else {
        // Si venías de editar un asiento ocupado, limpia sus datos para no copiarlos al nuevo
        if (editingSeatNumber !== null) {
          passengerForm.reset();
          paidAmountInput.value = 0;
        }
        selectedSeatNumber = number;
        editingSeatNumber = null;
        seatInput.value = number;
        btnSubmitForm.textContent = `Guardar Asiento #${number}`;
        renderCurrentBus();
      }
    });

    busGrid.appendChild(btn);
  }

  function resetForm() {
    passengerForm.reset();
    paidAmountInput.value = 0;
    selectedSeatNumber = null;
    editingSeatNumber = null;
    seatInput.value = '';
    btnSubmitForm.textContent = 'Guardar Asiento';
  }

  window.switchBus = function(busName) {
    const btnBus1 = document.getElementById('btnBus1');
    const btnBus2 = document.getElementById('btnBus2');

    currentBusKey = busName === 'bus1' ? 'autobus_1' : 'autobus_2';
    resetForm();

    if (busName === 'bus1') {
      btnBus1.classList.add('active');
      btnBus2.classList.remove('active');
      currentBusTitle.textContent = '🚌 Distribución Autobús 1 (45 Asientos)';
      costLabelBus.textContent = 'Costo Autobús 1';
    } else {
      btnBus2.classList.add('active');
      btnBus1.classList.remove('active');
      currentBusTitle.textContent = '🚌 Distribución Autobús 2 (45 Asientos)';
      costLabelBus.textContent = 'Costo Autobús 2';
    }

    renderCurrentBus();
  };

  // Al cambiar el estado de pago se ajusta el monto
  window.toggleAmountInput = function() {
    const status = paymentStatusSelect.value;
    if (status === 'Pendiente') {
      paidAmountInput.value = 0;
    } else if (status === 'Pagado') {
      paidAmountInput.value = getPricePerPerson().toFixed(2);
    }
  };

  // Al escribir el monto se ajusta el estado de pago
  paidAmountInput.addEventListener('input', () => {
    const amount = parseFloat(paidAmountInput.value) || 0;
    const price = getPricePerPerson();
    if (amount <= 0) paymentStatusSelect.value = 'Pendiente';
    else if (price > 0 && amount >= price) paymentStatusSelect.value = 'Pagado';
    else paymentStatusSelect.value = 'Anticipo';
  });

  function editPassenger(seatNum) {
    const activeData = getActiveData();
    const item = (activeData.asientos || {})[seatNum];
    if (!item) return;

    selectedSeatNumber = seatNum;
    editingSeatNumber = seatNum;
    seatInput.value = seatNum;
    passengerNameInput.value = item.name || '';
    passengerPhoneInput.value = item.phone || '';
    passengerTypeSelect.value = item.type || 'Adulto';
    paymentStatusSelect.value = item.payment || 'Pendiente';
    paidAmountInput.value = item.amount || 0;

    btnSubmitForm.textContent = `Actualizar Asiento #${seatNum}`;
    passengerNameInput.focus();
    renderCurrentBus();
  }

  // Guardar en la base de datos (con transacción para evitar que dos personas
  // ocupen el mismo asiento al mismo tiempo)
  passengerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const seatNum = parseInt(seatInput.value, 10);
    const passenger = {
      name: passengerNameInput.value.trim(),
      phone: passengerPhoneInput.value.trim(),
      type: passengerTypeSelect.value,
      payment: paymentStatusSelect.value,
      amount: Math.max(parseFloat(paidAmountInput.value) || 0, 0)
    };

    if (!seatNum) {
      alert('Por favor selecciona un asiento en el mapa.');
      return;
    }

    const isEditing = editingSeatNumber === seatNum;
    const previous = (getActiveData().asientos || {})[seatNum];
    const justPaid = passenger.payment === 'Pagado' && (!previous || previous.payment !== 'Pagado');
    const busKeyAtSave = currentBusKey;
    btnSubmitForm.disabled = true;

    getActiveRef().child(`asientos/${seatNum}`).transaction((current) => {
      if (current !== null && !isEditing) {
        return; // abortar: alguien más ocupó el asiento
      }
      return passenger;
    }).then(({ committed }) => {
      if (committed) {
        // Si se corrigió el nombre, sus registros de entrada al mar y pase de lista lo siguen
        if (isEditing && previous && previous.name !== passenger.name) {
          const key = `${busKeyAtSave}_${seatNum}`;
          const updates = {};
          const seaRec = seaData.pagos[key];
          if (seaRec && seaRec.name === previous.name) updates[`entrada_mar/pagos/${key}/name`] = passenger.name;
          if ((boardingData[busKeyAtSave] || {})[seatNum] === previous.name) updates[`abordaje/${busKeyAtSave}/${seatNum}`] = passenger.name;
          if (Object.keys(updates).length) db.ref().update(updates);
        }
        resetForm();
        if (justPaid) {
          celebrate();
          toast(`🎉 ¡${passenger.name} ya pagó completo!`);
        } else {
          toast(`💾 Asiento #${seatNum} guardado`);
        }
      } else {
        alert(`El asiento #${seatNum} acaba de ser ocupado por otra persona. Elige otro asiento.`);
        resetForm();
        renderCurrentBus();
      }
    }).catch((err) => {
      alert(`No se pudo guardar: ${err.message}`);
    }).finally(() => {
      btnSubmitForm.disabled = false;
    });
  });

  // Liberar asiento en la base de datos
  function removePassenger(seatNum) {
    const busName = currentBusKey === 'autobus_1' ? 'Autobús 1' : 'Autobús 2';
    if (confirm(`¿Deseas liberar el asiento ${seatNum} del ${busName}?`)) {
      // Se borra el asiento junto con su entrada al mar y su pase de lista
      db.ref().update({
        [`${getActiveRef().key}/asientos/${seatNum}`]: null,
        [`entrada_mar/pagos/${currentBusKey}_${seatNum}`]: null,
        [`abordaje/${currentBusKey}/${seatNum}`]: null
      }).then(() => {
        if (selectedSeatNumber === seatNum) resetForm();
      }).catch((err) => {
        alert(`No se pudo liberar el asiento: ${err.message}`);
      });
    }
  }

  function updatePassengerList(seatsData) {
    passengerListBody.innerHTML = '';
    const keys = Object.keys(seatsData).filter(k => seatsData[k]).sort((a, b) => a - b);
    totalRegisteredSpan.textContent = keys.length;

    if (keys.length === 0) {
      const td = el('td', { text: 'No hay asientos asignados aún en este autobús.', colSpan: 8, className: 'empty-row' });
      passengerListBody.appendChild(el('tr', {}, [td]));
      return;
    }

    const price = getPricePerPerson();

    keys.forEach(seatKey => {
      const seatNum = Number(seatKey);
      const item = seatsData[seatKey];
      const amount = Number(item.amount) || 0;
      const balance = Math.max(price - amount, 0);

      let badgeClass = 'badge-pendiente';
      if (item.payment === 'Anticipo') badgeClass = 'badge-anticipo';
      if (item.payment === 'Pagado') badgeClass = 'badge-pagado';

      const actions = [
        el('button', { className: 'btn-edit', text: '✏️ Editar', onClick: () => editPassenger(seatNum) }),
        el('button', { className: 'btn-delete', text: 'Liberar', onClick: () => removePassenger(seatNum) })
      ];
      const waLink = whatsappLink(item, seatNum, balance);
      if (waLink) {
        const wa = el('a', { className: 'btn-whatsapp', text: '💬 WhatsApp' });
        wa.href = waLink;
        wa.target = '_blank';
        wa.rel = 'noopener';
        wa.title = balance > 0 ? 'Enviar recordatorio de pago' : 'Enviar confirmación de pago';
        actions.unshift(wa);
      }

      // Todo el texto se inserta con textContent para evitar inyección de HTML
      const tr = el('tr', {}, [
        el('td', {}, [el('strong', { text: `#${seatNum}` })]),
        el('td', { text: item.name || '' }),
        el('td', { text: item.phone || '-' }),
        el('td', { text: item.type || '' }),
        el('td', {}, [el('strong', { text: money(amount) })]),
        el('td', { text: money(balance), className: balance > 0 ? 'text-red' : 'text-green' }),
        el('td', {}, [el('span', { className: `badge ${badgeClass}`, text: item.payment || 'Pendiente' })]),
        el('td', {}, [el('div', { className: 'action-buttons' }, actions)])
      ]);
      tr.dataset.payment = item.payment || 'Pendiente';
      passengerListBody.appendChild(tr);
    });
  }

  function calculateCosts(seatsData, data) {
    const passengers = Object.values(seatsData).filter(Boolean);
    const occupiedCount = passengers.length;
    const total = data.costoTotal;
    const price = getPricePerPerson(data);

    let totalCollected = 0;
    let totalPending = 0;
    passengers.forEach(item => {
      const amount = parseFloat(item.amount) || 0;
      totalCollected += amount;
      totalPending += Math.max(price - amount, 0);
    });

    const perSeat = total / TOTAL_SEATS;
    const perOccupied = occupiedCount > 0 ? total / occupiedCount : 0;
    const shortfall = Math.max(total - totalCollected - totalPending, 0);

    costPerSeatSpan.textContent = money(perSeat);
    costPerOccupiedSpan.textContent = money(perOccupied);
    totalCollectedSpan.textContent = money(totalCollected);
    totalPendingSpan.textContent = money(totalPending);
    busShortfallSpan.textContent = money(shortfall);

    const pct = total > 0 ? Math.min((totalCollected / total) * 100, 100) : 0;
    progressBar.style.width = `${pct}%`;
    progressLabel.textContent = total > 0
      ? `Autobús pagado: ${pct.toFixed(0)}% (${money(totalCollected)} de ${money(total)})`
      : 'Escribe el costo del autobús para ver el avance';
  }

  // Guardar costo del autobús y precio por persona (con espera para no escribir en cada tecla)
  const saveTotalCost = debounce((busRef, val) => busRef.child('costoTotal').set(val), 700);
  const savePrice = debounce((busRef, val) => busRef.child('precioPorPersona').set(val), 700);

  totalCostInput.addEventListener('input', () => {
    saveTotalCost(getActiveRef(), Math.max(parseFloat(totalCostInput.value) || 0, 0));
  });
  pricePerPersonInput.addEventListener('input', () => {
    savePrice(getActiveRef(), Math.max(parseFloat(pricePerPersonInput.value) || 0, 0));
  });

  function filterPassengers() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const rows = passengerListBody.getElementsByTagName('tr');

    Array.from(rows).forEach(row => {
      const text = row.textContent.toLowerCase();
      const matchesText = text.includes(query);
      const matchesPayment = paymentFilter === 'all' || !row.dataset.payment || row.dataset.payment === paymentFilter;
      row.style.display = matchesText && matchesPayment ? '' : 'none';
    });
  }
  window.filterPassengers = filterPassengers;

  // Exportar a CSV compatible con Excel (acentos y comillas correctos)
  window.exportToCSV = function() {
    const activeData = getActiveData();
    const seatsData = activeData.asientos || {};
    const keys = Object.keys(seatsData).filter(k => seatsData[k]).sort((a, b) => a - b);

    if (keys.length === 0) {
      alert('No hay datos para exportar en este autobús.');
      return;
    }

    const price = getPricePerPerson();
    const csvField = (value) => {
      let s = String(value ?? '');
      if (/^[=@]/.test(s)) s = `'${s}`; // evitar que Excel lo interprete como fórmula
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows = [['Asiento', 'Nombre', 'Contacto', 'Tipo', 'Estado de Pago', 'Monto Abonado', 'Saldo']];
    keys.forEach(seat => {
      const item = seatsData[seat];
      const amount = Number(item.amount) || 0;
      rows.push([
        seat,
        item.name,
        item.phone || '',
        item.type,
        item.payment || 'Pendiente',
        amount.toFixed(2),
        Math.max(price - amount, 0).toFixed(2)
      ]);
    });

    const csv = '﻿' + rows.map(r => r.map(csvField).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const label = currentBusKey === 'autobus_1' ? 'Autobus_1' : 'Autobus_2';

    const link = document.createElement('a');
    link.href = url;
    link.download = `pasajeros_${label}_viaje_oaxaca.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  window.switchTab = function(tabName) {
    document.querySelectorAll('#mainTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.id === `tab-${tabName}`));
  };

  // ---------- UTILIDADES COMPARTIDAS ----------
  function busLabel(busKey) {
    return busKey === 'autobus_1' ? 'Autobús 1' : 'Autobús 2';
  }

  // Todos los pasajeros de los 2 autobuses, ordenados por autobús y asiento
  function allPassengers() {
    const list = [];
    [['autobus_1', dataAutobus1], ['autobus_2', dataAutobus2]].forEach(([busKey, data]) => {
      const seats = data.asientos || {};
      Object.keys(seats).filter(k => seats[k]).sort((a, b) => a - b).forEach(seat => {
        list.push({ busKey, seat: Number(seat), name: seats[seat].name || '' });
      });
    });
    return list;
  }

  function copyText(text, okMessage) {
    const done = () => toast(okMessage);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  // ---------- 🌊 ENTRADA AL MAR ----------
  function seaKey(p) {
    return `${p.busKey}_${p.seat}`;
  }

  // Lo que ha dado una persona (solo cuenta si el registro es de esa misma persona)
  function seaPaidBy(p) {
    const rec = seaData.pagos[seaKey(p)];
    return rec && rec.name === p.name ? Number(rec.amount) || 0 : 0;
  }

  function seaStatus(amount, cost) {
    if (amount <= 0) return 'Pendiente';
    if (cost > 0 && amount >= cost) return 'Pagado';
    return 'Anticipo';
  }

  function setSeaAmount(p, amount) {
    amount = Math.max(Number(amount) || 0, 0);
    const before = seaPaidBy(p);
    db.ref(`entrada_mar/pagos/${seaKey(p)}`)
      .set(amount > 0 ? { name: p.name, amount } : null)
      .then(() => {
        const cost = seaData.costo;
        if (cost > 0 && amount >= cost && before < cost) {
          celebrate();
          toast(`🌊 ¡${p.name} ya pagó su entrada al mar!`);
        }
      })
      .catch(err => alert(`No se pudo guardar: ${err.message}`));
  }

  function renderSea() {
    // No redibujar mientras alguien escribe un monto (se perdería lo que escribe)
    if (seaBody.contains(document.activeElement)) {
      seaRenderPending = true;
      return;
    }
    seaRenderPending = false;

    const cost = seaData.costo;
    if (document.activeElement !== seaCostInput) {
      seaCostInput.value = cost > 0 ? cost : '';
    }

    const people = allPassengers();
    let collected = 0;
    let pending = 0;
    let paidCount = 0;
    people.forEach(p => {
      const amount = seaPaidBy(p);
      collected += amount;
      pending += Math.max(cost - amount, 0);
      if (seaStatus(amount, cost) === 'Pagado') paidCount++;
    });

    document.getElementById('seaTotal').textContent = money(cost * people.length);
    document.getElementById('seaCollected').textContent = money(collected);
    document.getElementById('seaPending').textContent = money(pending);
    const pct = people.length ? (paidCount / people.length) * 100 : 0;
    document.getElementById('seaProgressBar').style.width = `${pct}%`;
    document.getElementById('seaProgressLabel').textContent = cost > 0
      ? `${paidCount} de ${people.length} personas ya pagaron completo`
      : 'Escribe el costo de la entrada para calcular saldos';

    const query = document.getElementById('seaSearch').value.toLowerCase();
    seaBody.innerHTML = '';

    const visible = people.filter(p => {
      const status = seaStatus(seaPaidBy(p), cost);
      const text = `${p.name} #${p.seat} ${busLabel(p.busKey)}`.toLowerCase();
      return text.includes(query) && (seaFilter === 'all' || seaFilter === status);
    });

    if (visible.length === 0) {
      const msg = people.length === 0 ? 'Todavía no hay pasajeros registrados.' : 'Nadie coincide con el filtro.';
      seaBody.appendChild(el('tr', {}, [el('td', { text: msg, colSpan: 7, className: 'empty-row' })]));
      return;
    }

    visible.forEach(p => {
      const amount = seaPaidBy(p);
      const balance = Math.max(cost - amount, 0);
      const status = seaStatus(amount, cost);
      const badgeClass = { Pendiente: 'badge-pendiente', Anticipo: 'badge-anticipo', Pagado: 'badge-pagado' }[status];

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.step = 'any';
      input.inputMode = 'decimal';
      input.className = 'sea-amount';
      input.value = amount > 0 ? amount : '';
      input.placeholder = '0';
      input.addEventListener('change', () => setSeaAmount(p, input.value));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });

      const payAll = el('button', {
        className: 'btn-paid',
        text: '✅ Pagó todo',
        onClick: () => {
          if (cost <= 0) {
            alert('Primero escribe el costo de la entrada.');
            return;
          }
          setSeaAmount(p, cost);
        }
      });

      seaBody.appendChild(el('tr', {}, [
        el('td', { text: p.busKey === 'autobus_1' ? '1' : '2' }),
        el('td', {}, [el('strong', { text: `#${p.seat}` })]),
        el('td', { text: p.name }),
        el('td', {}, [input]),
        el('td', { text: money(balance), className: balance > 0 ? 'text-red' : 'text-green' }),
        el('td', {}, [el('span', { className: `badge ${badgeClass}`, text: status })]),
        el('td', {}, status === 'Pagado' ? [] : [payAll])
      ]));
    });
  }
  window.renderSea = renderSea;

  // Cuando terminan de escribir un monto, se aplica cualquier cambio que llegó mientras tanto
  seaBody.addEventListener('focusout', () => {
    setTimeout(() => { if (seaRenderPending) renderSea(); }, 0);
  });

  const saveSeaCost = debounce((val) => db.ref('entrada_mar/costo').set(val), 700);
  seaCostInput.addEventListener('input', () => {
    saveSeaCost(Math.max(parseFloat(seaCostInput.value) || 0, 0));
  });

  seaChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    seaFilter = chip.dataset.filter;
    seaChips.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
    renderSea();
  });

  // ---------- ✅ PASE DE LISTA ----------
  function boardingStatus() {
    const people = allPassengers().filter(p => p.busKey === currentBusKey);
    const marks = boardingData[currentBusKey] || {};
    const isBoarded = (p) => marks[p.seat] === p.name;
    return { people, isBoarded, boarded: people.filter(isBoarded).length };
  }

  function renderBoarding() {
    const { people, isBoarded, boarded } = boardingStatus();
    document.getElementById('boardingBusName').textContent = busLabel(currentBusKey);
    document.getElementById('boardedCount').textContent = boarded;
    document.getElementById('boardingTotal').textContent = people.length;
    document.getElementById('boardingBar').style.width = people.length ? `${(boarded / people.length) * 100}%` : '0';

    const missing = people.filter(p => !isBoarded(p));
    const missingText = document.getElementById('boardingMissing');
    if (people.length === 0) {
      missingText.textContent = 'No hay pasajeros en este autobús.';
    } else if (missing.length === 0) {
      missingText.textContent = '🎉 ¡Están todos a bordo! Ya pueden arrancar.';
      missingText.style.color = '#15803d';
    } else {
      missingText.textContent = `Faltan ${missing.length}: ${missing.map(p => `#${p.seat} ${p.name}`).join(', ')}`;
      missingText.style.color = '';
    }

    boardingList.innerHTML = '';
    people.forEach(p => {
      const checked = isBoarded(p);
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = checked;
      box.addEventListener('change', () => {
        const willBeAll = box.checked && boarded + 1 === people.length;
        db.ref(`abordaje/${p.busKey}/${p.seat}`).set(box.checked ? p.name : null)
          .then(() => { if (willBeAll) { celebrate(); toast('🚌 ¡Todos a bordo!'); } })
          .catch(err => alert(`No se pudo guardar: ${err.message}`));
      });

      const item = el('label', { className: `boarding-item${checked ? ' boarded' : ''}` }, [
        box,
        el('span', { className: 'seat-tag', text: `#${p.seat}` }),
        el('span', { className: 'who', text: p.name }),
        el('span', { text: checked ? '🚌 Arriba' : '⏳ Falta' })
      ]);
      boardingList.appendChild(el('li', {}, [item]));
    });
  }

  window.resetBoarding = function() {
    if (confirm(`¿Reiniciar el pase de lista del ${busLabel(currentBusKey)}? Todos quedarán como "Falta".`)) {
      db.ref(`abordaje/${currentBusKey}`).remove();
    }
  };

  window.copyMissing = function() {
    const { people, isBoarded } = boardingStatus();
    const missing = people.filter(p => !isBoarded(p));
    if (missing.length === 0) {
      toast('🎉 No falta nadie');
      return;
    }
    const text = [
      `🚌 *${busLabel(currentBusKey)} – faltan por subir (${missing.length})*`,
      ...missing.map(p => `#${p.seat} ${p.name}`)
    ].join('\n');
    copyText(text, '📋 Lista de faltantes copiada');
  };
});
