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

  let selectedSeatNumber = null;

  // Cargar datos guardados previamente
  const seatsData = JSON.parse(localStorage.getItem('busFamiliaJuquila')) || {};
  const savedCost = localStorage.getItem('costoAutobusJuquila') || '';

  if (savedCost) {
    totalCostInput.value = savedCost;
  }

  function saveToStorage() {
    localStorage.setItem('busFamiliaJuquila', JSON.stringify(seatsData));
    localStorage.setItem('costoAutobusJuquila', totalCostInput.value);
  }

  function renderBus() {
    busGrid.innerHTML = '';
    let seatCounter = 1;

    // Generar 10 filas de 4 asientos con pasillo central
    for (let row = 0; row < 10; row++) {
      for (let col = 1; col <= 5; col++) {
        if (col === 3) {
          const aisle = document.createElement('div');
          aisle.classList.add('seat', 'aisle');
          busGrid.appendChild(aisle);
        } else {
          createSeatButton(seatCounter);
          seatCounter++;
        }
      }
    }

    // Fila trasera de 5 asientos (41 al 45)
    for (let col = 1; col <= 5; col++) {
      createSeatButton(seatCounter);
      seatCounter++;
    }

    updatePassengerList();
    calculateCosts();
  }

  function createSeatButton(number) {
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
        // Cargar en el formulario para editar si ya está ocupado
        editPassenger(number);
      } else {
        selectedSeatNumber = number;
        seatInput.value = number;
        btnSubmitForm.textContent = "Guardar Asiento";
        renderBus();
      }
    });

    busGrid.appendChild(btn);
  }

  // Ocultar / Mostrar campo de monto abonado
  window.toggleAmountInput = function() {
    const status = paymentStatusSelect.value;
    const totalCost = parseFloat(totalCostInput.value) || 0;
    const occupiedCount = Object.keys(seatsData).length || 1;
    const estimatedCostPerOccupied = totalCost / occupiedCount;

    if (status === 'Pendiente') {
      paidAmountInput.value = 0;
    } else if (status === 'Pagado') {
      paidAmountInput.value = estimatedCostPerOccupied.toFixed(2);
    }
  };

  // Cargar datos en el formulario para editar
  window.editPassenger = function(seatNum) {
    const item = seatsData[seatNum];
    if (!item) return;

    selectedSeatNumber = seatNum;
    seatInput.value = seatNum;
    passengerNameInput.value = item.name || '';
    passengerPhoneInput.value = item.phone || '';
    passengerTypeSelect.value = item.type || 'Adulto';
    paymentStatusSelect.value = item.payment || 'Pendiente';
    paidAmountInput.value = item.amount || 0;

    btnSubmitForm.textContent = `Actualizar Asiento #${seatNum}`;
    
    // Enfocar el formulario
    passengerNameInput.focus();
    renderBus();
  };

  // Guardar / Actualizar datos del familiar
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

    seatsData[seatNum] = { name, phone, type, payment, amount };
    saveToStorage();

    passengerForm.reset();
    paidAmountInput.value = 0;
    selectedSeatNumber = null;
    seatInput.value = '';
    btnSubmitForm.textContent = "Guardar Asiento";

    renderBus();
  });

  // Liberar asiento
  window.removePassenger = function(seatNum) {
    if (confirm(`¿Deseas liberar el asiento ${seatNum}?`)) {
      delete seatsData[seatNum];
      saveToStorage();

      if (selectedSeatNumber === seatNum) {
        passengerForm.reset();
        paidAmountInput.value = 0;
        selectedSeatNumber = null;
        seatInput.value = '';
        btnSubmitForm.textContent = "Guardar Asiento";
      }

      renderBus();
    }
  };

  // Actualizar tabla
  function updatePassengerList() {
    passengerListBody.innerHTML = '';
    const keys = Object.keys(seatsData).sort((a, b) => a - b);
    totalRegisteredSpan.textContent = keys.length;

    if (keys.length === 0) {
      passengerListBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8;">No hay asientos asignados aún.</td></tr>`;
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

  // Calculadora de costos divididos y balances
  function calculateCosts() {
    const total = parseFloat(totalCostInput.value) || 0;
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
    calculateCosts();
    saveToStorage();
  });

  // Filtro de búsqueda en la tabla
  window.filterPassengers = function() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const rows = passengerListBody.getElementsByTagName('tr');

    Array.from(rows).forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  };

  // Exportar a Excel (CSV)
  window.exportToCSV = function() {
    const keys = Object.keys(seatsData).sort((a, b) => a - b);
    if (keys.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Asiento,Nombre,Contacto,Tipo,Estado de Pago,Monto Abonado\n";
    keys.forEach(seat => {
      const item = seatsData[seat];
      csvContent += `${seat},"${item.name}","${item.phone || ''}",${item.type},${item.payment || 'Pendiente'},$${item.amount || 0}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "lista_pasajeros_viaje_oaxaca.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cambio de pestañas
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

  renderBus();
});