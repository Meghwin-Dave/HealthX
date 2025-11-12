import frappe
from frappe.model.document import Document

class Invoice(Document):
    def validate(self):
        if not self.date:
            self.date = frappe.utils.nowdate()

        if not self.total_amount or self.total_amount <= 0:
            frappe.throw("Total Amount must be greater than zero.")

        if self.discount and (self.discount < 0 or self.discount > 100):
            frappe.throw("Discount must be between 0 and 100.")

        # Calculate after discount
        self.amount_after_discount = self.total_amount - (self.total_amount * (self.discount or 0) / 100)

    def on_submit(self):
        """When invoice is submitted, mark Clinic Visit as Paid if applicable."""
        if self.visit:
            frappe.db.set_value("Clinic Visit", self.visit, "billing_status", "Paid")
            frappe.msgprint(f"Marked Clinic Visit {self.visit} as Paid.")

@frappe.whitelist()
def create_invoice_from_visit(visit):
    """Create Invoice directly from Clinic Visit."""
    visit_doc = frappe.get_doc("Clinic Visit", visit)

    if not visit_doc.patient:
        frappe.throw("This visit has no linked patient.")

    # Check if already has an Invoice
    existing_invoice = frappe.db.get_value("Invoice", {"visit": visit})
    if existing_invoice:
        return existing_invoice

    # Try fetching doctor's consultation fees
    consultation_fees = None
    if visit_doc.doctor:
        consultation_fees = frappe.db.get_value("Doctor", visit_doc.doctor, "consultation_fees")

    # Create the invoice
    invoice = frappe.get_doc({
        "doctype": "Invoice",
        "visit": visit_doc.name,
        "patient": visit_doc.patient,
        "date": frappe.utils.nowdate(),
        "currency": frappe.defaults.get_user_default("currency") or "INR",
        "total_amount": consultation_fees or 0,
        "discount": 0,
        "payment_status": "Pending"
    })
    invoice.insert(ignore_permissions=True)
    frappe.db.commit()

    return invoice.name
