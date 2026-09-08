/** Standkreis is the organisation; Atlas is one product. Keep the mark independent of product names and colours. */
export function Brand({ label, inverse = false }: { label: string; inverse?: boolean }) {
  return (
    <div role="img" aria-label={label} className="inline-flex items-center" data-testid="brand">
      {/* eslint-disable-next-line @next/next/no-img-element -- canonical local SVG, shared with the generated app icons */}
      <img src="/brand/standkreis-mark.svg" width={32} height={32} alt="" className={`mr-2.5 shrink-0 ${inverse ? 'brightness-0 invert' : ''}`} />
      <span aria-hidden className="mr-[7px] text-[18px] leading-none font-semibold tracking-tight">Standkreis</span>
      <span aria-hidden className="text-[18px] leading-none font-normal">Atlas</span>
    </div>
  )
}
