import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { ArtifactService } from '../artifacts/artifact.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artifacts: ArtifactService
  ) {}

  async confirmOrder(dto: ConfirmOrderDto) {
    const manifest = this.artifacts.getManifest();
    const order = await this.prisma.order.create({
      data: {
        sessionId: dto.sessionId,
        orderType: dto.orderType,
        notes: dto.notes,
        artifactVersion: manifest.version,
        artifactHash: manifest.source_hash,
        items: {
          create: dto.items.map((item) => ({
            sku: item.sku,
            label: item.label,
            qty: item.qty,
            options: item.options ? JSON.stringify(item.options) : null
          }))
        }
      },
      include: { items: true }
    });

    return this.toOrderResponse(order);
  }

  async listOrders(limit = 20) {
    const orders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { items: true }
    });

    return orders.map((order) => this.toOrderResponse(order));
  }

  async updateStatus(id: string, status: string) {
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status }
    });
    return updated;
  }

  private toOrderResponse(order: {
    id: string;
    sessionId: string | null;
    orderType: string;
    status: string;
    notes: string | null;
    artifactVersion: string;
    artifactHash: string;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{ id: string; sku: string; label: string; qty: number; options: string | null }>;
  }) {
    return {
      id: order.id,
      sessionId: order.sessionId,
      orderType: order.orderType,
      status: order.status,
      notes: order.notes,
      artifactVersion: order.artifactVersion,
      artifactHash: order.artifactHash,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => {
        const parsedOptions = item.options ? (JSON.parse(item.options) as Record<string, unknown>) : undefined;
        return {
        id: item.id,
        sku: item.sku,
        label: item.label,
        qty: item.qty,
          options: parsedOptions
        };
      })
    };
  }
}
