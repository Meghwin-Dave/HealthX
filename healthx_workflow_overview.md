## Healthx User Guide

Welcome to Healthx. This guide explains how to use all available features to run outpatient visits, book appointments, conduct online consultations, manage home services, handle device monitoring, and bill patients.

### 1) Getting Started

- **Create Patients**
  - Go to Patient > New.
  - Enter full name, gender, phone number (must be unique), and other details.
  - Save.

- **Create Doctors**
  - Go to Doctor > New.
  - Set specialization (choose a Speciality), experience, and consultation fees.
  - Save.

- **Set Specialities (optional)**
  - Go to Speciality > New and add speciality names as needed.

- **Configure Doctor Schedules**
  - Go to Doctor Schedule > New.
  - Select the Doctor, add Start/End Time, Slot Duration (minutes).
  - Add Weekdays (use the multi-select table) and Save.

- **Optional Masters**
  - Device Types, Drugs, Home Services, Procedures, and Pharmacies can be created upfront or as needed during workflows.

### 2) Outpatient Clinic (Walk-in) and Queue Management

- Create a Clinic Visit
  - Clinic Visit > New.
  - Select Patient and Doctor; set Visit Type to Walk-in.
  - Save. Consultation Status defaults to Waiting.

- Issue a Queue Token
  - Queue Token > New.
  - Select Visit; Doctor fetches automatically.
  - Set Priority (Normal or Emergency) and Save.

- Complete the Visit and Bill
  - Update Clinic Visit Consultation Status to Completed.
  - Create an Invoice referencing the Visit.
  - Fill totals, choose Payment Mode, set Payment Status to Paid, and Submit.

### 3) Appointments

- Book a Doctor Appointment
  - Doctor Appointment > New.
  - Select Patient, Doctor, Date, Start Time, End Time (match Doctor Schedule).
  - Set Booking Source (Admin/Web/App) and Booking Status (Confirmed).
  - Save.

- Complete and Bill an Appointment
  - After service, set Booking Status to Completed.
  - Create an Invoice referencing the Appointment and Submit.

### 4) Online Consultations and E‑Prescriptions

- Start an Online Consultation
  - Online Consultation > New.
  - Select Patient, Doctor, and Date; add Video Session Link if applicable.
  - Record Symptoms and Provisional Diagnosis.
  - Add E‑Prescription Item rows (Drug Name, Dosage, Frequency per day, Duration in days).
  - Save.

- Fulfill the Prescription (Pharmacy)
  - Ensure Pharmacy masters are set up (Pharmacy > New).
  - Medicine Order > New, choose Pharmacy.
  - Add Medicine Order Item rows (Drug Name, Quantity, Remarks).
  - Track Delivery Status (Processing → Dispatched → Delivered) and Payment Status (Pending → Paid).

### 5) Packages and Procedures

- Define Procedures
  - Procedure > New.
  - Choose Speciality, add Description and Price. Save.

- Create a Treatment Package
  - Treatement Package > New.
  - Add Package Item rows:
    - Select Procedure; Price Per Session auto‑fetches.
    - Enter Quantity.
  - Set Total Price and Validity (days). Save.

- Bill a Package
  - Create an Invoice referencing the Treatement Package and Submit.

### 6) Home Services (At‑Home Care)

- Define Home Services
  - Home Service > New. Enter Title, Description, and Base Rate. Save.

- Schedule a Service Request
  - Service Request > New.
  - Select Service Type (Home Service), Doctor, and Visit Date; Status starts as Scheduled.
  - Save; move Status to Ongoing, then Completed when done.

- Generate a Home Report
  - Home Report > New.
  - Link the Service Request, enter Findings and Recommendations, attach Related Documents, set Submitted By (Doctor). Save.

- Bill the Service
  - Create an Invoice referencing the Service Request and Submit.

### 7) Devices, Vitals, and Alerts

- Set Up Devices
  - Device Type > New (e.g., Heart Rate Band).
  - Device > New: select Patient and Device Type; optionally add Serial Number and Last Sync Time.

- Capture Vitals
  - Vitals Reading > New.
  - Select Device (Patient is fetched automatically), enter metrics (Heart Rate, SPO2, BP, Temperature, Fall Detected, Timestamp). Save.

