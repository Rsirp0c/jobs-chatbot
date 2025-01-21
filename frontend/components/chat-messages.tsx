import { Message } from '@/components/message'
import { JobMatches } from '@/components/jobmatches'
import { Spinner } from '@/components/ui/spinner'
import { MessageWithCitations } from './types'

interface ChatMessagesProps {
  messages: MessageWithCitations[]
  isLoading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement>
}

//     <div className="flex h-fit min-h-full flex-col gap-4"></div>

export function ChatMessages({ messages, isLoading, messagesEndRef }: ChatMessagesProps) {
  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full px-4 py-4 min-h-full">
      {messages
        .filter(message => message.role !== 'system')
        .map((message, index) => (
          <>
            <Message 
              key={`message-${index}`}
              role={message.role as "system" | "user" | "assistant"} 
              content={message.content}
              citations={message.citations}
              matches={message.matches}
            />
            {message.role === 'assistant' && message.matches && (
              <JobMatches 
                key={`matches-${index}`}
                matches={message.matches}
              />
            )}
          </>
        ))}
      {isLoading && (
        <div className="self-start rounded-xl bg-white px-3 py-2">
          <Spinner className="text-blue-500" />
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}