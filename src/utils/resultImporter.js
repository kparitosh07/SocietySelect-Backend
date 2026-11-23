import XLSX from "xlsx";
import User from "../models/user.model.js";
import ExamAssignment from "../models/examAssignment.model.js";
import ExamResult from "../models/examResult.model.js";
import { calculateResultStatus } from "./calculateResult.js";

const normalizeRowKeys = (row) => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
        const cleanKey = String(key).trim().toLowerCase().replace(/[\s_-]+/g, "_");
        normalized[cleanKey] = value;
    }
    return normalized;
};

const parseSubmissionStatus = (rawStatus, marksObtained) => {
    if (typeof rawStatus === "string") {
        const s = rawStatus.trim().toLowerCase();
        if (["not_submitted", "not submitted", "absent", "unsubmitted", "no"].includes(s)) {
            return "NOT_SUBMITTED";
        }
        if (["submitted", "completed", "present", "yes"].includes(s)) {
            return "SUBMITTED";
        }
    }
    return typeof marksObtained === "number" && !Number.isNaN(marksObtained)
        ? "SUBMITTED"
        : "NOT_SUBMITTED";
};

export const importUnstopResultsFromBuffer = async (fileBuffer, exam) => {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
        throw new Error("Uploaded file contains no worksheets");
    }

    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
        defval: "",
    });

    const assignments = await ExamAssignment.find({ examId: exam._id }).lean();
    const assignedStudentIds = new Set(assignments.map((a) => a.studentId.toString()));

    if (assignedStudentIds.size === 0) {
        return {
            totalRecords: rawRows.length,
            successfulRecords: 0,
            failedRecords: rawRows.length,
            errors: ["No students are assigned to this examination"],
        };
    }

    const students = await User.find({
        _id: { $in: Array.from(assignedStudentIds) },
        role: "STUDENT",
    })
        .select("_id email studentNumber rollNo")
        .lean();

    const byEmail = new Map();
    const byStudentNumber = new Map();
    const byRollNo = new Map();

    for (const st of students) {
        if (st.email) byEmail.set(st.email.toLowerCase().trim(), st._id.toString());
        if (st.studentNumber) byStudentNumber.set(String(st.studentNumber).trim(), st._id.toString());
        if (st.rollNo) byRollNo.set(String(st.rollNo).trim().toLowerCase(), st._id.toString());
    }

    let successfulRecords = 0;
    let failedRecords = 0;
    const errors = [];
    const now = new Date();

    for (let i = 0; i < rawRows.length; i += 1) {
        const row = normalizeRowKeys(rawRows[i]);
        const rowNum = i + 2; // accounts for header row

        const email = String(row.email || row.email_address || row.student_email || "")
            .toLowerCase()
            .trim();
        const studentNum = String(row.student_number || row.studentnumber || row.student_id || "").trim();
        const rollNo = String(row.roll_no || row.rollno || row.roll_number || "").toLowerCase().trim();

        const matchedStudentId =
            (email && byEmail.get(email)) ||
            (studentNum && byStudentNumber.get(studentNum)) ||
            (rollNo && byRollNo.get(rollNo)) ||
            null;

        if (!matchedStudentId || !assignedStudentIds.has(matchedStudentId)) {
            failedRecords += 1;
            errors.push(`Row ${rowNum}: Student not found or not assigned to this exam`);
            continue;
        }

        const rawMarks = row.marks_obtained ?? row.marks ?? row.score ?? row.obtained_marks;
        const parsedMarks =
            rawMarks === "" || rawMarks === null || rawMarks === undefined ? null : Number(rawMarks);

        if (parsedMarks !== null && Number.isNaN(parsedMarks)) {
            failedRecords += 1;
            errors.push(`Row ${rowNum}: Invalid marks value`);
            continue;
        }

        const submissionStatus = parseSubmissionStatus(
            row.submission_status ?? row.status ?? row.participation_status,
            parsedMarks
        );
        const marksObtained = submissionStatus === "SUBMITTED" ? (parsedMarks ?? 0) : 0;
        const resultStatus = calculateResultStatus(
            { submissionStatus, marksObtained },
            exam
        );

        const rawDate = row.submitted_at ?? row.submission_time ?? row.timestamp;
        const parsedDate = rawDate ? new Date(rawDate) : null;
        const submittedAt =
            submissionStatus === "SUBMITTED"
                ? parsedDate && !Number.isNaN(parsedDate.getTime())
                    ? parsedDate
                    : now
                : null;

        await Promise.all([
            ExamResult.findOneAndUpdate(
                { examId: exam._id, studentId: matchedStudentId },
                {
                    examId: exam._id,
                    studentId: matchedStudentId,
                    marksObtained,
                    totalMarks: exam.totalMarks,
                    submissionStatus,
                    resultStatus,
                    submittedAt,
                    importedAt: now,
                },
                { upsert: true, new: true, runValidators: true }
            ),
            ExamAssignment.updateOne(
                { examId: exam._id, studentId: matchedStudentId },
                {
                    $set: {
                        participationStatus: submissionStatus === "SUBMITTED" ? "APPEARED" : "PENDING",
                    },
                }
            ),
        ]);

        successfulRecords += 1;
    }

    return {
        totalRecords: rawRows.length,
        successfulRecords,
        failedRecords,
        errors,
    };
};