frappe.ui.form.on("Invoice", {
    onload: function(frm) {
        // Autofill date if new
        if (frm.is_new() && !frm.doc.date) {
            frm.set_value("date", frappe.datetime.get_today());
        }
    },

    visit: function(frm) {
        // When visit is selected, auto-fill patient and default total amount
        if (frm.doc.visit) {
            frappe.db.get_doc("Clinic Visit", frm.doc.visit)
                .then(doc => {
                    if (doc.patient) frm.set_value("patient", doc.patient);
                    if (doc.doctor) frm.set_value("currency", frappe.defaults.get_user_default("currency") || "INR");
                    if (doc.doctor) {
                        // Optional: If doctor has consultation fees
                        frappe.db.get_value("Doctor", doc.doctor, "consultation_fees", (r) => {
                            if (r && r.consultation_fees) {
                                frm.set_value("total_amount", r.consultation_fees);
                                frm.trigger("calculate_amount_after_discount");
                            }
                        });
                    }
                });
        }
    },

    discount: function(frm) {
        frm.trigger("calculate_amount_after_discount");
    },

    total_amount: function(frm) {
        frm.trigger("calculate_amount_after_discount");
    },

    calculate_amount_after_discount: function(frm) {
        let total = frm.doc.total_amount || 0;
        let discount = frm.doc.discount || 0;
        let discounted = total - (total * discount / 100);
        frm.set_value("amount_after_discount", discounted);
    },

    payment_mode: function(frm) {
        // Automatically mark as paid for non-cash payments
        if (frm.doc.payment_mode && frm.doc.payment_mode !== "Cash") {
            frm.set_value("payment_status", "Paid");
        }
    },

    validate: function(frm) {
        // Ensure valid numbers
        if (frm.doc.total_amount <= 0) {
            frappe.throw(__("Total Amount must be greater than zero."));
        }

        if (frm.doc.discount < 0 || frm.doc.discount > 100) {
            frappe.throw(__("Discount must be between 0 and 100%."));
        }

        // Automatically calculate before save
        frm.trigger("calculate_amount_after_discount");
    },

    refresh: function(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button(__('Mark as Paid'), function() {
                frm.set_value("payment_status", "Paid");
                frm.save();
            });
        }
    }
});
