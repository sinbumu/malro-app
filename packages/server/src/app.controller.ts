import { Controller, Get } from '@nestjs/common';
import { ArtifactService } from './artifacts/artifact.service';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly artifactService: ArtifactService
  ) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('artifacts')
  getArtifacts() {
    const manifest = this.artifactService.getManifest();
    const menu = this.artifactService.getMenu();
    const aliases = this.artifactService.getAliases();
    return {
      manifest,
      stats: {
        menuItems: menu.items.length,
        aliases: Object.keys(aliases).length,
        fewShots: this.artifactService.getFewShots().length,
        evalset: this.artifactService.getEvalset().length
      }
    };
  }
}
