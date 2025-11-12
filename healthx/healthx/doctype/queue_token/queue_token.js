frappe.ui.form.on("Queue Token", {
    onload(frm) {
        // Apply filter to Visit field (show only relevant statuses)
        frm.set_query("visit", function() {
            return {
                filters: {
                    consultation_status: ["in", ["Waiting", "In-Progress"]],
                }
            };
        });

        // Set default date
        if (!frm.doc.date) {
            frm.set_value("date", frappe.datetime.now_date());
        }
    },

    refresh(frm) {
        // Make token_number read-only
        frm.set_df_property("token_number", "read_only", 1);
    },
});
