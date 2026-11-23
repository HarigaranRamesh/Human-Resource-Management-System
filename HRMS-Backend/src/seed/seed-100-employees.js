// src/seed/seed-100-employees.js
// Seeds 100 realistic employees with shifts, leave balances, and attendance into PostgreSQL
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../db/pg');

const FIRST_NAMES = [
  'Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Ananya', 'Deepak', 'Neha', 'Rajesh', 'Pooja',
  'Arun', 'Meera', 'Rohan', 'Divya', 'Karthik', 'Kavita', 'Sanjay', 'Shalini', 'Manoj', 'Ritu',
  'Suresh', 'Aditi', 'Nitin', 'Swati', 'Harish', 'Tanvi', 'Gaurav', 'Shweta', 'Varun', 'Preeti',
  'Alok', 'Sunita', 'Arvind', 'Radhika', 'Sandeep', 'Vandana', 'Pradeep', 'Rashmi', 'Chetan', 'Pallavi',
  'Kiran', 'Ashish', 'Smriti', 'Jasprit', 'Harmanpreet', 'Ravindra', 'Mithali', 'Hardik', 'Shafali', 'Rishabh',
  'Shreyas', 'Jemimah', 'Kanan', 'Deepti', 'Mohammed', 'Poonam', 'Yuzvendra', 'Shikha', 'Bhuvneshwar', 'Veda',
  'Umesh', 'Rajeshwari', 'Ishant', 'Mansi', 'Axar', 'Harleen', 'Washington', 'Richa', 'Shardul', 'Monica',
  'Navdeep', 'Simran', 'Natarajan', 'Richa', 'Prasidh', 'Gautam', 'Avesh', 'Sneh', 'Deepak', 'Meghna',
  'Arshdeep', 'Yastika', 'Ravi', 'Renuka', 'Umran', 'Anjali', 'Kuldeep', 'Devika', 'Mukesh', 'Amanjot',
  'Shivam', 'Kanika', 'Jitesh', 'Shreyanka', 'Rinku', 'Saika', 'Tilak', 'Mannat', 'Yashasvi', 'Titas'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Iyer', 'Singh', 'Roy', 'Verma', 'Gupta', 'Nair', 'Joshi',
  'Pillai', 'Menon', 'Kulkarni', 'Reddy', 'Sundaram', 'Rao', 'Hegde', 'Bhat', 'Chawla', 'Deshmukh',
  'Raina', 'Mishra', 'Gadkari', 'Chandra', 'Agarwal', 'Kapoor', 'Tiwari', 'Dhawan', 'Sen', 'Nath',
  'Williams', 'Kejriwal', 'Apte', 'Maheshwari', 'Shiva', 'Rawat', 'Desai', 'Bhagat', 'Bedi', 'Nehra',
  'Mandhana', 'Bumrah', 'Kaur', 'Jadeja', 'Raj', 'Pandya', 'Pant', 'Rodrigues', 'Rahul', 'Shami',
  'Yadav', 'Chahal', 'Pandey', 'Krishnamurthy', 'Gayakwad', 'Deol', 'Punia', 'Thakur', 'Saini', 'Bahadur',
  'Krishna', 'Khaka', 'Khan', 'Rana', 'Chahar', 'Bhatia', 'Bishnoi', 'Malik', 'Sarvani', 'Sen',
  'Vaidya', 'Mavi', 'Ahuja', 'Patil', 'Ishaque', 'Varma', 'Kashyap', 'Jaiswal', 'Sadhu', 'Bose',
  'Banerjee', 'Chatterjee', 'Mukherjee', 'Dutta', 'Sengupta', 'Ghosh', 'Das', 'Dhar', 'Chakraborty', 'Mitra',
  'Prajapati', 'Solanki', 'Chauhan', 'Rathore', 'Parmar', 'Mehta', 'Shah', 'Modi', 'Vora', 'Somaiya'
];

