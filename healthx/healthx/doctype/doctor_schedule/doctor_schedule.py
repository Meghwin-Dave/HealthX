import frappe
from frappe.model.document import Document
from datetime import datetime, timedelta

class DoctorSchedule(Document):

    def validate(self):
        """Validate schedule fields before saving."""
        self.validate_time_range()
        self.validate_slot_duration()
        self.validate_overlaps()

    def validate_time_range(self):
        """Ensure start_time < end_time."""
        if self.start_time >= self.end_time:
            frappe.throw("Start Time must be earlier than End Time.")

    def validate_slot_duration(self):
        """Ensure slot duration is positive and logical."""
        if self.slot_duration_min <= 0:
            frappe.throw("Slot Duration must be a positive number.")

        # Calculate total available time in minutes
        start = datetime.strptime(str(self.start_time), "%H:%M:%S")
        end = datetime.strptime(str(self.end_time), "%H:%M:%S")
        total_minutes = (end - start).seconds / 60

        if self.slot_duration_min > total_minutes:
            frappe.throw("Slot Duration cannot exceed total available time.")

    def validate_overlaps(self):
        """Ensure the doctor doesn't have overlapping schedules."""
        overlapping = frappe.db.exists(
            "Doctor Schedule",
            {
                "doctor": self.doctor,
                "name": ["!=", self.name],
            },
        )
        if overlapping:
            frappe.msgprint(
                f"Note: Doctor {self.doctor} already has another schedule ({overlapping})."
            )

import frappe
from datetime import datetime, timedelta

@frappe.whitelist()
def generate_time_slots(doctor=None, start_time=None, end_time=None, slot_duration_min=None):
    """Generate time slots between start and end time."""
    if not (start_time and end_time and slot_duration_min):
        frappe.throw("Start Time, End Time and Slot Duration are required.")

    start = datetime.strptime(str(start_time), "%H:%M:%S")
    end = datetime.strptime(str(end_time), "%H:%M:%S")
    duration = timedelta(minutes=int(slot_duration_min))

    slots = []
    current = start
    while current + duration <= end:
        slot_start = current.strftime("%H:%M")
        slot_end = (current + duration).strftime("%H:%M")
        slots.append(f"{slot_start} - {slot_end}")
        current += duration

    return slots
