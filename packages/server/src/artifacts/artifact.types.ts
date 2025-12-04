import { z } from 'zod';

export const MenuItemSchema = z.object({
  sku: z.string().min(1),
  display: z.string().min(1),
  temps: z.array(z.string().min(1)).nonempty(),
  base_price: z.record(z.number().nonnegative()),
  sizes_enabled: z.boolean(),
  allow_options: z.array(z.string().min(1))
});

export const MenuArtifactSchema = z.object({
  version: z.string().min(1),
  items: z.array(MenuItemSchema).nonempty()
});

export const AliasEntrySchema = z.object({
  sku: z.string().min(1),
  temp: z.string().optional(),
  size: z.string().optional(),
  notes: z.string().optional()
});

export const AliasMapSchema = z.record(AliasEntrySchema);

export const FewShotSchema = z.object({
  input: z.string().min(1),
  label: z.enum(['ASK', 'ORDER_DRAFT']).default('ORDER_DRAFT'),
  target: z.record(z.unknown())
});

export const ManifestSchema = z.object({
  domain: z.string().min(1),
  version: z.string().min(1),
  generated_at: z.string().min(1),
  counts: z.object({
    aliases: z.number().int().nonnegative(),
    few_shots: z.number().int().nonnegative(),
    evalset: z.number().int().nonnegative()
  }),
  source_hash: z.string().min(1),
  patterns_version: z.string().optional()
});

export const EvalsetEntrySchema = z.object({
  input: z.string().min(1),
  gold: z.record(z.unknown())
});

export type MenuArtifact = z.infer<typeof MenuArtifactSchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type AliasMap = z.infer<typeof AliasMapSchema>;
export type FewShotExample = z.infer<typeof FewShotSchema>;
export type ArtifactManifest = z.infer<typeof ManifestSchema>;
export type EvalsetExample = z.infer<typeof EvalsetEntrySchema>;

export type ArtifactBundle = {
  menu: MenuArtifact;
  aliases: AliasMap;
  fewShots: FewShotExample[];
  evalset: EvalsetExample[];
  manifest: ArtifactManifest;
  artifactsDir: string;
};
