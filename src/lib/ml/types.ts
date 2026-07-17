export type MlTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
};

export type MlUser = {
  id: number;
  nickname: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  permalink?: string;
};

export type MlOrderItem = {
  item: {
    id: string;
    title: string;
    seller_custom_field?: string | null;
  };
  quantity: number;
  unit_price: number;
  currency_id: string;
};

export type MlBuyer = {
  id: number;
  nickname?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: { number?: string; area_code?: string } | null;
};

export type MlOrder = {
  id: number;
  status: string;
  date_created: string;
  date_closed?: string | null;
  total_amount: number;
  currency_id: string;
  buyer: MlBuyer;
  order_items: MlOrderItem[];
};

export type MlOrdersSearchResponse = {
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
  results: MlOrder[];
};

export type MlNotification = {
  resource: string;
  user_id: number;
  topic: string;
  application_id: number;
  attempts: number;
  sent: string;
  received: string;
};
