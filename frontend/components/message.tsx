import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { FC } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface MessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  citations?: {
    start: number
    end: number
    text: string
    document_id: string
  }[]
  matches?: {
    id: string
    score: number
    metadata: {
      company: string
      title: string
      description: string
      location: string
      job_type: string
      min_amount?: number
      max_amount?: number
      currency?: string
      interval?: string
      job_url: string
      date_posted?: string
    }
  }[]
}

const MarkdownContent = ({ content }: { content: string }) => (
  <ReactMarkdown
    components={{
      code: ({ inline, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || '')
        return !inline && match ? (
          <SyntaxHighlighter
            style={tomorrow}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        )
      },
      // Add handling for superscript
      sup: ({children}) => (
        <sup className="text-blue-500 font-semibold">
          {children}
        </sup>
      ),
      // Better paragraph handling
      p: ({children}) => (
        <span className="whitespace-normal inline">
          {children}
        </span>
      ),
      // Handle links better
      a: ({href, children}) => (
        <span className="text-blue-500 hover:text-blue-600 cursor-pointer">
          {children}
        </span>
      )
    }}
  >
    {content}
  </ReactMarkdown>
)

const CitationText: FC<{ 
  text: string
  documentId: string
  matches?: MessageProps['matches']
}> = ({ text, documentId, matches }) => {
  // Find the matching job based on the citation document ID
  // documentId is "1", "2", "3" etc. matching the index+1 from vector search
  const jobMatch = matches?.find((_, index) => String(index + 1) === documentId)

  const preview = jobMatch ? (
    <div className="max-w-[300px] space-y-2">
      <div className="font-semibold">{jobMatch.metadata.company} - {jobMatch.metadata.title}</div>
      <div className="text-sm text-gray-600">{jobMatch.metadata.location}</div>
    </div>
  ) : (
    `Source: ${documentId}`
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="whitespace-normal inline border-b border-dashed border-gray-400">
          {text}
          <sup className="ml-0.5 text-blue-500 font-semibold inline">[{documentId}]</sup>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="p-3">
        {preview}
      </TooltipContent>
    </Tooltip>
  )
}

export const Message: FC<MessageProps> = ({ role, content, citations = [], matches = [] }) => {
  console.log('Message component received props:', {
    role,
    citationsLength: citations.length,
    matchesLength: matches.length,
    matches
  })

  const findWordBoundaries = (text: string, start: number, end: number) => {
    while (start > 0 && /\w/.test(text[start - 1])) {
      start--
    }
    while (end < text.length && /\w/.test(text[end])) {
      end++
    }
    return { start, end }
  }

  const renderContent = () => {
    if (!citations.length) {
      return <MarkdownContent content={content} />
    }

    // Group citations by document_id and keep only the last occurrence
    const lastCitationBySource = citations.reduce((acc, citation) => {
      const existingCitation = acc[citation.document_id]
      if (!existingCitation || existingCitation.end < citation.end) {
        // Adjust citation boundaries to word boundaries
        const { start, end } = findWordBoundaries(content, citation.start, citation.end)
        acc[citation.document_id] = { ...citation, start, end }
      }
      return acc
    }, {} as Record<string, typeof citations[0]>)

    // Convert back to array and sort by position
    const consolidatedCitations = Object.values(lastCitationBySource)
      .sort((a, b) => a.start - b.start)

    let lastIndex = 0
    const elements = []

    consolidatedCitations.forEach((citation, idx) => {
      if (citation.start > lastIndex) {
        elements.push(
          <span key={`text-${idx}`} className="whitespace-normal inline">
            <MarkdownContent content={content.substring(lastIndex, citation.start)} />
          </span>
        )
      }

      elements.push(
        <CitationText
          key={`citation-${idx}`}
          text={content.substring(citation.start, citation.end)}
          documentId={citation.document_id}
          matches={matches}
        />
      )

      lastIndex = citation.end
    })

    if (lastIndex < content.length) {
      elements.push(
        <span key="text-end" className="whitespace-normal inline">
          <MarkdownContent content={content.substring(lastIndex)} />
        </span>
      )
    }

    return <span className="whitespace-normal inline">{elements}</span>
  }

  return (
    <div
      data-role={role}
      className={cn(
        "max-w-[100%] rounded-xl px-3 py-2 text-md whitespace-normal",
        "data-[role=assistant]:self-start data-[role=user]:self-end",
        "data-[role=assistant]:bg-white data-[role=user]:bg-blue-500",
        "data-[role=assistant]:text-black data-[role=user]:text-white",
        role === 'assistant' && "prose prose-sm dark:prose-invert"
      )}
    >
      {role === 'assistant' ? renderContent() : content}
    </div>
  )
}

export default Message