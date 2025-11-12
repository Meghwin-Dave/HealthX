frappe.ui.form.on("Patient", {
    // ✅ Trigger when form is loaded
    onload: function(frm) {
        // Filter: Only show enabled languages
        frm.set_query("preferred_language", function() {
            return {
                filters: {
                    enabled: 1
                }
            };
        });

        // Filter: Show only active countries
        frm.set_query("country", function() {
            return {
                filters: {
                    enabled: 1
                }
            };
        });
    },

    // ✅ Before saving the record
    validate: function(frm) {
        // Full name must be at least 3 characters
        if (frm.doc.full_name && frm.doc.full_name.length < 3) {
            frappe.throw(__("Full Name must be at least 3 characters long."));
        }

        // Basic phone number validation
        if (frm.doc.phone_number && !/^\+?[0-9]{7,15}$/.test(frm.doc.phone_number)) {
            frappe.throw(__("Please enter a valid phone number (7–15 digits)."));
        }

        // Email format validation (if provided)
        if (frm.doc.email && !frappe.utils.validate_type(frm.doc.email, "email")) {
            frappe.throw(__("Invalid email address."));
        }

        // Date of birth validation
        if (frm.doc.date_of_birth && frappe.datetime.get_diff(frappe.datetime.nowdate(), frm.doc.date_of_birth) < 0) {
            frappe.throw(__("Date of Birth cannot be in the future."));
        }
    },

    // ✅ Auto-format name
    full_name: function(frm) {
        if (frm.doc.full_name) {
            frm.set_value("full_name", frm.doc.full_name.trim());
        }
    }
});
