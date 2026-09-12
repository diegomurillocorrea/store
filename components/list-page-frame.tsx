import { Heading } from '@/styles/catalyst-ui-kit/heading'
import {
  listPageHeadingClass,
  listPageInsetClass,
  listPageSpacedClass,
} from '@/lib/ui/list-chrome'

interface ListPageFrameProps {
  title?: string
  spaced?: boolean
  children: React.ReactNode
}

export function ListPageFrame({ title, spaced = false, children }: ListPageFrameProps) {
  return (
    <div className={listPageInsetClass}>
      {title ? <Heading className={listPageHeadingClass}>{title}</Heading> : null}
      {spaced ? <div className={listPageSpacedClass}>{children}</div> : children}
    </div>
  )
}
