interface AvatarProps {
  name: string
  imageUrl?: string | null
  size?: 'sm' | 'md'
}

export function Avatar({ name, imageUrl, size = 'md' }: AvatarProps) {
  const dimension = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  const initial = (name || '?').trim().charAt(0).toUpperCase()

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={name} className={`${dimension} rounded-full object-cover flex-shrink-0`} />
    )
  }

  return (
    <div className={`${dimension} rounded-full bg-orange-50 text-[#FF6600] font-semibold flex items-center justify-center flex-shrink-0`}>
      {initial}
    </div>
  )
}
