export type HashedId = string;

export type SessionUser = {
  id: HashedId;
  email: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  is_owner: boolean;
  permissions: string;
};

export type SessionCompany = {
  id: HashedId;
  name: string;
  currency_id: string;
};

export type LoginResponse = {
  token: string;
  user: SessionUser;
  company: SessionCompany;
};

export type Pagination = {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
};

export type ListResponse<T> = {
  data: T[];
  meta?: { pagination?: Pagination };
};

export type ItemResponse<T> = {
  data: T;
};

export type Contact = {
  id?: HashedId;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  is_primary?: boolean;
};

export type Client = {
  id: HashedId;
  name: string;
  display_name?: string;
  phone?: string;
  balance: number;
  paid_to_date?: number;
  credit_balance?: number;
  is_deleted?: boolean;
  contacts?: Contact[];
};

export type Project = {
  id: HashedId;
  name: string;
  number?: string;
  client_id: HashedId;
  due_date?: string;
  budgeted_amount?: number;
  private_notes?: string;
  public_notes?: string;
  is_deleted?: boolean;
  client?: Client;
  invoices?: Invoice[];
  documents?: DocumentFile[];
};

export type Invoice = {
  id: HashedId;
  number?: string;
  client_id: HashedId;
  project_id?: HashedId;
  amount: number;
  balance: number;
  status_id: number;
  date?: string;
  due_date?: string;
  public_notes?: string;
  private_notes?: string;
  client?: Client;
};

export type Payment = {
  id: HashedId;
  number?: string;
  client_id: HashedId;
  amount: number;
  date?: string;
  transaction_reference?: string;
  type_id?: number;
  client?: Client;
};

export type Expense = {
  id: HashedId;
  amount: number;
  date?: string;
  public_notes?: string;
  private_notes?: string;
  client_id?: HashedId;
  project_id?: HashedId;
};

export type Cheque = {
  id: HashedId;
  direction: 'in' | 'out';
  number: string;
  bank_name: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'deposited' | 'cleared' | 'bounced' | 'cancelled';
  notes: string;
  client_id: string;
  invoice_id: string;
  payment_id: string;
  client_name: string;
};

export type DocumentFile = {
  id: HashedId;
  name?: string;
  type?: string;
  url?: string;
  size?: number;
};

export type OverviewKpis = {
  receivables: number;
  upcoming_payments_count: number;
  upcoming_payments_total: number;
  upcoming_cheques_count: number;
  upcoming_cheques_total: number;
  active_projects: number;
};

export type OverviewAlert = {
  id: string;
  type: string;
  title: string;
  body: string;
  amount: number;
  entity_id: string;
  entity_type: string;
};

export type OverviewActivity = {
  id: string;
  type_id: number;
  notes: string;
  label: string;
  created_at: number;
};

export type Overview = {
  kpis: OverviewKpis;
  upcoming_payments: { id: string; number: string; due_date: string; balance: number }[];
  upcoming_cheques: { id: string; number: string; due_date: string; amount: number; status: string }[];
  alerts: OverviewAlert[];
  activity: OverviewActivity[];
};

export type OfficeSettings = {
  officeName?: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  paymentCurrency?: string;
  paletteId?: string;
};
