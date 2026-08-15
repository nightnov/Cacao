import { ProductVariant, VariantOption } from '@/types/admin'

export function generateVariantCombinations(options: VariantOption[]): Record<string, string>[] {
  const usableOptions = options.filter(o => o.name.trim() && o.values.length > 0)
  if (usableOptions.length === 0) return []

  return usableOptions.reduce<Record<string, string>[]>(
    (combinations, option) =>
      combinations.flatMap(combo =>
        option.values.map(value => ({ ...combo, [option.name]: value }))
      ),
    [{}]
  )
}

export function variantLabel(optionValues: Record<string, string>): string {
  return Object.values(optionValues).join(' / ')
}

function sameCombination(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every(key => a[key] === b[key])
}

export function findMatchingVariant(
  variants: ProductVariant[],
  selected: Record<string, string>
): ProductVariant | undefined {
  return variants.find(v => sameCombination(v.option_values, selected))
}
