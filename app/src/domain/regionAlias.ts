/** Shared by registry ingestion and runtime search; original labels remain display data. */
export function normalizeRegionAlias(value: string) {
  return value.normalize('NFC').trim().toLocaleLowerCase('de-DE')
    .replaceAll('ä', 'ae').replaceAll('ö', 'oe').replaceAll('ü', 'ue').replaceAll('ß', 'ss')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}
