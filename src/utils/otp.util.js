import crypto from "node:crypto";

export const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const hashOTP = (otp) => {
  return crypto
    .createHmac("sha256", process.env.OTP_SECRET)
    .update(otp)
    .digest("hex");
};

export const compareOTP = (enteredOTP, storedHash) => {
  const enteredHash = Buffer.from(hashOTP(enteredOTP), "hex");
  const savedHash = Buffer.from(storedHash, "hex");

  return (
    enteredHash.length === savedHash.length &&
    crypto.timingSafeEqual(enteredHash, savedHash)
  );
};