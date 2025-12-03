// hash.mjs
import bcrypt from "bcryptjs";

const plain = "AgromatLocal123*";  // <-- la contraseña que vas a usar
const saltRounds = 10;

const hash = await bcrypt.hash(plain, saltRounds);
console.log("HASH GENERADO:", hash);
process.exit(0);
