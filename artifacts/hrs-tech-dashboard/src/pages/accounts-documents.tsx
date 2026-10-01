import { useState, type FormEvent } from "react";
import { Download, Plus, Printer, Trash2, X } from "lucide-react";

export const accountDocumentKinds = [
  "Invoice",
  "Quotation",
  "Purchase Order",
  "Tax Invoice",
] as const;

export type AccountDocumentKind = (typeof accountDocumentKinds)[number];

export type DocumentLineItem = {
  id: string;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  taxRate: number;
};

export type AccountDocument = {
  id: string;
  number: string;
  kind: AccountDocumentKind;
  accountId: string;
  title: string;
  issueDate: string;
  dueDate: string;
  validUntil: string;
  shipToName: string;
  shipToAddress: string;
  shipToContact: string;
  salesPerson: string;
  poNumber: string;
  shipDate: string;
  shipVia: string;
  fob: string;
  terms: string;
  requisitioner: string;
  shippingTerms: string;
  notes: string;
  termsAndConditions: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyGstin: string;
  lines: DocumentLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  shipping: number;
  other: number;
  total: number;
  status: "Draft" | "Pending" | "Due soon" | "Paid";
};

export type DocumentContact = {
  id: string;
  kind: "Supplier" | "Vendor" | "Client";
  name: string;
  address: string;
  email: string;
  contact: string;
  phone: string;
};

export type AccountDocumentValues = Omit<
  AccountDocument,
  "id" | "number" | "status"
>;

type DocumentFormProps = {
  kind: AccountDocumentKind;
  documents: Pick<AccountDocument, "number" | "kind" | "issueDate">[];
  accounts: DocumentContact[];
  companyDefaults: Pick<
    AccountDocument,
    | "companyName"
    | "companyAddress"
    | "companyPhone"
    | "companyEmail"
    | "companyGstin"
  >;
  document?: AccountDocument;
  onCancel: () => void;
  onSubmit: (values: AccountDocumentValues) => void;
};

type DocumentPreviewProps = {
  document: AccountDocument;
  account?: DocumentContact;
  onClose: () => void;
  notify: (message: string, tone?: "success" | "warning" | "info") => void;
};

const prefixes: Record<AccountDocumentKind, string> = {
  Invoice: "INV",
  Quotation: "QT",
  "Purchase Order": "PO",
  "Tax Invoice": "TAX",
};