- Manage Alerts
  - Alert Type > New (e.g., Low SPO2, Fall).
  - Alert Log > New: select Patient, Device, Alert Type, and Value; set Status (New → Acknowledged → Resolved). Save.

### 8) Invoicing and Payments

- Create an Invoice
  - Invoice > New.
  - Link one of: Visit, Appointment, Treatement Package, Service Request.
  - Set Date, Patient, Currency, Total Amount, optional Discount; Amount After Discount will reflect totals.
  - Choose Payment Mode (Cash/Card/UPI) and set Payment Status (Pending/Paid).
  - Submit to finalize. Use Amended From to revise if needed.

### 9) Feedback and Ratings

- Doctor Reviews
  - Doctor Review > New.
  - Select Doctor and Patient, add Rating and Feedback, and Date (defaults to Today). Save.

### 10) Reference: What Each Screen Is For

- Patient: register patient demographics and contact details.
- Doctor: manage doctor details, specialization, fees, and average rating.
- Doctor Schedule: configure available weekdays and times for each doctor.
- Doctor Appointment: book and track appointments; confirm, complete, or cancel.
- Clinic Visit: record walk‑in visits; track consultation and billing status.
- Queue Token: issue and track queue position per visit and doctor.
- Online Consultation: capture remote consultations with e‑prescriptions.
- E‑Prescription Item: prescription lines under an online consultation.
- Pharmacy: maintain pharmacy directory and operating hours.
- Medicine Order and Items: fulfill prescriptions; track delivery and payments.
- Procedure: define clinical procedures and pricing by speciality.
- Treatement Package and Package Item: bundle procedures; set validity and price.
- Home Service, Service Request, Home Report: manage at‑home services lifecycle.
- Device Type, Device, Vitals Reading: set up devices and capture patient vitals.
- Alert Type, Alert Log: configure alert categories and manage alert lifecycle.
- Invoice: bill visits, appointments, packages, or service requests; submit payments.
- Speciality, Weekday/Weekdays: supporting lookups for schedules and procedures.

### FAQs and Tips

- How do I enforce appointment slots?
  - Align Appointment Date/Time with the Doctor’s Schedule (Start/End and Slot Duration).
- Can I bill multiple sources on one invoice?
  - Link the most relevant source (Visit, Appointment, Package, or Service Request) per invoice for clarity.
- How do I correct a submitted invoice?
  - Use Amended From to create a corrected copy.
- Why can’t I save a patient?
  - Ensure the phone number is unique and required fields are filled.
- Queue tip:
  - Use Priority = Emergency to fast‑track critical visits.

### Appendix: Relationships (Reference)

- Core masters
  - Patient is referenced by: Clinic Visit, Doctor Appointment, Online Consultation, Invoice, Device, Vitals Reading, Alert Log, Doctor Review.
  - Doctor is referenced by: Clinic Visit, Queue Token, Doctor Appointment, Doctor Schedule, Online Consultation, Home Report.submitted_by, Service Request, Doctor Review.
  - Speciality is referenced by: Doctor.specialization, Procedure.speciality.
  - Weekday is used via child table Weekdays within Doctor Schedule.
- Visit and queue
  - Clinic Visit links to Patient and Doctor.
  - Queue Token links to Clinic Visit and fetches its Doctor.
  - Clinic Visit links forward to Invoice (via Invoice.visit).
- Appointments and billing
  - Doctor Appointment links to Patient and Doctor; forwards to Invoice (Invoice.appointment).
  - Invoice optionally references Visit, Appointment, Treatement Package, and Service Request.
- Online consultations and prescriptions
  - Online Consultation contains child table E‑Prescription Item.
- Pharmacy and medicine orders
  - Pharmacy links forward to Medicine Order (Medicine Order.pharmacy).
  - Medicine Order contains child table Medicine Order Item (links to Drug).
- Packages and procedures
  - Treatement Package contains child table Package Item (links to Procedure).
  - Procedure links to Speciality.
- Home services workflow
  - Home Service is referenced by Service Request.service_type.
  - Service Request links forward to Invoice and Home Report.
  - Home Report links back to Service Request; submitted_by links to Doctor.
- Devices and monitoring
  - Device links to Patient and Device Type.
  - Vitals Reading links to Device and fetches Patient.
  - Alert Log links to Patient, Device, and Alert Type.


