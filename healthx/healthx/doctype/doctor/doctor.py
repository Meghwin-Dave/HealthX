import frappe
from frappe.model.document import Document
from frappe import _

class Doctor(Document):

    def validate(self):
        """Executed automatically before saving"""
        self.validate_full_name()
        self.validate_experience()
        self.validate_fees()
        self.validate_rating()
        self.check_duplicate_name()

    def validate_full_name(self):
        if not self.full_name or len(self.full_name.strip()) < 3:
            frappe.throw(_("Full Name must have at least 3 characters."))

    def validate_experience(self):
        if self.experience_years is None or self.experience_years < 0 or self.experience_years > 80:
            frappe.throw(_("Experience Years must be between 0 and 80."))

    def validate_fees(self):
        if self.consultation_fees is None or self.consultation_fees <= 0:
            frappe.throw(_("Consultation Fees must be greater than zero."))

    def validate_rating(self):
        if self.rating_average and (self.rating_average < 0 or self.rating_average > 5):
            frappe.throw(_("Rating Average must be between 0 and 5."))

    def check_duplicate_name(self):
        """Avoid duplicate doctor names"""
        existing = frappe.db.exists(
            "Doctor",
            {"full_name": self.full_name, "name": ["!=", self.name]}
        )
        if existing:
            frappe.throw(_("A Doctor named {0} already exists.").format(self.full_name))

# 💡 Optional API: Fetch doctors by specialization or rating
@frappe.whitelist()
def get_doctors_by_filter(specialization=None, min_rating=None):
    filters = {}
    if specialization:
        filters["specialization"] = specialization
    if min_rating:
        filters["rating_average"] = [">=", float(min_rating)]

    doctors = frappe.get_all(
        "Doctor",
        filters=filters,
        fields=[
            "name",
            "full_name",
            "specialization",
            "experience_years",
            "consultation_fees",
            "rating_average"
        ],
        order_by="rating_average desc"
    )
    return doctors
