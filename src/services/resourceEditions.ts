import type { Data, Resource } from "./schema";
import type { Language } from "./i18n";
export function isBook(category: string, categories: Data["categories"]): boolean {
  return categories.find(item => item.id === category)?.name.trim().toLocaleLowerCase("es") === "libros";
}
export function resourceForLanguage(resource: Resource, language: Language): Resource {
  const edition = resource.editions?.[language];
  if (!edition) return resource;
  return {
    ...resource,
    title: edition.title?.trim() || resource.title,
    description: edition.description ?? resource.description,
    url: edition.url?.trim() || resource.url,
    // A translated file without an online viewer must not link to another edition's reader.
    viewUrl: edition.viewUrl?.trim() || (edition.url?.trim() && edition.url !== resource.url ? "" : resource.viewUrl),
    format: edition.format?.trim() || resource.format,
    size: edition.size?.trim() || (edition.url?.trim() && edition.url !== resource.url ? "" : resource.size),
  };
}
