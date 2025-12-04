import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArtifactsModule } from './artifacts/artifacts.module';
import { NlModule } from './nl/nl.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      cache: true
    }),
    ArtifactsModule,
    NlModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
