import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { ArtifactService } from '../artifacts/artifact.service';
import { ArtifactManifest, MenuItem } from '../artifacts/artifact.types';
import { ParseRequestDto } from './dto/parse-request.dto';
import { AskResponse, MissingSlot, OrderDraftItem, OrderDraftResponse, ParseResponse } from './nl.types';

const MissingSlotSchema = z.enum(['temp', 'size', 'orderType', 'menu']);

const LlmAskSchema = z.object({
  type: z.literal('ASK'),
  data: z.object({
    message: z.string(),
    missingSlots: z.array(MissingSlotSchema).default([]),
    optionsHint: z.array(z.string()).optional()
  })
});

const LlmOrderItemSchema = z.object({
  sku: z.string().min(1),
  label: z.string().optional(),
  qty: z.number().int().positive().max(20).default(1),
  options: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
});

const LlmOrderSchema = z.object({
  type: z.literal('ORDER_DRAFT'),
  data: z.object({
    orderType: z.enum(['DINE_IN', 'TAKE_OUT']).default('DINE_IN'),
    notes: z.string().optional(),
    items: z.array(LlmOrderItemSchema).min(1)
  })
});

const LlmResponseSchema = z.discriminatedUnion('type', [LlmAskSchema, LlmOrderSchema]);

type LlmResponse = z.infer<typeof LlmResponseSchema>;

type MenuSnapshotItem = {
  sku: string;
  name: string;
  temps: string[];
  sizesEnabled: boolean;
  options: string[];
  basePrice: Record<string, number>;
};

@Injectable()
export class NlService {
  private readonly logger = new Logger(NlService.name);
  private readonly openAi?: OpenAI;
  private readonly openAiModel?: string;
  private readonly openAiTemperature: number;

  constructor(private readonly artifactService: ArtifactService, private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openAiModel = this.configService.get<string>('OPENAI_MODEL') ?? undefined;
    const temperature = this.configService.get<string>('OPENAI_TEMPERATURE');
    this.openAiTemperature = temperature ? Number(temperature) : 0.2;

    if (apiKey && this.openAiModel) {
      const baseURL = this.configService.get<string>('OPENAI_BASE_URL');
      this.openAi = new OpenAI({
        apiKey,
        baseURL: baseURL || undefined
      });
    } else {
      this.logger.warn('OPENAI_API_KEY 또는 OPENAI_MODEL 이 설정되어 있지 않아 규칙 기반 파서로 동작합니다.');
    }
  }

  async parseInput(dto: ParseRequestDto): Promise<ParseResponse> {
    const rawText = dto.inputText?.trim();
    if (!rawText) {
      return this.ask(['menu'], '메뉴를 다시 한번 정확히 말씀해 주세요.');
    }

    const llm = await this.tryOpenAiPipeline(rawText, dto.sessionId);
    if (llm) {
      return llm;
    }

    return this.runRuleBasedPipeline(rawText);
  }

