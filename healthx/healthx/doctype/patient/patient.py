import frappe
from frappe.model.document import Document
from frappe import _

class Patient(Document):

    def validate(self):
        """Runs automatically before save"""
        self.validate_full_name()
        self.validate_phone()
        self.validate_email()
        self.validate_date_of_birth()
        self.check_duplicate_phone()

    def validate_full_name(self):
        if not self.full_name or len(self.full_name.strip()) < 3:
            frappe.throw(_("Full Name must have at least 3 characters."))

    def validate_phone(self):
        import re
        pattern = re.compile(r"^\+?[0-9]{7,15}$")
        if not pattern.match(self.phone_number):
            frappe.throw(_("Please enter a valid Phone Number (7–15 digits)."))

    def validate_email(self):
        if self.email and not frappe.utils.validate_email_address(self.email):
            frappe.throw(_("Invalid email address."))

    def validate_date_of_birth(self):
        if self.date_of_birth and self.date_of_birth > frappe.utils.nowdate():
            frappe.throw(_("Date of Birth cannot be in the future."))

    def check_duplicate_phone(self):
        """Ensure phone number is unique."""
        existing = frappe.db.exists(
            "Patient",
            {"phone_number": self.phone_number, "name": ["!=", self.name]}
        )
        if existing:
            frappe.throw(_("A patient with this phone number already exists: {0}").format(existing))

# 💡 Optional custom method: fetch patients by gender or country
@frappe.whitelist()
def get_patients_by_filter(gender=None, country=None):
    """Fetch filtered patient list"""
    filters = {}
    if gender:
        filters["gender"] = gender
    if country:
        filters["country"] = country

    patients = frappe.get_all(
        "Patient",
        filters=filters,
        fields=["name", "full_name", "gender", "country", "phone_number"]
    )
    return patients
