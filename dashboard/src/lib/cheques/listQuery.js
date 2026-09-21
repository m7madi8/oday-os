const DEFAULTS = {
  page: 1,
  per_page: 20,
  sort: 'due_date',
  order: 'asc',
  direction: 'all',
};

/**
 * @param {URLSearchParams} params
 */
export function parseChequeListQuery(params) {
  const page = Math.max(1, Number(params.get('page') || DEFAULTS.page));
  const perPage = Math.min(100, Math.max(1, Number(params.get('per_page') || DEFAULTS.per_page)));
  const sort = params.get('sort') || DEFAULTS.sort;
  const order = params.get('order') === 'desc' ? 'desc' : 'asc';
  const direction = params.get('direction') || DEFAULTS.direction;
  const filter = params.get('q') || params.get('filter') || '';
  const status = params.get('status') || '';
  const bank_id = params.get('bank_id') || '';
  const currency = params.get('currency') || '';
  const overdue = params.get('overdue') === '1';
  const client_id = params.get('client_id') || '';
  const project_id = params.get('project_id') || '';

  return {
    page,
    per_page: perPage,
    sort,
    order,
    direction,
    filter,
    status,
    bank_id,
    currency,
    overdue,
    client_id,
    project_id,
  };
}

export function serializeChequeListQuery(state) {
  const params = {};
  if (state.filter) params.q = state.filter;
  if (state.direction && state.direction !== 'all') params.direction = state.direction;
  if (state.status) params.status = state.status;
  if (state.bank_id) params.bank_id = state.bank_id;
  if (state.currency) params.currency = state.currency;
  if (state.overdue) params.overdue = '1';
  if (state.client_id) params.client_id = state.client_id;
  if (state.project_id) params.project_id = state.project_id;
  if (state.sort && state.sort !== DEFAULTS.sort) params.sort = state.sort;
  if (state.order && state.order !== DEFAULTS.order) params.order = state.order;
  if (state.page && state.page !== 1) params.page = String(state.page);
  if (state.per_page && state.per_page !== DEFAULTS.per_page) params.per_page = String(state.per_page);
  return params;
}

export function listQueryKey(state) {
  return JSON.stringify({ ...DEFAULTS, ...state });
}
