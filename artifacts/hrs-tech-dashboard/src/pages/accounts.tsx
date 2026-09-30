import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeIndianRupee,
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  FilePlus2,
  FileText,
  Plus,
  ReceiptIndianRupee,
  Search,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { z } from "zod";
import {
  DocumentComposer,
  DocumentPreview,
  type ComposedDocument,
  type CompanyProfile,
  type DocumentAccount,
  type DocumentKind,
} from "@/pages/accounts-documents";

type Notify = (message: string, tone?: "success" | "warning" | "info") => void;
type AccountKind = DocumentAccount["kind"];
type DocumentStatus = "Draft" | "Pending" | "Due soon" | "Paid";
type AccountRecord = DocumentAccount;
type LedgerDocument = ComposedDocument;

type PayrollRecord = {
  id: string;
  name: string;
  department: string;
  monthlySalary: number;
  workingDays: number;
  presentDays: number;
  status: "Pending" | "Paid";
};

const accountSchema = z.array(
  z.object({
    id: z.string(),
    kind: z.enum(["Supplier", "Vendor", "Client"]),
    name: z.string(),
    address: z.string(),
    email: z.string(),
    contact: z.string(),
    phone: z.string(),
  }),
);

const companySchema = z.object({
  name: z.string(),
  address: z.string(),
  email: z.string(),
  phone: z.string(),
  gstin: z.string(),
  website: z.string(),
});

const documentSchema = z.array(
  z.object({
    id: z.string(),
    number: z.string(),
    kind: z.enum(["Invoice", "Quotation", "Purchase Order", "Tax Invoice"]),
    accountId: z.string(),
    title: z.string(),
    subtotal: z.number(),
    taxRate: z.number(),
    taxAmount: z.number(),
    total: z.number(),
    dueDate: z.string(),
    status: z.enum(["Draft", "Pending", "Due soon", "Paid"]),
    issueDate: z.string().optional(),
    validUntil: z.string().optional(),
    customerReference: z.string().optional(),
    salesperson: z.string().optional(),
    shipDate: z.string().optional(),
    shippingAddress: z.string().optional(),
    shipVia: z.string().optional(),
    fob: z.string().optional(),
    terms: z.string().optional(),
    comments: z.string().optional(),
    shipping: z.number().optional(),
    other: z.number().optional(),
    issuer: companySchema.optional(),
    lines: z
      .array(
        z.object({
          description: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
          taxable: z.boolean(),
        }),
      )
      .optional(),
  }),
);

const payrollSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    department: z.string(),
    monthlySalary: z.number(),
    workingDays: z.number(),
    presentDays: z.number(),
    status: z.enum(["Pending", "Paid"]),
  }),
);

const defaultCompany: CompanyProfile = {
  name: "HRS Infotech",
  address: "",
  email: "",
  phone: "",
  gstin: "",
  website: "",
};

const seedAccounts: AccountRecord[] = [
  {
    id: "a-1",
    kind: "Client",
    name: "Asterion Systems",
    address: "12 MG Road, Bengaluru",
    email: "accounts@asterion.example",
    contact: "Riya Shah",
    phone: "+91 98765 43210",
  },
  {
    id: "a-2",
    kind: "Client",
    name: "Northstar Retail",
    address: "4 Park Street, Kolkata",
    email: "finance@northstar.example",
    contact: "Arjun Das",
    phone: "+91 98765 43211",
  },
  {
    id: "a-3",
    kind: "Supplier",
    name: "Brightline Office Supply",
    address: "22 Industrial Area, Pune",
    email: "billing@brightline.example",
    contact: "Mina Patel",
    phone: "+91 98765 43212",
  },
  {
    id: "a-4",
    kind: "Vendor",
    name: "Cloud Harbor Services",
    address: "8 Tech Park, Hyderabad",
    email: "ap@cloudharbor.example",
    contact: "Dev Menon",
    phone: "+91 98765 43213",
  },
];

