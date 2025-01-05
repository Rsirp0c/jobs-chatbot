'use client'

import { cn } from '@/lib/utils'
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AutoResizeTextarea } from '@/components/autoresize-textarea'
import { useState, useEffect, useRef } from 'react'
import { toast } from '@/components/ui/use-toast'
import { Message } from '@/components/message'
import { Spinner } from '@/components/ui/spinner'
import { JobMatches } from '@/components/jobmatches'

const suggestionPrompts = [
  "I'm looking for software engineering jobs in the Bay Area",
  "Show me remote frontend jobs",
  "Find AI/ML jobs in Google",
  "Find entry-level positions using Python or Java",

]

interface ChatFormProps extends React.ComponentProps<'form'> {
  className?: string;
}

interface MessageWithCitations {
  role: string
  content: string
  matches?: any[]
  citations?: {
    start: number
    end: number
    text: string
    document_id: string
  }[]
}

interface Citation {
  start: number
  end: number
  text: string
  document_id: string
}

export function ChatForm({ className, ...props }: ChatFormProps) {
  const [messages, setMessages] = useState<MessageWithCitations[]>([
    { 
      role: 'system', 
      content: "You're an assistant for finding the best match job. Briefly introduce the jobs. do not output markdown."
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleScroll = () => {
    if (!containerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollButton(!isNearBottom)
  }

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    // Only auto-scroll if we're already near the bottom
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      
      if (isNearBottom) {
        scrollToBottom()
      }
    }
  }, [messages])

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return

    const userMessage = { role: 'user', content: messageContent.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    // Force scroll to bottom when user sends a message
    setTimeout(() => scrollToBottom(), 0)

    try {
      const vectorResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/vector/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: messageContent.trim(), top_k: 3 }),
      })

      if (!vectorResponse.ok) throw new Error('Vector search failed')

      const vectorResults = await vectorResponse.json()
      const documents = vectorResults.matches.map((match: any, index: number) => ({
        id: String(index + 1),
        data: `${match.metadata.company} - ${match.metadata.title}: ${match.metadata.description}`,
      }))

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          stream: true,
          context: documents,
        }),
      })

      if (!response.ok) throw new Error('Network error')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      let partialResponse = ''
      let assistantMessageAdded = false
      let citations: Citation[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          
          const data = line.slice(6)
          if (data === '[DONE]') continue
          if (data === '.') continue

          try {
            const jsonData = JSON.parse(data)
            
            if (jsonData.type === 'citation-start') {
              citations = [...citations, ...jsonData.citations]
            } else {
              partialResponse += jsonData
            }
          } catch (error) {
            partialResponse += data
          }

          setMessages(prev => {
            const newMessage = {
              role: 'assistant',
              content: partialResponse,
              matches: vectorResults.matches,
              citations: citations
            }
            
            if (!assistantMessageAdded) {
              return [...prev, newMessage]
            }
            return [...prev.slice(0, -1), newMessage]
          })
          assistantMessageAdded = true
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
    }
  }

  const header = (
    <header className="m-auto flex max-w-3xl flex-col gap-3 sm:gap-4 md:gap-5 px-4 sm:px-6 text-left">
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
            className="text-sm"
            onClick={() => sendMessage(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </header>
  )

  const messageList = (
    <div className="flex h-fit min-h-full flex-col gap-4">
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

  return (
    <main
      className={cn(
        'ring-none mx-auto flex h-svh max-h-svh w-full max-w-6xl flex-col items-stretch border-none relative',
        className
      )}
      {...props}
    >
      <div 
        ref={containerRef}
        className="flex-1 content-center overflow-y-auto px-6 pt-4 mb-2" 
      >
        {messages.length > 1 ? messageList : header}
      </div>

      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          variant="outline"
          size="icon"
          className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full shadow-md hover:shadow-lg"
        >
          <ArrowDownIcon size={16} />
        </Button>
      )}

      <div className="min-h-14 bg-white z-50">
        <form
          onSubmit={handleSubmit}
          className="min-h-8 border-input bg-background focus-within:ring-ring/10 fixed bottom-6 max-w-3xl w-[calc(100%-2rem)] mx-auto left-0 right-0 flex items-center rounded-[16px] border px-3 py-2 pr-8 text-md focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0"
        >
          <AutoResizeTextarea
            onKeyDown={handleKeyDown}
            onChange={e => setInput(e.target.value)}
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
    </main>
  )
}
