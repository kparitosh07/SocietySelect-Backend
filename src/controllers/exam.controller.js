import mongoose from "mongoose";
import Exam from "../models/exam.model.js";
import ExamAssignment from "../models/examAssignment.model.js";
import ExamResult from "../models/examResult.model.js";
import ExamImport from "../models/examImport.model.js";
import User from "../models/user.model.js";
import { importUnstopResultsFromBuffer } from "../utils/resultImporter.js";

const isValidUnstopUrl = (url) => {
    try {
        const parsed = new URL(url);
        return (
            parsed.protocol === "https:" &&
            (parsed.hostname === "unstop.com" || parsed.hostname.endsWith(".unstop.com"))
        );
    } catch {
        return false;
    }
};

export const createExam = async (req, res, next) => {
    try {
        const {
            name,
            subject,
            unstopLink,
            unstopAssessmentId = "",
            startDate,
            endDate,
            duration,
            totalMarks,
            passingMarks,
            status = "UPCOMING",
            studentIds = [],
        } = req.body;

        if (!name || !subject || !unstopLink || !startDate || !endDate || !duration || totalMarks == null || passingMarks == null) {
            return res.status(400).json({ success: false, message: "Missing required exam fields" });
        }

        if (!isValidUnstopUrl(unstopLink)) {
            return res.status(400).json({ success: false, message: "Invalid Unstop assessment URL" });
        }

        if (Number(passingMarks) > Number(totalMarks)) {
            return res.status(400).json({
                success: false,
                message: "Passing marks cannot exceed total marks",
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            return res.status(400).json({ success: false, message: "Invalid start or end date range" });
        }

        const exam = await Exam.create({
            name,
            subject,
            unstopLink,
            unstopAssessmentId,
            startDate: start,
            endDate: end,
            duration: Number(duration),
            totalMarks: Number(totalMarks),
            passingMarks: Number(passingMarks),
            status,
            createdBy: req.user._id,
        });

        let assignedCount = 0;
        if (Array.isArray(studentIds) && studentIds.length > 0) {
            const validIds = studentIds.filter((id) => mongoose.isValidObjectId(id));
            const students = await User.find({ _id: { $in: validIds }, role: "STUDENT" })
                .select("_id")
                .lean();

            if (students.length > 0) {
                const docs = students.map((s) => ({
                    examId: exam._id,
                    studentId: s._id,
                }));
                await ExamAssignment.insertMany(docs, { ordered: false }).catch(() => { });
                assignedCount = students.length;
            }
        }

        return res.status(201).json({
            success: true,
            data: exam,
            assignedCount,
        });
    } catch (err) {
        return next(err);
    }
};

export const getExams = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const exams = await Exam.find(filter).sort({ startDate: -1 }).lean();
        const examIds = exams.map((e) => e._id);

        const assignmentCounts = await ExamAssignment.aggregate([
            { $match: { examId: { $in: examIds } } },
            { $group: { _id: "$examId", assignedCount: { $sum: 1 } } },
        ]);

        const countMap = new Map(
            assignmentCounts.map((item) => [item._id.toString(), item.assignedCount])
        );

        const enriched = exams.map((exam) => ({
            ...exam,
            assignedCount: countMap.get(exam._id.toString()) || 0,
        }));

        return res.status(200).json({ success: true, data: enriched });
    } catch (err) {
        return next(err);
    }
};

export const getExamById = async (req, res, next) => {
    try {
        const exam = await Exam.findById(req.params.id).lean();
        if (!exam) {
            return res.status(404).json({ success: false, message: "Examination not found" });
        }
        return res.status(200).json({ success: true, data: exam });
    } catch (err) {
        return next(err);
    }
};

