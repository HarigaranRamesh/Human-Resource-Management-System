const { Asset, AssetCategory, AssetRequest } = require('../models/asset-model');
const crud_service = require('./crud-service');
const mongoose = require('mongoose');

class AssetService extends crud_service {
    constructor() {
        super(...arguments);
        this.model = Asset;
    }

    // Categories
    async getCategories() {
        const data = await AssetCategory.find().sort({ name: 1 });
        return data;
    }

    async createCategory(data) {
        const category = new AssetCategory(data);
        return await category.save();
    }

    async updateCategory(id, data) {
        return await AssetCategory.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteCategory(id) {
        return await AssetCategory.findByIdAndDelete(id);
    }

    // Assets
    async getAssets(query = {}) {
        const filters = {};
        if (query.category) filters.category = query.category;
        if (query.status) filters.status = query.status;
        if (query.userId) filters.assignedTo = query.userId;

        const data = await Asset.find(filters)
            .populate('assignedTo', 'user_name empId')
            .sort({ createdAt: -1 });

        const mappedData = data.map(item => {
            const doc = item.toObject();
            if (doc.assignedTo) {
                doc.assignedToName = doc.assignedTo.user_name;
                doc.assignedToId = doc.assignedTo._id;
                doc.assignedTo = doc.assignedTo.user_name;
            }
            return doc;
        });

        return mappedData;
    }

    async createAsset(data) {
        const asset = new Asset(data);
        return await asset.save();
    }

    async updateAsset(id, data) {
        return await Asset.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteAsset(id) {
        return await Asset.findByIdAndDelete(id);
    }

    // Operations
    async assignAsset(data) {
        const { assetId, employeeId, assignmentDate, expectedReturnDate, remarks } = data;

        const asset = await Asset.findById(assetId);
        if (!asset) throw new Error('Asset not found');
        if (asset.status !== 'Available') throw new Error('Asset is not available for assignment');

        asset.status = 'Assigned';
        asset.assignedTo = employeeId;
        asset.assignmentDate = assignmentDate || new Date();
        asset.expectedReturnDate = expectedReturnDate;

        asset.history.push({
            type: 'Assignment',
            employeeId: employeeId,
            date: new Date(),
            remarks: remarks
        });

        return await asset.save();
    }

    async assignKit(data) {
        const { assetIds, employeeId, assignmentDate, expectedReturnDate, remarks } = data;
        const results = [];

        for (const assetId of assetIds) {
            const asset = await Asset.findById(assetId);
            if (!asset || asset.status !== 'Available') continue;

            asset.status = 'Assigned';
            asset.assignedTo = employeeId;
            asset.assignmentDate = assignmentDate || new Date();
            asset.expectedReturnDate = expectedReturnDate;
            asset.history.push({
                type: 'Assignment',
                employeeId: employeeId,
                date: new Date(),
                remarks: `Part of Kit Assignment: ${remarks}`
            });
            results.push(await asset.save());
        }
        return results;
    }

    async returnAsset(assetId, data) {
        const { returnDate, condition, remarks } = data;

        const asset = await Asset.findById(assetId);
        if (!asset) throw new Error('Asset not found');

        const previousEmployee = asset.assignedTo;

        asset.status = 'Available';
        asset.assignedTo = null;
        asset.lastReturnDate = returnDate || new Date();
        asset.condition = condition || asset.condition;

        asset.history.push({
            type: 'Return',
            employeeId: previousEmployee,
            date: new Date(),
            remarks: remarks,
            condition: condition
        });

        return await asset.save();
    }

    async addAttachment(assetId, attachment) {
        const asset = await Asset.findById(assetId);
        if (!asset) throw new Error('Asset not found');

        asset.attachments.push(attachment);
        asset.history.push({
            type: 'DocumentAddition',
            date: new Date(),
            remarks: `Added document: ${attachment.name}`
        });

        return await asset.save();
    }

    // Requests
    async createRequest(data) {
        const request = new AssetRequest(data);
        return await request.save();
    }

    async getRequests(filters = {}) {
        return await AssetRequest.find(filters)
            .populate('employeeId', 'user_name empId')
            .sort({ createdAt: -1 });
    }

    async updateRequestStatus(id, data) {
        const { status, adminComment, approvedAssetId } = data;
        return await AssetRequest.findByIdAndUpdate(id, {
            status,
            adminComment,
            approvedAssetId
        }, { new: true });
    }

    async getAssetStats() {
        const stats = await Asset.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    available: { $sum: { $cond: [{ $eq: ["$status", "Available"] }, 1, 0] } },
                    assigned: { $sum: { $cond: [{ $eq: ["$status", "Assigned"] }, 1, 0] } },
                    underRepair: { $sum: { $cond: [{ $eq: ["$status", "Under Repair"] }, 1, 0] } },
                    retired: { $sum: { $cond: [{ $eq: ["$status", "Retired"] }, 1, 0] } }
                }
            }
        ]);

        const trend = [
            { month: 'Jan', count: 5 },
            { month: 'Feb', count: 8 },
            { month: 'Mar', count: 12 },
            { month: 'Apr', count: 15 },
            { month: 'May', count: 10 }
        ];

        return {
            summary: stats[0] || { total: 0, available: 0, assigned: 0, underRepair: 0, retired: 0 },
            trend: trend
        };
    }
}

module.exports = AssetService;
