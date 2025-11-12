import frappe
from frappe.model.document import Document
from frappe import _

class QueueToken(Document):

    def before_naming(self):
        """Assigns a new token number automatically before saving."""
        self.set_token_number()

    def validate(self):
        """Extra sanity checks."""
        if not self.date:
            frappe.throw(_("Date is required."))

        if not self.visit:
            frappe.throw(_("Visit is required."))

        if not self.doctor:
            frappe.throw(_("Doctor is required."))

        if self.priority and self.priority not in ["Normal", "Emergency"]:
            frappe.throw(_("Priority must be either 'Normal' or 'Emergency'."))

        if self.status and self.status not in ["Waiting", "In-Progress", "Completed"]:
            frappe.throw(_("Invalid Status."))

    def set_token_number(self):
        """Generate sequential token per date and priority (Emergency vs Normal)."""
        if self.token_number:
            return  # already assigned (e.g., on duplication)

        # Ensure date is set
        if not self.date:
            self.date = frappe.utils.nowdate()

        # Use DB transaction lock to prevent race conditions
        frappe.db.sql("LOCK TABLE `tabQueue Token` WRITE")

        try:
            if self.priority == "Emergency":
                # Get current max Emergency token for this date
                last_token = frappe.db.sql(
                    """
                    SELECT MAX(CAST(SUBSTRING(token_number, 2) AS UNSIGNED))
                    FROM `tabQueue Token`
                    WHERE date = %s AND priority = 'Emergency'
                    """,
                    (self.date,),
                )[0][0]
                next_token = (last_token or 0) + 1
                self.token_number = f"E{next_token}"

            else:
                # Get current max Normal token for this date
                last_token = frappe.db.sql(
                    """
                    SELECT MAX(CAST(token_number AS UNSIGNED))
                    FROM `tabQueue Token`
                    WHERE date = %s AND (priority IS NULL OR priority = 'Normal')
                    """,
                    (self.date,),
                )[0][0]
                next_token = (last_token or 0) + 1
                self.token_number = str(next_token)

        finally:
            frappe.db.sql("UNLOCK TABLES")

@frappe.whitelist()
def create_token_for_visit(visit, doctor):
    """Create a Queue Token for a given Clinic Visit."""
    visit_doc = frappe.get_doc("Clinic Visit", visit)

    token = frappe.get_doc({
        "doctype": "Queue Token",
        "date": frappe.utils.nowdate(),
        "visit": visit,
        "doctor": doctor,
        "priority": "Normal",  # Default, can be changed later
        "status": "Waiting"
    })
    token.insert()
    frappe.db.commit()

    return token.name

