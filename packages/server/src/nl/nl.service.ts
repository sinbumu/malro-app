import { Injectable } from '@nestjs/common';
import { ArtifactService } from '../artifacts/artifact.service';
import { MenuItem } from '../artifacts/artifact.types';
import { ParseRequestDto } from './dto/parse-request.dto';
import { AskResponse, MissingSlot, OrderDraftItem, OrderDraftResponse, ParseResponse } from './nl.types';

@Injectable()
export class NlService {
  constructor(private readonly artifactService: ArtifactService) {}

  parseInput(dto: ParseRequestDto): ParseResponse {
    const rawText = dto.inputText?.trim();
    if (!rawText) {
      return this.ask(['menu'], '메뉴를 다시 한번 정확히 말씀해 주세요.');
    }

    const artifacts = this.artifactService.artifacts;
    const normalized = this.normalize(rawText);
    const candidate = this.findSkuCandidate(normalized);

    if (!candidate) {
      return this.ask(['menu'], '메뉴 이름을 인식하지 못했습니다. 다시 말씀해 주세요.');
    }

    const menuItem = artifacts.menu.items.find((item) => item.sku === candidate.sku);
    if (!menuItem) {
      return this.ask(['menu'], '등록되지 않은 메뉴입니다. 다른 메뉴를 말씀해 주세요.');
    }

    const temp = candidate.temp ?? this.detectTemp(rawText);
    const size = candidate.size ?? this.detectSize(rawText);
    const qty = this.detectQuantity(rawText);
    const orderType = this.detectOrderType(rawText);

    const missingSlots = this.collectMissingSlots(menuItem, { temp, size });
    if (missingSlots.length > 0) {
      return this.ask(
        missingSlots,
        this.buildAskMessage(missingSlots, menuItem),
        missingSlots.includes('temp')
          ? menuItem.temps
          : missingSlots.includes('size')
            ? ['S', 'M', 'L']
            : undefined
      );
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

  private collectMissingSlots(
    item: MenuItem,
    options: { temp?: string; size?: string }
  ): MissingSlot[] {
    const missing: MissingSlot[] = [];
    if (item.temps.length > 1 && !options.temp) {
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
      const temps = menuItem.temps.join('/');
      return `${menuItem.display}는 ${temps} 중에서 선택해 주세요.`;
    }
    if (slots.includes('size')) {
      return `${menuItem.display} 사이즈(예: S/M/L)를 알려주세요.`;
    }
    return '정보가 부족해요. 한번 더 말씀해 주세요.';
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

  private normalize(text: string) {
    return text.toLowerCase().replace(/\s+/g, '');
  }
}
