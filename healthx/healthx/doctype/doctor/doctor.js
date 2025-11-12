frappe.ui.form.on("Doctor", {
    // ✅ When the form loads
    // ✅ Validate before saving
    validate: function(frm) {
        // Full name validation
        if (frm.doc.full_name && frm.doc.full_name.trim().length < 3) {
            frappe.throw(__("Full Name must be at least 3 characters long."));
        }

        // Experience validation
        if (frm.doc.experience_years < 0 || frm.doc.experience_years > 80) {
            frappe.throw(__("Experience Years must be between 0 and 80."));
        }

        // Consultation fees validation
        if (frm.doc.consultation_fees <= 0) {
            frappe.throw(__("Consultation Fees must be greater than zero."));
        }

        // Rating validation
        if (frm.doc.rating_average && (frm.doc.rating_average < 0 || frm.doc.rating_average > 5)) {
            frappe.throw(__("Rating Average must be between 0 and 5."));
        }

        // Auto-trim full name
        if (frm.doc.full_name) {
            frm.set_value("full_name", frm.doc.full_name.trim());
        }
    },

    // ✅ Auto-format name capitalization
    full_name: function(frm) {
        if (frm.doc.full_name) {
            const formattedName = frm.doc.full_name
                .split(" ")
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
            frm.set_value("full_name", formattedName);
        }
    }
});
