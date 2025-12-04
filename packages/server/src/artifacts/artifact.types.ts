import { z } from 'zod';

export const MenuItemSchema = z
  .object({
    sku: z.string().min(1),
    display: z.string().min(1),
    temps: z.array(z.string().min(1)).optional(),
    base_price: z.record(z.number().nonnegative()),
    sizes_enabled: z.boolean().optional(),
    allow_options: z.array(z.string().min(1)).optional()
  })
  .transform((item) => ({
    ...item,
    temps: item.temps ?? [],
    sizes_enabled: item.sizes_enabled ?? false,
    allow_options: item.allow_options ?? []
  }));

export const MenuArtifactSchema = z.object({
  version: z.string().min(1),
  items: z.array(MenuItemSchema).nonempty()
});

export const AliasEntrySchema = z.object({
  sku: z.string().min(1).optional(),
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

export type MenuArtifact = z.output<typeof MenuArtifactSchema>;
export type MenuItem = z.output<typeof MenuItemSchema>;
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
