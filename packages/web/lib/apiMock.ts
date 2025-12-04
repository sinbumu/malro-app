const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

export type MessageRole = 'user' | 'assistant';
export type MessageType = 'text' | 'ask' | 'draft';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  createdAt: string;
}

export interface DraftItem {
  sku: string;
  label: string;
  qty: number;
  options?: Record<string, string | number>;
}

export interface OrderDraft {
  id: string;
  items: DraftItem[];
  orderType: 'TAKE_OUT' | 'DINE_IN';
  notes?: string;
}

export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DONE';

export interface AdminOrder {
  id: string;
  status: OrderStatus;
  orderType: 'TAKE_OUT' | 'DINE_IN';
  createdAt: string;
  items: DraftItem[];
}

type ParseAsk = { type: 'ASK'; message: string };
type ParseDraft = { type: 'ORDER_DRAFT'; draft: OrderDraft };

type ParseApiResponse =
  | { type: 'ASK'; data: { message: string; missingSlots: string[]; optionsHint?: string[] } }
  | {
      type: 'ORDER_DRAFT';
      data: {
        orderType: 'TAKE_OUT' | 'DINE_IN';
        notes?: string;
        items: Array<{ sku: string; label: string; qty: number; options?: Record<string, string | number> }>;
      };
    };

export async function callParseApi(input: string, sessionId?: string): Promise<ParseAsk | ParseDraft> {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE_URL}/nl/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputText: input, sessionId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ParseApiResponse;
      if (json.type === 'ASK') {
        return { type: 'ASK', message: json.data.message };
      }
      return {
        type: 'ORDER_DRAFT',
        draft: {
          id: `DRAFT-${randomId()}`,
          orderType: json.data.orderType,
          notes: json.data.notes,
          items: json.data.items
        }
      };
    } catch (error) {
      console.warn('callParseApi failed, falling back to mock', error);
    }
  }

  return mockParse(input);
}

export async function confirmOrder(draft: OrderDraft, sessionId?: string): Promise<{ ok: boolean; orderId: string }> {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE_URL}/order/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: draft.orderType,
          sessionId,
          notes: draft.notes,
          items: draft.items
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { id: string };
      return { ok: true, orderId: json.id };
    } catch (error) {
      console.warn('confirmOrder failed, falling back to mock', error);
    }
  }

  await delay(600);
  return { ok: true, orderId: `ORD-${draft.id}` };
}

export async function fetchOrders(): Promise<AdminOrder[]> {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE_URL}/order/recent`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Array<{
        id: string;
        status: OrderStatus;
        orderType: 'TAKE_OUT' | 'DINE_IN';
        createdAt: string;
        items: DraftItem[];
      }>;
      return json;
    } catch (error) {
      console.warn('fetchOrders failed, falling back to mock orders', error);
    }
  }
  return MOCK_ORDERS;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE_URL}/order/${id}/status/${status}`, {
        method: 'PATCH'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return;
    } catch (error) {
      console.warn('updateOrderStatus failed', error);
    }
  }
}

// ---------------- Fallback mock implementations ----------------

const ASK_MESSAGES = [
  '사이즈를 알려주시면 도와드릴 수 있어요! (예: 톨, 라지)',
  '포장 여부를 말씀해 주세요. (매장/포장)',
  '온도를 정해주세요. (아이스/핫)'
];

const MOCK_ORDERS: AdminOrder[] = [
  {
    id: 'ORD-001',
    status: 'PREPARING',
    orderType: 'TAKE_OUT',
    createdAt: new Date().toISOString(),
    items: [{ sku: 'AMERICANO', label: 'ICE Americano', qty: 2, options: { temp: 'ICE', size: 'M' } }]
  },
  {
    id: 'ORD-002',
    status: 'READY',
    orderType: 'DINE_IN',
    createdAt: new Date().toISOString(),
    items: [{ sku: 'VANILLA_LATTE', label: 'Vanilla Latte', qty: 1, options: { temp: 'ICE' } }]
  }
];

function mockParse(input: string): ParseAsk | ParseDraft {
  if (input.includes('아이스 아메리카노')) {
    return {
      type: 'ORDER_DRAFT',
      draft: {
        id: `MOCK-${randomId()}`,
        items: [
          {
            sku: 'AMERICANO',
            label: '아이스 아메리카노',
            qty: extractQuantity(input),
            options: { temp: 'ICE', size: 'M' }
          }
        ],
        orderType: input.includes('포장') ? 'TAKE_OUT' : 'DINE_IN'
      }
    };
  }
  return { type: 'ASK', message: pickRandom(ASK_MESSAGES) };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractQuantity(input: string) {
  const match = input.match(/(\d+)/);
  if (match) {
    return Math.max(1, Math.min(20, Number(match[1])));
  }
  return input.includes('두 잔') ? 2 : 1;
}

function randomId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

