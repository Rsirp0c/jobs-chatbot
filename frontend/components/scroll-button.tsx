import { Button } from '@/components/ui/button'
import { ArrowDownIcon } from 'lucide-react'

interface ScrollButtonProps {
  onClick: () => void
  show: boolean
}

export function ScrollButton({ onClick, show }: ScrollButtonProps) {
  if (!show) return null

  return (
    <Button
      onClick={onClick}
      variant="outline"
      size="icon"
      className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full shadow-md hover:shadow-lg"
    >
      <ArrowDownIcon size={16} />
    </Button>
  )
}