// src/db/repositories/index.js — single import point for all repos
module.exports = {
  userRepo:       require('./user.repo'),
  roleRepo:       require('./role.repo'),
  attendanceRepo: require('./attendance.repo'),
  leaveRepo:      require('./leave.repo'),
  taskRepo:       require('./task.repo'),
  petrolRepo:     require('./petrol.repo'),
  holidayRepo:    require('./holiday.repo'),
  assetRepo:      require('./asset.repo'),
  feedRepo:       require('./feed.repo'),
  payslipRepo:    require('./payslip.repo'),
  shiftRepo:      require('./shift.repo'),
  deletedUserRepo: require('./deletedUser.repo'),
};