const DEPARTMENTS = [
  { name: 'Engineering', positions: ['Software Engineer', 'Senior Software Engineer', 'Lead Backend Engineer', 'Frontend Developer', 'DevOps Specialist'] },
  { name: 'Product & Design', positions: ['Product Manager', 'UI/UX Designer', 'Product Analyst', 'Visual Designer'] },
  { name: 'Quality Assurance', positions: ['QA Automation Engineer', 'SDET', 'Manual Test Specialist'] },
  { name: 'Human Resources', positions: ['HR Generalist', 'Talent Acquisition Lead', 'HR Operations Executive', 'Payroll Specialist'] },
  { name: 'Sales & Business', positions: ['Enterprise Account Executive', 'Business Development Rep', 'Sales Strategist'] },
  { name: 'Marketing', positions: ['Content Marketing Lead', 'Performance Marketing Specialist', 'SEO Analyst', 'Growth Marketer'] },
  { name: 'Finance & Accounts', positions: ['Staff Accountant', 'Financial Analyst', 'Billing Specialist'] },
  { name: 'IT & Infrastructure', positions: ['Systems Administrator', 'Network Engineer', 'IT Support Specialist'] },
  { name: 'Operations', positions: ['Operations Coordinator', 'Logistics Analyst', 'Facilities Manager'] },
];

const CITIES = ['Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR', 'Kolkata', 'Ahmedabad', 'Coimbatore', 'Kochi'];
const BLOOD_GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-'];

