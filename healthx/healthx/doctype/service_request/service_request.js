frappe.ui.form.on("Service Request", {
    refresh: function(frm) {
        if (!frm.is_new() && frm.doc.docstatus !== 1) {

            // 🧾 Create Invoice Button
            frm.add_custom_button(__('Create Invoice'), function() {
                frappe.prompt([
                    {
                        fieldname: 'patient',
                        label: 'Select Patient',
                        fieldtype: 'Link',
                        options: 'Patient',
                        reqd: 1
                    }
                ],
                function(values) {
                    frappe.call({
                        method: "healthx.healthx.doctype.service_request.service_request.create_invoice",
                        args: {
                            service_request: frm.doc.name,
                            patient: values.patient
                        },
                        callback: function(r) {
                            if (r.message) {
                                frappe.msgprint(__("Invoice {0} created successfully.", [r.message]));
                                frappe.set_route("Form", "Invoice", r.message);
                            }
                        }
                    });
                },
                __('Enter Patient Details'),
                __('Create'));
            }).addClass("btn-primary");

            // 🏠 Create Home Report Button
            frm.add_custom_button(__('Create Home Report'), function() {
                frappe.prompt([
                    {
                        fieldname: 'doctor',
                        label: 'Submitted By (Doctor)',
                        fieldtype: 'Link',
                        options: 'Doctor',
                        reqd: 1,
                        default: frm.doc.doctor || ''
                    },
                    {
                        fieldname: 'findings',
                        label: 'Findings',
                        fieldtype: 'Small Text',
                        reqd: 1
                    },
                    {
                        fieldname: 'recommendations',
                        label: 'Recommendations',
                        fieldtype: 'Small Text'
                    }
                ],
                function(values) {
                    frappe.call({
                        method: "healthx.healthx.doctype.service_request.service_request.create_home_report",
                        args: {
                            service_request: frm.doc.name,
                            doctor: values.doctor,
                            findings: values.findings,
                            recommendations: values.recommendations
                        },
                        callback: function(r) {
                            if (r.message) {
                                frappe.msgprint(__("Home Report {0} created successfully.", [r.message]));
                                frappe.set_route("Form", "Home Report", r.message);
                            }
                        }
                    });
                },
                __('Enter Home Report Details'),
                __('Create'));
            }).addClass("btn-secondary");
        }
    }
});
