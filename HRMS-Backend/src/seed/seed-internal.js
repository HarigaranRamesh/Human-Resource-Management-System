require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import your database models
const UserModel = require('../models/user-model');
const AccessModel = require('../models/access-model');
const standardMenus = require('./standard-menus.json');

async function seedInternalRoot() {
    try {
        console.log("️  Ensuring Internal System Root exists...");

        // Load credentials strictly from .env
        const adminName = process.env.ADMIN_NAME;
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;
        const mobile = process.env.ADMIN_MOBILE;
        const position = process.env.ADMIN_POSITION;
        const department = process.env.ADMIN_DEPARTMENT;

        // Validation - stop if critical credentials are missing
        if (!email || !password) {
            throw new Error("CRITICAL: ADMIN_EMAIL or ADMIN_PASSWORD not found in .env file. Seeding aborted.");
        }

        // Removing the strict required argument block so the hardcoded defaults just work automatically.

        // 1. Give them the absolute maximum permissions possible from the catalog
        const superAdminMenu = [
            { menuName: "Dashboard", children: [{ submenuName: "Dashboard" }, { submenuName: "Feed" }] },
            { menuName: "Performance", children: [{ submenuName: "Performance" }, { submenuName: "Performance Reports" }] },
            { menuName: "Access", children: [{ submenuName: "Access" }, { submenuName: "Access Define" }] },
            { menuName: "User Management", children: [{ submenuName: "Add User" }, { submenuName: "View Users" }, { submenuName: "ViewEdit Users" }] },
            { menuName: "Reports", children: [{ submenuName: "Daily Report" }, { submenuName: "Monthly Report" }] },
            { menuName: "Employee's Approval", children: [{ submenuName: "Employee Leave Approval" }, { submenuName: "Employee Petrol Approval" }] },
            { menuName: "Certificate", children: [{ submenuName: "Letters of Appointment" }, { submenuName: "Offer Letter" }, { submenuName: "Experience Letter" }] },
            { menuName: "Payslip", children: [{ submenuName: "Payslip" }] },
            { menuName: "Shift Management", children: [{ submenuName: "All Shifts" }] },
            { menuName: "Leave Policy", children: [{ submenuName: "Yearly Leave Policy" }, { submenuName: "Users Leave Policy Edit" }] },
            { menuName: "Holiday Planning", children: [{ submenuName: "Holiday Planning" }] },
            { menuName: "Asset Management", children: [{ submenuName: "Asset Management" }] },
            { menuName: "Task Management", children: [{ submenuName: "Task Management" }] },
        ];


        // 2. Create or Update the Root Role
        const existingRole = await AccessModel.findOne({ isSystem: true });
        const shouldEnforce = process.env.ENFORCE_SUPER_ADMIN_PERMISSIONS === 'true';

        let rootRole;
        if (!existingRole) {
            console.log("🌱 Creating initial System Root Role...");
            rootRole = await AccessModel.create({
                role: adminName,
                isSystem: true,
                main: superAdminMenu
            });
        } else {
            // If it exists, only update Name. Only update 'main' if forced.
            const updateObj = { $set: { role: adminName } };
            if (shouldEnforce) {
                console.log("🛠️ Resetting Super Admin menus to hardcoded defaults (Forced)");
                updateObj.$set.main = superAdminMenu;
            }
            rootRole = await AccessModel.findOneAndUpdate(
                { isSystem: true },
                updateObj,
                { new: true }
            );
        }
        console.log(`✅ System Root Role '${adminName}' confirmed with ID: ${rootRole._id}`);

        // 3. Hash the password securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create the First Admin User
        const newAdmin = await UserModel.findOneAndUpdate(
            { email: email },
            {
                $set: {
                    user_name: adminName,
                    email: email,
                    password: hashedPassword,
                    mobile_no: mobile,
                    role: rootRole._id,
                    status: true,
                    position: position,
                    department: department,
                    doj: new Date()
                }
            },
            { upsert: true, new: true }
        );
        console.log(`✅ Admin User '${adminName}' confirmed with ID: ${newAdmin._id}`);

        // 5. Link User to the Role Members list
        await AccessModel.findByIdAndUpdate(rootRole._id, {
            $addToSet: { members: newAdmin._id }
        });

        console.log(`\n🎉 Success! Internal Setup Complete.`);
        // console.log(`You can now log into the frontend using:`);
        // console.log(`Email/Phone: ${email} OR ${mobile}`);
        // console.log(`Password:    ${password}\n`);
    } catch (error) {
        console.error("❌ Failed to seed system root:", error);
    }
}

module.exports = seedInternalRoot;
