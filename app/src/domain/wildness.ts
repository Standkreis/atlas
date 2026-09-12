export type Wildness = 'wild' | 'captive' | 'cultivated'

/** Capture treats kept plants as cultivated and other species (including fungi) as captive.
 * Keep an inconsistent stored value selectable until the owner explicitly corrects it.
 */
export function sightingWildnessChoices(tile: string, stored: Wildness): Wildness[] {
  const choices: Wildness[] = ['wild', tile === 'plant' ? 'cultivated' : 'captive']
  return choices.includes(stored) ? choices : [...choices, stored]
}
