const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

let SECRET;
try {
  SECRET = fs.readFileSync(path.join(process.cwd(), "private.key"), "utf8").trim();
} catch (e) {
  SECRET = process.env.JWT_SECRET || "Bla@2021BOWS^!@#$)(*)";
}

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) return res.status(401).json({ message: "Token missing" });

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = verifyToken;
