
import "dotenv/config";

import path from "node:path";
import XLSX from "xlsx";

import connectDB from "../config/db.config.js";
import MentorRegistry from "../models/mentorRegistry.model.js";

const FILE_PATH = path.resolve(
  "data/Big Data CoE Member List.xlsx"
);

// Only currently eligible graduating batches.
const SELECTED_SHEETS = ["2029", "2028", "2027"];

const hasApplyFlag = process.argv.includes("--apply");

const normalizeHeader = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeText = (value) =>
  String(value ?? "").trim();

const normalizeStudentNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) return "";
    return String(value);
  }

  return String(value).trim();
};

const isValidEmail = (email) =>
  /^[^\s@]+@akgec\.ac\.in$/i.test(email);

const getColumnIndex = (headers, possibleNames) => {
  const normalizedHeaders = headers.map(normalizeHeader);

  return normalizedHeaders.findIndex((header) =>
    possibleNames.includes(header)
  );
};

const readSheet = (workbook, graduationYear) => {
  const worksheet = workbook.Sheets[graduationYear];

  if (!worksheet) {
    throw new Error(`Worksheet ${graduationYear} not found.`);
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: true
  });

  if (!rows.length) return [];

  const headers = rows[0];

  const nameIndex = getColumnIndex(headers, ["name", "fullname"]);
  const studentIndex = getColumnIndex(headers, [
    "studentno",
    "studentnumber"
  ]);
  const emailIndex = getColumnIndex(headers, [
    "collegeemail",
    "officialemail"
  ]);
  const branchIndex = getColumnIndex(headers, ["branch"]);
  const sectionIndex = getColumnIndex(headers, ["section"]);

  if (
    nameIndex === -1 ||
    studentIndex === -1 ||
    emailIndex === -1
  ) {
    throw new Error(
      `Required columns missing in worksheet ${graduationYear}.`
    );
  }


  return rows
    .slice(1)
    .map((row, index) => {
      const studentNumber = normalizeStudentNumber(
        row[studentIndex]
      );

      const admissionYear =
        studentNumber.length >= 2
          ? 2000 + Number(studentNumber.slice(0, 2))
          : null;

      return {
        fullName: normalizeText(row[nameIndex]),
        studentNumber,
        email: normalizeText(row[emailIndex]).toLowerCase(),
        admissionYear,
        graduationYear: Number(graduationYear),
        branch:
          branchIndex !== -1
            ? normalizeText(row[branchIndex]) || null
            : null,
        section:
          sectionIndex !== -1
            ? normalizeText(row[sectionIndex]) || null
            : null,
        sourceRow: index + 2
      };
    })
    .filter((record) =>
      record.fullName ||
      record.studentNumber ||
      record.email
    );

};

const validateRecord = (record) => {
  const errors = [];

  if (!record.fullName) {
    errors.push("Missing name");
  }

  if (!/^[0-9]{3,20}$/.test(record.studentNumber)) {
    errors.push("Invalid student number");
  }

  if (!isValidEmail(record.email)) {
    errors.push("Invalid or missing AKGEC email");
  }

  if (
    !record.admissionYear ||
    record.admissionYear + 4 !== record.graduationYear
  ) {
    errors.push("Student number does not match graduation sheet");
  }

  return errors;
};

const main = async () => {
  try {
    const workbook = XLSX.readFile(FILE_PATH);

    const allRecords = [];

    for (const year of SELECTED_SHEETS) {
      const records = readSheet(workbook, year);
      allRecords.push(...records);
    }

    const validRecords = [];
    const rejectedRecords = [];

    const seenStudentNumbers = new Set();
    const seenEmails = new Set();

    for (const record of allRecords) {
      const errors = validateRecord(record);

      if (
        record.studentNumber &&
        seenStudentNumbers.has(record.studentNumber)
      ) {
        errors.push("Duplicate student number in spreadsheet");
      }

      if (
        record.email &&
        seenEmails.has(record.email)
      ) {
        errors.push("Duplicate email in spreadsheet");
      }

      if (record.studentNumber) {
        seenStudentNumbers.add(record.studentNumber);
      }

      if (record.email) {
        seenEmails.add(record.email);
      }

      if (errors.length) {
        rejectedRecords.push({ ...record, errors });
      } else {
        validRecords.push(record);
      }
    }

    console.log("\n========== MENTOR IMPORT REPORT ==========");
    console.log("Total records:", allRecords.length);
    console.log("Valid records:", validRecords.length);
    console.log("Rejected records:", rejectedRecords.length);
    console.log("Mode:", hasApplyFlag ? "IMPORT" : "DRY RUN");

    if (rejectedRecords.length) {
      console.log("\nRejected records:");

      for (const record of rejectedRecords) {
        console.log({
          row: record.sourceRow,
          studentNumber: record.studentNumber,
          errors: record.errors
        });
      }
    }

    if (!hasApplyFlag) {
      console.log(
        "\nDry run completed. MongoDB was not modified."
      );
      console.log(
        "Run with --apply to import valid records."
      );
      return;
    }

    await connectDB();

    let imported = 0;
    let failed = 0;

    for (const record of validRecords) {
      try {
        const {
          sourceRow,
          ...mentorData
        } = record;

        await MentorRegistry.updateOne(
          {
            studentNumber: mentorData.studentNumber
          },
          {
            $set: mentorData,
            $setOnInsert: {
              isEligible: true
            }
          },
          { upsert: true, runValidators: true }
        );

        imported++;
      } catch (error) {
        failed++;

        console.error(
          `Failed to import student ${record.studentNumber}:`,
          error.message
        );
      }
    }

    console.log("\n========== IMPORT COMPLETE ==========");
    console.log("Successfully imported:", imported);
    console.log("Failed:", failed);
    console.log("Rejected:", rejectedRecords.length);
  } catch (error) {
    console.error("Mentor import failed:", error);
    process.exitCode = 1;
  } finally {
    if (hasApplyFlag) {
      const mongoose = await import("mongoose");
      await mongoose.default.disconnect();
    }
  }
};

main();