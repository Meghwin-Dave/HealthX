import frappe
from frappe.model.document import Document

class ServiceRequest(Document):
    pass


@frappe.whitelist()
def create_invoice(service_request, patient):
    """Create an Invoice from a Service Request"""
    sr = frappe.get_doc("Service Request", service_request)

    existing_invoice = frappe.db.exists("Invoice", {"service_request": sr.name})
    
    invoice = frappe.new_doc("Invoice")
    invoice.patient = patient
    invoice.date = frappe.utils.nowdate()
    invoice.total_amount = sr.base_rate or 0
    invoice.payment_status = "Pending"
    invoice.payment_mode = "Cash"
    invoice.currency = frappe.defaults.get_global_default("currency") or "INR"
    invoice.service_request = sr.name
    invoice.insert(ignore_permissions=True)
    frappe.db.commit()

    return invoice.name


@frappe.whitelist()
def create_home_report(service_request, doctor, findings, recommendations=None):
    """Create a Home Report linked to the Service Request"""
    sr = frappe.get_doc("Service Request", service_request)

    home_report = frappe.new_doc("Home Report")
    home_report.service_request = sr.name
    home_report.submitted_by = doctor
    home_report.findings = findings
    home_report.recommendations = recommendations or ""
    home_report.insert(ignore_permissions=True)
    frappe.db.commit()

    return home_report.name