  private async tryOpenAiPipeline(rawText: string, sessionId?: string): Promise<ParseResponse | null> {
    if (!this.openAi || !this.openAiModel) {
      return null;
    }

    try {
      const menu = this.artifactService.getMenu();
      const manifest = this.artifactService.getManifest();
      const snapshot = this.buildMenuSnapshot(menu.items);

      const systemPrompt =
        'You are a Korean cafe ordering assistant. '
        + 'Convert the user\'s natural language request into either an ASK or an ORDER_DRAFT JSON object. '
        + 'If required information (menu item, temperature, size, quantity, orderType, or options) is missing or unclear, respond with type "ASK" and describe what is missing. '
        + 'If you understand the full order, respond with type "ORDER_DRAFT" including items (sku, label, qty, options) and orderType (DINE_IN or TAKE_OUT). '
        + 'Use only SKUs and menu names provided in the catalog. Do not invent items. Always return valid JSON without additional text.';

      const userPrompt = [
        `Session ID: ${sessionId ?? 'new-session'}`,
        'User utterance:',
        rawText,
        'Menu catalog (use only these entries):',
        JSON.stringify(snapshot),
        'Return either an ASK or ORDER_DRAFT JSON object as described.'
      ].join('\n');

      const completion = await this.openAi.chat.completions.create({
        model: this.openAiModel,
        temperature: this.openAiTemperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      const message = completion.choices.at(0)?.message?.content?.trim();
      if (!message) {
        return null;
      }

      const jsonText = this.extractJson(message);
      if (!jsonText) {
        this.logger.warn(`LLM 응답에서 JSON을 추출하지 못했습니다: ${message}`);
        return null;
      }

      const parsed = LlmResponseSchema.safeParse(JSON.parse(jsonText));
      if (!parsed.success) {
        this.logger.warn('LLM 응답 스키마 검증 실패', parsed.error.flatten());
        return null;
      }

      return this.toParseResponse(parsed.data, manifest);
    } catch (error) {
      this.logger.error('OpenAI 호출 실패', error);
      return null;
    }
  }

  private runRuleBasedPipeline(rawText: string): ParseResponse {
    const artifacts = this.artifactService.artifacts;
    const normalized = this.normalize(rawText);
    const candidate = this.findSkuCandidate(normalized);

    if (!candidate) {
      return this.ask(['menu'], '어떤 메뉴인지 다시 말씀해 주세요.');
    }

    const menuItem = artifacts.menu.items.find((item) => item.sku === candidate.sku);
    if (!menuItem) {
      return this.ask(['menu'], '등록되지 않은 메뉴입니다. 다른 메뉴를 말씀해 주세요.');
    }

    const temp = candidate.temp ?? this.detectTemp(rawText);
    const size = candidate.size ?? this.detectSize(rawText);
    const qty = this.detectQuantity(rawText);
    const orderType = this.detectOrderType(rawText);

    const missing = this.collectMissingSlots(menuItem, { temp, size });
    if (missing.length > 0) {
      return this.ask(missing, this.buildAskMessage(missing, menuItem), ensureSizeHints(missing, menuItem));
    }

    const item: OrderDraftItem = {
      sku: menuItem.sku,
      label: menuItem.display,
      qty,
      options: this.cleanOptions({ temp, size })
    };

    const manifest = artifacts.manifest;
    const response: OrderDraftResponse = {
      type: 'ORDER_DRAFT',
      data: {
        orderType,
        items: [item],
        artifactVersion: manifest.version,
        artifactHash: manifest.source_hash
      }
    };

    return response;
  }

  private toParseResponse(payload: LlmResponse, manifest: ArtifactManifest): ParseResponse {
    if (payload.type === 'ASK') {
      return {
        type: 'ASK',
        data: {
          message: payload.data.message,
          missingSlots: payload.data.missingSlots ?? [],
          optionsHint: payload.data.optionsHint
        }
      };
    }

    const menu = this.artifactService.getMenu();
    const normalizedItems: OrderDraftItem[] = payload.data.items.map((item) => {
      const base = menu.items.find((m) => m.sku === item.sku);
      const label = item.label ?? base?.display ?? item.sku;
      return {
        sku: item.sku,
        label,
        qty: Math.max(1, Math.min(20, item.qty ?? 1)),
        options: this.normalizeLlmOptions(item.options)
      };
    });

    return {
      type: 'ORDER_DRAFT',
      data: {
        orderType: payload.data.orderType,
        items: normalizedItems,
        notes: payload.data.notes,
        artifactVersion: manifest.version,
        artifactHash: manifest.source_hash
      }
    };
  }

  private buildMenuSnapshot(items: MenuItem[]): MenuSnapshotItem[] {
    return items.slice(0, 80).map((item) => ({
      sku: item.sku,
      name: item.display,
      temps: item.temps ?? [],
      sizesEnabled: Boolean(item.sizes_enabled),
      options: item.allow_options ?? [],
      basePrice: item.base_price ?? {}
    }));
  }

  private normalizeLlmOptions(options?: Record<string, unknown>): Record<string, string> | undefined {
    if (!options) {
      return undefined;
    }
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(options)) {
      if (value === null || typeof value === 'undefined') {
        continue;
      }
      const formatted = this.serializeOptionValue(value);
      if (formatted) {
        normalized[key] = formatted;
      }
    }
    return Object.keys(normalized).length ? normalized : undefined;
  }

  private ask(missingSlots: MissingSlot[], message: string, optionsHint?: string[]): AskResponse {
    return {
      type: 'ASK',
      data: {
        missingSlots,
        message,
        optionsHint
      }
    };
  }

  private findSkuCandidate(text: string) {
    const aliases = this.artifactService.getAliases();
    for (const [alias, info] of Object.entries(aliases)) {
      if (text.includes(this.normalize(alias))) {
        return info;
      }
    }

    const menu = this.artifactService.getMenu();
    for (const item of menu.items) {
      if (text.includes(this.normalize(item.display)) || text.includes(item.sku.toLowerCase())) {
        return { sku: item.sku };
      }
    }

    return null;
  }

  private detectTemp(text: string): 'HOT' | 'ICE' | undefined {
    const tokens = text.toLowerCase();
    if (/(ice|아이스|차가운|시원)/.test(tokens)) {
      return 'ICE';
    }
    if (/(hot|핫|따뜻|뜨거|따숩)/.test(tokens)) {
      return 'HOT';
    }
    return undefined;
  }

  private detectSize(text: string): string | undefined {
    const tokens = text.toLowerCase();
    if (/(벤티|venti|라지|large|big)/.test(tokens)) {
      return 'L';
    }
    if (/(톨|tall|레귤러|regular|미디엄|medium)/.test(tokens)) {
      return 'M';
    }
    if (/(숏|small|스몰)/.test(tokens)) {
      return 'S';
    }
    return undefined;
  }

  private detectQuantity(text: string): number {
    const match = text.match(/([0-9]+)\s*(잔|개|컵|명)?/);
    if (match) {
      const value = parseInt(match[1], 10);
      if (!Number.isNaN(value) && value > 0) {
        return Math.min(value, 20);
      }
    }
    return text.includes('두 잔') ? 2 : 1;
  }

  private detectOrderType(text: string): 'DINE_IN' | 'TAKE_OUT' {
    const lowered = text.toLowerCase();
    if (/(포장|테이크아웃|가지고|to\s?go)/.test(lowered)) {
      return 'TAKE_OUT';
    }
    return 'DINE_IN';
  }

  private collectMissingSlots(item: MenuItem, options: { temp?: string; size?: string }): MissingSlot[] {
    const missing: MissingSlot[] = [];
    if ((item.temps?.length ?? 0) > 1 && !options.temp) {
      missing.push('temp');
    }
    if (item.sizes_enabled && !options.size) {
      missing.push('size');
    }
    return missing;
  }

  private cleanOptions(options: { temp?: string; size?: string }) {
    const result: Record<string, string> = {};
    if (options.temp) {
      result.temp = options.temp;
    }
    if (options.size) {
      result.size = options.size;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }

  private buildAskMessage(slots: MissingSlot[], menuItem: MenuItem) {
    if (slots.includes('temp')) {
      const temps = (menuItem.temps ?? []).join('/');
      return `${menuItem.display}는 ${temps} 중에서 선택해 주세요.`;
    }
    if (slots.includes('size')) {
      return `${menuItem.display}의 원하는 사이즈(S/M/L 등)를 알려주세요.`;
    }
    if (slots.includes('orderType')) {
      return '매장 이용인지 포장인지 알려 주세요.';
    }
    return '정보가 부족해요. 한번 더 말씀해 주세요.';
  }

  private extractJson(content: string): string | null {
    const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    return cleaned.slice(start, end + 1);
  }

  private normalize(text: string) {
    return text.toLowerCase().replace(/\s+/g, '');
  }

  private serializeOptionValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value) || (value && typeof value === 'object')) {
      try {
        return JSON.stringify(value);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

function ensureSizeHints(slots: MissingSlot[], menuItem: MenuItem): string[] | undefined {
  if (slots.includes('temp')) {
    return menuItem.temps ?? [];
  }
  if (slots.includes('size')) {
    return ['S', 'M', 'L'];
  }
  return undefined;
}
