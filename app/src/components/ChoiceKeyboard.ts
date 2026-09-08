import type { KeyboardEvent } from 'react'

/** Arrow keys select the adjacent option in an ARIA radio group. Native radios need no helper. */
export function radioKeys(event: KeyboardEvent<HTMLElement>) {
  const backwards = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
  const forwards = event.key === 'ArrowRight' || event.key === 'ArrowDown'
  if (!backwards && !forwards && event.key !== 'Home' && event.key !== 'End') return
  if (!(event.target instanceof HTMLElement) || event.target.getAttribute('role') !== 'radio') return
  const options = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')].filter((el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true')
  if (!options.length) return
  event.preventDefault()
  const index = options.indexOf(event.target as HTMLButtonElement)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (backwards ? -1 : 1) + options.length) % options.length
  options[next].focus()
  options[next].click()
}
