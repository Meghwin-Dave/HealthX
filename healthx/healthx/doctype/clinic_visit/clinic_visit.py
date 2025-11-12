import frappe
from frappe.model.document import Document
from frappe import _

class ClinicVisit(Document):

    def validate(self):
        """Runs automatically before saving."""
        self.validate_links()
        self.validate_status_values()
        self.auto_set_defaults()
        self.prevent_duplicate_pending_visits()

    def validate_links(self):
        if not frappe.db.exists("Patient", self.patient):
            frappe.throw(_("Invalid Patient selected."))
        if not frappe.db.exists("Doctor", self.doctor):
            frappe.throw(_("Invalid Doctor selected."))
        if self.patient == self.doctor:
            frappe.throw(_("Patient and Doctor cannot be the same entity."))

    def validate_status_values(self):
        valid_billing = ["Pending", "Paid"]
        valid_consult = ["Waiting", "In-Progress", "Completed"]
        valid_visit_types = ["Walk-in", "Appointment", "Online"]

        if self.billing_status and self.billing_status not in valid_billing:
            frappe.throw(_("Invalid Billing Status."))
        if self.consultation_status and self.consultation_status not in valid_consult:
            frappe.throw(_("Invalid Consultation Status."))
        if self.visit_type and self.visit_type not in valid_visit_types:
            frappe.throw(_("Invalid Visit Type."))

    def auto_set_defaults(self):
        """Set default statuses if empty."""
        if not self.billing_status:
            self.billing_status = "Pending"
        if not self.consultation_status:
            self.consultation_status = "Waiting"

    def prevent_duplicate_pending_visits(self):
        """Prevent multiple open visits for the same patient and doctor."""
        existing = frappe.db.exists(
            "Clinic Visit",
            {
                "patient": self.patient,
                "doctor": self.doctor,
                "consultation_status": ["in", ["Waiting", "In-Progress"]],
                "name": ["!=", self.name],
            },
        )
        if existing:
            frappe.throw(
                _("This patient already has an active visit with this doctor ({0}).").format(existing)
            )

# ✅ Whitelisted helper: Fetch previous visits
@frappe.whitelist()
def get_previous_visits(patient):
    """Return a list of previous visits for a patient."""
    visits = frappe.get_all(
        "Clinic Visit",
        filters={"patient": patient},
        fields=[
            "name",
            "doctor",
            "visit_type",
            "billing_status",
            "consultation_status",
            "creation",
        ],
        order_by="creation desc",
    )
    return visits

# ✅ Whitelisted helper: Get active consultations for a doctor
@frappe.whitelist()
def get_active_visits_for_doctor(doctor):
    """Return all ongoing visits for a doctor."""
    visits = frappe.get_all(
        "Clinic Visit",
        filters={"doctor": doctor, "consultation_status": ["in", ["Waiting", "In-Progress"]]},
        fields=["name", "patient", "visit_type", "consultation_status", "billing_status"],
    )
    return visits
