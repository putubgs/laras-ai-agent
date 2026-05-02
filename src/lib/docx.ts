"use client";

import { formatInTimeZone } from "date-fns-tz";
import { APP_TIME_ZONE } from "@/lib/app-timezone";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  BorderStyle,
  AlignmentType,
  LineRuleType,
  UnderlineType,
} from "docx";

// ── Markdown helpers ───────────────────────────────────────────────────────────

type Seg = { text: string; bold: boolean };

function parseMarkdown(raw: string): Seg[] {
  const segs: Seg[] = [];
  const re = /\*\*(.*?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) segs.push({ text: raw.slice(last, m.index), bold: false });
    segs.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < raw.length) segs.push({ text: raw.slice(last), bold: false });
  return segs;
}

// pt → half-points (docx size unit)
const pt = (n: number) => n * 2;

// Build an array of TextRuns from a line of text (handles **bold**)
function lineToRuns(text: string, fontSize: number, color = "2D2D2D"): TextRun[] {
  const segs = parseMarkdown(text);
  return segs.map(
    (seg) =>
      new TextRun({
        text: seg.text,
        bold: seg.bold,
        size: pt(fontSize),
        color,
        font: "Calibri",
      })
  );
}

// Convert a raw paragraph string (may contain \n) into DOCX Paragraph objects
function buildBodyParagraphs(rawPara: string, fontSize: number): Paragraph[] {
  const subLines = rawPara.trim().split("\n");
  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < subLines.length; i++) {
    const line = subLines[i].trim();
    if (!line) continue;

    paragraphs.push(
      new Paragraph({
        children: lineToRuns(line, fontSize),
        spacing: {
          // Only add after-spacing on the LAST sub-line of the block
          after: i === subLines.length - 1 ? 160 : 40,
          line: 288, // 1.2× line spacing
          lineRule: LineRuleType.AUTO,
        },
      })
    );
  }
  return paragraphs;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function downloadCoverLetterDocx({
  coverLetter,
  candidateName,
  candidateEmail,
  candidatePhone,
  candidateLocation,
  company,
  position,
}: {
  coverLetter: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateLocation?: string;
  company: string;
  position: string;
}) {
  const contactParts = [candidateEmail, candidatePhone, candidateLocation].filter(Boolean);
  const contactLine = contactParts.join("   ·   ");
  const dateStr = formatInTimeZone(new Date(), APP_TIME_ZONE, "MMMM d, yyyy");

  // ── Body paragraphs ──
  const rawParas = coverLetter.split(/\n{2,}/).filter((p) => p.trim());
  const bodyParagraphs = rawParas.flatMap((p) => buildBodyParagraphs(p, 11));

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: pt(11) },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1080,   // ~0.75 in
              right: 1080,
              bottom: 1080,
              left: 1080,
            },
          },
        },
        children: [
          // ── Name ──
          new Paragraph({
            children: [
              new TextRun({
                text: candidateName || "Your Name",
                bold: true,
                size: pt(22),
                color: "1A1A2E",
                font: "Calibri",
              }),
            ],
            spacing: { after: 60 },
          }),

          // ── Contact line ──
          ...(contactLine
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: contactLine,
                      size: pt(9.5),
                      color: "666688",
                      font: "Calibri",
                    }),
                  ],
                  spacing: { after: 100 },
                }),
              ]
            : []),

          // ── Divider (paragraph with bottom border) ──
          new Paragraph({
            children: [],
            border: {
              bottom: {
                color: "AAAACC",
                style: BorderStyle.SINGLE,
                size: 6,
                space: 4,
              },
            },
            spacing: { after: 240 },
          }),

          // ── Date ──
          new Paragraph({
            children: [
              new TextRun({
                text: dateStr,
                size: pt(10.5),
                color: "444444",
                font: "Calibri",
              }),
            ],
            spacing: { after: 240 },
          }),

          // ── Recipient ──
          new Paragraph({
            children: [
              new TextRun({
                text: "Hiring Manager",
                bold: true,
                size: pt(10.5),
                color: "1A1A1A",
                font: "Calibri",
              }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: company,
                size: pt(10.5),
                color: "1A1A1A",
                font: "Calibri",
              }),
            ],
            spacing: { after: 300 },
          }),

          // ── Subject ──
          new Paragraph({
            children: [
              new TextRun({
                text: `Cover Letter for ${position} Position`,
                bold: true,
                size: pt(11.5),
                color: "1A1A2E",
                font: "Calibri",
              }),
            ],
            spacing: { after: 360 },
          }),

          // ── Body ──
          ...bodyParagraphs,
        ],
      },
    ],
  });

  // Generate blob and trigger download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeCompany = company.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  a.href = url;
  a.download = `cover-letter-${safeCompany}-${formatInTimeZone(new Date(), APP_TIME_ZONE, "yyyy-MM-dd")}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
