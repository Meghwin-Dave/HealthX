(() => {
  let currentPatientId = null;
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
    const isPositive = positive || ['Paid', 'Completed', 'Confirmed', 'Delivered'].includes(label);
    return `<span class="badge-pill ${isPositive ? 'success' : 'warning'}">${label}</span>`;
  };

  // Load dashboard stats
  async function loadDashboardStats() {
    try {
      const [appointments, prescriptions, orders, services, invoices] = await Promise.all([
        HealthxWeb.fetchDocs('Doctor Appointment', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('E Prescription Item', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('Medicine Order', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('Home Service', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('Invoice', { fields: ['name'], limit: 1000 })
      ]);

      document.getElementById('appointments-count').textContent = appointments.length;
      document.getElementById('prescriptions-count').textContent = prescriptions.length;
      document.getElementById('orders-count').textContent = orders.length;
      document.getElementById('services-count').textContent = services.length;
      document.getElementById('invoices-count').textContent = invoices.length;
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  }

  // Profile Management
  async function loadProfile() {
    try {
      const patients = await HealthxWeb.fetchDocs('Patient', { fields: ['name', 'full_name', 'gender', 'date_of_birth', 'phone_number', 'email', 'country', 'address', 'preferred_language'], limit: 1 });
      if (patients.length > 0) {
        const patient = patients[0];
        currentPatientId = patient.name;
        const form = document.getElementById('profile-form');
        Object.keys(patient).forEach(key => {
          const input = form.querySelector(`[name="${key}"]`);
          if (input) input.value = patient[key] || '';
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());

    try {
      if (currentPatientId) {
        await HealthxWeb.updateDoc('Patient', currentPatientId, payload);
        HealthxWeb.showToast('Profile updated successfully');
      } else {
        await HealthxWeb.createDoc('Patient', payload);
        HealthxWeb.showToast('Profile created successfully');
      }
      await loadProfile();
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
        { label: 'Doctor', key: 'doctor' },
        { label: 'Visit Type', key: 'visit_type' },
        { label: 'Consultation', render: (row) => badge(row.consultation_status) },
        { label: 'Billing', render: (row) => badge(row.billing_status, row.billing_status === 'Paid') }
      ];
      HealthxWeb.renderTable(document.getElementById('visits-table'), columns, visits, 'No clinic visits recorded.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  // Appointments
  async function loadAppointments() {
    try {
      const appointments = await HealthxWeb.fetchDocs('Doctor Appointment', {
        fields: ['name', 'doctor', 'appointment_date', 'appointment_type', 'status', 'notes'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.appointment_date ? new Date(row.appointment_date).toLocaleString() : '—' },
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
      doctor: data.get('doctor'),
      appointment_date: data.get('appointment_date'),
      appointment_type: data.get('appointment_type'),
      status: data.get('status'),
      notes: data.get('notes')
    };

    try {
      await HealthxWeb.createDoc('Doctor Appointment', payload);
      form.reset();
      HealthxWeb.showToast('Appointment booked successfully');
      await loadAppointments();
      await loadDashboardStats();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Populate doctor options
  async function populateDoctors() {
    const selects = ['appointment-doctor', 'review-doctor'];
    await Promise.all(selects.map(id => {
      const select = document.getElementById(id);
      if (select) {
        return HealthxWeb.populateOptions(select, 'Doctor', { labelField: 'full_name', limit: 200 });
      }
    }));
  }

  // Prescriptions
  async function loadPrescriptions() {
    try {
      const prescriptions = await HealthxWeb.fetchDocs('E Prescription Item', {
        fields: ['name', 'drug_name', 'dosage', 'frequency', 'duration', 'doctor', 'prescription_date'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.prescription_date ? new Date(row.prescription_date).toLocaleDateString() : '—' },
        { label: 'Drug', key: 'drug_name' },
        { label: 'Dosage', key: 'dosage' },
        { label: 'Frequency', key: 'frequency' },
        { label: 'Duration', key: 'duration' },
        { label: 'Doctor', key: 'doctor' }
      ];
      HealthxWeb.renderTable(document.getElementById('prescriptions-table'), columns, prescriptions, 'No prescriptions found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  // Medicine Orders
  async function loadOrders() {
    try {
      const orders = await HealthxWeb.fetchDocs('Medicine Order', {
        fields: ['name', 'order_date', 'delivery_address', 'status', 'total_amount'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.order_date ? new Date(row.order_date).toLocaleDateString() : '—' },
        { label: 'Address', key: 'delivery_address' },
        { label: 'Status', render: (row) => badge(row.status) },
        { label: 'Amount', render: (row) => row.total_amount ? `₹${Number(row.total_amount).toLocaleString('en-IN')}` : '—' }
      ];
      HealthxWeb.renderTable(document.getElementById('orders-table'), columns, orders, 'No orders found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('order-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      delivery_address: data.get('delivery_address'),
      status: data.get('status'),
      order_date: new Date().toISOString().split('T')[0]
    };

    try {
      await HealthxWeb.createDoc('Medicine Order', payload);
      form.reset();
      HealthxWeb.showToast('Order placed successfully');
      await loadOrders();
      await loadDashboardStats();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Doctors Directory
  async function loadDoctors() {
    try {
      const doctors = await HealthxWeb.fetchDocs('Doctor', {
        fields: ['name', 'full_name', 'specialization', 'consultation_fees', 'rating_average'],
        limit: 50
      });
      const columns = [
        { label: 'Name', key: 'full_name' },
        { label: 'Specialization', key: 'specialization' },
        { label: 'Fees', render: (row) => `₹${Number(row.consultation_fees || 0).toLocaleString('en-IN')}` },
        { label: 'Rating', render: (row) => row.rating_average ? `${row.rating_average}/5` : '—' }
      ];
      HealthxWeb.renderTable(document.getElementById('doctors-table'), columns, doctors, 'No doctors found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  // Home Services
  async function loadServices() {
    try {
      const services = await HealthxWeb.fetchDocs('Home Service', {
        fields: ['name', 'service_type', 'service_date', 'address', 'status'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.service_date ? new Date(row.service_date).toLocaleDateString() : '—' },
        { label: 'Type', key: 'service_type' },
        { label: 'Address', key: 'address' },
        { label: 'Status', render: (row) => badge(row.status) }
      ];
      HealthxWeb.renderTable(document.getElementById('services-table'), columns, services, 'No services found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('service-request-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      service_type: data.get('service_type'),
      preferred_date: data.get('preferred_date'),
      preferred_time: data.get('preferred_time'),
      address: data.get('address'),
      status: 'Pending'
    };

    try {
      await HealthxWeb.createDoc('Service Request', payload);
      form.reset();
      HealthxWeb.showToast('Service requested successfully');
      await loadServices();
      await loadDashboardStats();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Invoices
  async function loadInvoices() {
    try {
      const invoices = await HealthxWeb.fetchDocs('Invoice', {
        fields: ['name', 'invoice_date', 'total_amount', 'status', 'invoice_type'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.invoice_date ? new Date(row.invoice_date).toLocaleDateString() : '—' },
        { label: 'Type', key: 'invoice_type' },
        { label: 'Amount', render: (row) => `₹${Number(row.total_amount || 0).toLocaleString('en-IN')}` },
        { label: 'Status', render: (row) => badge(row.status, row.status === 'Paid') }
      ];
      HealthxWeb.renderTable(document.getElementById('invoices-table'), columns, invoices, 'No invoices found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  // Vitals
  async function loadVitals() {
    try {
      const vitals = await HealthxWeb.fetchDocs('Vitals Reading', {
        fields: ['name', 'reading_date', 'blood_pressure', 'heart_rate', 'temperature', 'device'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.reading_date ? new Date(row.reading_date).toLocaleDateString() : '—' },
        { label: 'BP', key: 'blood_pressure' },
        { label: 'Heart Rate', key: 'heart_rate' },
        { label: 'Temperature', render: (row) => row.temperature ? `${row.temperature}°C` : '—' },
        { label: 'Device', key: 'device' }
      ];
      HealthxWeb.renderTable(document.getElementById('vitals-table'), columns, vitals, 'No vitals readings found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  // Reviews
  async function loadReviews() {
    try {
      const reviews = await HealthxWeb.fetchDocs('Doctor Review', {
        fields: ['name', 'doctor', 'rating', 'review_text', 'review_date'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.review_date ? new Date(row.review_date).toLocaleDateString() : '—' },
        { label: 'Doctor', key: 'doctor' },
        { label: 'Rating', render: (row) => `${row.rating || 0}/5` },
        { label: 'Review', key: 'review_text' }
      ];
      HealthxWeb.renderTable(document.getElementById('reviews-table'), columns, reviews, 'No reviews found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('review-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      doctor: data.get('doctor'),
      rating: Number(data.get('rating')),
      review_text: data.get('review_text'),
      review_date: new Date().toISOString().split('T')[0]
    };

    try {
      await HealthxWeb.createDoc('Doctor Review', payload);
      form.reset();
      HealthxWeb.showToast('Review submitted successfully');
      await loadReviews();
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

  // Refresh buttons
  document.getElementById('refresh-visits')?.addEventListener('click', loadVisits);
  document.getElementById('refresh-appointments')?.addEventListener('click', loadAppointments);
  document.getElementById('refresh-prescriptions')?.addEventListener('click', loadPrescriptions);
  document.getElementById('refresh-orders')?.addEventListener('click', loadOrders);
  document.getElementById('refresh-doctors')?.addEventListener('click', loadDoctors);
  document.getElementById('refresh-services')?.addEventListener('click', loadServices);
  document.getElementById('refresh-invoices')?.addEventListener('click', loadInvoices);
  document.getElementById('refresh-vitals')?.addEventListener('click', loadVitals);
  document.getElementById('refresh-reviews')?.addEventListener('click', loadReviews);
  document.getElementById('refresh-alerts')?.addEventListener('click', loadAlerts);

  // Initialize
  (async () => {
    await populateDoctors();
    await loadProfile();
    await loadDashboardStats();
    await loadVisits();
    await loadAppointments();
    await loadPrescriptions();
    await loadOrders();
    await loadDoctors();
    await loadServices();
    await loadInvoices();
    await loadVitals();
    await loadReviews();
    await loadAlerts();
  })();
})();
