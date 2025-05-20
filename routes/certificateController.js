import PDFDocument from "pdfkit";
import { Courses } from "../models/Courses.js";

export const generateCertificate = async (req, res) => {
  try {
    const courseId = req.params.id;  // Change this line to get the course ID from the route param
    const user = req.user;

    if (!user || !courseId) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const courseData = await Courses.findById(courseId);  // Use courseId here
    if (!courseData) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Certificate-${user.name.replace(/\s+/g, "_")}.pdf"`
    );

    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });
    doc.pipe(res);

    // Border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
      .lineWidth(4)
      .strokeColor("#003366")
      .stroke();

    // Title
    doc
      .fontSize(36)
      .fillColor("#003366")
      .text("Certificate of Completion", {
        align: "center",
        underline: true,
      });

    doc.moveDown(2);

    // Certify text
    doc
      .fontSize(20)
      .fillColor("black")
      .text(`This is to certify that`, {
        align: "center",
      });

    doc.moveDown();

    // Name
    doc
      .fontSize(28)
      .fillColor("#000000")
      .text(`${user.name}`, {
        align: "center",
        underline: true,
      });

    doc.moveDown();

    doc
      .fontSize(20)
      .text(`has successfully completed the course`, {
        align: "center",
      });

    doc.moveDown();

    doc
      .fontSize(24)
      .fillColor("#003366")
      .text(`"${courseData.title}"`, {
        align: "center",
        underline: true,
      });

    doc.moveDown(2);

    // Date and signature
    const date = new Date().toLocaleDateString();

    doc
      .fontSize(16)
      .fillColor("black")
      .text(`Date: ${date}`, 100, 400, { align: "left" });

    doc.end();
  } catch (error) {
    console.error("PDF generation failed", error);
    res.status(500).json({ message: "Error generating certificate" });
  }
};