export const updateExam = async (req, res, next) => {
    try {
        const existing = await Exam.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Examination not found" });
        }

        const nextTotal = req.body.totalMarks != null ? Number(req.body.totalMarks) : existing.totalMarks;
        const nextPassing = req.body.passingMarks != null ? Number(req.body.passingMarks) : existing.passingMarks;

        if (nextPassing > nextTotal) {
            return res.status(400).json({
                success: false,
                message: "Passing marks cannot exceed total marks",
            });
        }

        if (req.body.unstopLink && !isValidUnstopUrl(req.body.unstopLink)) {
            return res.status(400).json({ success: false, message: "Invalid Unstop assessment URL" });
        }

        const allowedFields = [
            "name",
            "subject",
            "unstopLink",
            "unstopAssessmentId",
            "startDate",
            "endDate",
            "duration",
            "totalMarks",
            "passingMarks",
            "status",
        ];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                existing[field] = req.body[field];
            }
        }

        await existing.save();
        return res.status(200).json({ success: true, data: existing });
    } catch (err) {
        return next(err);
    }
};

export const deleteExam = async (req, res, next) => {
    try {
        const { id } = req.params;
        const exam = await Exam.findById(id);
        if (!exam) {
            return res.status(404).json({ success: false, message: "Examination not found" });
        }

        const [assignmentCount, resultCount] = await Promise.all([
            ExamAssignment.countDocuments({ examId: id }),
            ExamResult.countDocuments({ examId: id }),
        ]);

        if (assignmentCount > 0 || resultCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete an examination that already has assigned students or imported results",
            });
        }

        await exam.deleteOne();
        return res.status(200).json({ success: true, message: "Examination deleted" });
    } catch (err) {
        return next(err);
    }
};

export const assignStudentsToExam = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { studentIds } = req.body;

        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ success: false, message: "studentIds array is required" });
        }

        const exam = await Exam.findById(id).select("_id").lean();
        if (!exam) {
            return res.status(404).json({ success: false, message: "Examination not found" });
        }

        const validIds = studentIds.filter((sid) => mongoose.isValidObjectId(sid));
        const students = await User.find({ _id: { $in: validIds }, role: "STUDENT" })
            .select("_id")
            .lean();

        const ops = students.map((st) => ({
            updateOne: {
                filter: { examId: exam._id, studentId: st._id },
                update: {
                    $setOnInsert: {
                        examId: exam._id,
                        studentId: st._id,
                        assignedAt: new Date(),
                        invitationStatus: "ASSIGNED",
                        participationStatus: "PENDING",
                    },
                },
                upsert: true,
            },
        }));

        if (ops.length > 0) {
            await ExamAssignment.bulkWrite(ops);
        }

        const totalAssigned = await ExamAssignment.countDocuments({ examId: exam._id });

        return res.status(200).json({
            success: true,
            data: {
                examId: exam._id,
                processedStudents: students.length,
                totalAssigned,
            },
        });
    } catch (err) {
        return next(err);
    }
};

export const getExamStudents = async (req, res, next) => {
    try {
        const { id } = req.params;
        const examExists = await Exam.exists({ _id: id });
        if (!examExists) {
            return res.status(404).json({ success: false, message: "Examination not found" });
        }

        const assignments = await ExamAssignment.find({ examId: id })
            .populate(
                "studentId",
                "fullName email studentNumber rollNo branch section domain probationStatus"
            )
            .lean();

        return res.status(200).json({ success: true, data: assignments });
    } catch (err) {
        return next(err);
    }
};

export const importExamResults = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Result file is required" });
        }

        const exam = await Exam.findById(id);
        if (!exam) {
            return res.status(404).json({ success: false, message: "Examination not found" });
        }

        const summary = await importUnstopResultsFromBuffer(req.file.buffer, exam);

        const importLog = await ExamImport.create({
            examId: exam._id,
            fileName: req.file.originalname,
            importedBy: req.user._id,
            totalRecords: summary.totalRecords,
            successfulRecords: summary.successfulRecords,
            failedRecords: summary.failedRecords,
        });

        return res.status(200).json({
            success: true,
            data: {
                importRecord: importLog,
                errors: summary.errors,
            },
        });
    } catch (err) {
        return next(err);
    }
};

