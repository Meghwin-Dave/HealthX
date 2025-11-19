(() => {
  const tabs = document.querySelectorAll('.section-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
  });

  // Badge helper
  const badge = (value, positive = false) => {
    const label = value || 'Pending';
    const isPositive = positive || ['Paid', 'Completed', 'Confirmed', 'Active', 'Delivered'].includes(label);
    return `<span class="badge-pill ${isPositive ? 'success' : 'warning'}">${label}</span>`;
  };

  // Load dashboard stats
  async function loadDashboardStats() {
    try {
      const [doctors, patients, appointments, visits, orders, invoices, drugs, devices] = await Promise.all([
        HealthxWeb.fetchDocs('Doctor', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('Patient', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('Doctor Appointment', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('Clinic Visit', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('Medicine Order', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('Invoice', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('Drug', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('Device', { fields: ['name'], limit: 1000 })
      ]);

      document.getElementById('doctors-count').textContent = doctors.length;
      document.getElementById('patients-count').textContent = patients.length;
      document.getElementById('appointments-count').textContent = appointments.length;
      document.getElementById('visits-count').textContent = visits.length;
      document.getElementById('orders-count').textContent = orders.length;
      document.getElementById('invoices-count').textContent = invoices.length;
      document.getElementById('drugs-count').textContent = drugs.length;
      document.getElementById('devices-count').textContent = devices.length;
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  }

  // Populate dropdowns
  async function populateDropdowns() {
    await Promise.all([
      HealthxWeb.populateOptions(document.getElementById('doctor-specialization'), 'Speciality', { labelField: 'speciality' }),
      HealthxWeb.populateOptions(document.getElementById('appointment-patient'), 'Patient', { labelField: 'full_name', limit: 200 }),
      HealthxWeb.populateOptions(document.getElementById('appointment-doctor'), 'Doctor', { labelField: 'full_name', limit: 200 }),
      HealthxWeb.populateOptions(document.getElementById('visit-patient'), 'Patient', { labelField: 'full_name', limit: 200 }),
      HealthxWeb.populateOptions(document.getElementById('visit-doctor'), 'Doctor', { labelField: 'full_name', limit: 200 }),
      HealthxWeb.populateOptions(document.getElementById('invoice-patient'), 'Patient', { labelField: 'full_name', limit: 200 }),
      HealthxWeb.populateOptions(document.getElementById('device-type'), 'Device Type', { labelField: 'device_type_name', limit: 200 })
    ]);
  }

  // Doctors
  async function loadDoctors() {
    try {
      const doctors = await HealthxWeb.fetchDocs('Doctor', {
        fields: ['name', 'full_name', 'specialization', 'experience_years', 'consultation_fees', 'rating_average'],
        limit: 50
      });
      const columns = [
        { label: 'Name', key: 'full_name' },
        { label: 'Specialization', key: 'specialization' },
        { label: 'Experience (yrs)', key: 'experience_years' },
        { label: 'Fees', render: (row) => `₹${Number(row.consultation_fees || 0).toLocaleString('en-IN')}` },
        { label: 'Rating', render: (row) => (row.rating_average ? `${row.rating_average}/5` : '—') }
      ];
      HealthxWeb.renderTable(document.getElementById('doctors-table'), columns, doctors, 'No doctors yet. Add your first specialist.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('doctor-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      full_name: data.get('full_name')?.trim(),
      specialization: data.get('specialization'),
      experience_years: Number(data.get('experience_years')) || 0,
      consultation_fees: Number(data.get('consultation_fees')) || 0
    };

    const rating = data.get('rating_average');
    if (rating) {
      payload.rating_average = Number(rating);
    }

    try {
      await HealthxWeb.createDoc('Doctor', payload);
      form.reset();
      HealthxWeb.showToast('Doctor saved');
      await loadDoctors();
      await loadDashboardStats();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Patients
  async function loadPatients() {
    try {
      const patients = await HealthxWeb.fetchDocs('Patient', {
        fields: ['name', 'full_name', 'gender', 'date_of_birth', 'phone_number', 'email'],
        limit: 50
      });
      const columns = [
        { label: 'Name', key: 'full_name' },
        { label: 'Gender', key: 'gender' },
        { label: 'Birth Date', render: (row) => row.date_of_birth || '—' },
        { label: 'Phone', key: 'phone_number' },
        { label: 'Email', key: 'email' }
      ];
      HealthxWeb.renderTable(document.getElementById('patients-table'), columns, patients, 'No patients yet. Use the form to create one.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('patient-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      full_name: data.get('full_name')?.trim(),
      gender: data.get('gender'),
      phone_number: data.get('phone_number')?.trim()
    };

    ['date_of_birth', 'email', 'country', 'address', 'preferred_language'].forEach((field) => {
      const value = data.get(field);
      if (value) {
        payload[field] = value.trim();
      }
    });

    try {
      await HealthxWeb.createDoc('Patient', payload);
      form.reset();
      HealthxWeb.showToast('Patient saved');
      await loadPatients();
      await loadDashboardStats();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Appointments
  async function loadAppointments() {
    try {
      const appointments = await HealthxWeb.fetchDocs('Doctor Appointment', {
        fields: ['name', 'patient', 'doctor', 'appointment_date', 'appointment_type', 'status', 'notes'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.appointment_date ? new Date(row.appointment_date).toLocaleString() : '—' },
        { label: 'Patient', key: 'patient' },
        { label: 'Doctor', key: 'doctor' },
        { label: 'Type', key: 'appointment_type' },
        { label: 'Status', render: (row) => badge(row.status) },
        { label: 'Notes', key: 'notes' }
      ];
      HealthxWeb.renderTable(document.getElementById('appointments-table'), columns, appointments, 'No appointments found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('appointment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      patient: data.get('patient'),
      doctor: data.get('doctor'),
      appointment_date: data.get('appointment_date'),
      appointment_type: data.get('appointment_type'),
      status: data.get('status'),
      notes: data.get('notes')
    };

    try {
      await HealthxWeb.createDoc('Doctor Appointment', payload);
      form.reset();
      HealthxWeb.showToast('Appointment created successfully');
      await loadAppointments();
      await loadDashboardStats();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Clinic Visits
  async function loadVisits() {
    try {
      const visits = await HealthxWeb.fetchDocs('Clinic Visit', {
        fields: ['name', 'patient', 'doctor', 'visit_type', 'billing_status', 'consultation_status', 'visit_date'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.visit_date ? new Date(row.visit_date).toLocaleDateString() : '—' },
        { label: 'Patient', key: 'patient' },
        { label: 'Doctor', key: 'doctor' },
        { label: 'Visit Type', key: 'visit_type' },
        { label: 'Consultation', render: (row) => badge(row.consultation_status) },
        { label: 'Billing', render: (row) => badge(row.billing_status, row.billing_status === 'Paid') }
      ];
      HealthxWeb.renderTable(document.getElementById('visit-table'), columns, visits, 'No clinic visits recorded.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('visit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      patient: data.get('patient'),
      doctor: data.get('doctor'),
      visit_type: data.get('visit_type'),
      consultation_status: data.get('consultation_status'),
      billing_status: data.get('billing_status')
    };

    try {
      await HealthxWeb.createDoc('Clinic Visit', payload);
      form.reset();
      HealthxWeb.showToast('Clinic visit saved');
      await loadVisits();
      await loadDashboardStats();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Drugs
  async function loadDrugs() {
    try {
      const drugs = await HealthxWeb.fetchDocs('Drug', {
        fields: ['name', 'drug_name', 'manufacturer', 'price', 'stock_quantity', 'unit'],
        limit: 50
      });
      const columns = [
        { label: 'Drug Name', key: 'drug_name' },
        { label: 'Manufacturer', key: 'manufacturer' },
        { label: 'Price', render: (row) => `₹${Number(row.price || 0).toLocaleString('en-IN')}` },
        { label: 'Stock', key: 'stock_quantity' },
        { label: 'Unit', key: 'unit' }
      ];
      HealthxWeb.renderTable(document.getElementById('drugs-table'), columns, drugs, 'No drugs found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('drug-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      drug_name: data.get('drug_name')?.trim(),
      manufacturer: data.get('manufacturer')?.trim(),
      price: Number(data.get('price')) || 0,
      stock_quantity: data.get('stock_quantity') ? Number(data.get('stock_quantity')) : 0,
      unit: data.get('unit')?.trim()
    };

    try {
      await HealthxWeb.createDoc('Drug', payload);
      form.reset();
      HealthxWeb.showToast('Drug added successfully');
      await loadDrugs();
      await loadDashboardStats();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Packages
  async function loadPackages() {
    try {
      const packages = await HealthxWeb.fetchDocs('Treatment Package', {
        fields: ['name', 'package_name', 'description', 'price', 'duration_days'],
        limit: 50
      });
      const columns = [
        { label: 'Package Name', key: 'package_name' },
        { label: 'Description', key: 'description' },
        { label: 'Price', render: (row) => `₹${Number(row.price || 0).toLocaleString('en-IN')}` },
        { label: 'Duration', render: (row) => row.duration_days ? `${row.duration_days} days` : '—' }
      ];
      HealthxWeb.renderTable(document.getElementById('packages-table'), columns, packages, 'No packages found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('package-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      package_name: data.get('package_name')?.trim(),
      description: data.get('description')?.trim(),
      price: Number(data.get('price')) || 0,
      duration_days: data.get('duration_days') ? Number(data.get('duration_days')) : null
    };

    try {
      await HealthxWeb.createDoc('Treatment Package', payload);
      form.reset();
      HealthxWeb.showToast('Package added successfully');
      await loadPackages();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Invoices
  async function loadInvoices() {
    try {
      const invoices = await HealthxWeb.fetchDocs('Invoice', {
        fields: ['name', 'patient', 'invoice_date', 'invoice_type', 'total_amount', 'status'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.invoice_date ? new Date(row.invoice_date).toLocaleDateString() : '—' },
        { label: 'Patient', key: 'patient' },
        { label: 'Type', key: 'invoice_type' },
        { label: 'Amount', render: (row) => `₹${Number(row.total_amount || 0).toLocaleString('en-IN')}` },
        { label: 'Status', render: (row) => badge(row.status, row.status === 'Paid') }
      ];
      HealthxWeb.renderTable(document.getElementById('invoices-table'), columns, invoices, 'No invoices found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('invoice-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      patient: data.get('patient'),
      invoice_type: data.get('invoice_type'),
      total_amount: Number(data.get('total_amount')) || 0,
      status: data.get('status'),
      invoice_date: new Date().toISOString().split('T')[0]
    };

    try {
      await HealthxWeb.createDoc('Invoice', payload);
      form.reset();
      HealthxWeb.showToast('Invoice created successfully');
      await loadInvoices();
      await loadDashboardStats();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Medicine Orders
  async function loadOrders() {
    try {
      const orders = await HealthxWeb.fetchDocs('Medicine Order', {
        fields: ['name', 'patient', 'order_date', 'delivery_address', 'status', 'total_amount'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.order_date ? new Date(row.order_date).toLocaleDateString() : '—' },
        { label: 'Patient', key: 'patient' },
        { label: 'Address', key: 'delivery_address' },
        { label: 'Status', render: (row) => badge(row.status) },
        { label: 'Amount', render: (row) => row.total_amount ? `₹${Number(row.total_amount).toLocaleString('en-IN')}` : '—' }
      ];
      HealthxWeb.renderTable(document.getElementById('orders-table'), columns, orders, 'No orders found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  // Home Services
  async function loadServices() {
    try {
      const services = await HealthxWeb.fetchDocs('Home Service', {
        fields: ['name', 'patient', 'service_type', 'service_date', 'address', 'status'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.service_date ? new Date(row.service_date).toLocaleDateString() : '—' },
        { label: 'Patient', key: 'patient' },
        { label: 'Type', key: 'service_type' },
        { label: 'Address', key: 'address' },
        { label: 'Status', render: (row) => badge(row.status) }
      ];
      HealthxWeb.renderTable(document.getElementById('services-table'), columns, services, 'No services found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  // Devices
  async function loadDevices() {
    try {
      const devices = await HealthxWeb.fetchDocs('Device', {
        fields: ['name', 'device_name', 'device_type', 'serial_number', 'status'],
        limit: 50
      });
      const columns = [
        { label: 'Device Name', key: 'device_name' },
        { label: 'Type', key: 'device_type' },
        { label: 'Serial Number', key: 'serial_number' },
        { label: 'Status', render: (row) => badge(row.status, row.status === 'Active') }
      ];
      HealthxWeb.renderTable(document.getElementById('devices-table'), columns, devices, 'No devices found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('device-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      device_name: data.get('device_name')?.trim(),
      device_type: data.get('device_type'),
      serial_number: data.get('serial_number')?.trim(),
      status: data.get('status')
    };

    try {
      await HealthxWeb.createDoc('Device', payload);
      form.reset();
      HealthxWeb.showToast('Device added successfully');
      await loadDevices();
      await loadDashboardStats();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Alerts
  async function loadAlerts() {
    try {
      const alerts = await HealthxWeb.fetchDocs('Alert Log', {
        fields: ['name', 'alert_type', 'alert_date', 'message', 'status'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.alert_date ? new Date(row.alert_date).toLocaleDateString() : '—' },
        { label: 'Type', key: 'alert_type' },
        { label: 'Message', key: 'message' },
        { label: 'Status', render: (row) => badge(row.status) }
      ];
      HealthxWeb.renderTable(document.getElementById('alerts-table'), columns, alerts, 'No alerts found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  // Specialities
  async function loadSpecialities() {
    try {
      const specialities = await HealthxWeb.fetchDocs('Speciality', {
        fields: ['name', 'speciality', 'description'],
        limit: 50
      });
      const columns = [
        { label: 'Speciality', key: 'speciality' },
        { label: 'Description', key: 'description' }
      ];
      HealthxWeb.renderTable(document.getElementById('specialities-table'), columns, specialities, 'No specialities found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('speciality-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      speciality: data.get('speciality')?.trim(),
      description: data.get('description')?.trim()
    };

    try {
      await HealthxWeb.createDoc('Speciality', payload);
      form.reset();
      HealthxWeb.showToast('Speciality added successfully');
      await loadSpecialities();
      await populateDropdowns();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Refresh buttons
  document.getElementById('refresh-doctors')?.addEventListener('click', loadDoctors);
  document.getElementById('refresh-patients')?.addEventListener('click', loadPatients);
  document.getElementById('refresh-appointments')?.addEventListener('click', loadAppointments);
  document.getElementById('refresh-visits')?.addEventListener('click', loadVisits);
  document.getElementById('refresh-drugs')?.addEventListener('click', loadDrugs);
  document.getElementById('refresh-packages')?.addEventListener('click', loadPackages);
  document.getElementById('refresh-invoices')?.addEventListener('click', loadInvoices);
  document.getElementById('refresh-orders')?.addEventListener('click', loadOrders);
  document.getElementById('refresh-services')?.addEventListener('click', loadServices);
  document.getElementById('refresh-devices')?.addEventListener('click', loadDevices);
  document.getElementById('refresh-alerts')?.addEventListener('click', loadAlerts);
  document.getElementById('refresh-specialities')?.addEventListener('click', loadSpecialities);

  // Initialize
  (async () => {
    await populateDropdowns();
    await loadDashboardStats();
    await loadDoctors();
    await loadPatients();
    await loadAppointments();
    await loadVisits();
    await loadDrugs();
    await loadPackages();
    await loadInvoices();
    await loadOrders();
    await loadServices();
    await loadDevices();
    await loadAlerts();
    await loadSpecialities();
  })();
})();
