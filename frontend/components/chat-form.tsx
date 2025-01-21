'use client'

import { cn } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import { toast } from '@/components/ui/use-toast'
import { ChatHeader } from './chat-header'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { ScrollButton } from './scroll-button'
import { MessageWithCitations, ChatFormProps, QueryAnalysisResponse } from './types'

const SYSTEM_MESSAGE = {
  role: 'system',
  content: "You are a job-matching assistant. Your purpose is to help users find jobs that match their skills and preferences. Provide brief introductions to job opportunities. If asked what you can do, respond concisely and stay focused on job-matching assistance."
}

const SUGGESTION_PROMPTS = [
  'What can you do?',
  "I'm looking for software engineering jobs in the Bay Area",
  "Find AI/ML jobs in Google",
  "Find senior level positions using Python or Java",
]

export function ChatForm({ className, ...props }: ChatFormProps) {
  const [messages, setMessages] = useState<MessageWithCitations[]>([SYSTEM_MESSAGE])
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
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      
      if (isNearBottom) {
        scrollToBottom()
      }
    }
  }, [messages])

  const analyzeQuery = async (query: string): Promise<QueryAnalysisResponse> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/agent/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error('Query analysis failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Error analyzing query:', error)
      return {
        needs_vector_search: false
      }
    }
  }

  const processStreamChunk = (
    chunk: string,
    partialResponse: string,
    citations: any[],
    assistantMessageAdded: boolean,
    setMessages: React.Dispatch<React.SetStateAction<MessageWithCitations[]>>,
    queryAnalysis: QueryAnalysisResponse,
    vectorResults: any
  ) => {
    const lines = chunk.split('\n')
    let updatedPartialResponse = partialResponse
    let updatedCitations = citations
    let updatedMessageAdded = assistantMessageAdded

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      
      const data = line.slice(6)
      if (data === '[DONE]' || data === '.') continue

      try {
        const jsonData = JSON.parse(data)
        
        if (jsonData.type === 'citation-start') {
          updatedCitations = [...updatedCitations, ...jsonData.citations]
        } else {
          updatedPartialResponse += jsonData
        }
      } catch (error) {
        updatedPartialResponse += data
      }

      setMessages(prev => {
        const newMessage = {
          role: 'assistant',
          content: updatedPartialResponse,
          matches: queryAnalysis.needs_vector_search ? vectorResults.matches : undefined,
          citations: updatedCitations
        }
        
        if (!updatedMessageAdded) {
          return [...prev, newMessage]
        }
        return [...prev.slice(0, -1), newMessage]
      })
      updatedMessageAdded = true
    }

    return {
      partialResponse: updatedPartialResponse,
      citations: updatedCitations,
      assistantMessageAdded: updatedMessageAdded
    }
  }

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return
  
    const userMessage = { role: 'user', content: messageContent.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    scrollToBottom
    setTimeout(() => scrollToBottom(), 0)
  
    try {
      // Run query analysis and potential vector search in parallel
      const abortController = new AbortController()
      
      const [queryAnalysis, vectorResults] = await Promise.all([
        analyzeQuery(messageContent.trim()),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/vector/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: messageContent.trim(), 
            top_k: 3 
          }),
          signal: abortController.signal
        })
          .then(res => res.json())
          .catch((error) => {
            // If aborted, return empty matches
            if (error.name === 'AbortError') {
              return { matches: [] }
            }
            // For other errors, also return empty matches
            return { matches: [] }
          })
      ]).then(([queryAnalysis, vectorResults]) => {
        // If vector search is not needed, abort the request
        if (!queryAnalysis.needs_vector_search) {
          abortController.abort()
        }
        return [queryAnalysis, vectorResults]
      })
  
      const documents = queryAnalysis.needs_vector_search 
        ? vectorResults.matches.map((match: any, index: number) => ({
            id: String(index + 1),
            data: `${match.metadata.company} - ${match.metadata.title}: ${match.metadata.description}`,
          }))
        : []
  
  
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages.filter(msg => msg.role !== 'system'), userMessage]
            .map(msg => ({
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
      let citations: any[] = []
  
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
  
        const chunk = new TextDecoder().decode(value)
        const result = processStreamChunk(
          chunk,
          partialResponse,
          citations,
          assistantMessageAdded,
          setMessages,
          queryAnalysis,
          vectorResults
        )
        
        partialResponse = result.partialResponse
        citations = result.citations
        assistantMessageAdded = result.assistantMessageAdded
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

  return (
    <main
      className={cn(
        'ring-none flex h-screen w-full flex-col items-stretch border-none relative',
        className
      )}
      {...props}
    >
      <div 
        ref={containerRef}
        className="flex-1 content-center overflow-y-auto" 
      >
        {messages.length > 1 ? (
          <ChatMessages 
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />
        ) : (
          <ChatHeader 
            suggestionPrompts={SUGGESTION_PROMPTS}
            onSuggestionClick={sendMessage}
          />
        )}
      </div>

      <ScrollButton 
        show={showScrollButton}
        onClick={scrollToBottom}
      />

      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
      />
    </main>
  )
}