export function nextDocumentNumber(
  kind: AccountDocumentKind,
  date: string,
  documents: Pick<AccountDocument, "number" | "kind" | "issueDate">[],
) {
  const year = date.slice(0, 4);
  const prefix = prefixes[kind];
  const sequence = documents.reduce((highest, document) => {
    const match = new RegExp(`^${prefix}-${year}-(\\d+)$`).exec(
      document.number,
    );
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 0);
  return `${prefix}-${year}-${String(sequence + 1).padStart(4, "0")}`;
}

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateLabel(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

function makeLine(): DocumentLineItem {
  return {
    id: crypto.randomUUID(),
    itemCode: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxable: true,
    taxRate: 18,
  };
}

const fieldClass =
  "mt-1 block h-9 w-full rounded border border-slate-700 bg-[#0b1522] px-2.5 text-[11px] text-slate-200 outline-none focus:border-cyan-400";
const fieldLabelClass = "block text-[10px] font-medium text-slate-400";

export function AccountDocumentForm({
  kind,
  documents,
  accounts,
  companyDefaults,
  document,
  onCancel,
  onSubmit,
}: DocumentFormProps) {
  const today = localDate();
  const [accountId, setAccountId] = useState(
    document?.accountId ??
      accounts.find((account) =>
        kind === "Purchase Order"
          ? account.kind !== "Client"
          : account.kind === "Client",
      )?.id ??
      accounts[0]?.id ??
      "",
  );
  const [issueDate, setIssueDate] = useState(document?.issueDate ?? today);
  const [title, setTitle] = useState(document?.title ?? "");
  const [dueDate, setDueDate] = useState(document?.dueDate ?? today);
  const [validUntil, setValidUntil] = useState(document?.validUntil ?? "");
  const [shipToName, setShipToName] = useState(document?.shipToName ?? "");
  const [shipToAddress, setShipToAddress] = useState(
    document?.shipToAddress ?? "",
  );
  const [shipToContact, setShipToContact] = useState(
    document?.shipToContact ?? "",
  );
  const [salesPerson, setSalesPerson] = useState(document?.salesPerson ?? "");
  const [poNumber, setPoNumber] = useState(document?.poNumber ?? "");
  const [shipDate, setShipDate] = useState(document?.shipDate ?? "");
  const [shipVia, setShipVia] = useState(document?.shipVia ?? "");
  const [fob, setFob] = useState(document?.fob ?? "");
  const [terms, setTerms] = useState(document?.terms ?? "Due on receipt");
  const [requisitioner, setRequisitioner] = useState(
    document?.requisitioner ?? "",
  );
  const [shippingTerms, setShippingTerms] = useState(
    document?.shippingTerms ?? "",
  );
  const [notes, setNotes] = useState(document?.notes ?? "");
  const [termsAndConditions, setTermsAndConditions] = useState(
    document?.termsAndConditions ??
      "Please review the items and contact us with any questions.",
  );
  const [companyName, setCompanyName] = useState(
    document?.companyName ?? companyDefaults.companyName,
  );
  const [companyAddress, setCompanyAddress] = useState(
    document?.companyAddress ?? companyDefaults.companyAddress,
  );
  const [companyPhone, setCompanyPhone] = useState(
    document?.companyPhone ?? companyDefaults.companyPhone,
  );
  const [companyEmail, setCompanyEmail] = useState(
    document?.companyEmail ?? companyDefaults.companyEmail,
  );
  const [companyGstin, setCompanyGstin] = useState(
    document?.companyGstin ?? companyDefaults.companyGstin,
  );
  const [shipping, setShipping] = useState(document?.shipping ?? 0);
  const [other, setOther] = useState(document?.other ?? 0);
  const [lines, setLines] = useState<DocumentLineItem[]>(
    document?.lines?.length
      ? document.lines.map((line) => ({ ...line }))
      : [makeLine()],
  );
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);
  const number =
    document?.number ?? nextDocumentNumber(kind, issueDate, documents);

  const activeAccount = accounts.find((account) => account.id === accountId);
  const subtotal = lines.reduce(
    (sum, line) =>
      sum + Math.max(0, line.quantity) * Math.max(0, line.unitPrice),
    0,
  );
  const taxAmount = lines.reduce(
    (sum, line) =>
      sum +
      (line.taxable
        ? (Math.max(0, line.quantity) *
            Math.max(0, line.unitPrice) *
            Math.max(0, line.taxRate)) /
          100
        : 0),
    0,
  );
  const total =
    subtotal + taxAmount + Math.max(0, shipping) + Math.max(0, other);
  const defaultShipName = shipToName || activeAccount?.name || "";
  const defaultShipAddress = shipToAddress || activeAccount?.address || "";
  const defaultShipContact =
    shipToContact || activeAccount?.contact || activeAccount?.phone || "";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeAccount || !issueDate || !title.trim() || lines.length === 0) {
      return;
    }
    if (lines.some((line) => !line.description.trim() || line.quantity <= 0)) {
      return;
    }
    onSubmit({
      kind,
      accountId,
      title: title.trim(),
      issueDate,
      dueDate,
      validUntil,
      shipToName,
      shipToAddress,
      shipToContact,
      salesPerson,
      poNumber,
      shipDate,
      shipVia,
      fob,
      terms,
      requisitioner,
      shippingTerms,
      notes,
      termsAndConditions,
      companyName: companyName.trim(),
      companyAddress: companyAddress.trim(),
      companyPhone: companyPhone.trim(),
      companyEmail: companyEmail.trim(),
      companyGstin: companyGstin.trim(),
      lines: lines.map((line) => ({ ...line })),
      subtotal: Number(subtotal.toFixed(2)),
      taxRate:
        subtotal === 0 ? 0 : Number(((taxAmount / subtotal) * 100).toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      shipping: Number(Math.max(0, shipping).toFixed(2)),
      other: Number(Math.max(0, other).toFixed(2)),
      total: Number(total.toFixed(2)),
    });
  };

  const updateLine = (
    id: string,
    field: keyof DocumentLineItem,
    value: string | number | boolean,
  ) => {
    setLines((current) =>
      current.map((line) =>
        line.id === id ? { ...line, [field]: value } : line,
      ),
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#050a11]/80 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <form
        onSubmit={submit}
        className="control-surface my-auto w-full max-w-5xl rounded-[9px] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accounts-document-title"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[9px] border-b border-slate-800 bg-[#101b2a] px-4 py-3">
          <div>
            <div className="text-[9px] font-semibold tracking-[.16em] text-cyan-300">
              {document ? "EDIT DOCUMENT" : "DOCUMENT WORKSPACE"}
            </div>
            <h2
              id="accounts-document-title"
              className="mt-1 text-[16px] font-semibold text-slate-100"
            >
              {document ? `Edit ${kind}` : `Create ${kind}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-5 p-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="space-y-4">
            <section className="grid gap-3 rounded border border-slate-800 bg-[#0d1725] p-3 sm:grid-cols-2">
              <label className={fieldLabelClass}>
                Document number
                <input
                  value={document?.number ?? number}
                  readOnly
                  className={`${fieldClass} mono cursor-not-allowed font-semibold text-cyan-200`}
                />
              </label>
              <label className={fieldLabelClass}>
                Document date
                <input
                  required
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className={fieldLabelClass}>
                {kind === "Purchase Order"
                  ? "Vendor / supplier"
                  : "Bill to / customer"}
                <select
                  required
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  className={fieldClass}
                >
                  <option value="" disabled>
                    Select an account
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.kind} · {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={fieldLabelClass}>
                {kind === "Purchase Order" ? "Required by" : "Due date"}
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className={`${fieldLabelClass} sm:col-span-2`}>
                Subject / project
                <input
                  required
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Project or service description"
                  className={fieldClass}
                />
              </label>
            </section>

            <section className="rounded border border-slate-800 bg-[#0d1725] p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-[11px] font-semibold text-slate-200">
                    Items and services
                  </h3>
                  <p className="mt-0.5 text-[9px] text-slate-600">
                    Add line items; taxable rows calculate GST automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLines((current) => [...current, makeLine()])
                  }
                  className="inline-flex items-center gap-1 rounded border border-cyan-400/30 px-2 py-1.5 text-[9px] font-medium text-cyan-200 hover:bg-cyan-400/10"
                >
                  <Plus size={12} />
                  Add item
                </button>
              </div>
              <div className="space-y-2">
                {lines.map((line, index) => (
                  <div
                    key={line.id}
                    className="grid gap-2 rounded border border-slate-800/80 bg-[#0a1421] p-2 sm:grid-cols-[1fr_2fr_76px_100px_82px_32px]"
                  >
                    <label className={fieldLabelClass}>
                      Item / SKU
                      <input
                        value={line.itemCode}
                        maxLength={40}
                        onChange={(event) =>
                          updateLine(line.id, "itemCode", event.target.value)
                        }
                        placeholder="Optional"
                        className={fieldClass}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      Description
                      <input
                        required
                        value={line.description}
                        maxLength={160}
                        onChange={(event) =>
                          updateLine(line.id, "description", event.target.value)
                        }
                        placeholder={`Item ${index + 1}`}
                        className={fieldClass}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      Qty
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(
                            line.id,
                            "quantity",
                            Number(event.target.value),
                          )
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      Unit price (₹)
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(event) =>
                          updateLine(
                            line.id,
                            "unitPrice",
                            Number(event.target.value),
                          )
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      GST %
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={line.taxRate}
                        disabled={!line.taxable}
                        onChange={(event) =>
                          updateLine(
                            line.id,
                            "taxRate",
                            Number(event.target.value),
                          )
                        }
                        className={fieldClass}
                      />
                    </label>
                    <div className="flex items-end justify-center gap-1">
                      <label
                        className="flex h-9 items-center gap-1 text-[9px] text-slate-500"
                        title="Apply GST to this item"
                      >
                        <input
                          type="checkbox"
                          checked={line.taxable}
                          onChange={(event) =>
                            updateLine(line.id, "taxable", event.target.checked)
                          }
                          aria-label={`GST taxable item ${index + 1}`}
                        />
                        GST
                      </label>
                      <button
                        type="button"
                        disabled={lines.length === 1}
                        onClick={() =>
                          setLines((current) =>
                            current.filter((item) => item.id !== line.id),
                          )
                        }
                        className="mb-2 rounded p-1 text-slate-600 hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-30"
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="text-right text-[9px] text-slate-500 sm:col-span-6">
                      Line total:{" "}
                      <span className="font-semibold text-slate-200">
                        {money(line.quantity * line.unitPrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-3 rounded border border-slate-800 bg-[#0d1725] p-3 sm:grid-cols-2">
              {kind === "Purchase Order" ? (
                <>
                  <TextField
                    label="Requisitioner"
                    value={requisitioner}
                    onChange={setRequisitioner}
                  />
                  <TextField
                    label="Ship via"
                    value={shipVia}
                    onChange={setShipVia}
                  />
                  <TextField label="FOB" value={fob} onChange={setFob} />
                  <TextField
                    label="Shipping terms"
                    value={shippingTerms}
                    onChange={setShippingTerms}
                  />
                  <TextField
                    label="Ship date"
                    type="date"
                    value={shipDate}
                    onChange={setShipDate}
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="Ship to name"
                    value={shipToName}
                    onChange={setShipToName}
                    placeholder={activeAccount?.name}
                  />
                  <TextField
                    label="Ship to contact / phone"
                    value={shipToContact}
                    onChange={setShipToContact}
                    placeholder={activeAccount?.contact || activeAccount?.phone}
                  />
                  <TextField
                    label="Ship to address"
                    value={shipToAddress}
                    onChange={setShipToAddress}
                    placeholder={activeAccount?.address}
                  />
                  <TextField
                    label="Salesperson"
                    value={salesPerson}
                    onChange={setSalesPerson}
                  />
                </>
              )}
              {kind === "Quotation" && (
                <>
                  <TextField
                    label="Valid until"
                    type="date"
                    value={validUntil}
                    onChange={setValidUntil}
                  />
                  <TextField
                    label="Customer PO number"
                    value={poNumber}
                    onChange={setPoNumber}
                  />
                </>
              )}
              {kind === "Invoice" || kind === "Tax Invoice" ? (
                <>
                  <TextField
                    label="Customer PO number"
                    value={poNumber}
                    onChange={setPoNumber}
                  />
                  <TextField
                    label="Ship date"
                    type="date"
                    value={shipDate}
                    onChange={setShipDate}
                  />
                  <TextField
                    label="Ship via"
                    value={shipVia}
                    onChange={setShipVia}
                  />
                  <TextField label="FOB" value={fob} onChange={setFob} />
                  <TextField
                    label="Payment terms"
                    value={terms}
                    onChange={setTerms}
                  />
                </>
              ) : null}
              <label className={`${fieldLabelClass} sm:col-span-2`}>
                {kind === "Quotation"
                  ? "Terms and conditions"
                  : "Comments / special instructions"}
                <textarea
                  value={kind === "Quotation" ? termsAndConditions : notes}
                  onChange={(event) =>
                    kind === "Quotation"
                      ? setTermsAndConditions(event.target.value)
                      : setNotes(event.target.value)
                  }
                  rows={3}
                  maxLength={1000}
                  className="mt-1 block w-full rounded border border-slate-700 bg-[#0b1522] p-2.5 text-[10px] text-slate-200 outline-none focus:border-cyan-400"
                />
              </label>
            </section>
          </div>

          <aside className="space-y-3">
            <section className="rounded border border-cyan-400/20 bg-cyan-400/[.04] p-3">
              <h3 className="text-[11px] font-semibold text-slate-100">
                Live total
              </h3>
              <div className="mt-3 space-y-2 text-[10px]">
                <AmountRow label="Subtotal" value={money(subtotal)} />
                <AmountRow label="GST" value={money(taxAmount)} />
                <label className="grid grid-cols-[1fr_110px] items-center gap-2 text-slate-500">
                  Shipping (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shipping}
                    onChange={(event) =>
                      setShipping(Number(event.target.value))
                    }
                    className="h-8 rounded border border-slate-700 bg-[#0b1522] px-2 text-right text-slate-200"
                  />
                </label>
                <label className="grid grid-cols-[1fr_110px] items-center gap-2 text-slate-500">
                  Other (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={other}
                    onChange={(event) => setOther(Number(event.target.value))}
                    className="h-8 rounded border border-slate-700 bg-[#0b1522] px-2 text-right text-slate-200"
                  />
                </label>
                <div className="flex justify-between border-t border-slate-700 pt-2 text-[13px] font-bold text-cyan-200">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>
            </section>

            <section className="rounded border border-slate-800 bg-[#0d1725] p-3">
              <button
                type="button"
                onClick={() => setShowCompanyDetails((visible) => !visible)}
                className="flex w-full items-center justify-between text-left text-[10px] font-semibold text-slate-200"
              >
                Your company details
                <span className="text-[9px] font-normal text-cyan-300">
                  {showCompanyDetails ? "Hide" : "Edit"}
                </span>
              </button>
              {showCompanyDetails && (
                <div className="mt-3 space-y-2.5">
                  <TextField
                    label="Company name"
                    value={companyName}
                    onChange={setCompanyName}
                    required
                  />
                  <TextField
                    label="Street / city / postal address"
                    value={companyAddress}
                    onChange={setCompanyAddress}
                  />
                  <TextField
                    label="Phone"
                    value={companyPhone}
                    onChange={setCompanyPhone}
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={companyEmail}
                    onChange={setCompanyEmail}
                  />
                  <TextField
                    label="GSTIN"
                    value={companyGstin}
                    onChange={setCompanyGstin}
                  />
                </div>
              )}
              {!showCompanyDetails && (
                <p className="mt-2 text-[9px] leading-4 text-slate-500">
                  {companyName || "Company name"} · Edit to add address, phone,
                  email, and GSTIN to the printed document.
                </p>
              )}
            </section>

            {kind !== "Purchase Order" && (
              <section className="rounded border border-slate-800 bg-[#0d1725] p-3">
                <h3 className="text-[10px] font-semibold text-slate-200">
                  Ship to
                </h3>
                <p className="mt-2 text-[9px] leading-4 text-slate-500">
                  {defaultShipName || "Same as selected account"}
                  <br />
                  {defaultShipAddress || "Address not provided"}
                  <br />
                  {defaultShipContact || "Contact not provided"}
                </p>
              </section>
            )}
          </aside>
        </div>
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 rounded-b-[9px] border-t border-slate-800 bg-[#101b2a] px-4 py-3">
          <p className="text-[9px] text-slate-600">
            GST totals are estimates; verify tax treatment before issuing.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded border border-slate-700 px-3 py-2 text-[10px] text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-cyan-400 px-4 py-2 text-[10px] font-semibold text-[#062d31] hover:bg-cyan-300"
            >
              {document ? "Save changes" : `Create ${kind}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className={fieldLabelClass}>
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
    </label>
  );
}

function AmountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-500">
      <span>{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}

export function AccountDocumentPreview({
  document,
  account,
  onClose,
  notify,
}: DocumentPreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const subtotal =
    document.lines?.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    ) ?? document.subtotal;
  const tax =
    document.lines?.reduce(
      (sum, line) =>
        sum +
        (line.taxable
          ? (line.quantity * line.unitPrice * line.taxRate) / 100
          : 0),
      0,
    ) ?? document.taxAmount;
  const billName = account?.name ?? "Account";
  const billAddress = account?.address ?? "";

  const downloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 16;
      const right = pageWidth - margin;
      const navy: [number, number, number] = [30, 58, 110];
      const ink: [number, number, number] = [31, 41, 55];
      const muted: [number, number, number] = [100, 116, 139];
      let y = 18;

      const write = (
        value: string,
        x: number,
        top: number,
        maxWidth: number,
        size = 8,
        bold = false,
        color: [number, number, number] = ink,
        align: "left" | "right" = "left",
      ) => {
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(size);
        pdf.setTextColor(color[0], color[1], color[2]);
        const lines = pdf.splitTextToSize(value || "—", maxWidth) as string[];
        pdf.text(lines, x, top, { align });
        return top + Math.max(lines.length, 1) * (size * 0.48);
      };

      const title =
        document.kind === "Purchase Order"
          ? "PURCHASE ORDER"
          : document.kind === "Quotation"
            ? "QUOTATION"
            : document.kind.toUpperCase();
      y = write(
        document.companyName || "Company Name",
        margin,
        y,
        95,
        17,
        true,
        navy,
      );
      if (document.companyAddress) {
        y = write(document.companyAddress, margin, y + 2, 90, 8, false, muted);
      }
      const contactLine = [document.companyPhone, document.companyEmail]
        .filter(Boolean)
        .join("  ·  ");
      if (contactLine)
        y = write(contactLine, margin, y + 1, 90, 8, false, muted);
      if (document.companyGstin) {
        y = write(
          `GSTIN: ${document.companyGstin}`,
          margin,
          y + 1,
          90,
          8,
          false,
          muted,
        );
      }
      write(title, right, 23, 90, 18, true, navy, "right");
      write(document.number, right, 31, 90, 10, true, ink, "right");
      write(
        `DATE  ${dateLabel(document.issueDate)}`,
        right,
        37,
        90,
        8,
        false,
        muted,
        "right",
      );
      if (document.kind === "Quotation") {
        write(
          `VALID UNTIL  ${dateLabel(document.validUntil)}`,
          right,
          42,
          90,
          8,
          false,
          muted,
          "right",
        );
      } else {
        write(
          `DUE DATE  ${dateLabel(document.dueDate)}`,
          right,
          42,
          90,
          8,
          false,
          muted,
          "right",
        );
      }
      y = Math.max(y, 49);
      pdf.setDrawColor(203, 213, 225);
      pdf.line(margin, y, right, y);
      y += 7;

      const address = (
        label: string,
        name: string,
        details: string[],
        x: number,
      ) => {
        pdf.setFillColor(...navy);
        pdf.roundedRect(x, y, 85, 7, 1, 1, "F");
        write(label, x + 2, y + 4.8, 80, 7, true, [255, 255, 255]);
        let addressY = y + 13;
        for (const line of [name, ...details].filter(Boolean)) {
          addressY =
            write(line, x + 2, addressY, 80, 8, line === name, ink) + 1;
        }
        return addressY;
      };

      const accountDetails = [
        billAddress,
        account?.contact ? `Attn: ${account.contact}` : "",
        account?.phone ?? "",
        account?.email ?? "",
      ];
      const shipDetails = [
        document.shipToAddress || billAddress,
        document.shipToContact || account?.contact || "",
        account?.phone ?? "",
      ];
      const leftEnd = address(
        document.kind === "Purchase Order"
          ? "VENDOR"
          : document.kind === "Quotation"
            ? "CUSTOMER"
            : "BILL TO",
        billName,
        accountDetails,
        margin,
      );
      const rightEnd = address(
        "SHIP TO",
        document.shipToName || billName,
        shipDetails,
        margin + 93,
      );
      y = Math.max(leftEnd, rightEnd) + 5;

      const metadata =
        document.kind === "Purchase Order"
          ? [
              ["REQUISITIONER", document.requisitioner],
              ["SHIP VIA", document.shipVia],
              ["FOB", document.fob],
              ["SHIPPING TERMS", document.shippingTerms],
              ["REQUIRED BY", dateLabel(document.dueDate)],
            ]
          : [
              ["SALES PERSON", document.salesPerson],
              ["P.O. #", document.poNumber],
              ["SHIP DATE", dateLabel(document.shipDate)],
              ["SHIP VIA", document.shipVia],
              ["TERMS", document.terms],
            ];
      if (document.kind !== "Quotation") {
        const cellWidth = (pageWidth - margin * 2) / metadata.length;
        metadata.forEach(([label, value], index) => {
          const x = margin + index * cellWidth;
          pdf.setFillColor(...navy);
          pdf.rect(x, y, cellWidth, 7, "F");
          write(
            label,
            x + 1.5,
            y + 4.8,
            cellWidth - 3,
            6,
            true,
            [255, 255, 255],
          );
          write(value || "—", x + 1.5, y + 12, cellWidth - 3, 7, false, ink);
        });
        y += 20;
      }

      const drawTableHeader = () => {
        pdf.setFillColor(...navy);
        pdf.rect(margin, y, pageWidth - margin * 2, 8, "F");
        write("ITEM", margin + 2, y + 5.5, 20, 7, true, [255, 255, 255]);
        write(
          "DESCRIPTION",
          margin + 24,
          y + 5.5,
          80,
          7,
          true,
          [255, 255, 255],
        );
        write(
          "QTY",
          margin + 132,
          y + 5.5,
          12,
          7,
          true,
          [255, 255, 255],
          "right",
        );
        write(
          "UNIT PRICE",
          margin + 157,
          y + 5.5,
          20,
          7,
          true,
          [255, 255, 255],
          "right",
        );
        write(
          "GST",
          margin + 169,
          y + 5.5,
          12,
          7,
          true,
          [255, 255, 255],
          "right",
        );
        write("AMOUNT", right, y + 5.5, 25, 7, true, [255, 255, 255], "right");
        y += 8;
      };
      drawTableHeader();

      for (const [index, line] of (document.lines ?? []).entries()) {
        const description = pdf.splitTextToSize(
          line.description || "—",
          79,
        ) as string[];
        const rowHeight = Math.max(8, description.length * 4 + 4);
        if (y + rowHeight > pageHeight - 28) {
          pdf.addPage();
          y = margin;
          drawTableHeader();
        }
        if (index % 2 === 1) {
          pdf.setFillColor(245, 247, 250);
          pdf.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
        }
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, y + rowHeight, right, y + rowHeight);
        write(line.itemCode || "—", margin + 2, y + 5, 20, 7);
        write(line.description, margin + 24, y + 5, 79, 7);
        write(
          String(line.quantity),
          margin + 132,
          y + 5,
          12,
          7,
          false,
          ink,
          "right",
        );
        write(
          money(line.unitPrice).replace("₹", "INR "),
          margin + 157,
          y + 5,
          20,
          7,
          false,
          ink,
          "right",
        );
        write(
          line.taxable ? `${line.taxRate}%` : "—",
          margin + 169,
          y + 5,
          12,
          7,
          false,
          ink,
          "right",
        );
        write(
          money(line.quantity * line.unitPrice).replace("₹", "INR "),
          right,
          y + 5,
          27,
          7,
          false,
          ink,
          "right",
        );
        y += rowHeight;
      }

      if (y + 58 > pageHeight - 18) {
        pdf.addPage();
        y = margin;
      }
      y += 7;
      if (document.notes || document.termsAndConditions) {
        const termsText =
          document.kind === "Quotation"
            ? document.termsAndConditions
            : document.notes;
        write(
          document.kind === "Quotation"
            ? "TERMS AND CONDITIONS"
            : "COMMENTS / INSTRUCTIONS",
          margin,
          y,
          95,
          8,
          true,
          navy,
        );
        const noteEnd = write(termsText, margin, y + 5, 95, 8, false, ink);
        y = Math.max(y + 10, noteEnd + 3);
      }
      const totalRows = [
        ["SUBTOTAL", subtotal],
        ["GST", tax],
        ["SHIPPING", document.shipping],
        ["OTHER", document.other],
      ] as const;
      let totalsY = y;
      for (const [label, value] of totalRows) {
        write(label, right - 55, totalsY, 27, 8, false, muted);
        write(
          money(value).replace("₹", "INR "),
          right,
          totalsY,
          45,
          8,
          false,
          ink,
          "right",
        );
        totalsY += 5;
      }
      pdf.setDrawColor(...navy);
      pdf.line(right - 58, totalsY, right, totalsY);
      write("TOTAL", right - 55, totalsY + 6, 28, 10, true, navy);
      write(
        money(subtotal + tax + document.shipping + document.other).replace(
          "₹",
          "INR ",
        ),
        right,
        totalsY + 6,
        45,
        10,
        true,
        navy,
        "right",
      );

      const pageCount = pdf.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        pdf.setPage(pageNumber);
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, pageHeight - 13, right, pageHeight - 13);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(...muted);
        pdf.text(document.number, margin, pageHeight - 8);
        pdf.text(`${pageNumber} / ${pageCount}`, right, pageHeight - 8, {
          align: "right",
        });
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
    <div className="document-preview-overlay fixed inset-0 z-[80] flex flex-col items-center overflow-y-auto bg-[#080f19]/90 p-3 sm:p-6">
      <div className="document-preview-toolbar sticky top-0 z-10 mb-3 flex w-full max-w-[210mm] items-center justify-between rounded border border-slate-700 bg-[#111e2e] px-3 py-2">
        <div>
          <div className="text-[10px] font-semibold text-slate-200">
            Print preview
          </div>
          <div className="text-[9px] text-slate-500">
            Use “Save as PDF” in your print dialog to download a PDF.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void downloadPdf()}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded border border-slate-600 px-3 py-2 text-[10px] font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60"
            data-testid="button-download-account-pdf"
          >
            <Download size={13} />
            {downloading ? "Preparing PDF…" : "Download PDF"}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded bg-cyan-400 px-3 py-2 text-[10px] font-semibold text-[#062d31] hover:bg-cyan-300"
          >
            <Printer size={13} />
            Print / Save PDF
          </button>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close preview"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <article className="document-print-sheet w-full max-w-[210mm] bg-white p-8 text-slate-900 shadow-2xl sm:p-12">
        <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
          <div className="max-w-[60%]">
            <div className="text-[22px] font-bold tracking-tight">
              {document.companyName || "Company Name"}
            </div>
            <p className="mt-2 whitespace-pre-line text-[10px] leading-4 text-slate-600">
              {document.companyAddress || "Company address"}
              {document.companyPhone ? `\nPhone: ${document.companyPhone}` : ""}
              {document.companyEmail ? `\nEmail: ${document.companyEmail}` : ""}
              {document.companyGstin ? `\nGSTIN: ${document.companyGstin}` : ""}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[27px] font-bold tracking-wide text-blue-700">
              {document.kind === "Purchase Order"
                ? "PURCHASE ORDER"
                : document.kind === "Quotation"
                  ? "QUOTATION"
                  : document.kind.toUpperCase()}
            </div>
            <div className="mt-2 space-y-1 text-[10px]">
              <p>
                <span className="mr-3 text-slate-500">NUMBER</span>
                <strong>{document.number}</strong>
              </p>
              <p>
                <span className="mr-3 text-slate-500">DATE</span>
                <strong>{dateLabel(document.issueDate)}</strong>
              </p>
              {(document.kind === "Invoice" ||
                document.kind === "Tax Invoice") && (
                <p>
                  <span className="mr-3 text-slate-500">DUE DATE</span>
                  <strong>{dateLabel(document.dueDate)}</strong>
                </p>
              )}
              {document.kind === "Quotation" && (
                <p>
                  <span className="mr-3 text-slate-500">VALID UNTIL</span>
                  <strong>{dateLabel(document.validUntil)}</strong>
                </p>
              )}
            </div>
          </div>
        </header>

        <section className="my-5 grid grid-cols-2 gap-5 text-[10px]">
          <AddressBlock
            title={
              document.kind === "Purchase Order"
                ? "VENDOR"
                : document.kind === "Quotation"
                  ? "CUSTOMER"
                  : "BILL TO"
            }
            name={billName}
            address={billAddress}
            contact={account?.contact}
            phone={account?.phone}
            email={account?.email}
          />
          <AddressBlock
            title="SHIP TO"
            name={document.shipToName || billName}
            address={document.shipToAddress || billAddress}
            contact={document.shipToContact || account?.contact}
            phone={document.shipToContact || account?.phone}
          />
        </section>

        {(document.kind === "Purchase Order" ||
          document.kind === "Invoice" ||
          document.kind === "Tax Invoice") && (
          <section className="mb-4 grid grid-cols-5 gap-px border border-slate-300 bg-slate-300 text-[9px]">
            {(document.kind === "Purchase Order"
              ? [
                  ["REQUISITIONER", document.requisitioner],
                  ["SHIP VIA", document.shipVia],
                  ["FOB", document.fob],
                  ["SHIPPING TERMS", document.shippingTerms],
                  ["REQUIRED BY", dateLabel(document.dueDate)],
                ]
              : [
                  ["SALES PERSON", document.salesPerson],
                  ["P.O. #", document.poNumber],
                  ["SHIP DATE", dateLabel(document.shipDate)],
                  ["SHIP VIA", document.shipVia],
                  ["TERMS", document.terms],
                ]
            ).map(([label, value]) => (
              <div key={label} className="min-h-12 bg-white">
                <div className="bg-blue-900 px-2 py-1 font-bold tracking-wide text-white">
                  {label}
                </div>
                <div className="px-2 py-2">{value || "—"}</div>
              </div>
            ))}
          </section>
        )}

        {document.kind === "Quotation" && (
          <div className="mb-3 text-[10px] text-slate-600">
            Prepared by {document.salesPerson || "—"}
          </div>
        )}

        <table className="w-full border-collapse text-left text-[10px]">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="border border-blue-900 px-2 py-2">ITEM #</th>
              <th className="border border-blue-900 px-2 py-2">DESCRIPTION</th>
              <th className="border border-blue-900 px-2 py-2 text-right">
                QTY
              </th>
              <th className="border border-blue-900 px-2 py-2 text-right">
                UNIT PRICE
              </th>
              <th className="border border-blue-900 px-2 py-2 text-right">
                GST
              </th>
              <th className="border border-blue-900 px-2 py-2 text-right">
                AMOUNT
              </th>
            </tr>
          </thead>
          <tbody>
            {document.lines?.map((line) => (
              <tr key={line.id} className="even:bg-slate-100">
                <td className="border border-slate-300 px-2 py-2">
                  {line.itemCode || "—"}
                </td>
                <td className="border border-slate-300 px-2 py-2">
                  {line.description}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right">
                  {line.quantity}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right">
                  {money(line.unitPrice)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right">
                  {line.taxable ? `${line.taxRate}%` : "—"}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right">
                  {money(line.quantity * line.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-5 flex items-start justify-between gap-6">
          <div className="max-w-[56%] flex-1">
            <div className="bg-blue-900 px-2 py-1.5 text-[10px] font-bold text-white">
              {document.kind === "Quotation"
                ? "TERMS AND CONDITIONS"
                : "COMMENTS OR SPECIAL INSTRUCTIONS"}
            </div>
            <p className="min-h-16 whitespace-pre-line border border-slate-300 p-2 text-[9px] leading-4 text-slate-700">
              {document.kind === "Quotation"
                ? document.termsAndConditions
                : document.notes}
            </p>
            {document.kind === "Quotation" && (
              <div className="mt-5 border-t border-slate-400 pt-2 text-[9px] text-slate-600">
                Customer acceptance (sign below): __________________________
              </div>
            )}
          </div>
          <div className="w-[42%] space-y-1.5 text-[10px]">
            <AmountRow label="SUBTOTAL" value={money(subtotal)} />
            <AmountRow label="GST" value={money(tax)} />
            <AmountRow label="SHIPPING" value={money(document.shipping)} />
            <AmountRow label="OTHER" value={money(document.other)} />
            <div className="flex justify-between border-t-2 border-slate-800 pt-2 text-[13px] font-bold">
              <span>TOTAL</span>
              <span>
                {money(subtotal + tax + document.shipping + document.other)}
              </span>
            </div>
            {document.kind === "Invoice" || document.kind === "Tax Invoice" ? (
              <p className="pt-3 text-right text-[9px] text-slate-600">
                Please make payment as per agreed terms.
              </p>
            ) : null}
          </div>
        </section>
        <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-[9px] leading-4 text-slate-500">
          {document.companyName || "Company Name"} · {document.companyPhone} ·{" "}
          {document.companyEmail}
          {document.kind === "Quotation" && (
            <p className="mt-2 font-semibold italic text-slate-700">
              Thank you for your business.
            </p>
          )}
        </footer>
      </article>
    </div>
  );
}

function AddressBlock({
  title,
  name,
  address,
  contact,
  phone,
  email,
}: {
  title: string;
  name: string;
  address: string;
  contact?: string;
  phone?: string;
  email?: string;
}) {
  return (
    <div className="min-h-28">
      <div className="mb-1 bg-blue-900 px-2 py-1 font-bold tracking-wide text-white">
        {title}
      </div>
      <div className="px-1 leading-4">
        <strong>{name}</strong>
        {address && <div className="whitespace-pre-line">{address}</div>}
        {contact && <div>Attn: {contact}</div>}
        {phone && <div>{phone}</div>}
        {email && <div>{email}</div>}
      </div>
    </div>
  );
}
