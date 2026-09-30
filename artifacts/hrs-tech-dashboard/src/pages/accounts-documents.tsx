import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Check,
  Download,
  FilePlus2,
  Plus,
  Share2,
  Trash2,
  X,
} from "lucide-react";

export type DocumentAccount = {
  id: string;
  kind: "Supplier" | "Vendor" | "Client";
  name: string;
  address: string;
  email: string;
  contact: string;
  phone: string;
};

export type CompanyProfile = {
  name: string;
  address: string;
  email: string;
  phone: string;
  gstin: string;
  website: string;
};

export type DocumentKind =
  "Invoice" | "Quotation" | "Purchase Order" | "Tax Invoice";

export type DocumentLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
};

export type ComposedDocument = {
  id: string;
  number: string;
  kind: DocumentKind;
  accountId: string;
  title: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  dueDate: string;
  status: "Draft" | "Pending" | "Due soon" | "Paid";
  issueDate?: string;
  validUntil?: string;
  customerReference?: string;
  salesperson?: string;
  shipDate?: string;
  shippingAddress?: string;
  shipVia?: string;
  fob?: string;
  terms?: string;
  comments?: string;
  shipping?: number;
  other?: number;
  lines?: DocumentLine[];
  issuer?: CompanyProfile;
};

const documentKinds: DocumentKind[] = [
  "Invoice",
  "Quotation",
  "Purchase Order",
  "Tax Invoice",
];

