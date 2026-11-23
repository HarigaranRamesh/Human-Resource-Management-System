function renderTemplate(html, vars = {}) {
  return html.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const val = vars[key];
    return val === undefined || val === null ? "" : String(val);
  });
}

const templates = {
  LEAVE_APPROVED: {
    subject: "✅ Leave Approved - {{leaveType}} ({{date}})",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="margin:0 0 10px;color:#1a7f37">Leave Approved</h2>
        <p>Dear <b>{{name}}</b>,</p>
        <p>Your leave request has been <b style="color:#1a7f37">APPROVED</b>.</p>

        <table cellpadding="6" style="border-collapse:collapse">
          <tr><td><b>Leave Type</b></td><td>{{leaveType}}</td></tr>
          <tr><td><b>Date</b></td><td>{{date}}</td></tr>
          <tr><td><b>Approved By</b></td><td>{{approvedBy}}</td></tr>
          <tr><td><b>Remarks</b></td><td>{{remarks}}</td></tr>
        </table>

        <p style="margin-top:14px">Regards,<br/>{{companyName}}</p>
      </div>
    `
  },

  LEAVE_REJECTED: {
    subject: "❌ Leave Rejected - {{leaveType}} ({{date}})",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="margin:0 0 10px;color:#b42318">Leave Rejected</h2>
        <p>Dear <b>{{name}}</b>,</p>
        <p>Your leave request has been <b style="color:#b42318">REJECTED</b>.</p>

        <table cellpadding="6" style="border-collapse:collapse">
          <tr><td><b>Leave Type</b></td><td>{{leaveType}}</td></tr>
          <tr><td><b>Date</b></td><td>{{date}}</td></tr>
          <tr><td><b>Reviewed By</b></td><td>{{approvedBy}}</td></tr>
          <tr><td><b>Reason</b></td><td>{{rejectionReason}}</td></tr>
          <tr><td><b>Remarks</b></td><td>{{remarks}}</td></tr>
        </table>

        <p style="margin-top:14px">Regards,<br/>{{companyName}}</p>
      </div>
    `
  },

  PERFORMANCE_ASSIGNED: {
    subject: "📋 Performance Self-Assessment Assigned",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="margin:0 0 10px;color:#1a7f37">Action Required: Performance Assessment</h2>
        <p>Dear <b>{{name}}</b>,</p>
        <p>A new performance template has been assigned to your role (<b>{{roleName}}</b>) by the Super Admin.</p>
        <p>Please log in to the HRMS portal to complete your self-assessment as per the assigned KPIs and KRAs.</p>
        <p style="margin-top:14px">Regards,<br/>{{companyName}} HR Team</p>
      </div>
    `
  },

  SELF_ASSESSMENT_SUBMITTED: {
    subject: "✅ Self-Assessment Submitted: {{employeeName}}",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="margin:0 0 10px;color:#1a7f37">Self-Assessment Completed</h2>
        <p>Hello Admin,</p>
        <p>Employee <b>{{employeeName}}</b> ({{roleName}}) has successfully submitted their performance self-assessment.</p>
        <p>You can now review their ratings and provide your feedback in the Performance module.</p>
        <p style="margin-top:14px">Regards,<br/>HRMS System</p>
      </div>
    `
  },

  PERFORMANCE_REVIEW_COMPLETED: {
    subject: "⭐ Performance Review Updated: {{employeeName}}",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="margin:0 0 10px;color:#1a7f37">Performance Review Update</h2>
        <p>Hello Team,</p>
        <p>The performance review for <b>{{employeeName}}</b> has been updated by <b>{{reviewerName}}</b>.</p>
        <p><b>Current Status:</b> {{status}}</p>
        <p>Please log in to the HRMS portal for further details.</p>
        <p style="margin-top:14px">Regards,<br/>{{companyName}} HRMS</p>
      </div>
    `
  }
};

module.exports = { templates, renderTemplate };
