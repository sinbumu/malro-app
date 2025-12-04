export type MessageRole = 'user' | 'assistant';
export type MessageType = 'text' | 'ask' | 'draft';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  createdAt: string;
}

export interface OrderDraft {
  id: string;
  items: { label: string; qty: number; options: string }[];
  orderType: 'TAKE_OUT' | 'DINE_IN';
}

type ParseAsk = { type: 'ASK'; message: string };
type ParseDraft = { type: 'ORDER_DRAFT'; draft: OrderDraft };

const ASK_MESSAGES = [
  '사이즈를 알려주시면 도와드릴 수 있어요! (예: 톨, 라지)',
  '포장 여부를 말씀해 주세요. (매장/포장)',
  '온도를 정해주세요. (아이스/핫)'
];

export async function callParseApi(input: string): Promise<ParseAsk | ParseDraft> {
  await delay(800);

  if (input.includes('아이스 아메리카노')) {
    return {
      type: 'ORDER_DRAFT',
      draft: {
        id: randomId(),
        items: [
          {
            label: '아이스 아메리카노',
            qty: extractQuantity(input),
            options: 'ICE · Tall'
          }
        ],
        orderType: input.includes('포장') ? 'TAKE_OUT' : 'DINE_IN'
      }
    };
  }

  return {
    type: 'ASK',
    message: pickRandom(ASK_MESSAGES)
  };
}

export async function confirmOrder(draft: OrderDraft): Promise<{ ok: boolean; orderId: string }> {
  await delay(600);
  return { ok: true, orderId: `ORD-${draft.id}` };
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