const seedDocuments: LedgerDocument[] = [
  {
    id: "d-1",
    number: "INV-2026-0142",
    kind: "Invoice",
    accountId: "a-1",
    title: "Access control deployment",
    subtotal: 240000,
    taxRate: 18,
    taxAmount: 43200,
    total: 283200,
    dueDate: "2026-10-12",
    status: "Pending",
  },
  {
    id: "d-2",
    number: "TAX-2026-0088",
    kind: "Tax Invoice",
    accountId: "a-2",
    title: "Annual maintenance",
    subtotal: 125000,
    taxRate: 18,
    taxAmount: 22500,
    total: 147500,
    dueDate: "2026-10-02",
    status: "Due soon",
  },
  {
    id: "d-3",
    number: "PO-2026-0061",
    kind: "Purchase Order",
    accountId: "a-3",
    title: "Readers and installation parts",
    subtotal: 76000,
    taxRate: 18,
    taxAmount: 13680,
    total: 89680,
    dueDate: "2026-09-25",
    status: "Pending",
  },
  {
    id: "d-4",
    number: "QT-2026-0104",
    kind: "Quotation",
    accountId: "a-1",
    title: "Visitor management expansion",
    subtotal: 98000,
    taxRate: 18,
    taxAmount: 17640,
    total: 115640,
    dueDate: "2026-10-20",
    status: "Draft",
  },
  {
    id: "d-5",
    number: "INV-2026-0136",
    kind: "Invoice",
    accountId: "a-2",
    title: "Gate controller upgrade",
    subtotal: 64000,
    taxRate: 18,
    taxAmount: 11520,
    total: 75520,
    dueDate: "2026-09-18",
    status: "Paid",
  },
];

const seedPayroll: PayrollRecord[] = [
  {
    id: "p-1",
    name: "Ananya Rao",
    department: "Operations",
    monthlySalary: 48000,
    workingDays: 26,
    presentDays: 24,
    status: "Pending",
  },
  {
    id: "p-2",
    name: "Kabir Mehta",
    department: "Engineering",
    monthlySalary: 62000,
    workingDays: 26,
    presentDays: 26,
    status: "Pending",
  },
  {
    id: "p-3",
    name: "Nisha Iyer",
    department: "Finance",
    monthlySalary: 54000,
    workingDays: 26,
    presentDays: 22,
    status: "Paid",
  },
  {
    id: "p-4",
    name: "Rahul Sen",
    department: "Support",
    monthlySalary: 36000,
    workingDays: 26,
    presentDays: 19,
    status: "Pending",
  },
];

const tabs = [
  "Overview",
  "Contacts",
  "Invoices",
  "Quotations",
  "Purchase Orders",
  "Tax Invoices",
  "Payroll",
  "GST",
] as const;
type AccountTab = (typeof tabs)[number];

