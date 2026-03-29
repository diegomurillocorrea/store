import { Heading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface ModulePlaceholderProps {
  title: string
  description?: string
}

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <div>
      <Heading>{title}</Heading>
      {description ? <Text className="mt-2">{description}</Text> : null}
    </div>
  )
}
