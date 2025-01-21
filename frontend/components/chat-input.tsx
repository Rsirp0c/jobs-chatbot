import { AutoResizeTextarea } from '@/components/autoresize-textarea'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowUpIcon } from 'lucide-react'

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

export function ChatInput({ input, isLoading, onInputChange, onSubmit, onKeyDown }: ChatInputProps) {
  return (
    <div className="min-h-14 bg-white z-50">
      <form
        onSubmit={onSubmit}
        className="min-h-8 border-input bg-background focus-within:ring-ring/10 fixed bottom-6 max-w-3xl w-[calc(100%-2rem)] mx-auto left-0 right-0 flex items-center rounded-[16px] border px-3 py-2 pr-8 text-md focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0"
      >
        <AutoResizeTextarea
          onKeyDown={onKeyDown}
          onChange={e => onInputChange(e.target.value)}
          value={input}
          placeholder="Enter a message"
          disabled={isLoading}
          className="placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="submit"
              disabled={isLoading}
              variant="ghost"
              size="sm"
              className="absolute bottom-2 right-1 size-6 rounded-full"
            >
              <ArrowUpIcon size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={12}>Submit</TooltipContent>
        </Tooltip>
      </form>
    </div>
  )
}