function storedValue<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  const saved = window.localStorage.getItem(key);
  return saved === null ? fallback : schema.parse(JSON.parse(saved));
}

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function monthLabel() {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function documentTab(kind: DocumentKind): AccountTab {
  if (kind === "Purchase Order") return "Purchase Orders";
  return `${kind}s` as AccountTab;
}

function nextDocumentNumber(kind: DocumentKind, documents: LedgerDocument[]) {
  const prefixes: Record<DocumentKind, string> = {
    Invoice: "INV",
    "Tax Invoice": "TAX",
    "Purchase Order": "PO",
    Quotation: "QUO",
  };
  const year = new Date().getFullYear();
  const prefix = prefixes[kind];
  const pattern =
    kind === "Quotation"
      ? new RegExp(`^(?:QUO|QT)-${year}-(\\d+)$`)
      : new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const sequence =
    documents.reduce((maximum, document) => {
      if (document.kind !== kind) return maximum;
      const match = pattern.exec(document.number);
      return match ? Math.max(maximum, Number(match[1])) : maximum;
    }, 0) + 1;
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

function statusClass(status: DocumentStatus | PayrollRecord["status"]) {
  if (status === "Paid")
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (status === "Due soon")
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  if (status === "Pending")
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  return "border-slate-600/50 bg-slate-700/30 text-slate-300";
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "cyan",
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Wallet;
  tone?: "cyan" | "green" | "amber" | "blue";
}) {
  const tones = {
    cyan: "bg-cyan-400/10 text-cyan-300",
    green: "bg-emerald-400/10 text-emerald-300",
    amber: "bg-amber-400/10 text-amber-200",
    blue: "bg-blue-400/10 text-blue-300",
  };
  return (
    <article className="control-surface rounded-[7px] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[9px] font-semibold tracking-[.12em] text-slate-500">
          {label}
        </div>
        <span className={`rounded-[5px] p-1.5 ${tones[tone]}`}>
          <Icon size={14} />
        </span>
      </div>
      <div className="mt-3 text-[20px] font-semibold tracking-tight text-slate-100">
        {value}
      </div>
      <div className="mt-1 text-[9px] text-slate-500">{detail}</div>
    </article>
  );
}

function AccountsPage({ notify }: { notify: Notify }) {
  const [activeTab, setActiveTab] = useState<AccountTab>("Overview");
  const [accounts, setAccounts] = useState(() =>
    storedValue("hrs.accounts.contacts", accountSchema, seedAccounts),
  );
  const [documents, setDocuments] = useState(() =>
    storedValue("hrs.accounts.documents", documentSchema, seedDocuments),
  );
  const [payroll, setPayroll] = useState(() =>
    storedValue("hrs.accounts.payroll", payrollSchema, seedPayroll),
  );
  const [company, setCompany] = useState(() =>
    storedValue("hrs.accounts.company", companySchema, defaultCompany),
  );
  const [search, setSearch] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<LedgerDocument | null>(
    null,
  );
  const [newAccount, setNewAccount] = useState<AccountKind>("Supplier");
  const [newDocument, setNewDocument] = useState<DocumentKind>("Invoice");

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "hrs.accounts.contacts",
        JSON.stringify(accounts),
      );
      window.localStorage.setItem(
        "hrs.accounts.documents",
        JSON.stringify(documents),
      );
      window.localStorage.setItem(
        "hrs.accounts.payroll",
        JSON.stringify(payroll),
      );
      window.localStorage.setItem(
        "hrs.accounts.company",
        JSON.stringify(company),
      );
    } catch (error) {
      console.error("Unable to save Accounts prototype data.", error);
      notify(
        "Accounts changed, but this browser could not save the data.",
        "warning",
      );
    }
  }, [accounts, documents, payroll, company, notify]);

  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const openReceivables = documents
    .filter(
      (document) =>
        document.kind === "Invoice" || document.kind === "Tax Invoice",
    )
    .filter((document) => document.status !== "Paid")
    .reduce((sum, document) => sum + document.total, 0);
  const openPayables = documents
    .filter((document) => document.kind === "Purchase Order")
    .filter((document) => document.status !== "Paid")
    .reduce((sum, document) => sum + document.total, 0);
  const paidPayroll = payroll
    .filter((record) => record.status === "Paid")
    .reduce(
      (sum, record) =>
        sum + (record.monthlySalary * record.presentDays) / record.workingDays,
      0,
    );
  const duePayroll = payroll
    .filter((record) => record.status !== "Paid")
    .reduce(
      (sum, record) =>
        sum + (record.monthlySalary * record.presentDays) / record.workingDays,
      0,
    );
  const overdueDocuments = documents.filter(
    (document) =>
      document.status === "Pending" &&
      document.dueDate < new Date().toISOString().slice(0, 10),
  );
  const soonDocuments = documents.filter(
    (document) => document.status === "Due soon",
  );
  const query = search.trim().toLowerCase();
  const filteredAccounts = accounts.filter((account) =>
    [
      account.name,
      account.kind,
      account.contact,
      account.email,
      account.phone,
    ].some((value) => value.toLowerCase().includes(query)),
  );
  const filteredDocuments = documents
    .filter(
      (document) =>
        activeTab === "Overview" || documentTab(document.kind) === activeTab,
    )
    .filter((document) =>
      [
        document.number,
        document.title,
        document.kind,
        accountById.get(document.accountId)?.name ?? "",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  const filteredPayroll = payroll.filter((record) =>
    [record.name, record.department].some((value) =>
      value.toLowerCase().includes(query),
    ),
  );

  const persistNewAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    const account: AccountRecord = {
      id: crypto.randomUUID(),
      kind: newAccount,
      name,
      address: String(form.get("address") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      contact: String(form.get("contact") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
    };
    setAccounts((current) => [account, ...current]);
    setContactOpen(false);
    event.currentTarget.reset();
    notify(`${account.kind} added to Accounts.`, "success");
  };

  const persistNewDocument = (document: LedgerDocument) => {
    const savedDocument = {
      ...document,
      number: nextDocumentNumber(document.kind, documents),
    };
    setDocuments((current) => [savedDocument, ...current]);
    setDocumentOpen(false);
    setPreviewDocument(savedDocument);
    notify(`${savedDocument.kind} ${savedDocument.number} created.`, "success");
  };

  const updateAttendance = (id: string, value: number) => {
    setPayroll((current) =>
      current.map((record) =>
        record.id === id
          ? {
              ...record,
              presentDays: Math.min(
                record.workingDays,
                Math.max(0, Math.round(value)),
              ),
            }
          : record,
      ),
    );
  };

  const recordPayment = (id: string) => {
    const employee = payroll.find((record) => record.id === id);
    if (!employee) return;
    setPayroll((current) =>
      current.map((record) =>
        record.id === id ? { ...record, status: "Paid" } : record,
      ),
    );
    notify(`Salary payment recorded for ${employee.name}.`, "success");
  };

  const markDocumentPaid = (id: string) => {
    setDocuments((current) =>
      current.map((document) =>
        document.id === id ? { ...document, status: "Paid" } : document,
      ),
    );
    notify("Document marked as paid in this browser prototype.", "success");
  };

  const deleteAccount = (id: string) => {
    if (documents.some((document) => document.accountId === id)) {
      notify(
        "This contact is linked to a document and cannot be removed.",
        "warning",
      );
      return;
    }
    setAccounts((current) => current.filter((account) => account.id !== id));
    notify("Contact removed.", "success");
  };

  const contactForm = contactOpen && (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#050a11]/75 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setContactOpen(false);
      }}
    >
      <form
        onSubmit={persistNewAccount}
        className="control-surface w-full max-w-lg rounded-[8px] p-4 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accounts-contact-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[9px] font-semibold tracking-[.16em] text-cyan-300">
              CONTACT DIRECTORY
            </div>
            <h2
              id="accounts-contact-title"
              className="mt-1 text-[16px] font-semibold text-slate-100"
            >
              Add account
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setContactOpen(false)}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>
        <label className="mb-3 block text-[10px] text-slate-400">
          Account type
          <select
            value={newAccount}
            onChange={(event) =>
              setNewAccount(event.target.value as AccountKind)
            }
            className="mt-1.5 h-9 w-full rounded border border-slate-700 bg-[#0b1522] px-2 text-[11px] text-slate-200"
          >
            {(["Supplier", "Vendor", "Client"] as const).map((kind) => (
              <option key={kind}>{kind}</option>
            ))}
          </select>
        </label>
        <label className="mb-3 block text-[10px] text-slate-400">
          Name
          <input
            required
            name="name"
            maxLength={120}
            className="mt-1.5 h-9 w-full rounded border border-slate-700 bg-[#0b1522] px-2 text-[11px] text-slate-200"
          />
        </label>
        <label className="mb-3 block text-[10px] text-slate-400">
          Address
          <input
            name="address"
            maxLength={240}
            className="mt-1.5 h-9 w-full rounded border border-slate-700 bg-[#0b1522] px-2 text-[11px] text-slate-200"
          />
        </label>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="text-[10px] text-slate-400">
            Contact person
            <input
              name="contact"
              maxLength={100}
              className="mt-1.5 h-9 w-full rounded border border-slate-700 bg-[#0b1522] px-2 text-[11px] text-slate-200"
            />
          </label>
          <label className="text-[10px] text-slate-400">
            Phone
            <input
              name="phone"
              type="tel"
              maxLength={40}
              className="mt-1.5 h-9 w-full rounded border border-slate-700 bg-[#0b1522] px-2 text-[11px] text-slate-200"
            />
          </label>
        </div>
        <label className="mb-4 block text-[10px] text-slate-400">
          Email
          <input
            name="email"
            type="email"
            maxLength={160}
            className="mt-1.5 h-9 w-full rounded border border-slate-700 bg-[#0b1522] px-2 text-[11px] text-slate-200"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setContactOpen(false)}
            className="rounded border border-slate-700 px-3 py-2 text-[10px] text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded bg-cyan-400 px-3 py-2 text-[10px] font-semibold text-[#062d31] hover:bg-cyan-300"
          >
            <Plus size={13} />
            Save contact
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <main
      className="mx-auto max-w-[1420px] px-4 pb-10 pt-[78px] sm:px-6 lg:px-8"
      data-testid="page-accounts"
    >
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1.5 text-[9px] font-semibold tracking-[.18em] text-cyan-300">
            FINANCE · ACCOUNTS
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-100">
            Accounts
          </h1>
          <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">
            Manage business contacts, billing documents, GST, and
            attendance-based payroll in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setActiveTab("Contacts");
              setContactOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-[#111e2e] px-3 py-2 text-[10px] font-medium text-slate-200 hover:border-slate-500"
          >
            <Plus size={13} />
            Add account
          </button>
          <button
            onClick={() => setDocumentOpen(true)}
            className="inline-flex items-center gap-1.5 rounded bg-cyan-400 px-3 py-2 text-[10px] font-semibold text-[#062d31] hover:bg-cyan-300"
          >
            <FilePlus2 size={13} />
            Create document
          </button>
        </div>
      </div>
      <div className="mb-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="PAYROLL PAID · THIS MONTH"
          value={currency(paidPayroll)}
          detail={`${payroll.filter((record) => record.status === "Paid").length} employees recorded as paid`}
          icon={Wallet}
          tone="green"
        />
        <StatCard
          label="PAYROLL TO PAY"
          value={currency(duePayroll)}
          detail={`${payroll.filter((record) => record.status !== "Paid").length} employees awaiting payment`}
          icon={BadgeIndianRupee}
          tone="amber"
        />
        <StatCard
          label="OPEN RECEIVABLES"
          value={currency(openReceivables)}
          detail="Unpaid invoices and tax invoices"
          icon={ArrowDownLeft}
          tone="blue"
        />
        <StatCard
          label="OPEN PURCHASE ORDERS"
          value={currency(openPayables)}
          detail="Outstanding supplier commitments"
          icon={ArrowUpRight}
          tone="cyan"
        />
      </div>
      <div
        className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-800/80"
        role="tablist"
        aria-label="Account sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => {
              setActiveTab(tab);
              setSearch("");
            }}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-[10px] transition-colors ${activeTab === tab ? "border-cyan-400 font-semibold text-cyan-300" : "border-transparent text-slate-500 hover:text-slate-300"}`}
            data-testid={`tab-accounts-${tab.toLowerCase().replaceAll(" ", "-")}`}
          >
            {tab}
          </button>
        ))}
      </div>
      {(activeTab === "Overview" ||
        activeTab === "Payroll" ||
        activeTab === "GST" ||
        activeTab === "Contacts" ||
        ["Invoices", "Quotations", "Purchase Orders", "Tax Invoices"].includes(
          activeTab,
        )) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[12px] font-semibold text-slate-200">
              {activeTab === "Overview" ? "Finance overview" : activeTab}
            </h2>
            <p className="mt-0.5 text-[9px] text-slate-600">
              {activeTab === "Payroll"
                ? `${monthLabel()} · monthly salary prorated by days present`
                : activeTab === "Overview"
                  ? "Receivables, payables, tax, and payroll at a glance"
                  : "Records are saved in this browser prototype"}
            </p>
          </div>
          {activeTab !== "GST" && activeTab !== "Payroll" && (
            <div className="relative w-full max-w-[280px]">
              <Search
                size={13}
                className="absolute left-2.5 top-2.5 text-slate-600"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  activeTab === "Contacts"
                    ? "Search accounts and contacts..."
                    : "Search documents..."
                }
                className="h-8 w-full rounded border border-slate-800 bg-[#0b1522] pl-8 pr-3 text-[10px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500/60"
              />
            </div>
          )}
        </div>
      )}
      {activeTab === "Overview" && (
        <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
          <section className="control-surface overflow-hidden rounded-[7px]">
            <div className="flex items-center justify-between border-b border-slate-800/80 px-3.5 py-3">
              <div>
                <h2 className="text-[12px] font-semibold text-slate-200">
                  Recent documents
                </h2>
                <p className="mt-0.5 text-[9px] text-slate-600">
                  Invoices, quotations, purchase orders, and tax invoices
                </p>
              </div>
              <button
                onClick={() => setActiveTab("Invoices")}
                className="text-[9px] font-medium text-cyan-300 hover:text-cyan-200"
              >
                View all
              </button>
            </div>
            <DocumentTable
              documents={filteredDocuments.slice(0, 5)}
              accountById={accountById}
              onMarkPaid={markDocumentPaid}
              onPreview={setPreviewDocument}
            />
          </section>
          <section className="control-surface overflow-hidden rounded-[7px]">
            <div className="flex items-center gap-2 border-b border-slate-800/80 px-3.5 py-3">
              <Bell size={14} className="text-amber-300" />
              <div>
                <h2 className="text-[12px] font-semibold text-slate-200">
                  Account alerts
                </h2>
                <p className="mt-0.5 text-[9px] text-slate-600">
                  Review outstanding items and upcoming deadlines
                </p>
              </div>
            </div>
            <div className="space-y-2 p-3">
              {overdueDocuments.length > 0 && (
                <div className="rounded border border-rose-400/20 bg-rose-400/[.06] p-2.5">
                  <div className="text-[10px] font-semibold text-rose-300">
                    Overdue · {overdueDocuments.length} document
                    {overdueDocuments.length === 1 ? "" : "s"}
                  </div>
                  <p className="mt-1 text-[9px] leading-4 text-slate-400">
                    {overdueDocuments
                      .map(
                        (document) =>
                          `${document.number} · ${currency(document.total)}`,
                      )
                      .join("  /  ")}
                  </p>
                </div>
              )}
              {soonDocuments.map((document) => (
                <div
                  key={document.id}
                  className="rounded border border-amber-400/20 bg-amber-400/[.05] p-2.5"
                >
                  <div className="text-[10px] font-semibold text-amber-200">
                    Due soon · {document.number}
                  </div>
                  <p className="mt-1 text-[9px] text-slate-400">
                    {accountById.get(document.accountId)?.name ?? "Account"} ·{" "}
                    {currency(document.total)} · due {document.dueDate}
                  </p>
                </div>
              ))}
              {payroll
                .filter((record) => record.status === "Pending")
                .map((record) => (
                  <div
                    key={record.id}
                    className="rounded border border-rose-400/20 bg-rose-400/[.06] p-2.5"
                  >
                    <div className="text-[10px] font-semibold text-rose-300">
                      Salary pending · {record.name}
                    </div>
                    <p className="mt-1 text-[9px] text-slate-400">
                      {currency(
                        (record.monthlySalary * record.presentDays) /
                          record.workingDays,
                      )}{" "}
                      for {record.presentDays} of {record.workingDays} working
                      days
                    </p>
                  </div>
                ))}
              {overdueDocuments.length === 0 &&
                soonDocuments.length === 0 &&
                payroll.every((record) => record.status === "Paid") && (
                  <p className="py-6 text-center text-[10px] text-slate-500">
                    No outstanding payment alerts.
                  </p>
                )}
            </div>
          </section>
          <section className="control-surface rounded-[7px] p-3.5 xl:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <ReceiptIndianRupee size={14} className="text-cyan-300" />
              <div>
                <h2 className="text-[12px] font-semibold text-slate-200">
                  GST snapshot
                </h2>
                <p className="mt-0.5 text-[9px] text-slate-600">
                  Calculated from this period’s saved documents
                </p>
              </div>
            </div>
            <GstSummary documents={documents} />
            <button
              onClick={() => setActiveTab("GST")}
              className="mt-3 text-[9px] font-medium text-cyan-300 hover:text-cyan-200"
            >
              Open GST summary →
            </button>
          </section>
        </div>
      )}
      {activeTab === "Contacts" && (
        <section className="control-surface overflow-hidden rounded-[7px]">
          <div className="divide-y divide-slate-800/70">
            {filteredAccounts.length ? (
              filteredAccounts.map((account) => (
                <article
                  key={account.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 rounded bg-slate-700/40 p-1.5 text-cyan-300">
                      <Building2 size={14} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-200">
                          {account.name}
                        </span>
                        <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[8px] text-slate-400">
                          {account.kind}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[9px] text-slate-500">
                        {account.contact || "Contact not set"} ·{" "}
                        {account.email || "Email not set"} ·{" "}
                        {account.phone || "Phone not set"}
                      </p>
                      <p className="mt-0.5 truncate text-[9px] text-slate-600">
                        {account.address || "Address not set"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAccount(account.id)}
                    className="rounded p-1.5 text-slate-600 hover:bg-rose-400/10 hover:text-rose-300"
                    aria-label={`Remove ${account.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </article>
              ))
            ) : (
              <EmptyState message="No accounts match your search." />
            )}
          </div>
        </section>
      )}
      {["Invoices", "Quotations", "Purchase Orders", "Tax Invoices"].includes(
        activeTab,
      ) && (
        <section className="control-surface overflow-hidden rounded-[7px]">
          <DocumentTable
            documents={filteredDocuments}
            accountById={accountById}
            onMarkPaid={markDocumentPaid}
            onPreview={setPreviewDocument}
          />
        </section>
      )}
      {activeTab === "Payroll" && (
        <div className="space-y-3">
          <div className="grid gap-2.5 sm:grid-cols-3">
            <StatCard
              label="PAY PERIOD"
              value={monthLabel()}
              detail="Attendance is editable before payment"
              icon={Users}
              tone="blue"
            />
            <StatCard
              label="DAYS ABSENT"
              value={String(
                payroll.reduce(
                  (sum, record) =>
                    sum + record.workingDays - record.presentDays,
                  0,
                ),
              )}
              detail="Across the listed employees"
              icon={BriefcaseBusiness}
              tone="amber"
            />
            <StatCard
              label="SALARY TO PAY"
              value={currency(duePayroll)}
              detail="Monthly salary × present ÷ working days"
              icon={BadgeIndianRupee}
              tone="cyan"
            />
          </div>
          <section className="control-surface overflow-hidden rounded-[7px]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead className="bg-[#152337] text-[9px] tracking-[.08em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">EMPLOYEE</th>
                    <th className="px-3 py-2.5">MONTHLY SALARY</th>
                    <th className="px-3 py-2.5">WORKING DAYS</th>
                    <th className="px-3 py-2.5">PRESENT</th>
                    <th className="px-3 py-2.5">ABSENT</th>
                    <th className="px-3 py-2.5">NET SALARY</th>
                    <th className="px-3 py-2.5">STATUS</th>
                    <th className="px-3 py-2.5">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredPayroll.map((record) => (
                    <tr key={record.id} className="text-[10px] text-slate-300">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-200">
                          {record.name}
                        </div>
                        <div className="mt-0.5 text-[9px] text-slate-600">
                          {record.department}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {currency(record.monthlySalary)}
                      </td>
                      <td className="px-3 py-2.5">{record.workingDays}</td>
                      <td className="px-3 py-2.5">
                        <input
                          aria-label={`Days present for ${record.name}`}
                          type="number"
                          min="0"
                          max={record.workingDays}
                          value={record.presentDays}
                          disabled={record.status === "Paid"}
                          onChange={(event) =>
                            updateAttendance(
                              record.id,
                              Number(event.target.value),
                            )
                          }
                          className="h-7 w-16 rounded border border-slate-700 bg-[#0b1522] px-2 text-[10px] text-slate-200 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        {record.workingDays - record.presentDays}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-100">
                        {currency(
                          (record.monthlySalary * record.presentDays) /
                            record.workingDays,
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded border px-1.5 py-1 text-[8px] ${statusClass(record.status)}`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {record.status === "Paid" ? (
                          <span className="inline-flex items-center gap-1 text-[9px] text-emerald-300">
                            <Check size={12} />
                            Recorded
                          </span>
                        ) : (
                          <button
                            onClick={() => recordPayment(record.id)}
                            className="rounded bg-cyan-400 px-2 py-1.5 text-[9px] font-semibold text-[#062d31] hover:bg-cyan-300"
                          >
                            Record payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPayroll.length === 0 && (
                <EmptyState message="No employees match your search." />
              )}
            </div>
            <p className="border-t border-slate-800/70 px-3.5 py-2.5 text-[9px] leading-4 text-slate-600">
              Salary estimate = monthly salary ÷ working days × days present.
              Attendance data and payment status are demonstration records;
              verify payroll rules, leave treatment, deductions, and statutory
              compliance before use.
            </p>
          </section>
        </div>
      )}
      {activeTab === "GST" && (
        <div className="space-y-3">
          <section className="control-surface rounded-[7px] p-3.5">
            <div className="mb-3 flex items-center gap-2">
              <ReceiptIndianRupee size={14} className="text-cyan-300" />
              <div>
                <h2 className="text-[12px] font-semibold text-slate-200">
                  GST summary
                </h2>
                <p className="mt-0.5 text-[9px] text-slate-600">
                  Tax amounts calculated from saved documents; not a filed
                  return
                </p>
              </div>
            </div>
            <GstSummary documents={documents} />
          </section>
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="control-surface rounded-[7px] p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <ArrowDownLeft size={13} className="text-emerald-300" />
                <h2 className="text-[11px] font-semibold text-slate-200">
                  GST collected · GST-Out
                </h2>
              </div>
              <p className="text-[9px] text-slate-500">
                Output GST on invoices and tax invoices
              </p>
              <div className="mt-3 text-[18px] font-semibold text-emerald-300">
                {currency(
                  documents
                    .filter(
                      (document) =>
                        (document.kind === "Invoice" ||
                          document.kind === "Tax Invoice") &&
                        document.status !== "Draft",
                    )
                    .reduce((sum, document) => sum + document.taxAmount, 0),
                )}
              </div>
            </section>
            <section className="control-surface rounded-[7px] p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <ArrowUpRight size={13} className="text-blue-300" />
                <h2 className="text-[11px] font-semibold text-slate-200">
                  GST paid · GST-In
                </h2>
              </div>
              <p className="text-[9px] text-slate-500">
                Input GST on purchase orders
              </p>
              <div className="mt-3 text-[18px] font-semibold text-blue-300">
                {currency(
                  documents
                    .filter((document) => document.kind === "Purchase Order")
                    .reduce((sum, document) => sum + document.taxAmount, 0),
                )}
              </div>
            </section>
          </div>
        </div>
      )}
      {contactForm}
      {documentOpen && (
        <DocumentComposer
          accounts={accounts}
          company={company}
          kind={newDocument}
          nextNumber={nextDocumentNumber(newDocument, documents)}
          onKindChange={setNewDocument}
          onClose={() => setDocumentOpen(false)}
          onSave={persistNewDocument}
          onCompanyChange={setCompany}
          notify={notify}
        />
      )}
      {previewDocument && (
        <DocumentPreview
          document={previewDocument}
          account={accountById.get(previewDocument.accountId)}
          company={company}
          onClose={() => setPreviewDocument(null)}
          notify={notify}
        />
      )}
    </main>
  );
}

function DocumentTable({
  documents,
  accountById,
  onMarkPaid,
  onPreview,
}: {
  documents: LedgerDocument[];
  accountById: Map<string, AccountRecord>;
  onMarkPaid: (id: string) => void;
  onPreview: (document: LedgerDocument) => void;
}) {
  if (documents.length === 0)
    return (
      <EmptyState message="No documents yet. Create an invoice, quotation, purchase order, or tax invoice to get started." />
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px] border-collapse text-left">
        <thead className="bg-[#152337] text-[9px] tracking-[.08em] text-slate-500">
          <tr>
            <th className="px-3 py-2.5">DOCUMENT</th>
            <th className="px-3 py-2.5">ACCOUNT</th>
            <th className="px-3 py-2.5">DUE DATE</th>
            <th className="px-3 py-2.5">GST</th>
            <th className="px-3 py-2.5">TOTAL</th>
            <th className="px-3 py-2.5">STATUS</th>
            <th className="px-3 py-2.5">ACTIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {documents.map((document) => (
            <tr key={document.id} className="text-[10px] text-slate-300">
              <td className="px-3 py-2.5">
                <div className="font-medium text-slate-200">
                  {document.number}
                </div>
                <div className="mt-0.5 text-[9px] text-slate-600">
                  {document.kind} · {document.title}
                </div>
              </td>
              <td className="px-3 py-2.5">
                {accountById.get(document.accountId)?.name ?? "Contact removed"}
              </td>
              <td className="px-3 py-2.5">{document.dueDate}</td>
              <td className="px-3 py-2.5">
                {currency(document.taxAmount)}{" "}
                <span className="text-slate-600">({document.taxRate}%)</span>
              </td>
              <td className="px-3 py-2.5 font-semibold text-slate-100">
                {currency(document.total)}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`rounded border px-1.5 py-1 text-[8px] ${statusClass(document.status)}`}
                >
                  {document.status}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPreview(document)}
                    className="text-[9px] font-medium text-cyan-300 hover:text-cyan-200"
                  >
                    Preview
                  </button>
                  {document.status !== "Paid" &&
                    document.status !== "Draft" && (
                      <button
                        onClick={() => onMarkPaid(document.id)}
                        className="text-[9px] font-medium text-slate-400 hover:text-emerald-300"
                      >
                        Mark paid
                      </button>
                    )}
                  {document.status === "Paid" && (
                    <span className="inline-flex items-center gap-1 text-[9px] text-emerald-300">
                      <Check size={12} />
                      Paid
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GstSummary({ documents }: { documents: LedgerDocument[] }) {
  const gstOut = documents
    .filter(
      (document) =>
        (document.kind === "Invoice" || document.kind === "Tax Invoice") &&
        document.status !== "Draft",
    )
    .reduce((sum, document) => sum + document.taxAmount, 0);
  const gstIn = documents
    .filter((document) => document.kind === "Purchase Order")
    .reduce((sum, document) => sum + document.taxAmount, 0);
  const total = documents
    .filter((document) => document.status !== "Draft")
    .reduce((sum, document) => sum + document.taxAmount, 0);
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {[
        {
          label: "GST-Out · collected",
          value: gstOut,
          tone: "text-emerald-300",
        },
        {
          label: "GST-In · purchase input",
          value: gstIn,
          tone: "text-blue-300",
        },
        {
          label: "GST across saved documents",
          value: total,
          tone: "text-slate-100",
        },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded border border-slate-800 bg-[#0d1725] p-2.5"
        >
          <div className="text-[9px] text-slate-500">{item.label}</div>
          <div className={`mt-1 text-[14px] font-semibold ${item.tone}`}>
            {currency(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[130px] flex-col items-center justify-center gap-2 px-4 text-center text-[10px] text-slate-600">
      <FileText size={19} strokeWidth={1.5} />
      <p>{message}</p>
    </div>
  );
}

export default AccountsPage;
