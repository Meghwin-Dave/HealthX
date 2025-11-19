(() => {
  let currentDoctorId = null;
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
    const isPositive = positive || ['Paid', 'Completed', 'Confirmed', 'Available'].includes(label);
    return `<span class="badge-pill ${isPositive ? 'success' : 'warning'}">${label}</span>`;
  };

  // Load dashboard stats
  async function loadDashboardStats() {
    try {
      const [appointments, prescriptions, consultations, tokens, reviews] = await Promise.all([
        HealthxWeb.fetchDocs('Doctor Appointment', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('E Prescription Item', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('Online Consultation', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('Queue Token', { fields: ['name'], limit: 1000 }),
        HealthxWeb.fetchDocs('Doctor Review', { fields: ['name'], limit: 1000 })
      ]);

      document.getElementById('appointments-count').textContent = appointments.length;
      document.getElementById('prescriptions-count').textContent = prescriptions.length;
      document.getElementById('consultations-count').textContent = consultations.length;
      document.getElementById('tokens-count').textContent = tokens.length;
      document.getElementById('reviews-count').textContent = reviews.length;
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  }

  // Profile Management
  async function loadProfile() {
    try {
      const doctors = await HealthxWeb.fetchDocs('Doctor', { 
        fields: ['name', 'full_name', 'specialization', 'experience_years', 'consultation_fees', 'rating_average'], 
        limit: 1 
      });
      if (doctors.length > 0) {
        const doctor = doctors[0];
        currentDoctorId = doctor.name;
        const form = document.getElementById('profile-form');
        Object.keys(doctor).forEach(key => {
          const input = form.querySelector(`[name="${key}"]`);
          if (input) input.value = doctor[key] || '';
        });
        
        // Display profile info
        const infoDiv = document.getElementById('profile-info');
        if (infoDiv) {
          infoDiv.innerHTML = `
            <div class="card">
              <h3>${doctor.full_name || 'N/A'}</h3>
              <p><strong>Specialization:</strong> ${doctor.specialization || 'N/A'}</p>
              <p><strong>Experience:</strong> ${doctor.experience_years || 0} years</p>
              <p><strong>Consultation Fees:</strong> ₹${Number(doctor.consultation_fees || 0).toLocaleString('en-IN')}</p>
              <p><strong>Rating:</strong> ${doctor.rating_average ? `${doctor.rating_average}/5` : 'N/A'}</p>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
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
      if (currentDoctorId) {
        await HealthxWeb.updateDoc('Doctor', currentDoctorId, payload);
        HealthxWeb.showToast('Profile updated successfully');
      } else {
        await HealthxWeb.createDoc('Doctor', payload);
        HealthxWeb.showToast('Profile created successfully');
      }
      await loadProfile();
      await loadDashboardStats();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Populate dropdowns
  async function populateDropdowns() {
    await Promise.all([
      HealthxWeb.populateOptions(document.getElementById('doctor-specialization'), 'Speciality', { labelField: 'speciality' }),
      HealthxWeb.populateOptions(document.getElementById('appointment-patient'), 'Patient', { labelField: 'full_name', limit: 200 }),
      HealthxWeb.populateOptions(document.getElementById('prescription-patient'), 'Patient', { labelField: 'full_name', limit: 200 }),
      HealthxWeb.populateOptions(document.getElementById('visit-patient'), 'Patient', { labelField: 'full_name', limit: 200 }),
      HealthxWeb.populateOptions(document.getElementById('vitals-patient'), 'Patient', { labelField: 'full_name', limit: 200 }),
      HealthxWeb.populateOptions(document.getElementById('prescription-drug'), 'Drug', { labelField: 'drug_name', limit: 200 }),
      HealthxWeb.populateOptions(document.getElementById('vitals-device'), 'Device', { labelField: 'device_name', limit: 200 })
    ]);
  }

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

  // Schedule
  async function loadSchedule() {
    try {
      const schedules = await HealthxWeb.fetchDocs('Doctor Schedule', {
        fields: ['name', 'doctor', 'day_of_week', 'start_time', 'end_time', 'is_available'],
        limit: 50
      });
      const columns = [
        { label: 'Day', key: 'day_of_week' },
        { label: 'Start Time', key: 'start_time' },
        { label: 'End Time', key: 'end_time' },
        { label: 'Available', render: (row) => badge(row.is_available ? 'Yes' : 'No', row.is_available) }
      ];
      HealthxWeb.renderTable(document.getElementById('schedule-table'), columns, schedules, 'No schedule found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('schedule-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      day_of_week: data.get('day_of_week'),
      start_time: data.get('start_time'),
      end_time: data.get('end_time'),
      is_available: data.get('is_available') === '1'
    };

    try {
      await HealthxWeb.createDoc('Doctor Schedule', payload);
      form.reset();
      HealthxWeb.showToast('Schedule added successfully');
      await loadSchedule();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Prescriptions
  async function loadPrescriptions() {
    try {
      const prescriptions = await HealthxWeb.fetchDocs('E Prescription Item', {
        fields: ['name', 'patient', 'drug_name', 'dosage', 'frequency', 'duration', 'prescription_date'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.prescription_date ? new Date(row.prescription_date).toLocaleDateString() : '—' },
        { label: 'Patient', key: 'patient' },
        { label: 'Drug', key: 'drug_name' },
        { label: 'Dosage', key: 'dosage' },
        { label: 'Frequency', key: 'frequency' },
        { label: 'Duration', key: 'duration' }
      ];
      HealthxWeb.renderTable(document.getElementById('prescriptions-table'), columns, prescriptions, 'No prescriptions found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  document.getElementById('prescription-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      patient: data.get('patient'),
      drug_name: data.get('drug_name'),
      dosage: data.get('dosage'),
      frequency: data.get('frequency'),
      duration: data.get('duration'),
      prescription_date: new Date().toISOString().split('T')[0]
    };

    try {
      await HealthxWeb.createDoc('E Prescription Item', payload);
      form.reset();
      HealthxWeb.showToast('Prescription created successfully');
      await loadPrescriptions();
      await loadDashboardStats();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Online Consultations
  async function loadConsultations() {
    try {
      const consultations = await HealthxWeb.fetchDocs('Online Consultation', {
        fields: ['name', 'patient', 'doctor', 'consultation_date', 'status', 'consultation_type'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.consultation_date ? new Date(row.consultation_date).toLocaleDateString() : '—' },
        { label: 'Patient', key: 'patient' },
        { label: 'Type', key: 'consultation_type' },
        { label: 'Status', render: (row) => badge(row.status) }
      ];
      HealthxWeb.renderTable(document.getElementById('consultations-table'), columns, consultations, 'No consultations found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  // Queue Tokens
  async function loadQueue() {
    try {
      const tokens = await HealthxWeb.fetchDocs('Queue Token', {
        fields: ['name', 'patient', 'token_number', 'status', 'queue_date'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.queue_date ? new Date(row.queue_date).toLocaleDateString() : '—' },
        { label: 'Patient', key: 'patient' },
        { label: 'Token', key: 'token_number' },
        { label: 'Status', render: (row) => badge(row.status) }
      ];
      HealthxWeb.renderTable(document.getElementById('queue-table'), columns, tokens, 'No queue tokens found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

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
        { label: 'Visit Type', key: 'visit_type' },
        { label: 'Consultation', render: (row) => badge(row.consultation_status) },
        { label: 'Billing', render: (row) => badge(row.billing_status, row.billing_status === 'Paid') }
      ];
      HealthxWeb.renderTable(document.getElementById('visits-table'), columns, visits, 'No clinic visits recorded.');
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
      visit_type: data.get('visit_type'),
      consultation_status: data.get('consultation_status'),
      billing_status: data.get('billing_status')
    };

    try {
      await HealthxWeb.createDoc('Clinic Visit', payload);
      form.reset();
      HealthxWeb.showToast('Clinic visit saved');
      await loadVisits();
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
      HealthxWeb.renderTable(document.getElementById('patients-table'), columns, patients, 'No patients found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  // Vitals
  async function loadVitals() {
    try {
      const vitals = await HealthxWeb.fetchDocs('Vitals Reading', {
        fields: ['name', 'patient', 'reading_date', 'blood_pressure', 'heart_rate', 'temperature', 'device'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.reading_date ? new Date(row.reading_date).toLocaleDateString() : '—' },
        { label: 'Patient', key: 'patient' },
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

  document.getElementById('vitals-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      patient: data.get('patient'),
      blood_pressure: data.get('blood_pressure'),
      heart_rate: data.get('heart_rate') ? Number(data.get('heart_rate')) : null,
      temperature: data.get('temperature') ? Number(data.get('temperature')) : null,
      device: data.get('device'),
      reading_date: new Date().toISOString().split('T')[0]
    };

    try {
      await HealthxWeb.createDoc('Vitals Reading', payload);
      form.reset();
      HealthxWeb.showToast('Vitals reading saved');
      await loadVitals();
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  });

  // Reviews
  async function loadReviews() {
    try {
      const reviews = await HealthxWeb.fetchDocs('Doctor Review', {
        fields: ['name', 'doctor', 'patient', 'rating', 'review_text', 'review_date'],
        limit: 50
      });
      const columns = [
        { label: 'Date', render: (row) => row.review_date ? new Date(row.review_date).toLocaleDateString() : '—' },
        { label: 'Patient', key: 'patient' },
        { label: 'Rating', render: (row) => `${row.rating || 0}/5` },
        { label: 'Review', key: 'review_text' }
      ];
      HealthxWeb.renderTable(document.getElementById('reviews-table'), columns, reviews, 'No reviews found.');
    } catch (error) {
      HealthxWeb.showToast(error.message, 'error');
    }
  }

  // Refresh buttons
  document.getElementById('refresh-appointments')?.addEventListener('click', loadAppointments);
  document.getElementById('refresh-schedule')?.addEventListener('click', loadSchedule);
  document.getElementById('refresh-prescriptions')?.addEventListener('click', loadPrescriptions);
  document.getElementById('refresh-consultations')?.addEventListener('click', loadConsultations);
  document.getElementById('refresh-queue')?.addEventListener('click', loadQueue);
  document.getElementById('refresh-visits')?.addEventListener('click', loadVisits);
  document.getElementById('refresh-patients')?.addEventListener('click', loadPatients);
  document.getElementById('refresh-vitals')?.addEventListener('click', loadVitals);
  document.getElementById('refresh-reviews')?.addEventListener('click', loadReviews);

  // Initialize
  (async () => {
    await populateDropdowns();
    await loadProfile();
    await loadDashboardStats();
    await loadAppointments();
    await loadSchedule();
    await loadPrescriptions();
    await loadConsultations();
    await loadQueue();
    await loadVisits();
    await loadPatients();
    await loadVitals();
    await loadReviews();
  })();
})();
