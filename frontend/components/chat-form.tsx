'use client'

import { cn } from '@/lib/utils'
import { ArrowUpIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AutoResizeTextarea } from '@/components/autoresize-textarea'
import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'

export function ChatForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      // First, perform vector search
      const vectorResponse = await fetch('http://localhost:8000/api/v1/vector/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: input.trim(),
          top_k: 3  // Adjust as needed
        }),
      })

      if (!vectorResponse.ok) throw new Error('Vector search failed')
      
      const vectorResults = await vectorResponse.json()
      const context = vectorResults.matches
        .map((match: { metadata: { description: string } }) => match.metadata.description)
        .join('\n')

      // Then, send chat request with context
      const response = await fetch('http://localhost:8000/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          stream: true,
          context: context  // Add context from vector search
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

            try {
              const parsed = JSON.parse(data)
              if (parsed.response) {
                partialResponse += parsed.response
                setMessages(prev => {
                  const updated = [...prev]
                  return !assistantMessageAdded
                    ? [...updated, { role: 'assistant', content: partialResponse }]
                    : [
                        ...updated.slice(0, -1),
                        { role: 'assistant', content: partialResponse },
                      ]
                })
                assistantMessageAdded = true
              }
            } catch {}
          }
        }
      }
    } catch {
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
    <header className="m-auto flex max-w-96 flex-col gap-5 text-center">
      <h1 className="text-2xl font-semibold leading-none tracking-tight">
        AI Chatbot with Vector Search
      </h1>
      <p className="text-muted-foreground text-sm">
        This chatbot uses FastAPI backend with Cohere for chat and vector search capabilities.
      </p>
    </header>
  )

  const messageList = (
    <div className="my-4 flex h-fit min-h-full flex-col gap-4">
      {messages.map((message, index) => (
        <div
          key={index}
          data-role={message.role}
          className="max-w-[80%] rounded-xl px-3 py-2 text-sm data-[role=assistant]:self-start data-[role=user]:self-end data-[role=assistant]:bg-gray-100 data-[role=user]:bg-blue-500 data-[role=assistant]:text-black data-[role=user]:text-white"
        >
          {message.content}
        </div>
      ))}
    </div>
  )

  return (
    <main
      className={cn(
        'ring-none my-4 mx-auto flex h-svh max-h-svh w-full max-w-[60rem] flex-col items-stretch border-none',
        className
      )}
      {...props}
    >
      <div className="flex-1 content-center overflow-y-auto px-6">
        {messages.length ? messageList : header}
      </div>
      <form
        onSubmit={handleSubmit}
        className="border-input bg-background focus-within:ring-ring/10 relative mx-6 mb-6 flex items-center rounded-[16px] border px-3 py-1.5 pr-8 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0"
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
              className="absolute bottom-1 right-1 size-6 rounded-full"
            >
              <ArrowUpIcon size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={12}>Submit</TooltipContent>
        </Tooltip>
      </form>
    </main>
  )
}