export const getExamResults = async (req, res, next) => {
    try {
        const { id } = req.params;
        const examExists = await Exam.exists({ _id: id });
        if (!examExists) {
            return res.status(404).json({ success: false, message: "Examination not found" });
        }

        const results = await ExamResult.find({ examId: id })
            .populate("studentId", "fullName email studentNumber rollNo branch section domain")
            .sort({ marksObtained: -1 })
            .lean();

        return res.status(200).json({ success: true, data: results });
    } catch (err) {
        return next(err);
    }
};

export const getExamSummary = async (req, res, next) => {
    try {
        const { id } = req.params;
        const exam = await Exam.findById(id).lean();
        if (!exam) {
            return res.status(404).json({ success: false, message: "Examination not found" });
        }

        const [assignments, results] = await Promise.all([
            ExamAssignment.find({ examId: id }).lean(),
            ExamResult.find({ examId: id }).lean(),
        ]);

        const totalStudents = assignments.length;
        const resultByStudent = new Map(
            results.map((r) => [r.studentId.toString(), r])
        );

        let appeared = 0;
        let passed = 0;
        let failed = 0;
        let pending = 0;

        for (const assignment of assignments) {
            const resDoc = resultByStudent.get(assignment.studentId.toString());
            const hasAppeared =
                assignment.participationStatus === "APPEARED" ||
                resDoc?.submissionStatus === "SUBMITTED";

            if (hasAppeared) {
                appeared += 1;
            }

            if (!resDoc || resDoc.submissionStatus !== "SUBMITTED" || resDoc.resultStatus === "PENDING") {
                pending += 1;
            } else if (resDoc.resultStatus === "PASSED") {
                passed += 1;
            } else if (resDoc.resultStatus === "FAILED") {
                failed += 1;
            }
        }

        const participationRate =
            totalStudents > 0 ? Number(((appeared / totalStudents) * 100).toFixed(1)) : 0;

        return res.status(200).json({
            success: true,
            data: {
                examId: exam._id,
                examName: exam.name,
                totalStudents,
                appeared,
                passed,
                failed,
                pending,
                participationRate,
            },
        });
    } catch (err) {
        return next(err);
    }
};

// --- Student-side endpoints ---

export const getStudentExams = async (req, res, next) => {
    try {
        const assignments = await ExamAssignment.find({ studentId: req.user._id })
            .populate("examId")
            .sort({ assignedAt: -1 })
            .lean();

        const data = assignments
            .filter((a) => a.examId)
            .map((a) => ({
                assignmentId: a._id,
                assignedAt: a.assignedAt,
                invitationStatus: a.invitationStatus,
                participationStatus: a.participationStatus,
                exam: a.examId,
            }));

        return res.status(200).json({ success: true, data });
    } catch (err) {
        return next(err);
    }
};

export const getStudentExamById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const assignment = await ExamAssignment.findOne({
            examId: id,
            studentId: req.user._id,
        })
            .populate("examId")
            .lean();

        if (!assignment || !assignment.examId) {
            return res.status(404).json({
                success: false,
                message: "Assigned examination not found for this student",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                assignment,
                exam: assignment.examId,
            },
        });
    } catch (err) {
        return next(err);
    }
};

export const getStudentExamResult = async (req, res, next) => {
    try {
        const { id } = req.params;
        const assignment = await ExamAssignment.findOne({
            examId: id,
            studentId: req.user._id,
        }).lean();

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "You are not assigned to this examination",
            });
        }

        const result = await ExamResult.findOne({
            examId: id,
            studentId: req.user._id,
        })
            .populate("examId", "name subject totalMarks passingMarks")
            .lean();

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Result has not been published for this examination yet",
            });
        }

        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return next(err);
    }
};