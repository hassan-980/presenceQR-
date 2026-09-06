export type ReportRow = {
  name: string;
  roll: string;
  present: number;
  total: number;
  percent: number;
  lastAttended: string;
};

export function formatDate(value: string | number | Date) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function downloadCsv(className: string, rows: ReportRow[], sessionDates: string[] = []) {
  const header = [
    "Student",
    "Roll no",
    "Sessions attended",
    "Total sessions",
    "Attendance %",
    "Last attended",
  ];
  const body = rows.map((r) => [r.name, r.roll, r.present, r.total, `${r.percent}%`, r.lastAttended]);
  const meta = [
    [`Class: ${className}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [`Class dates: ${sessionDates.length ? sessionDates.join(" | ") : "—"}`],
    [],
  ];
  const csv = [...meta, header, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${slug(className)}-attendance.csv`);
}

export async function downloadPdf(
  className: string,
  code: string,
  rows: ReportRow[],
  sessionDates: string[] = [],
) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Attendance report — ${className}`, 14, 18);
  doc.setFontSize(10);
  doc.text(`Subject code: ${code}`, 14, 25);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 31);
  const dateLines = doc.splitTextToSize(
    `Class dates: ${sessionDates.length ? sessionDates.join(", ") : "—"}`,
    180,
  );
  doc.text(dateLines, 14, 37);

  autoTable(doc, {
    startY: 37 + dateLines.length * 5 + 3,
    head: [["Student", "Roll no", "Attended", "Total", "Attendance %", "Last attended"]],
    body: rows.map((r) => [
      r.name,
      r.roll,
      String(r.present),
      String(r.total),
      `${r.percent}%`,
      r.lastAttended,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [38, 78, 90] },
  });

  doc.save(`${slug(className)}-attendance.pdf`);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "class";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
