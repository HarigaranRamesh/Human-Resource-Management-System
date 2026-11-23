// src/services/payslipPdf.service.js
// Enterprise Payslip PDF Generator using PDFKit
const PDFDocument = require('pdfkit');

function generatePayslipPdf(payslipData, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(stream);

  // 1. Header Banner
  doc.rect(40, 40, 515, 65).fill('#2F4156');
  doc.fillColor('#FFFFFF')
     .fontSize(18)
     .font('Helvetica-Bold')
     .text('NIRALIX HRMS ENTERPRISE', 60, 52);
  doc.fontSize(10)
     .font('Helvetica')
     .text('Global Workforce Solutions & Corporate Services', 60, 74)
     .text('CONFIDENTIAL SALARY STATEMENT', 360, 74, { align: 'right' });

  // 2. Payslip Period & Info
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[payslipData.month] || `Month ${payslipData.month}`;
  
  doc.fillColor('#2F4156')
     .fontSize(13)
     .font('Helvetica-Bold')
     .text(`Payslip for ${monthName} ${payslipData.year}`, 40, 120);

  // 3. Employee Details Grid
  doc.rect(40, 140, 515, 90).stroke('#CBD5E1');
  
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#567C8D');
  doc.text('Employee Name:', 50, 148);
  doc.text('Employee ID:', 50, 168);
  doc.text('Department:', 50, 188);
  doc.text('Designation:', 50, 208);

  doc.font('Helvetica').fillColor('#1E293B');
  doc.text(payslipData.user_name || '—', 140, 148);
  doc.text(payslipData.emp_id || '—', 140, 168);
  doc.text(payslipData.department || '—', 140, 188);
  doc.text(payslipData.position || '—', 140, 208);

  doc.font('Helvetica-Bold').fillColor('#567C8D');
  doc.text('Bank Name:', 310, 148);
  doc.text('Account No:', 310, 168);
  doc.text('IFSC Code:', 310, 188);
  doc.text('PAN Number:', 310, 208);

  doc.font('Helvetica').fillColor('#1E293B');
  doc.text(payslipData.bank_name || 'Standard Chartered', 390, 148);
  doc.text(payslipData.account_no ? `•••• ${payslipData.account_no.slice(-4)}` : '•••• 5489', 390, 168);
  doc.text(payslipData.ifsc_code || 'SCBL0036001', 390, 188);
  doc.text(payslipData.pan_no || 'AAAPL1234K', 390, 208);

  // 4. Attendance Summary
  doc.rect(40, 238, 515, 26).fill('#F8FAFC');
  doc.stroke('#CBD5E1');
  doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
  doc.text(`Calendar Days: ${payslipData.days_in_month || 30}`, 50, 246);
  doc.text(`Days Worked: ${payslipData.days_worked || 30}`, 220, 246);
  doc.text(`Loss of Pay (LOP): ${payslipData.lop_days || 0}`, 400, 246);

  // 5. Earnings & Deductions Tables
  const startY = 275;
  const colWidth = 252;
  const colGap = 11;
  const leftX = 40;
  const rightX = leftX + colWidth + colGap;

  // Earnings Header
  doc.rect(leftX, startY, colWidth, 22).fill('#567C8D');
  doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
     .text('EARNINGS', leftX + 10, startY + 6)
     .text('AMOUNT (₹)', leftX + colWidth - 75, startY + 6);

  // Deductions Header
  doc.rect(rightX, startY, colWidth, 22).fill('#567C8D');
  doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
     .text('DEDUCTIONS', rightX + 10, startY + 6)
     .text('AMOUNT (₹)', rightX + colWidth - 75, startY + 6);

  // Earnings Rows
  const earningsList = [
    { label: 'Basic Salary', val: payslipData.basic },
    { label: 'House Rent Allowance (HRA)', val: payslipData.hra },
    { label: 'Dearness Allowance (DA)', val: payslipData.da },
    { label: 'Conveyance Allowance', val: payslipData.conveyance },
    { label: 'Medical Allowance', val: payslipData.medical },
    { label: 'Special Allowance', val: payslipData.special_allowance },
  ].filter(e => parseFloat(e.val) > 0);

  // Deductions Rows
  const deductionsList = [
    { label: 'Provident Fund (Employee PF)', val: payslipData.pf_employee },
    { label: 'Employee State Insurance (ESI)', val: payslipData.esi_employee },
    { label: 'Professional Tax (PT)', val: payslipData.professional_tax },
    { label: 'Income Tax (TDS)', val: payslipData.tds_tax },
  ].filter(d => parseFloat(d.val) > 0);

  let curY = startY + 28;
  const maxRows = Math.max(earningsList.length, deductionsList.length);

  doc.font('Helvetica').fontSize(9).fillColor('#1E293B');

  for (let i = 0; i < maxRows; i++) {
    // Left side
    if (earningsList[i]) {
      doc.text(earningsList[i].label, leftX + 10, curY);
      doc.text(`₹ ${parseFloat(earningsList[i].val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftX + colWidth - 85, curY, { align: 'right', width: 75 });
    }
    // Right side
    if (deductionsList[i]) {
      doc.text(deductionsList[i].label, rightX + 10, curY);
      doc.text(`₹ ${parseFloat(deductionsList[i].val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX + colWidth - 85, curY, { align: 'right', width: 75 });
    }
    curY += 20;
  }

  // Subtotals line
  doc.rect(leftX, curY + 6, colWidth, 22).fill('#F1F5F9');
  doc.fillColor('#0F172A').font('Helvetica-Bold')
     .text('Gross Earnings', leftX + 10, curY + 12)
     .text(`₹ ${parseFloat(payslipData.gross_earnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftX + colWidth - 85, curY + 12, { align: 'right', width: 75 });

  doc.rect(rightX, curY + 6, colWidth, 22).fill('#F1F5F9');
  doc.fillColor('#0F172A').font('Helvetica-Bold')
     .text('Total Deductions', rightX + 10, curY + 12)
     .text(`₹ ${parseFloat(payslipData.total_deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX + colWidth - 85, curY + 12, { align: 'right', width: 75 });

  // 6. Net Pay Box
  curY += 45;
  doc.rect(40, curY, 515, 45).fill('#C8D9E6');
  doc.fillColor('#2F4156').fontSize(11).font('Helvetica-Bold')
     .text('NET SALARY PAYABLE:', 60, curY + 16);
  doc.fontSize(16).fillColor('#2F4156')
     .text(`₹ ${parseFloat(payslipData.net_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 350, curY + 13, { align: 'right', width: 185 });

  // 7. Footer Note & Disclaimer
  doc.fontSize(8).font('Helvetica').fillColor('#64748B')
     .text('Note: This is a system-generated payslip issued by NIRALIX HRMS Enterprise and does not require a physical signature.', 40, 720, { align: 'center', width: 515 })
     .text('For queries regarding salary computation or tax deductions, please contact HR & Accounts.', 40, 735, { align: 'center', width: 515 });

  doc.end();
}

module.exports = { generatePayslipPdf };
