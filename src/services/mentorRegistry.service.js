import MentorRegistry from "../models/mentorRegistry.model.js";

export const findEligibleMentor = async ({
  email,
  studentNumber
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedStudentNumber = studentNumber.trim();

  return MentorRegistry.findOne({
    email: normalizedEmail,
    studentNumber: normalizedStudentNumber,
    isEligible: true
  });
};
