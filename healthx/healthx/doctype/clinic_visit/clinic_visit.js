frappe.ui.form.on("Clinic Visit", {
    validate: function(frm) {
        // Edge case check
        if (frm.doc.patient === frm.doc.doctor) {
            frappe.throw(__("Patient and Doctor cannot be the same entity."));
        }

        // Default statuses
        if (!frm.doc.billing_status) {
            frm.set_value("billing_status", "Pending");
        }

        if (!frm.doc.consultation_status) {
            frm.set_value("consultation_status", "Waiting");
        }

        // Validate visit type
        const valid_visit_types = ["Walk-in", "Appointment", "Online"];
        if (frm.doc.visit_type && !valid_visit_types.includes(frm.doc.visit_type)) {
            frappe.throw(__("Invalid Visit Type."));
        }
    },

    consultation_status: function(frm) {
        if (frm.doc.consultation_status === "Completed" && frm.doc.billing_status === "Pending") {
            frappe.confirm(
                __("Mark billing status as Paid?"),
                () => {
                    frm.set_value("billing_status", "Paid");
                    frm.save();
                }
            );
        }
    },

    patient: function(frm) {
        if (frm.doc.patient) {
            frappe.call({
                method: "healthx.healthx.doctype.clinic_visit.clinic_visit.get_previous_visits",
                args: { patient: frm.doc.patient },
                callback: function(r) {
                    if (r.message && r.message.length) {
                        frappe.msgprint(__("This patient has {0} previous visits.", [r.message.length]));
                    }
                }
            });
        }
    },

    refresh: function(frm) {
        if (!frm.is_new() && frm.doc.name) {

            // ✅ Generate Queue Token
            frm.add_custom_button(__('Generate Queue Token'), function() {
                frappe.call({
                    method: "healthx.healthx.doctype.queue_token.queue_token.create_token_for_visit",
                    args: {
                        visit: frm.doc.name,
                        doctor: frm.doc.doctor
                    },
                    callback: function(r) {
                        if (r.message) {
                            frappe.msgprint(__("Queue Token {0} created successfully.", [r.message]));
                            frappe.set_route("Form", "Queue Token", r.message);
                        }
                    }
                });
            }).addClass("btn-primary");

            // ✅ Generate Invoice (only if not already Paid)
            if (frm.doc.billing_status !== "Paid") {
                frm.add_custom_button(__('Generate Invoice'), function() {
                    frappe.call({
                        method: "healthx.healthx.doctype.invoice.invoice.create_invoice_from_visit",
                        args: {
                            visit: frm.doc.name
                        },
                        callback: function(r) {
                            if (r.message) {
                                frappe.msgprint(__("Invoice {0} created successfully.", [r.message]));
                                frappe.set_route("Form", "Invoice", r.message);
                            }
                        }
                    });
                }).addClass("btn-success");
            }
        }
    }
});
