frappe.ui.form.on("Doctor Appointment", {
    refresh(frm) {
        // Add Invoice button only if appointment is saved
        if (!frm.is_new() && frm.doc.patient && frm.doc.doctor) {
            frm.add_custom_button(__('🧾 Generate Invoice'), function () {
                frappe.call({
                    method: "frappe.client.insert",
                    args: {
                        doc: {
                            doctype: "Invoice",
                            date: frappe.datetime.nowdate(),
                            patient: frm.doc.patient,
                            appointment: frm.doc.name, // link appointment to invoice
                            total_amount: 0.0,
                            payment_status: "Pending",
                            payment_mode: "Cash"
                        }
                    },
                    callback: function (r) {
                        if (r.message) {
                            frappe.msgprint({
                                title: __("Invoice Created"),
                                message: __("Invoice <b>{0}</b> has been created successfully.", [r.message.name]),
                                indicator: "green"
                            });
                            frappe.set_route("Form", "Invoice", r.message.name);
                        }
                    }
                });
            })
            .addClass("btn-primary")
            .css({ "font-weight": "600" });
        }
    }
});
