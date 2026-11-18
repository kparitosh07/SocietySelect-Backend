import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized: Token missing" });
  }

  try {
    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_ACCESS_SECRET;
    const decoded = jwt.verify(token, secret);
    req.user = {
      ...decoded,
      id: decoded.sub || decoded.id,
      _id: decoded.sub || decoded.id,
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};