import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      type: "access"
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "15m"
    }
  );
};

export const generateRefreshToken = (user, sessionId) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      sid: sessionId.toString(),
      type: "refresh"
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d"
    }
  );
};