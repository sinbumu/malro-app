import { Module } from '@nestjs/common';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { NlController } from './nl.controller';
import { NlService } from './nl.service';

@Module({
  imports: [ArtifactsModule],
  controllers: [NlController],
  providers: [NlService]
})
export class NlModule {}
