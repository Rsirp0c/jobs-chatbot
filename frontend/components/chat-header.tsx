import { Button } from '@/components/ui/button'

interface ChatHeaderProps {
  suggestionPrompts: string[]
  onSuggestionClick: (prompt: string) => void
}

export function ChatHeader({ suggestionPrompts, onSuggestionClick }: ChatHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:gap-4 md:gap-5 px-4 sm:px-6 text-left max-w-3xl mx-auto w-full pt-4">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight sm:leading-tight md:leading-none tracking-tight">
        AI Answer Engine for{" "}
        <span className="block text-blue-400 text-right mt-1">
          <em>Job Matching</em>
        </span>
      </h1>
      <p className="text-muted-foreground text-sm sm:text-base md:text-md">
        This chatbot uses Cohere and Pinecone for chat and vector search capabilities.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {suggestionPrompts.map((prompt, index) => (
          <Button
            key={index}
            variant="outline"
            className="text-md"
            onClick={() => onSuggestionClick(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </header>
  )
}