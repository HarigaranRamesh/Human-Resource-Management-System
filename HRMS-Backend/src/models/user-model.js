const mongoose = require("mongoose");

// Counter Schema
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model("counter", counterSchema);

// User Schema
const userSchema = new mongoose.Schema(
  {
    user_name: { type: String, required: true, uppercase: true, trim: true },
    mobile_no: { type: String, unique: true, trim: true },
    emergency_contact_no: { type: String, trim: true, required: true },
    emergency_contact_name: { type: String, trim: true, required: true },
    empId: { type: String, unique: true, sparse: true }, // Auto-generated employee ID (sparse to allow nulls for candidates)
    password: { type: String, required: true },
    email: { type: String, unique: true, trim: true }, // Personal Email
    officialEmail: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    maritalStatus: { type: String, trim: true },
    gender: { type: String, trim: true },
    currentAddress: { type: String, trim: true },
    permanentAddress: { type: String, trim: true },
    aadharNo: { type: String, trim: true, default: "" },
    panNo: { type: String, trim: true, uppercase: true, default: "" },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "access",
      default: null,
      required: true,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null
    },
    position: { type: String, trim: true },
    designation: { type: String, trim: true },
    department: { type: String, trim: true },
    probationPeriod: { type: String, trim: true },
    probationStatus: { type: String, trim: true },
    workLocation: { type: String, trim: true },
    directReport: { type: String, trim: true }, // Name or ID of reporting manager
    status: { type: Boolean, default: true },
    education: [
      {
        qualificationType: { type: String, trim: true },
        courseName: { type: String, trim: true },
        collegeName: { type: String, trim: true },
        universityName: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        percentage: { type: String, trim: true },
      }
    ],
    familyDetails: [
      {
        name: { type: String, trim: true },
        relationship: { type: String, trim: true },
        mobileNumber: { type: String, trim: true },
      }
    ],
    logcal: { type: Number, default: 0 },
    bankName: { type: String, trim: true, default: "" },
    branchName: { type: String, trim: true, default: "" },
    accountNo: { type: String, trim: true, uppercase: true, default: "" },
    ifscCode: { type: String, trim: true, uppercase: true, default: "" },
    accountHolderName: { type: String, trim: true, default: "" },
    createdby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    doj: { type: Date, default: Date.now },
    dob: { type: Date, default: Date.now },
    ref1_name: { type: String, trim: true, default: "" },
    ref1_mobile: { type: String, trim: true, default: "" },
    ref2_name: { type: String, trim: true, default: "" },
    ref2_mobile: { type: String, trim: true, default: "" },
    kmsCharge: { type: Number, default: 10 },
    creditpetrol: [
      {
        amount: { type: Number, default: 0 },
        from: { type: String, default: '' },
        to: { type: String, default: '' },
        purposeofVisit: { type: String, default: '' },
        kms: { type: Number, default: 0 },
        modeoftransport: { type: String, default: '' },
        updatedAt: { type: Date, default: Date.now },
        approved: { type: Boolean, default: false }
      }
    ],
    balance: {
      amount: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

// Pre-save hook to generate empId
userSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    let prefix = "OAID";
    let counterId = "empId";
    let startSeq = 11010;

    // 🔍 Fetch role details for dynamic ID generation
    if (this.role) {
      const AccessModel = mongoose.model("access");
      const roleDoc = await AccessModel.findById(this.role);

      if (roleDoc) {
        prefix = roleDoc.idPrefix || "OAID";
        if (roleDoc.isCandidateRole) {
          counterId = "candidateId";
          startSeq = 0; // Candidates start from 1 (OAIDSC1, OAIDSC2...)
          if (!roleDoc.idPrefix) prefix = "OAIDSC";
        }
      }
    }

    // Find counter and increment
    const counter = await Counter.findByIdAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    // Generate ID
    if (counterId === "candidateId") {
      this.empId = `${prefix}${counter.seq}`;
    } else {
      this.empId = `${prefix}${(counter.seq + startSeq).toString().padStart(5, "0")}`;
    }

    next();
  } catch (err) {
    next(err);
  }
});

const userModel = mongoose.model("user", userSchema);
module.exports = userModel;
