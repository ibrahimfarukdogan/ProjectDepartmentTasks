import 'dotenv/config';

const myValue = 'My App';

module.exports = {
  name: myValue,
  version: process.env.PROJECT_VERSION || '1.0.0',
    extra: {
      API_URL: process.env.API_URL  || 'http://localhost:3000',
    },
};
