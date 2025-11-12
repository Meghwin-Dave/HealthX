frappe.ui.form.on("Pharmacy", {
    validate: function(frm) {
        // ✅ Ensure pharmacy name is not empty
        if (!frm.doc.pharmacy__name) {
            frappe.throw(__("Pharmacy Name is required."));
        }

        // ✅ Validate address
        if (!frm.doc.address) {
            frappe.throw(__("Please enter the pharmacy address."));
        }

        // ✅ Validate contact number (only digits, min 10 characters)
        if (frm.doc.contact_number) {
            const phonePattern = /^[0-9]{10,15}$/;
            if (!phonePattern.test(frm.doc.contact_number)) {
                frappe.throw(__("Please enter a valid Contact Number (10-15 digits)."));
            }
        } else {
            frappe.throw(__("Contact Number is required."));
        }

        // ✅ Validate operating hours
        if (frm.doc.from && frm.doc.to) {
            const fromTime = moment(frm.doc.from, "HH:mm:ss");
            const toTime = moment(frm.doc.to, "HH:mm:ss");
            if (toTime.isBefore(fromTime)) {
                frappe.throw(__("Operating 'To' time cannot be earlier than 'From' time."));
            }
        }

        // ✅ Rating check (if entered)
        if (frm.doc.rating && (frm.doc.rating < 0 || frm.doc.rating > 5)) {
            frappe.throw(__("Rating must be between 0 and 5."));
        }
    },

    // Auto-format contact number
    contact_number: function(frm) {
        if (frm.doc.contact_number) {
            frm.set_value("contact_number", frm.doc.contact_number.replace(/\D/g, "")); // remove non-digits
        }
    },

    // Auto set default operating hours if empty
    onload: function(frm) {
        if (!frm.doc.from) frm.set_value("from", "09:00:00");
        if (!frm.doc.to) frm.set_value("to", "21:00:00");
    }
});
