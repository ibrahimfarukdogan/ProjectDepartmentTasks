// src/seed.ts
import { Users, Permissions } from '../models/index.js';

export const seedDatabase = async () => {
  const permissionCount = await Permissions.count();
  if (permissionCount === 0) {
    await Permissions.bulkCreate([
      //{ permission_name: "departmentcreation", level: 1 },
     // { permission_name: "usercreation", level: 2 },
    ]);
    console.log("✅ Default permissions seeded.");
  }

  const userCount = await Users.count();
  if (userCount === 0) {
    //await Users.create({
     // user_name: "admin",
     // user_mail: "admin@mail.com",
     // user_password: "adminadmin", // Consider hashing in a real app
    //});
    console.log("✅ Default admin user seeded.");
  }
};
