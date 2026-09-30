import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Download,
  FilePlus2,
  Printer,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

export type DocumentKind =
  "Invoice" | "Quotation" | "Purchase Order" | "Tax Invoice";

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

type Notify = (message: string, tone?: "success" | "warning" | "info") => void;

const kinds: DocumentKind[] = [
  "Invoice",
  "Quotation",
  "Purchase Order",
  "Tax Invoice",
];

const numberPrefixes: Record<DocumentKind, string> = {
  Invoice: "INV",
  Quotation: "QUO",
  "Purchase Order": "PO",
  "Tax Invoice": "TAX",
};

const defaultLine: DocumentLine = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxable: true,
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

function displayDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function nextDocumentNumber(
  kind: DocumentKind,
  documents: Pick<ComposedDocument, "kind" | "number">[],
  year = new Date().getFullYear(),
) {
  const prefix = numberPrefixes[kind];
  const pattern =
    kind === "Quotation"
      ? new RegExp(`^(?:QUO|QT)-${year}-(\\d+)$`)
      : new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const next =
    documents.reduce((max, document) => {
      if (document.kind !== kind) return max;
      const match = pattern.exec(document.number);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

const inputClass =
  "mt-1 block h-9 w-full rounded border border-slate-700 bg-[#0b1522] px-2.5 text-[11px] text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30";
const labelClass = "block text-[10px] font-medium text-slate-400";

export function DocumentComposer({
  accounts,
  documents,
  company,
  onCompanyChange,
  kind,
  onKindChange,
  onClose,
  onSave,
}: {
  accounts: DocumentAccount[];
  documents: Pick<ComposedDocument, "kind" | "number">[];
  company: CompanyProfile;
  onCompanyChange: (company: CompanyProfile) => void;
  kind: DocumentKind;
  onKindChange: (kind: DocumentKind) => void;
  onClose: () => void;
  onSave: (document: ComposedDocument) => void;
}) {
  const [accountId, setAccountId] = useState("");
  const [issueDate, setIssueDate] = useState(localDate());
  const [dueDate, setDueDate] = useState(
    dateAfter(kind === "Quotation" ? 30 : 14),
  );
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
  const [lines, setLines] = useState<DocumentLine[]>([{ ...defaultLine }]);
  const [error, setError] = useState("");

  const account = accounts.find((item) => item.id === accountId);
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    [lines],
  );
  const taxableSubtotal = useMemo(
    () =>
      lines
        .filter((line) => line.taxable)
        .reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    [lines],
  );
  const taxAmount =
    Math.round((taxableSubtotal * taxRate + Number.EPSILON) * 100) / 100;
  const total =
    Math.round((subtotal + taxAmount + shipping + other + Number.EPSILON) * 100) /
    100;
  const isPurchaseOrder = kind === "Purchase Order";
  const isQuotation = kind === "Quotation";
  const recipient = isPurchaseOrder ? "Vendor / supplier" : "Customer";
  const nextNumber = nextDocumentNumber(
    kind,
    documents,
    Number(issueDate.slice(0, 4)),
  );

  const changeKind = (next: DocumentKind) => {
    onKindChange(next);
    setDueDate(dateAfter(next === "Quotation" ? 30 : 14));
    setAccountId("");
  };

  const updateLine = (index: number, patch: Partial<DocumentLine>) => {
    setLines((current) =>
      current.map((line, row) =>
        row === index ? { ...line, ...patch } : line,
      ),
    );
  };

  const saveDocument = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account) {
      setError(`Choose a ${recipient.toLowerCase()} from your saved contacts.`);
      return;
    }
    if (lines.length === 0 || lines.some((line) => !line.description.trim())) {
      setError("Add a description for each line item before saving.");
      return;
    }
    if (
      subtotal <= 0 ||
      lines.some(
        (line) =>
          !Number.isFinite(line.quantity) ||
          !Number.isFinite(line.unitPrice) ||
          line.quantity <= 0 ||
          line.unitPrice < 0,
      )
    ) {
      setError("Enter a quantity above zero and a valid item price.");
      return;
    }

    onSave({
      id: crypto.randomUUID(),
      number: nextNumber,
      kind,
      accountId,
      title: lines[0]?.description.trim() ?? kind,
      subtotal,
      taxRate,
      taxAmount,
      total,
      dueDate,
      status: isQuotation ? "Draft" : "Pending",
      issueDate,
      validUntil: isQuotation ? dueDate : undefined,
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
      lines: lines.map((line) => ({
        ...line,
        description: line.description.trim(),
      })),
      issuer: company,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-[#050a11]/80 p-2 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={saveDocument}
        className="mx-auto my-2 max-w-[1180px] overflow-hidden rounded-xl border border-slate-700/80 bg-[#0b1421] shadow-2xl sm:my-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-composer-title"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-800 bg-[#0b1421]/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden rounded-lg bg-cyan-400/10 p-2 text-cyan-300 sm:block">
              <FilePlus2 size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[9px] font-semibold tracking-[.14em] text-cyan-300">
                <Sparkles size={11} /> DOCUMENT STUDIO
              </div>
              <h2
                id="document-composer-title"
                className="mt-0.5 truncate text-[15px] font-semibold text-slate-100 sm:text-[17px]"
              >
                Create {kind}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close document form"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-100"
          >
            <X size={17} />
          </button>
        </header>

        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
          <div className="space-y-4">
            <section className="rounded-lg border border-slate-800 bg-[#101b2a] p-3.5 sm:p-4">
              <h3 className="text-[11px] font-semibold text-slate-200">
                Your business
              </h3>
              <p className="mb-3 mt-0.5 text-[9px] text-slate-500">
                These details are saved and printed as your company header.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Company name
                  <input
                    required
                    value={company.name}
                    onChange={(event) =>
                      onCompanyChange({ ...company, name: event.target.value })
                    }
                    maxLength={140}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  GSTIN
                  <input
                    value={company.gstin}
                    onChange={(event) =>
                      onCompanyChange({ ...company, gstin: event.target.value })
                    }
                    maxLength={20}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Address
                  <input
                    value={company.address}
                    onChange={(event) =>
                      onCompanyChange({
                        ...company,
                        address: event.target.value,
                      })
                    }
                    maxLength={240}
                    placeholder="Business address"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Email
                  <input
                    type="email"
                    value={company.email}
                    onChange={(event) =>
                      onCompanyChange({ ...company, email: event.target.value })
                    }
                    maxLength={160}
                    placeholder="accounts@company.com"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Phone
                  <input
                    type="tel"
                    value={company.phone}
                    onChange={(event) =>
                      onCompanyChange({ ...company, phone: event.target.value })
                    }
                    maxLength={40}
                    placeholder="+91"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Website
                  <input
                    value={company.website}
                    onChange={(event) =>
                      onCompanyChange({
                        ...company,
                        website: event.target.value,
                      })
                    }
                    maxLength={160}
                    placeholder="www.company.com"
                    className={inputClass}
                  />
                </label>
              </div>
            </section>
            <section className="rounded-lg border border-slate-800 bg-[#101b2a] p-3.5 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-[11px] font-semibold text-slate-200">
                    Document details
                  </h3>
                  <p className="mt-0.5 text-[9px] text-slate-500">
                    Numbered automatically by type and calendar year.
                  </p>
                </div>
                <span className="rounded-md border border-cyan-400/20 bg-cyan-400/[.07] px-2 py-1 font-mono text-[10px] font-medium text-cyan-200">
                  {nextNumber}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Document type
                  <select
                    value={kind}
                    onChange={(event) =>
                      changeKind(event.target.value as DocumentKind)
                    }
                    className={inputClass}
                  >
                    {kinds.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  {recipient}
                  <select
                    required
                    value={accountId}
                    onChange={(event) => {
                      setAccountId(event.target.value);
                      const selected = accounts.find(
                        (item) => item.id === event.target.value,
                      );
                      setShippingAddress(selected?.address ?? "");
                    }}
                    className={inputClass}
                  >
                    <option value="">Select a saved contact</option>
                    {accounts
                      .filter((item) =>
                        isPurchaseOrder
                          ? item.kind !== "Client"
                          : item.kind === "Client",
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.kind}
                        </option>
                      ))}
                  </select>
                </label>
                <label className={labelClass}>
                  Issue date
                  <input
                    required
                    type="date"
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  {isQuotation ? "Valid until" : "Due date"}
                  <input
                    required
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  {isPurchaseOrder
                    ? "Requisition / reference"
                    : "Customer reference"}
                  <input
                    value={customerReference}
                    onChange={(event) =>
                      setCustomerReference(event.target.value)
                    }
                    placeholder="Optional reference number"
                    maxLength={80}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  {isPurchaseOrder
                    ? "Requested by"
                    : "Prepared by / salesperson"}
                  <input
                    value={salesperson}
                    onChange={(event) => setSalesperson(event.target.value)}
                    placeholder="Optional"
                    maxLength={100}
                    className={inputClass}
                  />
                </label>
                {(kind === "Invoice" ||
                  kind === "Purchase Order" ||
                  kind === "Tax Invoice") && (
                  <label className={labelClass}>
                    Ship date
                    <input
                      type="date"
                      value={shipDate}
                      onChange={(event) => setShipDate(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                )}
                {(kind === "Invoice" ||
                  kind === "Purchase Order" ||
                  kind === "Tax Invoice") && (
                  <label className={labelClass}>
                    Ship via
                    <input
                      value={shipVia}
                      onChange={(event) => setShipVia(event.target.value)}
                      placeholder="Carrier / delivery method"
                      maxLength={100}
                      className={inputClass}
                    />
                  </label>
                )}
                {isPurchaseOrder && (
                  <label className={labelClass}>
                    FOB / delivery terms
                    <input
                      value={fob}
                      onChange={(event) => setFob(event.target.value)}
                      placeholder="Optional"
                      maxLength={100}
                      className={inputClass}
                    />
                  </label>
                )}
              </div>
              <label className={`${labelClass} mt-3`}>
                Ship-to address
                <input
                  value={shippingAddress}
                  onChange={(event) => setShippingAddress(event.target.value)}
                  placeholder="Enter delivery address"
                  maxLength={240}
                  className={inputClass}
                />
              </label>
            </section>

            <section className="rounded-lg border border-slate-800 bg-[#101b2a] p-3.5 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-[11px] font-semibold text-slate-200">
                    Items and services
                  </h3>
                  <p className="mt-0.5 text-[9px] text-slate-500">
                    Add products or services and their quantity and unit price.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLines((current) => [...current, { ...defaultLine }])
                  }
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1.5 text-[9px] font-medium text-slate-200 hover:border-cyan-400/50 hover:text-cyan-200"
                >
                  <Plus size={12} /> Add item
                </button>
              </div>
              <div className="space-y-2">
                {lines.map((line, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(0,1fr)_64px_88px_28px] items-end gap-2 rounded-md border border-slate-800 bg-[#0b1522] p-2 sm:grid-cols-[minmax(0,1fr)_76px_112px_78px_30px]"
                  >
                    <label className={labelClass}>
                      Description
                      <input
                        required
                        value={line.description}
                        onChange={(event) =>
                          updateLine(index, { description: event.target.value })
                        }
                        placeholder="Product or service"
                        maxLength={140}
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Qty
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
                      Unit price
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
                        placeholder="₹ 0.00"
                        className={inputClass}
                      />
                    </label>
                    <label className="hidden items-center gap-1.5 pb-2 text-[9px] text-slate-400 sm:flex">
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
                          current.filter((_, row) => row !== index),
                        )
                      }
                      aria-label={`Remove item ${index + 1}`}
                      className="mb-1 rounded p-1.5 text-slate-600 hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                    <label className="col-span-4 flex items-center gap-1.5 text-[9px] text-slate-400 sm:hidden">
                      <input
                        type="checkbox"
                        checked={line.taxable}
                        onChange={(event) =>
                          updateLine(index, { taxable: event.target.checked })
                        }
                        className="accent-cyan-400"
                      />
                      Include this item in GST calculation
                    </label>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-800 bg-[#101b2a] p-3.5 sm:p-4">
              <h3 className="mb-3 text-[11px] font-semibold text-slate-200">
                Notes and charges
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  GST / tax rate (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={(event) => setTaxRate(Number(event.target.value))}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Shipping (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shipping}
                    onChange={(event) =>
                      setShipping(Number(event.target.value))
                    }
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Other charges (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={other}
                    onChange={(event) => setOther(Number(event.target.value))}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Terms
                  <input
                    value={terms}
                    onChange={(event) => setTerms(event.target.value)}
                    placeholder="Payment, delivery, or quote terms"
                    maxLength={180}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className={`${labelClass} mt-3`}>
                Special instructions
                <textarea
                  rows={2}
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  placeholder="Add a note for the customer or supplier"
                  maxLength={500}
                  className="mt-1 block w-full resize-y rounded border border-slate-700 bg-[#0b1522] px-2.5 py-2 text-[11px] text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                />
              </label>
            </section>
          </div>

          <aside className="space-y-3 lg:sticky lg:top-[78px] lg:self-start">
            <section className="overflow-hidden rounded-lg border border-slate-700/80 bg-[#111e2e]">
              <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-3">
                <div>
                  <h3 className="text-[11px] font-semibold text-slate-100">
                    Live total
                  </h3>
                  <p className="mt-0.5 text-[9px] text-slate-500">
                    Updates as you edit items and tax.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[8px] font-semibold text-emerald-300">
                  LIVE
                </span>
              </div>
              <div className="space-y-2 p-3.5 text-[10px]">
                <AmountRow label="Subtotal" value={money(subtotal)} />
                <AmountRow
                  label={`GST · ${taxRate || 0}%`}
                  value={money(taxAmount)}
                />
                <AmountRow label="Shipping" value={money(shipping)} />
                <AmountRow label="Other" value={money(other)} />
                <div className="my-2 border-t border-slate-700" />
                <div className="flex items-center justify-between text-[12px] font-semibold text-slate-100">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>
            </section>
            <section className="rounded-lg border border-slate-800 bg-[#101b2a] p-3.5">
              <h3 className="mb-2 text-[10px] font-semibold text-slate-200">
                Before you save
              </h3>
              <ul className="space-y-1.5 text-[9px] leading-4 text-slate-500">
                <li>
                  ✓ Number is generated for{" "}
                  {new Date(issueDate || localDate()).getFullYear()} and
                  increases per document type.
                </li>
                <li>
                  ✓ Contact and item details appear on your printable document.
                </li>
                <li>
                  ✓ GST is estimated from taxable items; verify applicable tax
                  rules.
                </li>
              </ul>
            </section>
            {error && (
              <p
                role="alert"
                className="rounded-md border border-rose-400/20 bg-rose-400/[.07] px-3 py-2 text-[10px] text-rose-200"
              >
                {error}
              </p>
            )}
          </aside>
        </div>
        <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-800 bg-[#0b1421]/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[9px] text-slate-600">
            Preview, print, or save as PDF after creating this document.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-700 px-3 py-2 text-[10px] text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-cyan-400 px-3.5 py-2 text-[10px] font-semibold text-[#062d31] hover:bg-cyan-300"
            >
              <FilePlus2 size={13} /> Create {kind}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function AmountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-400">
      <span>{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
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
  notify: Notify;
}) {
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    window.document.body.classList.add("document-printing");
    return () => window.document.body.classList.remove("document-printing");
  }, []);
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
  const isPo = document.kind === "Purchase Order";
  const isQuote = document.kind === "Quotation";

  const downloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const right = width - margin;
      const navy: [number, number, number] = [30, 58, 100];
      const ink: [number, number, number] = [31, 41, 55];
      const gray: [number, number, number] = [100, 116, 139];
      let y = margin;
      const text = (
        value: string,
        x: number,
        top: number,
        maxWidth: number,
        size = 9,
        bold = false,
        color: [number, number, number] = ink,
      ) => {
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(size);
        pdf.setTextColor(...color);
        const wrapped = pdf.splitTextToSize(value || "—", maxWidth) as string[];
        pdf.text(wrapped, x, top);
        return Math.max(5, wrapped.length * size * 0.42);
      };

      text(company.name || "Your company", margin, y + 7, 100, 18, true, navy);
      let companyY = y + 13;
      for (const line of [
        company.address,
        company.gstin && `GSTIN: ${company.gstin}`,
        company.email,
        company.phone,
        company.website,
      ].filter(Boolean) as string[]) {
        companyY += text(line, margin, companyY, 85, 8, false, gray) + 1;
      }
      text(document.kind.toUpperCase(), right - 75, y + 8, 75, 17, true, navy);
      let metaY = y + 16;
      const meta: [string, string][] = [
        ["DOCUMENT NO.", document.number],
        ["ISSUE DATE", displayDate(document.issueDate)],
        [
          isQuote ? "VALID UNTIL" : isPo ? "SHIP DATE" : "DUE DATE",
          displayDate(
            isQuote
              ? document.validUntil
              : isPo
                ? document.shipDate
                : document.dueDate,
          ),
        ],
      ];
      if (document.customerReference) {
        meta.push(["REFERENCE", document.customerReference]);
      }
      for (const [label, value] of meta) {
        text(label, right - 75, metaY, 29, 7, true, gray);
        text(value, right - 44, metaY, 44, 8, true, ink);
        metaY += 6;
      }
      y = Math.max(companyY, metaY) + 7;
      pdf.setDrawColor(203, 213, 225);
      pdf.line(margin, y, right, y);
      y += 7;

      const gap = 8;
      const cardWidth = (width - margin * 2 - gap) / 2;
      const card = (label: string, x: number, top: number) => {
        pdf.setFillColor(...navy);
        pdf.roundedRect(x, top, cardWidth, 7, 1, 1, "F");
        text(label, x + 2, top + 4.8, cardWidth - 4, 7, true, [255, 255, 255]);
      };
      card(isPo ? "VENDOR" : isQuote ? "CUSTOMER" : "BILL TO", margin, y);
      card(isQuote ? "PREPARED BY" : "SHIP TO", margin + cardWidth + gap, y);
      let leftY = y + 12;
      for (const line of [
        account?.name,
        account?.contact && `Attn: ${account.contact}`,
        account?.address,
        account?.email,
        account?.phone,
      ].filter(Boolean) as string[]) {
        leftY += text(line, margin + 2, leftY, cardWidth - 4, 8) + 1;
      }
      let rightY = y + 12;
      for (const line of [
        ...(isQuote
          ? [document.salesperson || company.name, company.email, company.phone]
          : [
              document.shippingAddress ||
                (isPo ? company.address : account?.address),
              document.shipVia && `Ship via: ${document.shipVia}`,
              document.fob && `FOB: ${document.fob}`,
            ]),
      ].filter(Boolean) as string[]) {
        rightY +=
          text(line, margin + cardWidth + gap + 2, rightY, cardWidth - 4, 8) +
          1;
      }
      y = Math.max(leftY, rightY, y + 31) + 6;

      const drawHeader = () => {
        pdf.setFillColor(...navy);
        pdf.rect(margin, y, width - margin * 2, 8, "F");
        text("DESCRIPTION", margin + 2, y + 5.5, 82, 7, true, [255, 255, 255]);
        text("UNIT PRICE", 118, y + 5.5, 24, 7, true, [255, 255, 255]);
        text("QTY", 146, y + 5.5, 13, 7, true, [255, 255, 255]);
        text("GST", 163, y + 5.5, 12, 7, true, [255, 255, 255]);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255);
        pdf.text("AMOUNT", right - 2, y + 5.5, { align: "right" });
        y += 8;
      };
      const newPage = () => {
        pdf.addPage();
        y = margin;
        drawHeader();
      };
      drawHeader();
      lines.forEach((line, index) => {
        const description = pdf.splitTextToSize(
          line.description,
          79,
        ) as string[];
        const rowHeight = Math.max(9, description.length * 4 + 4);
        if (y + rowHeight > height - 38) newPage();
        if (index % 2 === 1) {
          pdf.setFillColor(245, 247, 250);
          pdf.rect(margin, y, width - margin * 2, rowHeight, "F");
        }
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, y + rowHeight, right, y + rowHeight);
        text(line.description, margin + 2, y + 5, 79, 8);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...ink);
        pdf.text(money(line.unitPrice).replace("₹", "INR "), 141, y + 5, {
          align: "right",
        });
        pdf.text(String(line.quantity), 158, y + 5, { align: "right" });
        pdf.text(line.taxable ? `${document.taxRate}%` : "—", 173, y + 5, {
          align: "right",
        });
        pdf.text(
          money(line.quantity * line.unitPrice).replace("₹", "INR "),
          right - 2,
          y + 5,
          { align: "right" },
        );
        y += rowHeight;
      });

      y += 5;
      const totalX = right - 68;
      const totalRow = (label: string, value: number, bold = false) => {
        text(label, totalX, y + 4, 38, 8, bold, gray);
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(bold ? 11 : 8);
        pdf.setTextColor(...(bold ? navy : ink));
        pdf.text(money(value).replace("₹", "INR "), right, y + 4, {
          align: "right",
        });
        y += bold ? 8 : 6;
      };
      totalRow("Subtotal", document.subtotal);
      totalRow(`GST (${document.taxRate}%)`, document.taxAmount);
      totalRow("Shipping", document.shipping ?? 0);
      if (document.other) totalRow("Other charges", document.other);
      pdf.setDrawColor(...navy);
      pdf.line(totalX, y, right, y);
      y += 2;
      totalRow("TOTAL", document.total, true);
      y += 4;

      for (const [label, value] of [
        ["TERMS", document.terms],
        ["NOTES / SPECIAL INSTRUCTIONS", document.comments],
      ] as const) {
        if (!value) continue;
        y += text(label, margin, y + 4, width - margin * 2, 8, true, navy);
        y += text(value, margin, y + 2, width - margin * 2, 8) + 3;
        if (y > height - 22) {
          pdf.addPage();
          y = margin;
        }
      }

      const pages = pdf.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) {
        pdf.setPage(page);
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, height - 13, right, height - 13);
        text(
          `${company.name || "Your company"} · ${document.number}`,
          margin,
          height - 8,
          130,
          7,
          false,
          gray,
        );
        pdf.setFontSize(7);
        pdf.setTextColor(...gray);
        pdf.text(`${page} / ${pages}`, right, height - 8, { align: "right" });
      }
      pdf.save(`${document.number.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`);
      notify("PDF downloaded.", "success");
    } catch (error) {
      console.error("Unable to create document PDF.", error);
      notify(
        "Could not create the PDF. Use Print and choose Save as PDF instead.",
        "warning",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="document-preview-overlay fixed inset-0 z-[75] overflow-y-auto bg-[#070d16]/90 p-2 backdrop-blur-sm sm:p-5">
      <div className="no-print mx-auto mb-3 flex max-w-[980px] flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-[#101b2a] p-3">
        <div className="flex items-center gap-2">
          <div className="rounded bg-cyan-400/10 p-2 text-cyan-300">
            <Printer size={15} />
          </div>
          <div>
            <h2 className="text-[11px] font-semibold text-slate-100">
              Document ready
            </h2>
            <p className="text-[9px] text-slate-500">
              {document.number} · {document.kind}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-[10px] font-medium text-slate-200 hover:bg-slate-800"
          >
            <Printer size={13} /> Print
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={() => void downloadPdf()}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan-400 px-3 py-2 text-[10px] font-semibold text-[#062d31] hover:bg-cyan-300 disabled:opacity-50"
          >
            <Download size={13} />
            {downloading ? "Preparing PDF…" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close preview"
          >
            <X size={15} />
          </button>
        </div>
      </div>
      <article className="document-print-surface mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-6 py-8 text-slate-800 shadow-2xl sm:px-[16mm] sm:py-[14mm]">
        <header className="flex flex-col justify-between gap-6 border-b-2 border-[#284a7d] pb-5 sm:flex-row">
          <div className="min-w-0">
            <div className="text-[20px] font-bold tracking-tight text-[#284a7d]">
              {company.name || "Your company"}
            </div>
            <div className="mt-2 space-y-0.5 text-[10px] leading-4 text-slate-600">
              {company.address && <p>{company.address}</p>}
              {company.gstin && (
                <p>
                  <strong>GSTIN:</strong> {company.gstin}
                </p>
              )}
              {company.email && <p>{company.email}</p>}
              {company.phone && <p>{company.phone}</p>}
              {company.website && <p>{company.website}</p>}
            </div>
          </div>
          <div className="sm:min-w-[205px] sm:text-right">
            <div className="text-[26px] font-bold tracking-[.06em] text-[#284a7d]">
              {document.kind.toUpperCase()}
            </div>
            <p className="mt-1 font-mono text-[12px] font-semibold text-slate-700">
              {document.number}
            </p>
            <div className="mt-2 space-y-1 text-[10px] text-slate-600">
              <p>
                <span className="mr-2 text-slate-400">DATE</span>
                {displayDate(document.issueDate)}
              </p>
              <p>
                <span className="mr-2 text-slate-400">
                  {isQuote ? "VALID UNTIL" : isPo ? "SHIP DATE" : "DUE DATE"}
                </span>
                {displayDate(
                  isQuote
                    ? document.validUntil
                    : isPo
                      ? document.shipDate
                      : document.dueDate,
                )}
              </p>
              {document.customerReference && (
                <p>
                  <span className="mr-2 text-slate-400">REFERENCE</span>
                  {document.customerReference}
                </p>
              )}
            </div>
          </div>
        </header>
        <section className="my-6 grid gap-4 sm:grid-cols-2">
          <DocumentAddress
            title={isPo ? "VENDOR" : isQuote ? "CUSTOMER" : "BILL TO"}
            account={account}
          />
          <DocumentAddress
            title={isQuote ? "PREPARED BY" : "SHIP TO"}
            lines={
              isQuote
                ? ([
                    document.salesperson || company.name,
                    company.email,
                    company.phone,
                  ].filter(Boolean) as string[])
                : ([
                    document.shippingAddress ||
                      (isPo ? company.address : account?.address),
                    document.shipVia && `Ship via: ${document.shipVia}`,
                    document.fob && `FOB: ${document.fob}`,
                  ].filter(Boolean) as string[])
            }
          />
        </section>
        {(document.salesperson ||
          document.shipVia ||
          document.fob ||
          document.terms) && (
          <div className="mb-5 grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4">
            {[
              ["PREPARED BY", document.salesperson],
              ["SHIP VIA", document.shipVia],
              ["FOB", document.fob],
              [isPo ? "SHIPPING TERMS" : "TERMS", document.terms],
            ]
              .filter((entry) => entry[1])
              .map(([label, value]) => (
                <div key={label} className="bg-white px-2 py-2">
                  <div className="text-[8px] font-semibold tracking-wide text-slate-400">
                    {label}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-700">{value}</div>
                </div>
              ))}
          </div>
        )}
        <div className="overflow-hidden rounded border border-slate-200">
          <table className="w-full border-collapse text-left text-[10px]">
            <thead className="bg-[#284a7d] text-white">
              <tr>
                <th className="px-3 py-2.5 font-semibold">DESCRIPTION</th>
                <th className="px-2 py-2.5 text-right font-semibold">
                  UNIT PRICE
                </th>
                <th className="px-2 py-2.5 text-right font-semibold">QTY</th>
                <th className="px-2 py-2.5 text-right font-semibold">GST</th>
                <th className="px-3 py-2.5 text-right font-semibold">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr
                  key={index}
                  className={index % 2 ? "bg-slate-50" : "bg-white"}
                >
                  <td className="border-b border-slate-100 px-3 py-2.5 font-medium text-slate-700">
                    {line.description}
                  </td>
                  <td className="border-b border-slate-100 px-2 py-2.5 text-right">
                    {money(line.unitPrice)}
                  </td>
                  <td className="border-b border-slate-100 px-2 py-2.5 text-right">
                    {line.quantity}
                  </td>
                  <td className="border-b border-slate-100 px-2 py-2.5 text-right">
                    {line.taxable ? `${document.taxRate}%` : "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2.5 text-right font-medium">
                    {money(line.quantity * line.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-[280px] space-y-2 text-[10px]">
            <PreviewAmount label="Subtotal" value={document.subtotal} />
            <PreviewAmount
              label={`GST (${document.taxRate}%)`}
              value={document.taxAmount}
            />
            <PreviewAmount label="Shipping" value={document.shipping ?? 0} />
            <PreviewAmount label="Other charges" value={document.other ?? 0} />
            <div className="border-t-2 border-[#284a7d] pt-2">
              <PreviewAmount label="TOTAL" value={document.total} strong />
            </div>
          </div>
        </div>
        {(document.terms || document.comments) && (
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {document.terms && (
              <div>
                <h3 className="border-b border-slate-200 pb-1.5 text-[9px] font-bold tracking-wide text-[#284a7d]">
                  TERMS & CONDITIONS
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-[9px] leading-4 text-slate-600">
                  {document.terms}
                </p>
              </div>
            )}
            {document.comments && (
              <div>
                <h3 className="border-b border-slate-200 pb-1.5 text-[9px] font-bold tracking-wide text-[#284a7d]">
                  NOTES / SPECIAL INSTRUCTIONS
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-[9px] leading-4 text-slate-600">
                  {document.comments}
                </p>
              </div>
            )}
          </div>
        )}
        <footer className="mt-12 border-t border-slate-200 pt-3 text-center text-[9px] text-slate-500">
          {company.email && (
            <p>
              Questions? Contact {company.email}
              {company.phone ? ` · ${company.phone}` : ""}
            </p>
          )}
          <p className="mt-1 font-medium text-[#284a7d]">
            {isQuote
              ? "Thank you for considering our proposal."
              : isPo
                ? "Thank you for your order."
                : "Thank you for your business."}
          </p>
        </footer>
      </article>
    </div>
  );
}

function DocumentAddress({
  title,
  account,
  lines,
}: {
  title: string;
  account?: DocumentAccount;
  lines?: string[];
}) {
  const content =
    lines ??
    ([
      account?.name,
      account?.contact && `Attn: ${account.contact}`,
      account?.address,
      account?.email,
      account?.phone,
    ].filter(Boolean) as string[]);
  return (
    <div className="overflow-hidden rounded border border-slate-200">
      <h3 className="bg-[#284a7d] px-3 py-1.5 text-[9px] font-bold tracking-wide text-white">
        {title}
      </h3>
      <div className="min-h-[74px] space-y-0.5 px-3 py-2.5 text-[10px] leading-4 text-slate-600">
        {content.length ? (
          content.map((line, index) => (
            <p
              key={index}
              className={index === 0 ? "font-semibold text-slate-800" : ""}
            >
              {line}
            </p>
          ))
        ) : (
          <p className="text-slate-400">Address not provided</p>
        )}
      </div>
    </div>
  );
}

function PreviewAmount({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${strong ? "text-[12px] font-bold text-[#284a7d]" : "text-slate-600"}`}
    >
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  );
}
