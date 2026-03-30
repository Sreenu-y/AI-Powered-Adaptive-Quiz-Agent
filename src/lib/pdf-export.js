import jsPDF from "jspdf";

export function exportToPDF(content) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPage = (needed = 20) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  };

  const addHeading = (text, size = 18) => {
    checkPage(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.5) + 4;
  };

  const addSubheading = (text) => {
    checkPage(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * 6 + 3;
  };

  const addBody = (text) => {
    checkPage(10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      checkPage(7);
      doc.text(line, margin, y);
      y += 6;
    }
    y += 3;
  };

  const addBullet = (text) => {
    checkPage(8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    const bulletText = `•  ${text}`;
    const lines = doc.splitTextToSize(bulletText, maxWidth - 5);
    for (const line of lines) {
      checkPage(7);
      doc.text(line, margin + 3, y);
      y += 6;
    }
    y += 1;
  };

  const addSeparator = () => {
    checkPage(8);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // Title
  if (content.title) {
    addHeading(content.title, 20);
    y += 2;
    addSeparator();
  }

  // Introduction
  if (content.introduction) {
    addSubheading("Introduction");
    addBody(content.introduction);
    y += 2;
  }

  // Key Concepts
  if (content.keyConcepts && content.keyConcepts.length > 0) {
    addSubheading("Key Concepts");
    for (const concept of content.keyConcepts) {
      addBullet(concept);
    }
    y += 2;
  }

  // Detailed Explanation
  if (content.detailedExplanation) {
    addSubheading("Detailed Explanation");
    addBody(content.detailedExplanation);
    y += 2;
  }

  // Examples
  if (content.examples && content.examples.length > 0) {
    addSubheading("Examples");
    for (const example of content.examples) {
      addBullet(example);
    }
    y += 2;
  }

  // Summary
  if (content.summary) {
    addSubheading("Summary");
    addBody(content.summary);
  }

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  const filename = `${(content.title || "Learning Notes").replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 50)}.pdf`;
  doc.save(filename);
}
