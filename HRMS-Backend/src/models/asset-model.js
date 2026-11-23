const mongoose = require("mongoose");

const assetCategorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true }
}, { timestamps: true });

const assetSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    serialNumber: { type: String, required: true, trim: true, unique: true },
    category: { type: String, required: true }, // Name of the category
    status: {
        type: String,
        enum: ['Available', 'Assigned', 'Under Repair', 'Retired'],
        default: 'Available'
    },
    condition: {
        type: String,
        enum: ['New', 'Good', 'Fair', 'Poor'],
        default: 'Good'
    },
    purchaseDate: { type: Date },
    purchasePrice: { type: Number },
    description: { type: String, trim: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    assignmentDate: { type: Date },
    expectedReturnDate: { type: Date },
    lastReturnDate: { type: Date },
    attachments: [
        {
           name: { type: String },
            url: { type: String },
            type: { type: String }, // 'Invoice', 'Photo', etc.
            uploadDate: { type: Date, default: Date.now }
        }
    ],
    history: [
        {
            type: { type: String, enum: ['Assignment', 'Return', 'StatusChange', 'DocumentAddition'] },
            employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
            date: { type: Date, default: Date.now },
            remarks: { type: String },
            condition: { type: String }
        }
    ]
}, { timestamps: true });

const assetRequestSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    category: { type: String, required: true },
    reason: { type: String },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    adminComment: { type: String },
    approvedAssetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }
}, { timestamps: true });

const AssetCategory = mongoose.model("AssetCategory", assetCategorySchema);
const Asset = mongoose.model("Asset", assetSchema);
const AssetRequest = mongoose.model("AssetRequest", assetRequestSchema);

module.exports = { Asset, AssetCategory, AssetRequest };
