import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DB_URL;

if (!dbUrl) {
  throw new Error("DB_URL is not defined in environment variables");
}

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false
});

export default sequelize;