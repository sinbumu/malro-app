import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ArtifactsModule } from '../artifacts/artifacts.module';

@Module({
  imports: [ArtifactsModule],
  controllers: [OrdersController],
  providers: [OrdersService]
})
export class OrdersModule {}
