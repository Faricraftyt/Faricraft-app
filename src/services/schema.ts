import { z } from "zod";
const text = z.string().max(10000);
const url = z
  .string()
  .refine(
    (v) => !v || /^https:\/\/[^\s]+$/.test(v),
    "Usá una URL HTTPS pública",
  );
const image = z
  .string()
  .refine(
    (v) =>
      !v || /^https:\/\/[^\s]+$/.test(v) || /^(?!\/|.*\.\.)[\w./-]+$/.test(v),
    "Usá HTTPS o una ruta relativa sin espacios",
  );
export const link = z.object({
  label: z.string().min(1),
  url: url.refine(Boolean, "Falta la URL"),
});
export const resourceEdition = z.object({
  title: z.string().max(200).optional(),
  description: text.optional(),
  url: url.optional(),
  viewUrl: url.optional(),
  format: text.optional(),
  size: text.optional(),
});
export const resource = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).max(200),
    description: text.default(""),
    viewUrl: url.optional(),
    editions: z.object({ es: resourceEdition.optional(), en: resourceEdition.optional(), pt: resourceEdition.optional() }).optional(),
    category: z.string().min(1),
    image,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tags: z.array(z.string()),
    format: text,
    size: text,
    url,
    published: z.boolean(),
    order: z.number(),
  })
  .refine(
    (v) => !v.published || !!v.url,
    "Un recurso publicado necesita un enlace público",
  );
export const schemas = {
  resources: z.array(resource),
  categories: z.array(
    z.object({ id: z.string().min(1), name: z.string().min(1) }),
  ),
  bio: z.object({
    name: z.string().min(1),
    description: text,
    channelDescription: text,
    avatar: image,
    links: z.array(link),
    projects: z.array(
      z.object({ title: z.string().min(1), description: text, url }),
    ),
  }),
  settings: z.object({
    name: z.string().min(1),
    description: text,
    logo: image,
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    channelId: z
      .string()
      .refine((v) => !v || /^UC[\w-]{22}$/.test(v), "Channel ID inválido"),
    channelUrl: url,
    repositoryUrl: url,
    theme: z.enum(["dark", "light"]),
    links: z.array(link),
  }),
  videos: z.object({
    updatedAt: z.string().nullable(),
    error: z.string().nullable(),
    items: z.array(
      z.object({
        id: z.string().regex(/^[\w-]{11}$/),
        title: z.string(),
        titles: z.object({ es: z.string().optional(), en: z.string().optional(), pt: z.string().optional() }).optional(),
        description: z.string(),
        date: z.string(),
        thumbnail: url,
      }),
    ),
  }),
};
export type Data = {
  [K in keyof typeof schemas]: z.infer<(typeof schemas)[K]>;
};
export type Resource = z.infer<typeof resource>;
export type Key = keyof Data;
export const keys = Object.keys(schemas) as Key[];
export function validate(data: unknown): Data {
  const d = z.object(schemas).parse(data);
  for (const k of ["resources", "categories"] as const) {
    if (new Set(d[k].map((x) => x.id)).size !== d[k].length)
      throw Error("Hay identificadores duplicados");
  }
  for (const r of d.resources)
    if (!d.categories.some((c) => c.id === r.category))
      throw Error("Categoría inexistente: " + r.category);
  return d;
}
export const asset = (v: string) =>
  v.startsWith("https://") ? v : import.meta.env.BASE_URL + v;

// Drafts may contain unfinished fields; exported/public data always use strict validation.
function relax(s: z.ZodTypeAny): z.ZodTypeAny {
  if (s instanceof z.ZodOptional) return relax(s.unwrap()).optional();
  if (s instanceof z.ZodDefault) return relax(s.removeDefault()).default(s._def.defaultValue());
  if (s instanceof z.ZodEffects) return relax(s.innerType());
  if (s instanceof z.ZodString) return z.string();
  if (s instanceof z.ZodNumber) return z.number();
  if (s instanceof z.ZodArray) return z.array(relax(s.element));
  if (s instanceof z.ZodNullable) return relax(s.unwrap()).nullable();
  if (s instanceof z.ZodObject)
    return z.object(
      Object.fromEntries(
        Object.entries(s.shape).map(([k, v]) => [k, relax(v as z.ZodTypeAny)]),
      ),
    );
  return s;
}
export function validateDraft(d: unknown): Data {
  return relax(z.object(schemas)).parse(d) as Data;
}
export const safeHref = (v: string) => (/^https:\/\//.test(v) ? v : undefined);

export const uid = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
        v.toString(16).padStart(2, "0"),
      ).join("");
