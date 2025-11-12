frappe.ui.form.on("Treatement Package", {
    refresh(frm) {
        // Show button only when the document is saved
        if (!frm.is_new() && frm.doc.total_price > 0) {
            frm.add_custom_button(__('🧾 Generate Invoice'), function () {
                frappe.prompt([
                    {
                        label: __("Select Patient"),
                        fieldname: "patient",
                        fieldtype: "Link",
                        options: "Patient",
                        reqd: 1
                    },
                    {
                        label: __("Payment Mode"),
                        fieldname: "payment_mode",
                        fieldtype: "Select",
                        options: "Cash\nCard\nUPI",
                        default: "Cash",
                        reqd: 1
                    }
                ],
                function(values) {
                    frappe.call({
                        method: "frappe.client.insert",
                        args: {
                            doc: {
                                doctype: "Invoice",
                                date: frappe.datetime.nowdate(),
                                patient: values.patient,
                                total_amount: frm.doc.total_price,
                                amount_after_discount: frm.doc.total_price,
                                payment_status: "Pending",
                                payment_mode: values.payment_mode,
                                currency: "INR",
                                treatement_package: frm.doc.name // optional link to package for traceability
                            }
                        },
                        callback: function (r) {
                            if (r.message) {
                                frappe.msgprint({
                                    title: __("Invoice Created"),
                                    message: __("Invoice <b>{0}</b> generated successfully for patient <b>{1}</b>.", [
                                        r.message.name,
                                        values.patient
                                    ]),
                                    indicator: "green"
                                });
                                frappe.set_route("Form", "Invoice", r.message.name);
                            }
                        }
                    });
                },
                __("Invoice Details"),
                __("Create")
                );
            })
            .addClass("btn-primary")
            .css({ "font-weight": "600" });
        }
    }
});

frappe.ui.form.on("Treatement Package", {
    validate(frm) {
        let total = 0;

        // Loop through each inclusion and calculate total
        (frm.doc.inclusions || []).forEach(row => {
            if (row.price_per_session && row.quantity) {
                total += flt(row.price_per_session) * flt(row.quantity);
            }
        });

        frm.set_value("total_price", total);
    }
});

// Optional: Update total instantly when inclusions table changes
frappe.ui.form.on("Package Item", {
    price_per_session(frm, cdt, cdn) {
        calculate_total(frm);
    },
    quantity(frm, cdt, cdn) {
        calculate_total(frm);
    },
    inclusions_remove(frm) {
        calculate_total(frm);
    }
});

function calculate_total(frm) {
    let total = 0;
    (frm.doc.inclusions || []).forEach(row => {
        if (row.price_per_session && row.quantity) {
            total += flt(row.price_per_session) * flt(row.quantity);
        }
    });
    frm.set_value("total_price", total);
}

