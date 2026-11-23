const crud_service = require("./crud-service");
const userDocModel = require("../models/user-doc-model");
const path = require("path");

class UserDocService extends crud_service {
  constructor() {
    super(...arguments);
    this.model = userDocModel;

    this.validateAdd = async (data) => { };
    this.validateEdit = async (data, id) => { };
    this.validateDelete = async (data) => { };
  }

  /**
   * Processes req.files and req.body from multer
   * and maps them into structured payload
   */
  async handleMulterUploads(req) {
    const payload = {
      user_id: req.body.user_id
    };

    // Helper: convert file object → relative path
    const normalizePath = (file) =>
      file.path.replace(/.*public/, "").replace(/\\/g, "/");

    // ---- Parse all uploaded files
    for (const file of req.files) {
      const relativePath = normalizePath(file);

      // --- PG: e.g. pg[0][certificate] or pg[0][marksheet]
      if (file.fieldname.startsWith("pg[")) {
        const match = file.fieldname.match(/pg\[(\d+)\]\[(\w+)\]/);
        if (match) {
          const index = parseInt(match[1], 10);
          const key = match[2];
          if (!payload.pg) payload.pg = [];
          if (!payload.pg[index]) payload.pg[index] = {};
          payload.pg[index][key] = relativePath;
        }
      }

      // --- UG: e.g. ug[0][certificate] or ug[0][marksheet]
      else if (file.fieldname.startsWith("ug[")) {
        const match = file.fieldname.match(/ug\[(\d+)\]\[(\w+)\]/);
        if (match) {
          const index = parseInt(match[1], 10);
          const key = match[2];
          if (!payload.ug) payload.ug = [];
          if (!payload.ug[index]) payload.ug[index] = {};
          payload.ug[index][key] = relativePath;
        }
      }

      // --- Others: e.g. others[0][certificate] or others[0][marksheet]
      else if (file.fieldname.startsWith("others[")) {
        const match = file.fieldname.match(/others\[(\d+)\]\[(\w+)\]/);
        if (match) {
          const index = parseInt(match[1], 10);
          const key = match[2];
          if (!payload.others) payload.others = [];
          if (!payload.others[index]) payload.others[index] = {};
          payload.others[index][key] = relativePath;
        }
      }

      // --- Previous Companies: prev[0][relieving], prev[0][payslips]
      else if (file.fieldname.startsWith("prev[")) {
        const match = file.fieldname.match(/prev\[(\d+)\]\[(\w+)\]/);
        if (match) {
          const index = parseInt(match[1], 10);
          const key = match[2];
          if (!payload.prev) payload.prev = [];
          if (!payload.prev[index]) payload.prev[index] = { payslips: [] };

          if (key === "payslips") {
            payload.prev[index].payslips.push(relativePath);
          } else {
            payload.prev[index][key] = relativePath;
          }
        }
      }

      // --- Single files: photo, aadhar_front, pan_front, etc.
      else {
        payload[file.fieldname] = relativePath;
      }
    }

    // ---- Map all other text fields from req.body (e.g. prev[0][companyName], pg[0][qualification])
    const bodyKeys = Object.keys(req.body);
    bodyKeys.forEach(bodyKey => {
      // match something like arrayName[index][propertyName]
      const match = bodyKey.match(/^([a-zA-Z0-9_]+)\[(\d+)\]\[([a-zA-Z0-9_]+)\]$/);
      if (match) {
        const arrName = match[1]; // e.g. 'prev', 'pg', 'ug', 'others'
        const index = parseInt(match[2], 10);
        const propName = match[3];

        if (!payload[arrName]) payload[arrName] = [];
        if (!payload[arrName][index]) {
          payload[arrName][index] = arrName === 'prev' ? { payslips: [] } : {};
        }

        // Don't overwrite if it's already an array (like payslips from files), though body won't typically do that.
        payload[arrName][index][propName] = req.body[bodyKey];
      }
    });

    return payload;
  }
}

module.exports = UserDocService;
