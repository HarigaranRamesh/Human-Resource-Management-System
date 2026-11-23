// src/db/repositories/payroll.repo.js
// Enterprise-grade Dynamic Payroll & Compensation Engine (Keka Parity)
const { query, getClient } = require('../pg');

/**
 * 1. SALARY STRUCTURES
 */
async function listStructures() {
  const { rows } = await query(`SELECT * FROM salary_structures ORDER BY created_at ASC`);
  return rows;
}

async function getDefaultStructure() {
  const { rows } = await query(`SELECT * FROM salary_structures WHERE is_default = TRUE LIMIT 1`);
  if (rows[0]) return rows[0];
  const all = await listStructures();
  return all[0] || null;
}

async function getStructureById(id) {
  const { rows } = await query(`SELECT * FROM salary_structures WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createStructure(data) {
  const { rows } = await query(`
    INSERT INTO salary_structures (
      name, description, basic_pct, hra_pct, da_pct,
      conveyance_monthly, medical_monthly, pf_employee_pct, pf_employer_pct,
      pf_ceiling, esi_employee_pct, esi_employer_pct, esi_threshold, pt_monthly, is_default
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING *
  `, [
    data.name, data.description || null,
    data.basic_pct || 50.00, data.hra_pct || 50.00, data.da_pct || 0.00,
    data.conveyance_monthly || 1600.00, data.medical_monthly || 1250.00,
    data.pf_employee_pct || 12.00, data.pf_employer_pct || 12.00,
    data.pf_ceiling || 15000.00, data.esi_employee_pct || 0.75,
    data.esi_employer_pct || 3.25, data.esi_threshold || 21000.00,
    data.pt_monthly || 200.00, data.is_default || false
  ]);
  return rows[0];
}

/**
 * 2. SALARY CALCULATION ENGINE
 * Calculates detailed earnings, deductions, formulas, and net pay.
 */
function calculateSalaryBreakdown(annualCtc, structure, lopDays = 0, daysInMonth = 30) {
  const ctc = parseFloat(annualCtc) || 600000;
  const monthlyGross = Math.round((ctc / 12) * 100) / 100;

  const basicPct = parseFloat(structure?.basic_pct || 50) / 100;
  const hraPct = parseFloat(structure?.hra_pct || 50) / 100;
  const daPct = parseFloat(structure?.da_pct || 0) / 100;
  const conveyanceFixed = parseFloat(structure?.conveyance_monthly || 1600);
  const medicalFixed = parseFloat(structure?.medical_monthly || 1250);

  // Unprorated baseline figures
  const baseBasic = Math.round(monthlyGross * basicPct * 100) / 100;
  const baseHra = Math.round(baseBasic * hraPct * 100) / 100;
  const baseDa = Math.round(baseBasic * daPct * 100) / 100;
  const baseConveyance = Math.min(conveyanceFixed, Math.max(0, monthlyGross - baseBasic - baseHra));
  const baseMedical = Math.min(medicalFixed, Math.max(0, monthlyGross - baseBasic - baseHra - baseConveyance));
  const baseSpecial = Math.max(0, Math.round((monthlyGross - (baseBasic + baseHra + baseDa + baseConveyance + baseMedical)) * 100) / 100);

  // LOP Proration Factor
  const validDaysInMonth = daysInMonth > 0 ? daysInMonth : 30;
  const safeLopDays = Math.min(validDaysInMonth, Math.max(0, parseFloat(lopDays) || 0));
  const workedDays = validDaysInMonth - safeLopDays;
  const proration = workedDays / validDaysInMonth;

  // Prorated actual earnings
  const basic = Math.round(baseBasic * proration * 100) / 100;
  const hra = Math.round(baseHra * proration * 100) / 100;
  const da = Math.round(baseDa * proration * 100) / 100;
  const conveyance = Math.round(baseConveyance * proration * 100) / 100;
  const medical = Math.round(baseMedical * proration * 100) / 100;
  const specialAllowance = Math.round(baseSpecial * proration * 100) / 100;
  const grossEarnings = Math.round((basic + hra + da + conveyance + medical + specialAllowance) * 100) / 100;

  // Deductions
  // PF: 12% of Basic up to statutory ceiling (e.g. ₹15,000 base -> ₹1,800 max)
  const pfCeiling = parseFloat(structure?.pf_ceiling || 15000);
  const pfEmployeePct = parseFloat(structure?.pf_employee_pct || 12) / 100;
  const pfEmployerPct = parseFloat(structure?.pf_employer_pct || 12) / 100;
  const pfWage = Math.min(basic, pfCeiling);
  const pfEmployee = Math.round(pfWage * pfEmployeePct * 100) / 100;
  const pfEmployer = Math.round(pfWage * pfEmployerPct * 100) / 100;

  // ESI: Applied only if Gross <= threshold (₹21,000/mo)
  const esiThreshold = parseFloat(structure?.esi_threshold || 21000);
  const esiEmployeePct = parseFloat(structure?.esi_employee_pct || 0.75) / 100;
  const esiEmployerPct = parseFloat(structure?.esi_employer_pct || 3.25) / 100;
  let esiEmployee = 0;
  let esiEmployer = 0;
  if (monthlyGross <= esiThreshold) {
    esiEmployee = Math.round(grossEarnings * esiEmployeePct * 100) / 100;
    esiEmployer = Math.round(grossEarnings * esiEmployerPct * 100) / 100;
  }

  // Professional Tax: standard ₹200 / month
  const ptMonthly = parseFloat(structure?.pt_monthly || 200);

  // TDS / Tax slab estimate:
  let tdsTax = 0;
  if (ctc > 1200000) {
    tdsTax = Math.round(((ctc - 1200000) * 0.15 / 12) * 100) / 100;
  } else if (ctc > 750000) {
    tdsTax = Math.round(((ctc - 750000) * 0.10 / 12) * 100) / 100;
  }

  const totalDeductions = Math.round((pfEmployee + esiEmployee + ptMonthly + tdsTax) * 100) / 100;
  const netSalary = Math.max(0, Math.round((grossEarnings - totalDeductions) * 100) / 100);

  return {
    annualCtc: ctc,
    monthlyGross,
    daysInMonth: validDaysInMonth,
    daysWorked: workedDays,
    lopDays: safeLopDays,
    earnings: {
      basic,
      hra,
      da,
      conveyance,
      medical,
      specialAllowance,
      grossEarnings,
    },
    deductions: {
      pfEmployee,
      pfEmployer,
      esiEmployee,
      esiEmployer,
      professionalTax: ptMonthly,
      tdsTax,
      totalDeductions,
    },
    netSalary,
    formulas: {
      basic: `${structure?.basic_pct || 50}% of Monthly Gross`,
      hra: `${structure?.hra_pct || 50}% of Basic Salary`,
      da: `${structure?.da_pct || 0}% of Basic Salary`,
      conveyance: `Fixed ₹${conveyanceFixed}/mo allowance`,
      medical: `Fixed ₹${medicalFixed}/mo allowance`,
      specialAllowance: `Balancing allowance (Gross - components)`,
      pfEmployee: `${structure?.pf_employee_pct || 12}% of Basic (capped at ₹${pfCeiling})`,
      esiEmployee: monthlyGross <= esiThreshold ? `${structure?.esi_employee_pct || 0.75}% of Gross` : `Exempt (Gross > ₹${esiThreshold})`,
      professionalTax: `State Professional Tax slab: ₹${ptMonthly}/mo`,
      tdsTax: `Standard New Regime TDS estimate`,
    }
  };
}

/**
 * 3. EMPLOYEE SALARY ASSIGNMENT
 */
async function getEmployeeSalary(userId) {
  const { rows } = await query(`
    SELECT es.*, ss.name AS structure_name, ss.basic_pct, ss.hra_pct, ss.pf_ceiling, ss.pt_monthly
    FROM employee_salaries es
    LEFT JOIN salary_structures ss ON ss.id = es.structure_id
    WHERE es.user_id = $1 AND es.is_active = TRUE
    LIMIT 1
  `, [userId]);

  if (rows[0]) return rows[0];

  // If no specific assignment, fallback to users.annual_ctc and default structure
  const { rows: uRows } = await query(`SELECT id, annual_ctc FROM users WHERE id = $1`, [userId]);
  if (!uRows[0]) return null;
  const ctc = parseFloat(uRows[0].annual_ctc || 600000);
  const defStruct = await getDefaultStructure();

  return {
    user_id: userId,
    annual_ctc: ctc,
    monthly_gross: Math.round((ctc / 12) * 100) / 100,
    structure_id: defStruct?.id || null,
    structure_name: defStruct?.name || 'Default Structure',
    structure: defStruct,
    is_active: true,
  };
}

async function assignEmployeeSalary(userId, annualCtc, structureId = null) {
  const ctc = parseFloat(annualCtc);
  const monthlyGross = Math.round((ctc / 12) * 100) / 100;
  let structId = structureId;
  if (!structId) {
    const def = await getDefaultStructure();
    structId = def?.id || null;
  }

  // Deactivate old
  await query(`UPDATE employee_salaries SET is_active = FALSE WHERE user_id = $1`, [userId]);

  // Insert new
  const { rows } = await query(`
    INSERT INTO employee_salaries (user_id, structure_id, annual_ctc, monthly_gross, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING *
  `, [userId, structId, ctc, monthlyGross]);

  // Sync users table
  await query(`UPDATE users SET annual_ctc = $1 WHERE id = $2`, [ctc, userId]);
  return rows[0];
}

/**
 * 4. PAYROLL PROCESSING RUNS
 */
async function listPayrollRuns() {
  const { rows } = await query(`
    SELECT pr.*, u1.user_name AS processed_by_name, u2.user_name AS approved_by_name
    FROM payroll_runs pr
    LEFT JOIN users u1 ON u1.id = pr.processed_by
    LEFT JOIN users u2 ON u2.id = pr.approved_by
    ORDER BY pr.year DESC, pr.month DESC
  `);
  return rows;
}

async function getPayrollRun(id) {
  const { rows } = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function executePayrollRun(month, year, processedBy) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const defStruct = await getDefaultStructure();

    // 1. Get all active users
    const { rows: users } = await client.query(`
      SELECT u.id, u.user_name, u.emp_id, u.email, u.department, u.position,
             COALESCE(es.annual_ctc, u.annual_ctc, 600000) AS ctc,
             es.structure_id
      FROM users u
      LEFT JOIN employee_salaries es ON es.user_id = u.id AND es.is_active = TRUE
      WHERE u.status = TRUE
      ORDER BY u.user_name ASC
    `);

    // 2. Upsert payroll run record
    const { rows: runRows } = await client.query(`
      INSERT INTO payroll_runs (month, year, status, processed_by)
      VALUES ($1, $2, 'Finalized', $3)
      ON CONFLICT (month, year) DO UPDATE SET
        status = 'Finalized',
        processed_by = EXCLUDED.processed_by,
        updated_at = NOW()
      RETURNING *
    `, [month, year, processedBy]);
    const run = runRows[0];

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalEmpCount = 0;

    // 3. For each employee, calculate LOP and generate detailed payslip
    for (const u of users) {
      // Count absent days in this month
      const { rows: attRows } = await client.query(`
        SELECT COUNT(*) AS absent_count
        FROM attendance
        WHERE user_id = $1
          AND EXTRACT(MONTH FROM date) = $2
          AND EXTRACT(YEAR FROM date) = $3
          AND attendance_type IN ('Absent', 'LOP')
      `, [u.id, month, year]);
      const lopDays = parseInt(attRows[0]?.absent_count || 0, 10);

      const breakdown = calculateSalaryBreakdown(u.ctc, defStruct, lopDays, 30);

      await client.query(`
        INSERT INTO detailed_payslips (
          payroll_run_id, user_id, month, year, days_in_month, days_worked, lop_days,
          ctc_annual, basic, hra, da, conveyance, medical, special_allowance, gross_earnings,
          pf_employee, pf_employer, esi_employee, esi_employer, professional_tax, tds_tax,
          total_deductions, net_salary, breakdown_meta, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, 'Finalized'
        )
        ON CONFLICT (user_id, month, year) DO UPDATE SET
          payroll_run_id = EXCLUDED.payroll_run_id,
          days_worked = EXCLUDED.days_worked,
          lop_days = EXCLUDED.lop_days,
          ctc_annual = EXCLUDED.ctc_annual,
          basic = EXCLUDED.basic,
          hra = EXCLUDED.hra,
          da = EXCLUDED.da,
          conveyance = EXCLUDED.conveyance,
          medical = EXCLUDED.medical,
          special_allowance = EXCLUDED.special_allowance,
          gross_earnings = EXCLUDED.gross_earnings,
          pf_employee = EXCLUDED.pf_employee,
          pf_employer = EXCLUDED.pf_employer,
          esi_employee = EXCLUDED.esi_employee,
          esi_employer = EXCLUDED.esi_employer,
          professional_tax = EXCLUDED.professional_tax,
          tds_tax = EXCLUDED.tds_tax,
          total_deductions = EXCLUDED.total_deductions,
          net_salary = EXCLUDED.net_salary,
          breakdown_meta = EXCLUDED.breakdown_meta,
          updated_at = NOW()
      `, [
        run.id, u.id, month, year, breakdown.daysInMonth, breakdown.daysWorked, breakdown.lopDays,
        breakdown.annualCtc, breakdown.earnings.basic, breakdown.earnings.hra, breakdown.earnings.da,
        breakdown.earnings.conveyance, breakdown.earnings.medical, breakdown.earnings.specialAllowance,
        breakdown.earnings.grossEarnings, breakdown.deductions.pfEmployee, breakdown.deductions.pfEmployer,
        breakdown.deductions.esiEmployee, breakdown.deductions.esiEmployer, breakdown.deductions.professionalTax,
        breakdown.deductions.tdsTax, breakdown.deductions.totalDeductions, breakdown.netSalary,
        JSON.stringify(breakdown.formulas)
      ]);

      totalGross += breakdown.earnings.grossEarnings;
      totalDeductions += breakdown.deductions.totalDeductions;
      totalNet += breakdown.netSalary;
      totalEmpCount += 1;
    }

    // 4. Update run totals
    await client.query(`
      UPDATE payroll_runs
      SET total_employees = $1, total_gross = $2, total_deductions = $3, total_net = $4, updated_at = NOW()
      WHERE id = $5
    `, [totalEmpCount, totalGross, totalDeductions, totalNet, run.id]);

    await client.query('COMMIT');
    return { success: true, runId: run.id, totalEmployees: totalEmpCount, totalNet };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 5. PAYSLIP RETRIEVAL & EMPLOYEE ACCESS
 */
async function getPayslipsByUser(userId) {
  const { rows } = await query(`
    SELECT dp.*, u.user_name, u.emp_id, u.department, u.position, u.email, u.bank_name, u.account_no, u.ifsc_code, u.pan_no
    FROM detailed_payslips dp
    JOIN users u ON u.id = dp.user_id
    WHERE dp.user_id = $1
    ORDER BY dp.year DESC, dp.month DESC
  `, [userId]);
  return rows;
}

async function getDetailedPayslip(userId, month, year) {
  const { rows } = await query(`
    SELECT dp.*, u.user_name, u.emp_id, u.department, u.position, u.email, u.doj,
           u.bank_name, u.branch_name, u.account_no, u.ifsc_code, u.pan_no, u.aadhar_no
    FROM detailed_payslips dp
    JOIN users u ON u.id = dp.user_id
    WHERE dp.user_id = $1 AND dp.month = $2 AND dp.year = $3
  `, [userId, month, year]);

  if (rows[0]) return rows[0];

  // If no run completed for this month yet, generate on-the-fly preview
  const uSalary = await getEmployeeSalary(userId);
  if (!uSalary) return null;

  const defStruct = await getDefaultStructure();
  const breakdown = calculateSalaryBreakdown(uSalary.annual_ctc, defStruct, 0, 30);
  const { rows: uRows } = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
  const u = uRows[0];

  return {
    user_id: userId,
    month,
    year,
    days_in_month: 30,
    days_worked: 30,
    lop_days: 0,
    ctc_annual: breakdown.annualCtc,
    basic: breakdown.earnings.basic,
    hra: breakdown.earnings.hra,
    da: breakdown.earnings.da,
    conveyance: breakdown.earnings.conveyance,
    medical: breakdown.earnings.medical,
    special_allowance: breakdown.earnings.specialAllowance,
    gross_earnings: breakdown.earnings.grossEarnings,
    pf_employee: breakdown.deductions.pfEmployee,
    pf_employer: breakdown.deductions.pfEmployer,
    esi_employee: breakdown.deductions.esiEmployee,
    esi_employer: breakdown.deductions.esiEmployer,
    professional_tax: breakdown.deductions.professionalTax,
    tds_tax: breakdown.deductions.tdsTax,
    total_deductions: breakdown.deductions.totalDeductions,
    net_salary: breakdown.netSalary,
    breakdown_meta: breakdown.formulas,
    status: 'Preview',
    user_name: u?.user_name,
    emp_id: u?.emp_id,
    department: u?.department,
    position: u?.position,
    email: u?.email,
    doj: u?.doj,
    bank_name: u?.bank_name,
    branch_name: u?.branch_name,
    account_no: u?.account_no,
    ifsc_code: u?.ifsc_code,
    pan_no: u?.pan_no,
  };
}

module.exports = {
  listStructures,
  getDefaultStructure,
  getStructureById,
  createStructure,
  calculateSalaryBreakdown,
  getEmployeeSalary,
  assignEmployeeSalary,
  listPayrollRuns,
  getPayrollRun,
  executePayrollRun,
  getPayslipsByUser,
  getDetailedPayslip,
};
