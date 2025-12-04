export type MissingSlot = 'temp' | 'size' | 'orderType' | 'menu';

export type AskResponse = {
  type: 'ASK';
  data: {
    missingSlots: MissingSlot[];
    message: string;
    optionsHint?: string[];
  };
};

export type OrderDraftItem = {
  sku: string;
  label: string;
  qty: number;
  options?: Record<string, string | number>;
};

export type OrderDraftResponse = {
  type: 'ORDER_DRAFT';
  data: {
    orderType: 'DINE_IN' | 'TAKE_OUT';
    items: OrderDraftItem[];
    artifactVersion: string;
    artifactHash: string;
    notes?: string;
  };
};

export type ParseResponse = AskResponse | OrderDraftResponse;
