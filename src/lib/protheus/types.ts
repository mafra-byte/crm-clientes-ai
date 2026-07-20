export type ProtheusTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
};

export type ProtheusCustomer = {
  codigo?: string;
  code?: string;
  A1_COD?: string;
  loja?: string;
  store?: string;
  A1_LOJA?: string;
  nome?: string;
  name?: string;
  A1_NOME?: string;
  nreduz?: string;
  A1_NREDUZ?: string;
  email?: string;
  A1_EMAIL?: string;
  telefone?: string;
  phone?: string;
  A1_TEL?: string;
  cgc?: string;
  document?: string;
  A1_CGC?: string;
};

export type ProtheusOrderItem = {
  produto?: string;
  product?: string;
  C6_PRODUTO?: string;
  descricao?: string;
  description?: string;
  C6_DESCRI?: string;
  quantidade?: number;
  quantity?: number;
  C6_QTDVEN?: number;
  preco?: number;
  price?: number;
  C6_PRCVEN?: number;
};

export type ProtheusOrder = {
  id?: string;
  codigo?: string;
  number?: string;
  C5_NUM?: string;
  status?: string;
  C5_STATUS?: string;
  liberado?: string;
  total?: number;
  totalAmount?: number;
  C5_TOTAL?: number;
  moeda?: string;
  currency?: string;
  emissao?: string;
  date?: string;
  C5_EMISSAO?: string;
  cliente?: string;
  customerCode?: string;
  C5_CLIENTE?: string;
  loja?: string;
  customerStore?: string;
  C5_LOJACLI?: string;
  clienteNome?: string;
  customerName?: string;
  items?: ProtheusOrderItem[];
  itens?: ProtheusOrderItem[];
};

export type ProtheusListResponse<T> = {
  items?: T[];
  data?: T[];
  content?: T[];
  total?: number;
  hasNext?: boolean;
};
