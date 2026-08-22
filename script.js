const firebaseConfig = {
  apiKey: "AIzaSyBLHw-5Rdxq-2DNTJTNuXOZOfFab68VnQI",
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
  const costPerSeatSpan = document.getElementById('costPerSeat');
  const costPerOccupiedSpan = document.getElementById('costPerOccupied');
  const totalCollectedSpan = document.getElementById('totalCollected');
  const totalPendingSpan = document.getElementById('totalPending');
  const paidAmountInput = document.getElementById('paidAmount');
  const paymentStatusSelect = document.getElementById('paymentStatus');
  const btnSubmitForm = document.getElementById('btnSubmitForm');
  const currentBusTitle = document.getElementById('currentBusTitle');
  const costLabelBus = document.getElementById('costLabelBus');

  let currentBusKey = 'autobus_1';
  let selectedSeatNumber = null;
  let allBusesData = {
    autobus_1: { asientos: {}, costoTotal: 0 },
    autobus_2: { asientos: {}, costoTotal: 0 }
  };

  const dbRef = db.ref('viaje_oaxaca_doble');
  const oldDbRef = db.ref('viaje_oaxaca');

  // MIGRACIÓN AUTOMÁTICA DE DATOS ANTERIORES
  oldDbRef.once('value').then((snap) => {
    const oldData = snap.val();
    const localSeats = JSON.parse(localStorage.getItem('busFamiliaJuquila')) || {};
    const localCost = parseFloat(localStorage.getItem('costoAutobusJuquila')) || 0;

    // Si había datos en la ruta anterior de Firebase o en localStorage
    if (oldData && oldData.asientos) {
      dbRef.child('autobus_1').transaction((current) => {
        if (!current || !current.asientos) {
          return {
            asientos: oldData.asientos,
            costoTotal: oldData.costoTotal || 0
          };
        }
        return current;
      });
    } else if (Object.keys(localSeats).length > 0) {
      dbRef.child('autobus_1').transaction((current) => {
        if (!current || !current.asientos) {
          return {
            asientos: localSeats,
            costoTotal: localCost
          };
        }
        return current;
      });
    }
  });

  // ESCUCHAR EN TIEMPO REAL
  dbRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    allBusesData.autobus_1 = data.autobus_1 || { asientos: {}, costoTotal: 0 };
    allBusesData.autobus_2 = data.autobus_2 || { asientos: {}, costoTotal: 0 };

    renderCurrentBus();
  });

  function getActiveBusData() {
    return allBusesData[currentBusKey] || { asientos: {}, costoTotal: 0 };
  }

  function renderCurrentBus() {
    const busData = getActiveBusData();
    const seatsData = busData.asientos || {};
    const busCost = busData.costoTotal || 0;

    totalCostInput.value = busCost > 0 ? busCost : '';
    busGrid.innerHTML = '';
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

    updatePassengerList(seatsData);
    calculateCosts(seatsData, busCost);
  }

  function createSeatButton(number, seatsData) {
    const btn = document.createElement('button');
    btn.classList.add('seat');
    btn.textContent = number;

    if (seatsData[number]) {
      btn.classList.add('occupied');
    }

    if (number === selectedSeatNumber) {
      btn.classList.add('selected');
    }

    btn.addEventListener('click', () => {
      if (seatsData[number]) {
        editPassenger(number);
      } else {
        selectedSeatNumber = number;
        seatInput.value = number;
        btnSubmitForm.textContent = `Guardar Asiento #${number}`;
        renderCurrentBus();
      }
    });

    busGrid.appendChild(btn);
  }

  window.switchBus = function(busName) {
    const btnBus1 = document.getElementById('btnBus1');
    const btnBus2 = document.getElementById('btnBus2');

    currentBusKey = busName === 'bus1' ? 'autobus_1' : 'autobus_2';
    selectedSeatNumber = null;
    passengerForm.reset();
    paidAmountInput.value = 0;
    seatInput.value = '';
    btnSubmitForm.textContent = "Guardar Asiento";

    if (busName === 'bus1') {
      btnBus1.classList.add('active');
      btnBus2.classList.remove('active');
      currentBusTitle.textContent = "🚌 Distribución Autobús 1 (45 Asientos)";
      costLabelBus.textContent = "Costo Autobús 1";
    } else {
      btnBus2.classList.add('active');
      btnBus1.classList.remove('active');
      currentBusTitle.textContent = "🚌 Distribución Autobús 2 (45 Asientos)";
      costLabelBus.textContent = "Costo Autobús 2";
    }

    renderCurrentBus();
  };

  window.toggleAmountInput = function() {
    const busData = getActiveBusData();
    const seatsData = busData.asientos || {};
    const totalCost = busData.costoTotal || 0;
    const status = paymentStatusSelect.value;
    const occupiedCount = Object.keys(seatsData).length || 1;
    const estimatedCostPerOccupied = totalCost / occupiedCount;

    if (status === 'Pendiente') {
      paidAmountInput.value = 0;
    } else if (status === 'Pagado') {
      paidAmountInput.value = estimatedCostPerOccupied.toFixed(2);
    }
  };

  window.editPassenger = function(seatNum) {
    const busData = getActiveBusData();
    const item = (busData.asientos || {})[seatNum];
    if (!item) return;

    selectedSeatNumber = seatNum;
    seatInput.value = seatNum;
    passengerNameInput.value = item.name || '';
    passengerPhoneInput.value = item.phone || '';
    passengerTypeSelect.value = item.type || 'Adulto';
    paymentStatusSelect.value = item.payment || 'Pendiente';
    paidAmountInput.value = item.amount || 0;

    btnSubmitForm.textContent = `Actualizar Asiento #${seatNum}`;
    passengerNameInput.focus();
    renderCurrentBus();
  };

  passengerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const seatNum = seatInput.value;
    const name = passengerNameInput.value.trim();
    const phone = passengerPhoneInput.value.trim();
    const type = passengerTypeSelect.value;
    const payment = paymentStatusSelect.value;
    const amount = parseFloat(paidAmountInput.value) || 0;

    if (!seatNum) {
      alert('Por favor selecciona un asiento en el mapa.');
      return;
    }

    dbRef.child(`${currentBusKey}/asientos/${seatNum}`).set({
      name,
      phone,
      type,
      payment,
      amount
    }).then(() => {
      passengerForm.reset();
      paidAmountInput.value = 0;
      selectedSeatNumber = null;
      seatInput.value = '';
      btnSubmitForm.textContent = "Guardar Asiento";
    });
  });

  window.removePassenger = function(seatNum) {
    const busName = currentBusKey === 'autobus_1' ? 'Autobús 1' : 'Autobús 2';
    if (confirm(`¿Deseas liberar el asiento ${seatNum} del ${busName}?`)) {
      dbRef.child(`${currentBusKey}/asientos/${seatNum}`).remove().then(() => {
        if (selectedSeatNumber === seatNum) {
          passengerForm.reset();
          paidAmountInput.value = 0;
          selectedSeatNumber = null;
          seatInput.value = '';
          btnSubmitForm.textContent = "Guardar Asiento";
        }
      });
    }
  };

  function updatePassengerList(seatsData) {
    passengerListBody.innerHTML = '';
    const keys = Object.keys(seatsData).sort((a, b) => a - b);
    totalRegisteredSpan.textContent = keys.length;

    if (keys.length === 0) {
      passengerListBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8;">No hay asientos asignados aún en este autobús.</td></tr>`;
      return;
    }

    keys.forEach(seatNum => {
      const item = seatsData[seatNum];
      const tr = document.createElement('tr');

      let badgeClass = 'badge-pendiente';
      if (item.payment === 'Anticipo') badgeClass = 'badge-anticipo';
      if (item.payment === 'Pagado') badgeClass = 'badge-pagado';

      tr.innerHTML = `
        <td><strong>#${seatNum}</strong></td>
        <td>${item.name}</td>
        <td>${item.phone || '-'}</td>
        <td>${item.type}</td>
        <td><strong>$${(item.amount || 0).toFixed(2)}</strong></td>
        <td><span class="badge ${badgeClass}">${item.payment || 'Pendiente'}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-edit" onclick="editPassenger(${seatNum})">✏️ Editar</button>
            <button class="btn-delete" onclick="removePassenger(${seatNum})">Liberar</button>
          </div>
        </td>
      `;
      passengerListBody.appendChild(tr);
    });
  }

  function calculateCosts(seatsData, total) {
    const occupiedCount = Object.keys(seatsData).length;
    const perSeat = total / 45;
    const perOccupied = occupiedCount > 0 ? total / occupiedCount : 0;

    let totalCollected = 0;
    Object.values(seatsData).forEach(item => {
      totalCollected += (parseFloat(item.amount) || 0);
    });

    const totalPending = total - totalCollected;

    costPerSeatSpan.textContent = `$${perSeat.toFixed(2)}`;
    costPerOccupiedSpan.textContent = `$${perOccupied.toFixed(2)}`;
    totalCollectedSpan.textContent = `$${totalCollected.toFixed(2)}`;
    totalPendingSpan.textContent = `$${(totalPending > 0 ? totalPending : 0).toFixed(2)}`;
  }

  totalCostInput.addEventListener('input', () => {
    const val = parseFloat(totalCostInput.value) || 0;
    dbRef.child(`${currentBusKey}/costoTotal`).set(val);
  });

  window.filterPassengers = function() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const rows = passengerListBody.getElementsByTagName('tr');

    Array.from(rows).forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  };

  window.exportToCSV = function() {
    const busData = getActiveBusData();
    const seatsData = busData.asientos || {};
    const keys = Object.keys(seatsData).sort((a, b) => a - b);
    
    if (keys.length === 0) {
      alert('No hay datos para exportar en este autobús.');
      return;
    }

    const label = currentBusKey === 'autobus_1' ? 'Autobus_1' : 'Autobus_2';
    let csvContent = `data:text/csv;charset=utf-8,Asiento,Nombre,Contacto,Tipo,Estado de Pago,Monto Abonado\n`;
    keys.forEach(seat => {
      const item = seatsData[seat];
      csvContent += `${seat},"${item.name}","${item.phone || ''}",${item.type},${item.payment || 'Pendiente'},$${item.amount || 0}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pasajeros_${label}_viaje_oaxaca.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  window.switchTab = function(tabName) {
    const btnRegistro = document.getElementById('btnTabRegistro');
    const btnCronograma = document.getElementById('btnTabCronograma');
    const tabRegistro = document.getElementById('tab-registro');
    const tabCronograma = document.getElementById('tab-cronograma');

    if (tabName === 'registro') {
      btnRegistro.classList.add('active');
      btnCronograma.classList.remove('active');
      tabRegistro.classList.add('active');
      tabCronograma.classList.remove('active');
    } else {
      btnCronograma.classList.add('active');
      btnRegistro.classList.remove('active');
      tabCronograma.classList.add('active');
      tabRegistro.classList.remove('active');
    }
  };
});