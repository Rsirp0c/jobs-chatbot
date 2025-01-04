// Message.tsx
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { JobMatches } from '@/components/jobmatches'
import { FC } from 'react'

interface JobMetadata {
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
}

interface JobMatch {
  id: string
  score: number
  metadata: JobMetadata
}

interface MessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  matches?: JobMatch[]
}

interface CodeProps {
  node?: any
  inline?: boolean
  className?: string
  children: React.ReactNode
  [key: string]: any
}

export const Message: FC<MessageProps> = ({ role, content, matches }) => {
  return (
    <div
      data-role={role}
      className={cn(
        "max-w-[100%] rounded-xl px-3 py-2 text-md",
        "data-[role=assistant]:self-start data-[role=user]:self-end",
        "data-[role=assistant]:bg-white data-[role=user]:bg-blue-500",
        "data-[role=assistant]:text-black data-[role=user]:text-white",
        role === 'assistant' && "prose prose-sm dark:prose-invert"
      )}
    >
      {role === 'assistant' ? (
        <>
          <ReactMarkdown
            components={{
              code: ({ node, inline, className, children, ...props }: CodeProps) => {
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
              }
            }}
          >
            {content}
          </ReactMarkdown>
          {matches && matches.length > 0 && (
            <JobMatches matches={matches} />
          )}
        </>
      ) : (
        content
      )}
    </div>
  )
}

export default Message