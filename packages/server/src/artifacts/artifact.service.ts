import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import {
  AliasMap,
  AliasMapSchema,
  ArtifactBundle,
  ArtifactManifest,
  EvalsetExample,
  EvalsetEntrySchema,
  FewShotExample,
  FewShotSchema,
  ManifestSchema,
  MenuArtifact,
  MenuArtifactSchema
} from './artifact.types';

@Injectable()
export class ArtifactService implements OnModuleInit {
  private readonly logger = new Logger(ArtifactService.name);
  private snapshot?: ArtifactBundle;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.reload();
  }

  get artifacts(): ArtifactBundle {
    if (!this.snapshot) {
      throw new Error('Artifacts not loaded yet');
    }
    return this.snapshot;
  }

  async reload() {
    const artifactsDir = this.resolveArtifactsDir();
    this.logger.log(`Loading artifacts from ${artifactsDir}`);

    const [menu, aliases, fewShotsRaw, evalset, manifest] = await Promise.all([
      this.readJsonFile(MenuArtifactSchema, path.join(artifactsDir, 'menu.json')),
      this.readJsonFile(AliasMapSchema, path.join(artifactsDir, 'aliases.json')),
      this.readJsonlFile(FewShotSchema, path.join(artifactsDir, 'few_shots.jsonl')),
      this.readJsonlFile(EvalsetEntrySchema, path.join(artifactsDir, 'evalset.jsonl')),
      this.readJsonFile(ManifestSchema, path.join(artifactsDir, 'artifact_manifest.json'))
    ]);
    const fewShots = fewShotsRaw as FewShotExample[];

    this.validateCounts({ aliases, fewShots, evalset, manifest });

    this.snapshot = { menu, aliases, fewShots, evalset, manifest, artifactsDir };
    this.logger.log(
      `Artifacts ready (menuItems=${menu.items.length}, aliases=${Object.keys(aliases).length}, fewShots=${fewShots.length})`
    );
  }

  getMenu(): MenuArtifact {
    return this.artifacts.menu;
  }

  getAliases(): AliasMap {
    return this.artifacts.aliases;
  }

  getFewShots(): FewShotExample[] {
    return this.artifacts.fewShots;
  }

  getEvalset(): EvalsetExample[] {
    return this.artifacts.evalset;
  }

  getManifest(): ArtifactManifest {
    return this.artifacts.manifest;
  }

  private resolveArtifactsDir(): string {
    const envDir = this.configService.get<string>('ARTIFACTS_DIR');
    if (envDir) {
      return path.resolve(envDir);
    }
    return path.resolve(process.cwd(), '../../artifacts/cafe');
  }

  private async readJsonFile<T extends z.ZodTypeAny>(schema: T, filePath: string): Promise<z.output<T>> {
    const raw = await readFile(filePath, 'utf-8');
    const json = JSON.parse(raw) as unknown;
    return schema.parse(json);
  }

  private async readJsonlFile<T extends z.ZodTypeAny>(schema: T, filePath: string): Promise<Array<z.output<T>>> {
    const raw = await readFile(filePath, 'utf-8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    return lines.map((line, index) => {
      try {
        const parsed = JSON.parse(line) as unknown;
        return schema.parse(parsed);
      } catch (err) {
        throw new Error(`Invalid JSONL at ${path.basename(filePath)} line ${index + 1}: ${String(err)}`);
      }
    });
  }

  private validateCounts(args: {
    aliases: AliasMap;
    fewShots: FewShotExample[];
    evalset: EvalsetExample[];
    manifest: ArtifactManifest;
  }) {
    const aliasCountMatches = args.manifest.counts.aliases === Object.keys(args.aliases).length;
    const fewShotCountMatches = args.manifest.counts.few_shots === args.fewShots.length;
    const evalsetCountMatches = args.manifest.counts.evalset === args.evalset.length;

    if (!aliasCountMatches || !fewShotCountMatches || !evalsetCountMatches) {
      const details = JSON.stringify(
        {
          manifest: args.manifest.counts,
          actual: {
            aliases: Object.keys(args.aliases).length,
            few_shots: args.fewShots.length,
            evalset: args.evalset.length
          }
        },
        null,
        2
      );
      throw new Error(`Artifact count mismatch. ${details}`);
    }
  }
}
