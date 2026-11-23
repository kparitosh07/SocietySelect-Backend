export const calculateResultStatus = ({ submissionStatus, marksObtained }, exam) => {
  if (submissionStatus !== "SUBMITTED") {
    return "PENDING";
  }
  if (typeof marksObtained === "number" && marksObtained >= exam.passingMarks) {
    return "PASSED";
  }
  return "FAILED";
};