````text
You are building a frontend-only shell for a kiosk ordering MVP called “malro”.

Goal:
- Create a Next.js 14 (App Router) + TypeScript + Tailwind CSS project.
- No real backend yet. All API calls must be mocked with placeholder functions.
- The app will later connect to an external NestJS API server providing endpoints like /nl/parse, /order/confirm, /orders, /events.

Project requirements:
- Use Next.js App Router with the following routes:
  - `/kiosk` : kiosk UX for natural-language ordering
  - `/admin` : lightweight admin dashboard showing orders
- Use Tailwind CSS for styling.
- Use simple, clean, responsive UI (dark mode friendly if possible).
- Keep everything in one Next.js app (no separate admin app).

Global structure:
- `app/layout.tsx` : basic layout with a header.
- `app/page.tsx` : simple landing page with buttons to go to `/kiosk` and `/admin`.
- `app/kiosk/page.tsx` : kiosk UI.
- `app/admin/page.tsx` : admin UI.
- `components/` : shared components (chat bubble, order summary, status badge, etc.).
- All code in TypeScript.

### /kiosk page requirements

The kiosk page will simulate a conversational “order by talking” flow.

UI:
- A fixed header with title, e.g. “malro Kiosk – Order by speaking”.
- Main area with:
  - A scrollable chat-like message list.
  - Each message has:
    - role: "user" | "assistant"
    - type: "text" | "ask" | "draft"
    - content: string
  - A small area to show the current `ORDER_DRAFT` summary if available.
- Footer area with:
  - Text input for the user’s message.
  - “Send” button.
  - Mic button (start/stop STT) with a simple visual state (e.g. glowing when recording).

State management:
- Use a React client component with hooks.
- Define a client-side type like:

  ```ts
  type MessageRole = "user" | "assistant";
  type MessageType = "text" | "ask" | "draft";

  interface ChatMessage {
    id: string;
    role: MessageRole;
    type: MessageType;
    content: string;
    createdAt: string;
  }

  interface OrderDraft {
    id: string;
    items: { label: string; qty: number; options: string }[];
    orderType: "TAKE_OUT" | "DINE_IN";
  }
````

* Component state should include:

  * `messages: ChatMessage[]`
  * `currentInput: string`
  * `draft: OrderDraft | null`
  * `isLoading: boolean`
  * `isRecording: boolean`

API mocking:

* For now, do NOT call any real API.

* Instead, implement two placeholder functions in a separate module (e.g. `lib/apiMock.ts`):

  ```ts
  export async function callParseApi(input: string): Promise<
    | { type: "ASK"; message: string }
    | { type: "ORDER_DRAFT"; draft: OrderDraft }
  > {
    // mock logic: if input includes "아이스 아메리카노", return a fake ORDER_DRAFT
    // otherwise return an ASK asking for size or order type
  }

  export async function confirmOrder(draft: OrderDraft): Promise<{ ok: boolean; orderId: string }> {
    // mock: always succeed
  }
  ```

* The kiosk page should use these mock functions to:

  * Append user message to the chat.
  * Add assistant messages for either ASK or ORDER_DRAFT.
  * When the user clicks “Confirm order”, call `confirmOrder` and show a toast or popup.

STT (Speech-to-Text) placeholder:

* Do NOT implement real Web Speech API or any backend STT.

* Instead, create a small hook or helper function, e.g. `useMockSTT`, with the following interface:

  ```ts
  interface STTControls {
    isRecording: boolean;
    start: () => void;
    stop: () => void;
  }
  ```

* `start()` should set `isRecording` to true and maybe clear the input.

* `stop()` should set `isRecording` to false and for now just set a dummy Korean text like `"아이스 아메리카노 톨 사이즈 두 잔 포장"` into the input.

* The mic button UI uses `isRecording` to change style.

### /admin page requirements

The admin page will show a list of mock orders and allow updating status.

UI:

* A header like “malro Admin – Orders”.
* A table with columns:

  * Order ID
  * Created time
  * Summary (e.g. “ICE Americano M x2 (take-out)”)
  * Status badge (PENDING / PREPARING / READY / DONE)
  * A dropdown or buttons to change status.

State:

* Use a local state array of orders, e.g.:

  ```ts
  type OrderStatus = "PENDING" | "PREPARING" | "READY" | "DONE";

  interface AdminOrder {
    id: string;
    createdAt: string;
    summary: string;
    status: OrderStatus;
  }
  ```

* Seed with 3–5 mock orders.

* When status changes, update local state; no need for backend.

Real-time placeholder:

* Add a small banner or text saying “Live updates will be connected via SSE later”.
* Optionally, implement a fake `setInterval` that adds a new mock order every 30–60 seconds to simulate incoming orders.

### Styling & UX

* Use Tailwind for layout and spacing.
* Make the kiosk page mobile/tablet friendly (centered content, max width, nice spacing).
* Use subtle cards, rounded corners, and simple color accents.
* Show loading states (e.g. disable buttons while waiting for mock API).

### Additional constraints

* Do NOT create API routes in Next.js for now.
* Do NOT include any external UI libraries except Tailwind (and built-in React).
* Keep the code reasonably small and readable: separate reusable components, but avoid over-engineering.
* Add comments in the code where actual API calls (to NestJS backend or STT/Web Speech API) will be plugged in later.

The final result should be a working Next.js frontend app that:

* Lets the user type a message and see ASK / ORDER_DRAFT responses using mocks.
* Lets the user simulate confirming an order.
* Shows a simple admin view over a list of mock orders.
* Is ready to be wired up to a real backend later.

```
```
