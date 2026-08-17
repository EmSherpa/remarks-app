import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  ShadingType,
  HeadingLevel,
} from "docx";

const COL1 = 2200;
const COL2 = 7150;

function headerCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: "2E5395" },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 22 })],
      }),
    ],
  });
}

export async function buildRemarksDocx(params: {
  title: string;
  subtitle: string;
  quarterSummary: string;
  remarks: { student_name: string; remark: string }[];
}): Promise<Buffer> {
  const { title, subtitle, quarterSummary, remarks } = params;

  const rows = [
    new TableRow({
      tableHeader: true,
      children: [headerCell("Student Name", COL1), headerCell("Quarter Summary & Remarks", COL2)],
    }),
  ];

  remarks.forEach(({ student_name, remark }, i) => {
    const shade = i % 2 === 0 ? undefined : { type: ShadingType.CLEAR, fill: "F2F2F2" };
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: COL1, type: WidthType.DXA },
            shading: shade,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
              new Paragraph({ children: [new TextRun({ text: student_name, bold: true, size: 21 })] }),
            ],
          }),
          new TableCell({
            width: { size: COL2, type: WidthType.DXA },
            shading: shade,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
              new Paragraph({
                spacing: { after: 150 },
                children: [
                  new TextRun({ text: quarterSummary, italics: true, size: 20, color: "444444" }),
                ],
              }),
              new Paragraph({ children: [new TextRun({ text: remark, size: 21 })] }),
            ],
          }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1000, bottom: 1000, left: 900, right: 900 },
          },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: title, bold: true, size: 32, color: "1F3864" })],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [new TextRun({ text: subtitle, italics: true, size: 21, color: "555555" })],
          }),
          new Table({ width: { size: 9350, type: WidthType.DXA }, columnWidths: [COL1, COL2], rows }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}