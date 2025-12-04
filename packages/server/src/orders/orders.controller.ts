import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { OrdersService } from './orders.service';

@Controller('order')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('confirm')
  confirm(@Body() dto: ConfirmOrderDto) {
    return this.ordersService.confirmOrder(dto);
  }

  @Get('recent')
  getRecent() {
    return this.ordersService.listOrders();
  }

  @Patch(':id/status/:status')
  updateStatus(@Param('id') id: string, @Param('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }
}
