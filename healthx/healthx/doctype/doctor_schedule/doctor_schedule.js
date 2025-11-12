frappe.ui.form.on("Doctor Schedule", {
    validate: function(frm) {
        // 🕒 Ensure Start Time < End Time
        if (frm.doc.start_time && frm.doc.end_time && frm.doc.start_time >= frm.doc.end_time) {
            frappe.throw(__("Start Time must be earlier than End Time."));
        }

        // ✅ Positive slot duration
        if (frm.doc.slot_duration_min && frm.doc.slot_duration_min <= 0) {
            frappe.throw(__("Slot Duration must be a positive number."));
        }
    },

    refresh(frm) {
        if (!frm.is_new() && frm.doc.start_time && frm.doc.end_time) {
            frm.add_custom_button(__('Preview Time Slots'), () => {
                frappe.call({
                    method: "healthx.healthx.doctype.doctor_schedule.doctor_schedule.generate_time_slots",
                    args: {
                        doctor: frm.doc.doctor,
                        start_time: frm.doc.start_time,
                        end_time: frm.doc.end_time,
                        slot_duration_min: frm.doc.slot_duration_min
                    },
                    callback(r) {
                        if (r.message) {
                            // Build modern card-styled layout
                            const slots = r.message;
                            let html = `
                                <div style="max-height:500px;overflow-y:auto;padding:10px;">
                                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
                                        ${slots.map(slot => `
                                            <div style="
                                                background:#f8f9fa;
                                                border:1px solid #e0e0e0;
                                                border-radius:6px;
                                                padding:8px 10px;
                                                text-align:center;
                                                font-weight:500;
                                                color:#333;
                                                box-shadow:0 1px 2px rgba(0,0,0,0.05);
                                                transition:all 0.2s ease;
                                            ">
                                                <i class="fa fa-clock text-muted" style="margin-right:5px;color:#6c757d;"></i>
                                                ${slot}
                                            </div>
                                        `).join("")}
                                    </div>
                                </div>
                            `;

                            frappe.msgprint({
                                title: __("🕒 Available Slots"),
                                message: html,
                                indicator: "green",
                                wide: true
                            });
                        }
                    }
                });
            }).addClass("btn-info");
        }
    }
});
