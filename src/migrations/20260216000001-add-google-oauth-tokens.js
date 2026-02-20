/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'google_access_token', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Google OAuth access token for API calls on behalf of user',
    });

    await queryInterface.addColumn('users', 'google_refresh_token', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Google OAuth refresh token for token renewal',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'google_access_token');
    await queryInterface.removeColumn('users', 'google_refresh_token');
  },
};
