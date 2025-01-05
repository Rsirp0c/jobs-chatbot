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

interface ChatFormProps extends React.ComponentProps<'form'> {
  className?: string;
}

export function ChatForm({ className, ...props }: ChatFormProps) {
  const [messages, setMessages] = useState<{ role: string; content: string; matches?: any[] }[]>([
    { 
      role: 'system', 
      content: "You're an assistant for finding the best match job. Briefly introduce the jobs."
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
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // First, perform vector search
      const vectorResponse = await fetch('http://localhost:8000/api/v1/vector/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input.trim(), top_k: 3 }),
      })

      if (!vectorResponse.ok) throw new Error('Vector search failed')

      const vectorResults = await vectorResponse.json()
      const documents = vectorResults.matches.map((match: any, index: number) => ({
        id: String(index + 1),
        data: `${match.metadata.company} - ${match.metadata.title}: ${match.metadata.description}`,
      }))

      // Then, send chat request with context
      const response = await fetch('http://localhost:8000/api/v1/chat/stream', {
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            partialResponse += data
            setMessages(prev => {
              if (!assistantMessageAdded) {
                return [...prev, { 
                  role: 'assistant', 
                  content: partialResponse,
                  matches: vectorResults.matches 
                }]
              }
              return [
                ...prev.slice(0, -1),
                { 
                  role: 'assistant', 
                  content: partialResponse,
                  matches: vectorResults.matches 
                }
              ]
            })
            assistantMessageAdded = true
          }
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
    }
  }

  const header = (
    <header className="m-auto flex max-w-full flex-col gap-3 sm:gap-4 md:gap-5 px-4 sm:px-6 text-left">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight sm:leading-tight md:leading-none tracking-tight">
        AI Answer Engine for{" "}
        <span className="block text-blue-400 text-right">
          <em>Job Matching</em>
        </span>
      </h1>
      <p className="text-muted-foreground text-sm sm:text-base md:text-md">
        This chatbot uses FastAPI backend with Cohere for chat and vector search capabilities.
      </p>
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
        'ring-none mx-auto flex h-svh max-h-svh w-full max-w-4xl flex-col items-stretch border-none relative',
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