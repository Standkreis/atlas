/** Persisted JSON and old offline snapshots are not trusted to contain labelled strings. */
export function taxonNames(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([language, name]) => /^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/.test(language) && typeof name === 'string' && name.trim()).map(([language, name]) => [language, (name as string).trim()]))
}

export function taxonNameParts(value: unknown, scientificName: string, locale: string) {
  const names = taxonNames(value)
  const languages = [...new Set([locale, 'de', 'en', ...Object.keys(names).sort()])]
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
  const chosen = languages.map((language) => names[language]).find(Boolean) ?? scientificName
  const primary = same(chosen, scientificName) ? scientificName : chosen
  const seen = new Set([primary.toLowerCase(), scientificName.toLowerCase()])
  const alternatives = languages.flatMap((language) => {
    const name = names[language]
    if (!name || seen.has(name.toLowerCase())) return []
    seen.add(name.toLowerCase())
    return [{ language, name }]
  })
  return { primary, scientific: same(primary, scientificName) ? null : scientificName, alternatives }
}

export const taxonDisplayName = (taxon: { names: unknown; sciName: string }, locale: string) => taxonNameParts(taxon.names, taxon.sciName, locale).primary
