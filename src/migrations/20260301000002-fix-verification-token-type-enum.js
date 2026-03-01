'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ALTER the ENUM to include all required values.
    // MySQL is safe to run this even if values already exist.
    await queryInterface.sequelize.query(`
      ALTER TABLE verification_tokens
      MODIFY COLUMN type ENUM('email','phone','password_reset','2fa','login_otp')
      NOT NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert to original set (pre login_otp / 2fa).
    // WARNING: any rows with 'login_otp' or '2fa' must be deleted first.
    await queryInterface.sequelize.query(`
      DELETE FROM verification_tokens WHERE type IN ('login_otp', '2fa')
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE verification_tokens
      MODIFY COLUMN type ENUM('email','phone','password_reset')
      NOT NULL
    `);
  },
};
