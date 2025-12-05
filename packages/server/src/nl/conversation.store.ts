import { Injectable } from '@nestjs/common';
import { MissingSlot } from './nl.types';

type ConversationRole = 'user' | 'assistant';

export type ConversationMessage = {
  role: ConversationRole;
  content: string;
  timestamp: number;
};

export type PendingDraftState = {
  sku: string;
  filledOptions: {
    temp?: string;
    size?: string;
  };
  missingSlots: MissingSlot[];
};

@Injectable()
export class ConversationStore {
  private readonly history = new Map<string, ConversationMessage[]>();
  private readonly pending = new Map<string, PendingDraftState>();
  private readonly maxHistoryItems = 12;

  appendMessage(sessionId: string, message: Omit<ConversationMessage, 'timestamp'>) {
    if (!sessionId) {
      return;
    }
    const list = this.history.get(sessionId) ?? [];
    list.push({ ...message, timestamp: Date.now() });
    if (list.length > this.maxHistoryItems) {
      list.splice(0, list.length - this.maxHistoryItems);
    }
    this.history.set(sessionId, list);
  }

  getHistory(sessionId: string, limit = 8): ConversationMessage[] {
    if (!sessionId) {
      return [];
    }
    const list = this.history.get(sessionId) ?? [];
    return list.slice(-limit);
  }

  setPendingState(sessionId: string, state: PendingDraftState) {
    if (!sessionId) {
      return;
    }
    this.pending.set(sessionId, state);
  }

  getPendingState(sessionId: string): PendingDraftState | null {
    if (!sessionId) {
      return null;
    }
    return this.pending.get(sessionId) ?? null;
  }

  clearPendingState(sessionId: string) {
    if (!sessionId) {
      return;
    }
    this.pending.delete(sessionId);
  }

  reset(sessionId: string) {
    this.history.delete(sessionId);
    this.pending.delete(sessionId);
  }
}