async function seed100Employees() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting 100 Employees Seeding Process...');
    await client.query('BEGIN');

    // 1. Ensure Standard Shifts exist
    console.log('⏰ Ensuring standard shifts exist...');
    const shiftsToEnsure = [
      { name: 'General Shift', start_time: '09:30', end_time: '18:30', grace_mins: 15 },
      { name: 'Morning Shift', start_time: '07:00', end_time: '15:30', grace_mins: 15 },
      { name: 'Evening Shift', start_time: '13:30', end_time: '22:00', grace_mins: 15 },
    ];
    const shiftMap = {};
    for (const s of shiftsToEnsure) {
      const { rows } = await client.query(`
        INSERT INTO shifts (name, start_time, end_time, grace_mins)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
        RETURNING *
      `, [s.name, s.start_time, s.end_time, s.grace_mins]);
      if (rows.length) {
        shiftMap[s.name] = rows[0].id;
      } else {
        const { rows: existing } = await client.query(`SELECT id FROM shifts WHERE name=$1 LIMIT 1`, [s.name]);
        shiftMap[s.name] = existing[0]?.id;
      }
    }
    const defaultShiftId = shiftMap['General Shift'];
    console.log('✅ Shifts confirmed:', Object.keys(shiftMap).join(', '));

    // 2. Fetch Roles
    const { rows: roles } = await client.query(`SELECT id, role FROM roles`);
    const roleMap = {};
    roles.forEach(r => { roleMap[r.role] = r.id; });
    console.log('✅ Available Roles:', Object.keys(roleMap).join(', '));

    const roleEmployeeId = roleMap['Employee'] || roles[0].id;
    const roleManagerId  = roleMap['Manager']  || roleEmployeeId;
    const roleHRId       = roleMap['HR']       || roleEmployeeId;
    const roleAdminId    = roleMap['Admin']    || roleEmployeeId;
    const roleInternId   = roleMap['Intern']   || roleEmployeeId;

    // 3. Ensure Standard Leave Policies
    console.log('📋 Ensuring standard leave policies exist...');
    const leaveLabels = ['Casual Leave', 'Sick Leave', 'Planned Leave'];
    for (const rName of ['Employee', 'Manager', 'HR', 'Admin', 'Intern']) {
      for (const lbl of leaveLabels) {
        await client.query(`
          INSERT INTO leave_policies (role, label, amount, accrual_type, active)
          VALUES ($1, $2, 12, 'annual', true)
          ON CONFLICT (role, label) DO UPDATE SET amount = 12, active = true
        `, [rName, lbl]);
      }
    }
    console.log('✅ Standard leave policies configured.');

    // 4. Get Current Sequence Counter for empId
    const { rows: cRows } = await client.query(`SELECT seq FROM counters WHERE id='empId' FOR UPDATE`);
    let currentSeq = cRows.length ? cRows[0].seq : 0;
    console.log(`📌 Starting empId counter seq: ${currentSeq}`);

    // Pre-hash password for speed
    const defaultPassword = 'Employee@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const todayStr = new Date().toISOString().split('T')[0];
    const createdUsers = [];

    // 5. Generate and Insert 100 Employees
    console.log('👥 Generating 100 employee records...');
    for (let i = 0; i < 100; i++) {
      currentSeq++;
      const empId = `HARI${(currentSeq + 11010).toString().padStart(5, '0')}`;
      const firstName = FIRST_NAMES[i];
      const lastName = LAST_NAMES[i];
      const fullName = `${firstName} ${lastName}`.toUpperCase();
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@harihrms.com`;
      const officialEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@harihrms.com`;
      const mobileNo = `9810${(100000 + i + 1).toString()}`; // 10 digit unique mobile

      // Department and position
      const deptObj = DEPARTMENTS[i % DEPARTMENTS.length];
      const department = deptObj.name;
      const position = deptObj.positions[i % deptObj.positions.length];
      const designation = position;

      // Role distribution:
      // ~3 Admin, ~12 Manager, ~8 HR, ~7 Intern, ~70 Employee
      let roleId = roleEmployeeId;
      let roleName = 'Employee';
      if (i < 3) {
        roleId = roleAdminId;
        roleName = 'Admin';
      } else if (i < 15) {
        roleId = roleManagerId;
        roleName = 'Manager';
      } else if (i < 23) {
        roleId = roleHRId;
        roleName = 'HR';
      } else if (i < 30) {
        roleId = roleInternId;
        roleName = 'Intern';
      }

      // Status: 92 Active, 8 Inactive (for realistic analytics)
      const isActive = i < 92;

      // Shift assignment: General (70%), Morning (15%), Evening (15%)
      let shiftId = defaultShiftId;
      if (i % 6 === 0 && shiftMap['Morning Shift']) shiftId = shiftMap['Morning Shift'];
      else if (i % 7 === 0 && shiftMap['Evening Shift']) shiftId = shiftMap['Evening Shift'];

      // Demographic data
      const city = CITIES[i % CITIES.length];
      const currentAddress = `#${100 + i}, Tech Park Road, ${city}`;
      const permanentAddress = `#${50 + i}, Green Avenue, ${city}`;
      const bloodGroup = BLOOD_GROUPS[i % BLOOD_GROUPS.length];
      const gender = (i % 3 === 0 || i % 5 === 0) ? 'Female' : 'Male';
      const maritalStatus = (i % 2 === 0) ? 'Married' : 'Single';
      const aadharNo = `${3000 + i} ${4000 + i} ${5000 + i}`;
      const panNo = `ABCDE${(1000 + i)}F`;
      const emergencyContactNo = `97000${(1000 + i).toString()}`;
      const emergencyContactName = `Contact of ${firstName}`;

      // Join date: distributed over last 3 years
      const joinYear = 2023 + (i % 3);
      const joinMonth = (i % 12) + 1;
      const joinDay = ((i * 3) % 27) + 1;
      const doj = new Date(Date.UTC(joinYear, joinMonth - 1, joinDay));

      // Birth date: 24 to 45 years old
      const birthYear = 1980 + (i % 20);
      const dob = new Date(Date.UTC(birthYear, (i % 12), (i % 27) + 1));

      // Education & family details JSON
      const education = [
        { degree: 'B.Tech / B.E.', institution: `${city} Institute of Technology`, passoutYear: birthYear + 22, percentage: '78%' }
      ];
      const familyDetails = [
        { name: `Family Member of ${firstName}`, relation: 'Spouse/Parent', contact: emergencyContactNo }
      ];

      // Insert User
      const { rows: uRows } = await client.query(`
        INSERT INTO users (
          user_name, mobile_no, emp_id, password, email, official_email,
          blood_group, marital_status, gender, current_address, permanent_address,
          aadhar_no, pan_no, role_id, shift_id, position, designation, department,
          probation_period, probation_status, work_location, direct_report,
          emergency_contact_no, emergency_contact_name, doj, dob,
          education, family_details, status
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
          $20,$21,$22,$23,$24,$25,$26,$27,$28,$29
        )
        ON CONFLICT (email) DO UPDATE SET
          mobile_no = EXCLUDED.mobile_no,
          user_name = EXCLUDED.user_name,
          role_id = EXCLUDED.role_id,
          shift_id = EXCLUDED.shift_id,
          position = EXCLUDED.position,
          department = EXCLUDED.department,
          status = EXCLUDED.status
        RETURNING *
      `, [
        fullName, mobileNo, empId, hashedPassword, email, officialEmail,
        bloodGroup, maritalStatus, gender, currentAddress, permanentAddress,
        aadharNo, panNo, roleId, shiftId, position, designation, department,
        '6 Months', 'Confirmed', city, 'Reporting Manager',
        emergencyContactNo, emergencyContactName, doj, dob,
        JSON.stringify(education), JSON.stringify(familyDetails), isActive
      ]);

      const user = uRows[0];
      createdUsers.push(user);

      // Link to role_members
      await client.query(`
        INSERT INTO role_members (role_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [roleId, user.id]);

      // Seed Leave Types (Balances) for User
      const remainingLeave = [
        { year: 2026, months: [1,1,1,1,1,1,1,1,1,1,1,1], annualValue: 12 }
      ];
      for (const lbl of leaveLabels) {
        await client.query(`
          INSERT INTO leave_types (user_id, label, value, accrual_type, doj, remaining)
          VALUES ($1, $2, 12, 'annual', $3, $4)
          ON CONFLICT (user_id, label) DO NOTHING
        `, [user.id, lbl, doj, JSON.stringify(remainingLeave)]);
      }

      // Seed Today's Attendance
      if (isActive) {
        if (i < 80) {
          // Normal Present (09:15 - 09:25 clock in)
          const min = 15 + (i % 12);
          const loginTime = `${todayStr}T09:${min < 10 ? '0' + min : min}:00.000Z`;
          await client.query(`
            INSERT INTO attendance (
              user_id, date, attendance_type, geo_login_flag, geo_login_time,
              geo_login_lat, geo_login_lon, geo_login_address, late_mark, late_minutes
            ) VALUES ($1, $2, 'Present', true, $3, 12.9716, 77.5946, 'Bangalore Office', false, 0)
            ON CONFLICT (user_id, date) DO UPDATE SET
              attendance_type = 'Present',
              geo_login_flag = true,
              geo_login_time = EXCLUDED.geo_login_time
          `, [user.id, todayStr, loginTime]);
        } else if (i < 85) {
          // Late Mark (09:48 - 09:55 clock in)
          const min = 48 + (i % 7);
          const loginTime = `${todayStr}T09:${min}:00.000Z`;
          await client.query(`
            INSERT INTO attendance (
              user_id, date, attendance_type, geo_login_flag, geo_login_time,
              geo_login_lat, geo_login_lon, geo_login_address, late_mark, late_minutes
            ) VALUES ($1, $2, 'Present', true, $3, 12.9716, 77.5946, 'Bangalore Office', true, 20)
            ON CONFLICT (user_id, date) DO UPDATE SET
              attendance_type = 'Present',
              geo_login_flag = true,
              geo_login_time = EXCLUDED.geo_login_time,
              late_mark = true,
              late_minutes = 20
          `, [user.id, todayStr, loginTime]);
        } else if (i < 88) {
          // Approved Casual / Sick Leave
          const leaveType = (i % 2 === 0) ? 'Casual Leave' : 'Sick Leave';
          await client.query(`
            INSERT INTO attendance (
              user_id, date, attendance_type, approved, reason_for_applying
            ) VALUES ($1, $2, $3, true, 'Personal work / Not feeling well')
            ON CONFLICT (user_id, date) DO UPDATE SET
              attendance_type = EXCLUDED.attendance_type,
              approved = true
          `, [user.id, todayStr, leaveType]);
        } else {
          // Absent
          await client.query(`
            INSERT INTO attendance (
              user_id, date, attendance_type, remarks
            ) VALUES ($1, $2, 'Absent', 'No check-in recorded')
            ON CONFLICT (user_id, date) DO UPDATE SET
              attendance_type = 'Absent'
          `, [user.id, todayStr]);
        }
      }
    }

    // 6. Update counter
    await client.query(`UPDATE counters SET seq = $1 WHERE id='empId'`, [currentSeq]);
    console.log(`📌 Updated empId counter seq to: ${currentSeq}`);

    await client.query('COMMIT');

    console.log('\n======================================================');
    console.log('🎉 100 EMPLOYEES SEEDED SUCCESSFULLY!');
    console.log('======================================================');
    console.log(`• Total Employees Seeded: 100`);
    console.log(`• ID Range: HARI${(currentSeq - 100 + 11011).toString().padStart(5, '0')} to HARI${(currentSeq + 11010).toString().padStart(5, '0')}`);
    console.log(`• Active Users: 92  |  Inactive Users: 8`);
    console.log(`• Default Login Password for all: ${defaultPassword}`);
    console.log(`• Sample Login Mobile: ${createdUsers[0]?.mobile_no} or ${createdUsers[10]?.mobile_no}`);
    console.log(`• Sample Login Emp ID: ${createdUsers[0]?.emp_id} or ${createdUsers[10]?.emp_id}`);
    console.log('======================================================\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed with error:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed100Employees()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seed100Employees;
