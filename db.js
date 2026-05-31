const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

var sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT,
  logging: false,
  // logging: console.log
});

module.exports = sequelize;