type Props = {
  accounts: DocumentAccount[];
  company: CompanyProfile;
  kind: DocumentKind;
  nextNumber: string;
  onKindChange: (kind: DocumentKind) => void;
  onClose: () => void;
  onSave: (document: ComposedDocument) => void;
  onCompanyChange: (company: CompanyProfile) => void;
  notify: (message: string, tone?: "success" | "warning" | "info") => void;
};

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDate(date);
}

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function prettyDate(date: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function pdfFilename(document: ComposedDocument) {
  return `${document.number.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;
}

async function createDocumentPdf(
  document: ComposedDocument,
  account: DocumentAccount | undefined,
  company: CompanyProfile,
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const right = pageWidth - margin;
  const blue: [number, number, number] = [39, 76, 133];
  const ink: [number, number, number] = [30, 41, 59];
  const muted: [number, number, number] = [100, 116, 139];
  const currencyText = (value: number) =>
    `INR ${new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`;
  const dateText = (value?: string) => (value ? prettyDate(value) : "—");
  const kind = document.kind;
  const isPo = kind === "Purchase Order";
  const isQuote = kind === "Quotation";
  const isInvoice = kind === "Invoice" || kind === "Tax Invoice";
  const lines = document.lines?.length
    ? document.lines
    : [
        {
          description: document.title,
          quantity: 1,
          unitPrice: document.subtotal,
          taxable: true,
        },
      ];
  const taxableSubtotal = lines
    .filter((line) => line.taxable)
    .reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const taxAmount = (taxableSubtotal * document.taxRate) / 100;
  const subtotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const total =
    subtotal + taxAmount + (document.shipping ?? 0) + (document.other ?? 0);
  let y = margin;

  const addText = (
    value: string,
    x: number,
    top: number,
    maxWidth: number,
    size = 9,
    color: [number, number, number] = ink,
    weight: "normal" | "bold" = "normal",
  ) => {
    pdf.setFont("helvetica", weight);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const rows = pdf.splitTextToSize(value || " ", maxWidth) as string[];
    pdf.text(rows, x, top);
    return rows.length * (size * 0.42);
  };

  const addSection = (label: string, x: number, top: number, width: number) => {
    pdf.setFillColor(...blue);
    pdf.rect(x, top, width, 6, "F");
    addText(label, x + 2, top + 4.1, width - 4, 7, [255, 255, 255], "bold");
  };

  const drawTableHeader = () => {
    pdf.setFillColor(...blue);
    pdf.rect(margin, y, pageWidth - margin * 2, 8, "F");
    addText("DESCRIPTION", margin + 2, y + 5.4, 75, 7, [255, 255, 255], "bold");
    addText("UNIT PRICE", 113, y + 5.4, 23, 7, [255, 255, 255], "bold");
    addText("QTY", 140, y + 5.4, 15, 7, [255, 255, 255], "bold");
    addText("TAX", 158, y + 5.4, 12, 7, [255, 255, 255], "bold");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text("AMOUNT", right - 2, y + 5.4, { align: "right" });
    y += 8;
  };

  const newPage = () => {
    pdf.addPage();
    y = margin;
    drawTableHeader();
  };

  const companyName = company.name || "Your company";
  const heading = isPo
    ? "PURCHASE ORDER"
    : isQuote
      ? "QUOTATION"
      : kind.toUpperCase();
  addText(companyName, margin, y + 7, 95, 19, blue, "bold");
  addText("TECHNOLOGY · SECURITY · OPERATIONS", margin, y + 12, 100, 7, muted);
  const companyLines = [
    company.address,
    company.gstin && `GSTIN: ${company.gstin}`,
    company.email,
    company.phone,
    company.website,
  ].filter(Boolean);
  let companyY = y + 18;
  for (const line of companyLines) {
    companyY += addText(line, margin, companyY, 85, 8, muted) + 1;
  }
  addText(heading, right - 82, y + 8, 82, 18, blue, "bold");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...muted);
  const meta = [
    ["DATE", dateText(document.issueDate)],
    [isPo ? "PO #" : isQuote ? "QUOTE #" : "INVOICE #", document.number],
    ["SUBJECT", document.title],
    [
      isQuote ? "VALID UNTIL" : isPo ? "SHIP DATE" : "DUE DATE",
      dateText(
        isQuote
          ? document.validUntil
          : isPo
            ? document.shipDate
            : document.dueDate,
      ),
    ],
    ...(document.customerReference
      ? [["REFERENCE", document.customerReference]]
      : []),
  ];
  let metaY = y + 16;
  for (const [label, value] of meta) {
    addText(label, right - 82, metaY, 28, 7, muted, "bold");
    const valueHeight = addText(value, right - 51, metaY, 51, 8, ink, "bold");
    metaY += Math.max(5, valueHeight + 1.5);
  }
  y = Math.max(companyY, metaY) + 5;
  pdf.setDrawColor(203, 213, 225);
  pdf.line(margin, y, right, y);
  y += 5;

  const blockGap = 8;
  const blockWidth = (pageWidth - margin * 2 - blockGap) / 2;
  addSection(
    isPo ? "VENDOR" : isQuote ? "CUSTOMER" : "BILL TO",
    margin,
    y,
    blockWidth,
  );
  const accountLines = [
    account?.name ?? "Select an account",
    account?.contact,
    account?.address,
    account?.email,
    account?.phone,
  ].filter(Boolean) as string[];
  let accountY = y + 11;
  for (const line of accountLines) {
    accountY += addText(line, margin + 2, accountY, blockWidth - 4, 8, ink) + 1;
  }
  const rightBlockX = margin + blockWidth + blockGap;
  if (isInvoice || isPo) {
    addSection(isPo ? "SHIP TO" : "SHIP TO", rightBlockX, y, blockWidth);
    const shipLines = [
      isPo ? `${companyName} · Receiving` : account?.name,
      isPo
        ? document.shippingAddress || company.address
        : document.shippingAddress || account?.address,
      document.shipVia && `Ship via: ${document.shipVia}`,
    ].filter(Boolean) as string[];
    let shipY = y + 11;
    for (const line of shipLines) {
      shipY +=
        addText(line, rightBlockX + 2, shipY, blockWidth - 4, 8, ink) + 1;
    }
    accountY = Math.max(accountY, shipY);
  } else {
    addSection("PREPARED BY", rightBlockX, y, blockWidth);
    accountY = Math.max(
      accountY,
      y +
        11 +
        addText(
          document.salesperson || companyName,
          rightBlockX + 2,
          y + 11,
          blockWidth - 4,
          8,
          ink,
        ),
    );
  }
  y = Math.max(accountY, y + 27) + 4;

  if (
    document.salesperson ||
    document.shipVia ||
    document.fob ||
    document.terms
  ) {
    const details: [string, string][] = [
      ["PREPARED BY", document.salesperson],
      ["SHIP VIA", document.shipVia],
      ["FOB", document.fob],
      [isPo ? "SHIPPING TERMS" : "TERMS", document.terms],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));
    if (details.length) {
      const cellWidth = (pageWidth - margin * 2) / Math.min(4, details.length);
      let x = margin;
      for (const [label, value] of details) {
        addSection(label, x, y, cellWidth);
        addText(value, x + 2, y + 11, cellWidth - 4, 8, ink);
        x += cellWidth;
      }
      y += 19;
    }
  }

  drawTableHeader();
  for (const line of lines) {
    const wrapped = pdf.splitTextToSize(line.description, 77) as string[];
    const rowHeight = Math.max(8, wrapped.length * 4 + 3);
    if (y + rowHeight > pageHeight - 18) newPage();
    if (Math.floor((y - 8) / rowHeight) % 2 === 1) {
      pdf.setFillColor(241, 245, 249);
      pdf.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
    }
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y + rowHeight, right, y + rowHeight);
    addText(line.description, margin + 2, y + 5, 77, 8);
    pdf.setFontSize(8);
    pdf.setTextColor(...ink);
    pdf.text(currencyText(line.unitPrice), 136, y + 5, { align: "right" });
    pdf.text(String(line.quantity), 155, y + 5, { align: "right" });
    pdf.text(line.taxable ? `${document.taxRate}%` : "—", 169, y + 5, {
      align: "right",
    });
    pdf.text(currencyText(line.quantity * line.unitPrice), right - 2, y + 5, {
      align: "right",
    });
    y += rowHeight;
  }

  const notes = [document.terms, document.comments].filter(
    (note): note is string => Boolean(note),
  );
  const totalRows: [string, string][] = [
    ["SUBTOTAL", currencyText(subtotal)],
    [`TAX (${document.taxRate}%)`, currencyText(taxAmount)],
    ...(document.shipping
      ? ([["SHIPPING", currencyText(document.shipping)]] as [string, string][])
      : []),
    ...(document.other
      ? ([["OTHER", currencyText(document.other)]] as [string, string][])
      : []),
  ];
  const totalsHeight = (totalRows.length + 1) * 6 + 6;
  if (y + totalsHeight + 24 > pageHeight - 12) newPage();
  y += 6;
  const notesWidth = 100;
  if (notes.length) {
    addSection(
      isQuote ? "TERMS AND CONDITIONS" : "COMMENTS / INSTRUCTIONS",
      margin,
      y,
      notesWidth,
    );
    let noteY = y + 11;
    for (const note of notes) {
      noteY += addText(note, margin + 2, noteY, notesWidth - 4, 8, muted) + 2;
    }
  }
  const totalsX = pageWidth - margin - 67;
  let totalY = y + 2;
  for (const [label, value] of totalRows) {
    addText(label, totalsX, totalY + 3, 38, 8, muted);
    pdf.setFontSize(8);
    pdf.setTextColor(...ink);
    pdf.text(value, right, totalY + 3, { align: "right" });
    totalY += 6;
  }
  pdf.setFillColor(234, 241, 251);
  pdf.rect(totalsX - 2, totalY, right - totalsX + 2, 9, "F");
  addText("TOTAL", totalsX, totalY + 6, 35, 9, blue, "bold");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...blue);
  pdf.text(currencyText(total), right - 2, totalY + 6, { align: "right" });

  const footerY = Math.min(pageHeight - 12, Math.max(totalY + 18, y + 33));
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, footerY - 4, right, footerY - 4);
  addText(
    `Contact ${companyName}${company.email ? ` · ${company.email}` : ""}${company.phone ? ` · ${company.phone}` : ""}`,
    margin,
    footerY,
    pageWidth - margin * 2,
    8,
    muted,
  );
  pdf.setProperties({
    title: `${kind} ${document.number}`,
    subject: document.title,
    author: companyName,
  });
  return pdf;
}

const inputClass =
  "mt-1.5 h-9 w-full rounded border border-slate-700 bg-[#0b1522] px-2.5 text-[11px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400/70";
const labelClass = "block text-[10px] font-medium text-slate-400";

function DocumentPaper({
  document,
  account,
  company,
  lines,
  issueDate,
  title,
  number,
  validUntil,
  customerReference,
  salesperson,
  shipDate,
  shippingAddress,
  shipVia,
  fob,
  terms,
  comments,
  shipping,
  other,
  taxRate,
}: {
  document?: ComposedDocument;
  account?: DocumentAccount;
  company: CompanyProfile;
  lines: DocumentLine[];
  issueDate: string;
  title: string;
  number: string;
  validUntil: string;
  customerReference: string;
  salesperson: string;
  shipDate: string;
  shippingAddress: string;
  shipVia: string;
  fob: string;
  terms: string;
  comments: string;
  shipping: number;
  other: number;
  taxRate: number;
}) {
  const kind = document?.kind ?? "Invoice";
  const isQuote = kind === "Quotation";
  const isPo = kind === "Purchase Order";
  const isInvoice = kind === "Invoice" || kind === "Tax Invoice";
  const subtotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const taxableSubtotal = lines
    .filter((line) => line.taxable)
    .reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const taxAmount = (taxableSubtotal * taxRate) / 100;
  const total = subtotal + taxAmount + shipping + other;
  const safeLines = lines.length
    ? lines
    : [{ description: "", quantity: 1, unitPrice: 0, taxable: true }];
  const recipientTitle = isPo ? "VENDOR" : isQuote ? "CUSTOMER" : "BILL TO";

  return (
    <article className="document-paper document-print-surface mx-auto w-full max-w-[760px] bg-white p-6 text-slate-800 shadow-xl sm:p-9">
      <header className="flex items-start justify-between gap-5 border-b-2 border-[#244a84] pb-5">
        <div className="min-w-0">
          <div className="text-[22px] font-bold tracking-tight text-[#173765]">
            {company.name || "Your company"}
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            Technology · Security · Operations
          </p>
          <div className="mt-3 whitespace-pre-line text-[10px] leading-4 text-slate-600">
            {company.address}
            {company.gstin && <p>GSTIN: {company.gstin}</p>}
            {company.email && <p>{company.email}</p>}
            {company.phone && <p>{company.phone}</p>}
            {company.website && <p>{company.website}</p>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <h2 className="text-[27px] font-bold uppercase tracking-[.08em] text-[#3678bd]">
            {kind === "Purchase Order"
              ? "Purchase Order"
              : kind === "Quotation"
                ? "Quotation"
                : kind}
          </h2>
          <dl className="mt-3 grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-[10px]">
            <dt className="font-semibold text-slate-500">DATE</dt>
            <dd>{prettyDate(issueDate)}</dd>
            <dt className="font-semibold text-slate-500">
              {isPo ? "PO #" : isQuote ? "QUOTE #" : "INVOICE #"}
            </dt>
            <dd className="font-semibold text-[#173765]">
              {number || "Assigned on save"}
            </dd>
            {title && (
              <>
                <dt className="font-semibold text-slate-500">SUBJECT</dt>
                <dd>{title}</dd>
              </>
            )}
            {customerReference && (
              <>
                <dt className="font-semibold text-slate-500">REFERENCE</dt>
                <dd>{customerReference}</dd>
              </>
            )}
            {isQuote && (
              <>
                <dt className="font-semibold text-slate-500">VALID UNTIL</dt>
                <dd>{prettyDate(validUntil)}</dd>
              </>
            )}
            {!isPo && !isQuote && (
              <>
                <dt className="font-semibold text-slate-500">DUE DATE</dt>
                <dd>{prettyDate(document?.dueDate ?? validUntil)}</dd>
              </>
            )}
          </dl>
        </div>
      </header>

      <section
        className={`my-5 grid gap-4 ${isInvoice ? "sm:grid-cols-2" : "sm:grid-cols-[1fr_1fr]"}`}
      >
        <div>
          <h3 className="bg-[#274c85] px-2.5 py-1.5 text-[9px] font-bold tracking-[.12em] text-white">
            {recipientTitle}
          </h3>
          <div className="min-h-[74px] px-2.5 py-2 text-[10px] leading-[1.65]">
            <p className="font-semibold text-slate-800">
              {account?.name || "Select an account"}
            </p>
            {account?.contact && <p>{account.contact}</p>}
            {account?.address && <p>{account.address}</p>}
            {account?.email && <p>{account.email}</p>}
            {account?.phone && <p>{account.phone}</p>}
          </div>
        </div>
        {isInvoice && (
          <div>
            <h3 className="bg-[#274c85] px-2.5 py-1.5 text-[9px] font-bold tracking-[.12em] text-white">
              SHIP TO
            </h3>
            <div className="min-h-[74px] px-2.5 py-2 text-[10px] leading-[1.65]">
              <p className="font-semibold text-slate-800">
                {account?.name || "Same as bill to"}
              </p>
              <p className="whitespace-pre-line">
                {shippingAddress || account?.address || "Same as bill to"}
              </p>
              {shipDate && <p>Ship date: {prettyDate(shipDate)}</p>}
              {shipVia && <p>Ship via: {shipVia}</p>}
            </div>
          </div>
        )}
        {isPo && (
          <div>
            <h3 className="bg-[#274c85] px-2.5 py-1.5 text-[9px] font-bold tracking-[.12em] text-white">
              SHIP TO
            </h3>
            <div className="min-h-[74px] px-2.5 py-2 text-[10px] leading-[1.65]">
              <p className="font-semibold text-slate-800">
                {company.name || "Your company"} · Receiving
              </p>
              <p className="whitespace-pre-line">
                {shippingAddress || company.address || "Add a ship-to address"}
              </p>
              {shipDate && <p>Required by: {prettyDate(shipDate)}</p>}
              {shipVia && <p>Ship via: {shipVia}</p>}
            </div>
          </div>
        )}
        {isQuote && (
          <div>
            <h3 className="bg-[#274c85] px-2.5 py-1.5 text-[9px] font-bold tracking-[.12em] text-white">
              PREPARED BY
            </h3>
            <div className="min-h-[74px] px-2.5 py-2 text-[10px] leading-[1.65]">
              <p className="font-semibold text-slate-800">
                {salesperson || company.name || "Your company"}
              </p>
              {terms && <p>Terms: {terms}</p>}
            </div>
          </div>
        )}
      </section>

      {(isPo || (isInvoice && (salesperson || fob || terms))) && (
        <div className="mb-4 grid grid-cols-2 border border-slate-300 text-[9px] sm:grid-cols-4">
          {[
            [isPo ? "REQUISITIONER" : "SALESPERSON", salesperson],
            ["SHIP DATE", shipDate ? prettyDate(shipDate) : ""],
            ["FOB / SHIP VIA", [fob, shipVia].filter(Boolean).join(" · ")],
            [isPo ? "SHIPPING TERMS" : "TERMS", terms],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-r border-slate-300 last:border-r-0"
            >
              <div className="bg-[#274c85] px-2 py-1 font-bold text-white">
                {label}
              </div>
              <div className="min-h-6 px-2 py-1 text-slate-700">
                {value || "—"}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden border border-slate-300">
        <table className="w-full border-collapse text-left text-[10px]">
          <thead className="bg-[#274c85] text-[9px] font-bold tracking-wide text-white">
            <tr>
              <th className="w-[48%] px-2.5 py-2">DESCRIPTION</th>
              <th className="px-2 py-2 text-right">UNIT PRICE</th>
              <th className="px-2 py-2 text-right">QTY</th>
              <th className="px-2 py-2 text-center">TAXED</th>
              <th className="px-2.5 py-2 text-right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {safeLines.map((line, index) => (
              <tr
                key={`${line.description}-${index}`}
                className={index % 2 ? "bg-slate-100" : "bg-white"}
              >
                <td className="border-b border-slate-200 px-2.5 py-2">
                  {line.description || "Item or service"}
                </td>
                <td className="border-b border-slate-200 px-2 py-2 text-right">
                  {money(line.unitPrice)}
                </td>
                <td className="border-b border-slate-200 px-2 py-2 text-right">
                  {line.quantity}
                </td>
                <td className="border-b border-slate-200 px-2 py-2 text-center">
                  {line.taxable ? `${taxRate}%` : "—"}
                </td>
                <td className="border-b border-slate-200 px-2.5 py-2 text-right">
                  {money(line.quantity * line.unitPrice)}
                </td>
              </tr>
            ))}
            {Array.from(
              { length: Math.max(0, 3 - safeLines.length) },
              (_, index) => (
                <tr key={`spacer-${index}`} className="h-7 even:bg-slate-50">
                  <td className="border-b border-slate-200" colSpan={5} />
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-4 grid gap-5 sm:grid-cols-[1.2fr_.8fr]">
        <div>
          <h3 className="bg-[#274c85] px-2.5 py-1.5 text-[9px] font-bold tracking-[.12em] text-white">
            {isQuote
              ? "TERMS AND CONDITIONS"
              : "COMMENTS OR SPECIAL INSTRUCTIONS"}
          </h3>
          <p className="min-h-[76px] whitespace-pre-wrap border border-t-0 border-slate-300 px-2.5 py-2 text-[9px] leading-4 text-slate-600">
            {terms ||
              (isQuote
                ? "Quote valid until the date shown above. Work begins after written acceptance."
                : "Thank you for your business. Please include the document number with your payment.")}
            {comments ? `\n${comments}` : ""}
          </p>
          {isQuote && (
            <div className="mt-4 border-b border-slate-400 pb-1 text-[9px] text-slate-500">
              Accepted by: ____________________________________
            </div>
          )}
        </div>
        <dl className="space-y-1.5 text-[10px]">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">SUBTOTAL</dt>
            <dd>{money(subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">TAX ({taxRate}%)</dt>
            <dd>{money(taxAmount)}</dd>
          </div>
          {shipping > 0 && (
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">SHIPPING</dt>
              <dd>{money(shipping)}</dd>
            </div>
          )}
          {other > 0 && (
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">OTHER</dt>
              <dd>{money(other)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2 border-t-2 border-[#274c85] bg-[#eaf1fb] px-2 py-2 text-[12px] font-bold text-[#173765]">
            <dt>TOTAL</dt>
            <dd>{money(total)}</dd>
          </div>
        </dl>
      </section>
      <footer className="mt-8 border-t border-slate-200 pt-3 text-center text-[9px] leading-4 text-slate-500">
        Contact {company.name || "your company"}
        {company.email ? ` · ${company.email}` : ""}
        {company.phone ? ` · ${company.phone}` : ""}
        <p className="mt-1 font-semibold italic text-[#274c85]">
          Thank you for your business.
        </p>
      </footer>
    </article>
  );
}

export function DocumentPreview({
  document,
  account,
  company,
  onClose,
  notify,
}: {
  document: ComposedDocument;
  account?: DocumentAccount;
  company: CompanyProfile;
  onClose: () => void;
  notify: (message: string, tone?: "success" | "warning" | "info") => void;
}) {
  const downloadPdf = async () => {
    try {
      const pdf = await createDocumentPdf(
        document,
        account,
        document.issuer ?? company,
      );
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = pdfFilename(document);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify(`${pdfFilename(document)} downloaded.`, "success");
    } catch (error) {
      console.error("Unable to generate document PDF.", error);
      notify("Unable to generate the PDF. Please try again.", "warning");
    }
  };

  const sharePdf = async () => {
    try {
      const pdf = await createDocumentPdf(
        document,
        account,
        document.issuer ?? company,
      );
      const blob = pdf.output("blob");
      const file = new File([blob], pdfFilename(document), {
        type: "application/pdf",
      });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          title: `${document.kind} ${document.number}`,
          text: document.title,
          files: [file],
        });
        notify("PDF shared.", "success");
        return;
      }
      downloadPdf();
      notify(
        "Sharing is unavailable here; the PDF was downloaded instead.",
        "info",
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Unable to share document PDF.", error);
      notify("Unable to share the PDF. You can still download it.", "warning");
    }
  };

  const lines = document.lines?.length
    ? document.lines
    : [
        {
          description: document.title,
          quantity: 1,
          unitPrice: document.subtotal,
          taxable: true,
        },
      ];
  return (
    <div className="document-preview-overlay fixed inset-0 z-[75] overflow-y-auto bg-[#050a11]/85 p-3 sm:p-6">
      <div className="no-print mx-auto mb-3 flex max-w-[760px] items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold tracking-[.16em] text-cyan-300">
            DOCUMENT PREVIEW
          </p>
          <p className="mt-1 text-[12px] font-semibold text-white">
            {document.number}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void downloadPdf()}
            className="inline-flex items-center gap-1.5 rounded bg-cyan-400 px-3 py-2 text-[10px] font-semibold text-[#062d31] hover:bg-cyan-300"
          >
            <Download size={13} />
            Download PDF
          </button>
          <button
            onClick={() => void sharePdf()}
            className="inline-flex items-center gap-1.5 rounded border border-slate-700 px-3 py-2 text-[10px] font-medium text-slate-200 hover:bg-slate-800"
          >
            <Share2 size={13} />
            Share PDF
          </button>
          <button
            onClick={onClose}
            className="rounded border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
            aria-label="Close preview"
          >
            <X size={15} />
          </button>
        </div>
      </div>
      <DocumentPaper
        document={document}
        account={account}
        company={document.issuer ?? company}
        lines={lines}
        issueDate={document.issueDate ?? document.dueDate}
        title={document.title}
        number={document.number}
        validUntil={document.validUntil ?? document.dueDate}
        customerReference={document.customerReference ?? ""}
        salesperson={document.salesperson ?? ""}
        shipDate={document.shipDate ?? ""}
        shippingAddress={document.shippingAddress ?? ""}
        shipVia={document.shipVia ?? ""}
        fob={document.fob ?? ""}
        terms={document.terms ?? ""}
        comments={document.comments ?? ""}
        shipping={document.shipping ?? 0}
        other={document.other ?? 0}
        taxRate={document.taxRate}
      />
    </div>
  );
}

export function DocumentComposer({
  accounts,
  company,
  kind,
  nextNumber,
  onKindChange,
  onClose,
  onSave,
  onCompanyChange,
  notify,
}: Props) {
  const [accountId, setAccountId] = useState("");
  const [title, setTitle] = useState("");
  const [issueDate, setIssueDate] = useState(localDate());
  const [dueDate, setDueDate] = useState(dateAfter(30));
  const [validUntil, setValidUntil] = useState(dateAfter(30));
  const [customerReference, setCustomerReference] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [shipDate, setShipDate] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shipVia, setShipVia] = useState("");
  const [fob, setFob] = useState("");
  const [terms, setTerms] = useState("");
  const [comments, setComments] = useState("");
  const [taxRate, setTaxRate] = useState(18);
  const [shipping, setShipping] = useState(0);
  const [other, setOther] = useState(0);
  const [lines, setLines] = useState<DocumentLine[]>([
    { description: "", quantity: 1, unitPrice: 0, taxable: true },
  ]);
  const account = accounts.find((item) => item.id === accountId);
  const totals = useMemo(() => {
    const subtotal = lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    );
    const taxable = lines
      .filter((line) => line.taxable)
      .reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const taxAmount = Math.round(taxable * taxRate) / 100;
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount + shipping + other,
    };
  }, [lines, taxRate, shipping, other]);

  const updateLine = (index: number, update: Partial<DocumentLine>) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...update } : line,
      ),
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !account ||
      !title.trim() ||
      lines.some(
        (line) =>
          !line.description.trim() || line.quantity <= 0 || line.unitPrice < 0,
      )
    ) {
      notify(
        "Choose an account and enter a description and valid details for every line item.",
        "warning",
      );
      return;
    }
    const document: ComposedDocument = {
      id: crypto.randomUUID(),
      number: nextNumber,
      kind,
      accountId,
      title: title.trim(),
      subtotal: totals.subtotal,
      taxRate,
      taxAmount: totals.taxAmount,
      total: totals.total,
      issueDate,
      dueDate: kind === "Quotation" ? validUntil : dueDate,
      validUntil: kind === "Quotation" ? validUntil : undefined,
      customerReference: customerReference.trim(),
      salesperson: salesperson.trim(),
      shipDate: isPo ? dueDate : shipDate,
      shippingAddress: shippingAddress.trim(),
      shipVia: shipVia.trim(),
      fob: fob.trim(),
      terms: terms.trim(),
      comments: comments.trim(),
      shipping,
      other,
      lines,
      issuer: company,
      status: kind === "Quotation" ? "Draft" : "Pending",
    };
    onSave(document);
  };

  const isQuote = kind === "Quotation";
  const isPo = kind === "Purchase Order";
  const isInvoice = kind === "Invoice" || kind === "Tax Invoice";

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-[#050a11]/85 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold tracking-[.16em] text-cyan-300">
              ACCOUNTS · DOCUMENT STUDIO
            </p>
            <h2 className="mt-1 text-[18px] font-semibold text-white">
              Create a document
            </h2>
            <p className="mt-1 text-[10px] text-slate-500">
              Build a polished, itemized business document with live totals and
              print preview.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
            aria-label="Close document studio"
          >
            <X size={16} />
          </button>
        </div>
        <form
          onSubmit={submit}
          className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(480px,.9fr)]"
        >
          <section className="control-surface rounded-[8px] p-4 sm:p-5">
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                DOCUMENT TYPE
                <select
                  value={kind}
                  onChange={(event) =>
                    onKindChange(event.target.value as DocumentKind)
                  }
                  className={inputClass}
                >
                  {documentKinds.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <div className="rounded border border-cyan-400/20 bg-cyan-400/[.06] px-3 py-2">
                <p className="text-[9px] font-semibold tracking-wider text-cyan-300">
                  NEXT AUTO-NUMBER
                </p>
                <p className="mono mt-1 text-[14px] font-semibold text-white">
                  {nextNumber}
                </p>
                <p className="mt-0.5 text-[9px] text-slate-500">
                  Sequential by type and calendar year
                </p>
              </div>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                {isPo ? "VENDOR" : "CUSTOMER / ACCOUNT"}
                <select
                  required
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Choose a contact</option>
                  {accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.kind} · {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                {isPo ? "ORDER TITLE" : "DOCUMENT TITLE"}
                <input
                  required
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Annual maintenance service"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                DOCUMENT DATE
                <input
                  required
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                  className={inputClass}
                />
              </label>
              {isQuote ? (
                <label className={labelClass}>
                  QUOTE VALID UNTIL
                  <input
                    required
                    type="date"
                    min={issueDate}
                    value={validUntil}
                    onChange={(event) => setValidUntil(event.target.value)}
                    className={inputClass}
                  />
                </label>
              ) : (
                <label className={labelClass}>
                  {isPo ? "REQUIRED SHIP DATE" : "PAYMENT DUE DATE"}
                  <input
                    required
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className={inputClass}
                  />
                </label>
              )}
              <label className={labelClass}>
                CUSTOMER / REFERENCE NO.
                <input
                  maxLength={60}
                  value={customerReference}
                  onChange={(event) => setCustomerReference(event.target.value)}
                  placeholder="Optional reference"
                  className={inputClass}
                />
              </label>
              {isInvoice && (
                <label className={labelClass}>
                  SHIP DATE
                  <input
                    type="date"
                    value={shipDate}
                    onChange={(event) => setShipDate(event.target.value)}
                    className={inputClass}
                  />
                </label>
              )}
              <label className={labelClass}>
                {isPo ? "REQUISITIONER" : "SALESPERSON / PREPARED BY"}
                <input
                  maxLength={80}
                  value={salesperson}
                  onChange={(event) => setSalesperson(event.target.value)}
                  placeholder="Name or department"
                  className={inputClass}
                />
              </label>
              {(isPo || isInvoice) && (
                <>
                  <label className={labelClass}>
                    SHIP VIA
                    <input
                      maxLength={80}
                      value={shipVia}
                      onChange={(event) => setShipVia(event.target.value)}
                      placeholder="Courier, freight, or delivery"
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    SHIP-TO ADDRESS
                    <textarea
                      rows={2}
                      maxLength={240}
                      value={shippingAddress}
                      onChange={(event) =>
                        setShippingAddress(event.target.value)
                      }
                      placeholder={
                        isPo
                          ? "Delivery address"
                          : "Leave blank to use the account address"
                      }
                      className="mt-1.5 w-full rounded border border-slate-700 bg-[#0b1522] px-2.5 py-2 text-[10px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400/70"
                    />
                  </label>
                </>
              )}
              {isPo && (
                <label className={labelClass}>
                  FOB / SHIPPING TERMS
                  <input
                    maxLength={80}
                    value={fob}
                    onChange={(event) => setFob(event.target.value)}
                    placeholder="Delivery terms"
                    className={inputClass}
                  />
                </label>
              )}
            </div>

            <details className="mb-4 rounded border border-slate-800 bg-[#0c1725]">
              <summary className="cursor-pointer px-3 py-2.5 text-[10px] font-medium text-slate-300">
                Your business details
                <span className="ml-2 text-[9px] text-slate-600">
                  Shown on the printable document
                </span>
              </summary>
              <div className="grid gap-3 border-t border-slate-800 p-3 sm:grid-cols-2">
                <label className={labelClass}>
                  COMPANY NAME
                  <input
                    required
                    maxLength={120}
                    value={company.name}
                    onChange={(event) =>
                      onCompanyChange({ ...company, name: event.target.value })
                    }
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  GSTIN
                  <input
                    maxLength={20}
                    value={company.gstin}
                    onChange={(event) =>
                      onCompanyChange({ ...company, gstin: event.target.value })
                    }
                    placeholder="Optional tax registration number"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  BUSINESS ADDRESS
                  <textarea
                    rows={2}
                    maxLength={240}
                    value={company.address}
                    onChange={(event) =>
                      onCompanyChange({
                        ...company,
                        address: event.target.value,
                      })
                    }
                    placeholder="Street, city, state, PIN"
                    className="mt-1.5 w-full rounded border border-slate-700 bg-[#0b1522] px-2.5 py-2 text-[10px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400/70"
                  />
                </label>
                <div className="grid gap-3">
                  <label className={labelClass}>
                    BUSINESS EMAIL
                    <input
                      type="email"
                      maxLength={160}
                      value={company.email}
                      onChange={(event) =>
                        onCompanyChange({
                          ...company,
                          email: event.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    PHONE / WEBSITE
                    <input
                      maxLength={160}
                      value={[company.phone, company.website]
                        .filter(Boolean)
                        .join(" · ")}
                      onChange={(event) => {
                        const [phone = "", website = ""] =
                          event.target.value.split(" · ");
                        onCompanyChange({ ...company, phone, website });
                      }}
                      placeholder="Phone · website"
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>
            </details>

            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-[11px] font-semibold text-slate-200">
                  Line items
                </h3>
                <p className="mt-0.5 text-[9px] text-slate-500">
                  Add products or services; totals update as you type.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setLines((current) => [
                    ...current,
                    {
                      description: "",
                      quantity: 1,
                      unitPrice: 0,
                      taxable: true,
                    },
                  ])
                }
                className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1.5 text-[9px] text-cyan-300 hover:bg-slate-800"
              >
                <Plus size={12} />
                Add item
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((line, index) => (
                <div
                  key={`line-${index}`}
                  className="grid gap-2 rounded border border-slate-800 bg-[#0c1725] p-2 sm:grid-cols-[minmax(130px,1fr)_78px_110px_70px_32px] sm:items-end"
                >
                  <label className={labelClass}>
                    DESCRIPTION
                    <input
                      required
                      maxLength={120}
                      value={line.description}
                      onChange={(event) =>
                        updateLine(index, { description: event.target.value })
                      }
                      placeholder="Product or service"
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    QTY
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(index, {
                          quantity: Number(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    UNIT PRICE (₹)
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice || ""}
                      onChange={(event) =>
                        updateLine(index, {
                          unitPrice: Number(event.target.value),
                        })
                      }
                      placeholder="0.00"
                      className={inputClass}
                    />
                  </label>
                  <label className="flex h-9 items-center gap-1.5 text-[9px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={line.taxable}
                      onChange={(event) =>
                        updateLine(index, { taxable: event.target.checked })
                      }
                      className="accent-cyan-400"
                    />
                    Taxable
                  </label>
                  <button
                    type="button"
                    disabled={lines.length === 1}
                    onClick={() =>
                      setLines((current) =>
                        current.filter((_, lineIndex) => lineIndex !== index),
                      )
                    }
                    className="mb-0.5 rounded p-2 text-slate-600 hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-30"
                    aria-label={`Remove line ${index + 1}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className={labelClass}>
                GST RATE (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(event) =>
                    setTaxRate(
                      Math.max(0, Math.min(100, Number(event.target.value))),
                    )
                  }
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                SHIPPING (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shipping || ""}
                  onChange={(event) =>
                    setShipping(Math.max(0, Number(event.target.value)))
                  }
                  placeholder="0.00"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                OTHER CHARGES (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={other || ""}
                  onChange={(event) =>
                    setOther(Math.max(0, Number(event.target.value)))
                  }
                  placeholder="0.00"
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                {isQuote ? "TERMS AND CONDITIONS" : "PAYMENT / SHIPPING TERMS"}
                <textarea
                  rows={3}
                  maxLength={500}
                  value={terms}
                  onChange={(event) => setTerms(event.target.value)}
                  placeholder={
                    isQuote
                      ? "Quote validity, acceptance, and delivery terms..."
                      : "Payment due in 30 days..."
                  }
                  className="mt-1.5 w-full rounded border border-slate-700 bg-[#0b1522] px-2.5 py-2 text-[10px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400/70"
                />
              </label>
              <label className={labelClass}>
                COMMENTS / SPECIAL INSTRUCTIONS
                <textarea
                  rows={3}
                  maxLength={500}
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  placeholder="Optional note for the recipient"
                  className="mt-1.5 w-full rounded border border-slate-700 bg-[#0b1522] px-2.5 py-2 text-[10px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400/70"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-col-reverse justify-between gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:items-center">
              <p className="max-w-md text-[9px] leading-4 text-slate-500">
                Number is assigned when you save. This demo saves to this
                browser and does not file GST or send payments.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-slate-700 px-3 py-2 text-[10px] text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!accounts.length || totals.subtotal <= 0}
                  className="inline-flex items-center gap-1.5 rounded bg-cyan-400 px-3 py-2 text-[10px] font-semibold text-[#062d31] hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FilePlus2 size={13} />
                  Save {kind}
                </button>
              </div>
            </div>
          </section>

          <aside className="xl:sticky xl:top-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-[11px] font-semibold text-slate-200">
                  Live document preview
                </h3>
                <p className="mt-0.5 text-[9px] text-slate-500">
                  What the recipient will receive
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[.06] px-2 py-1 text-[8px] text-emerald-300">
                <Check size={10} />
                LIVE
              </span>
            </div>
            <div className="max-h-[calc(100dvh-130px)] overflow-auto rounded border border-slate-700/70">
              <DocumentPaper
                account={account}
                lines={lines}
                issueDate={issueDate}
                title={title}
                number={nextNumber}
                validUntil={isQuote ? validUntil : dueDate}
                customerReference={customerReference}
                salesperson={salesperson}
                shipDate={isPo ? dueDate : shipDate}
                shippingAddress={shippingAddress}
                shipVia={shipVia}
                fob={fob}
                terms={terms}
                comments={comments}
                shipping={shipping}
                other={other}
                taxRate={taxRate}
                document={{
                  id: "preview",
                  number: nextNumber,
                  kind,
                  accountId,
                  title,
                  subtotal: totals.subtotal,
                  taxRate,
                  taxAmount: totals.taxAmount,
                  total: totals.total,
                  dueDate: isQuote ? validUntil : dueDate,
                  status: "Draft",
                }}
                company={company}
              />
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
