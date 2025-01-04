// JobMatches.tsx
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPinIcon, BuildingIcon, DollarSignIcon } from 'lucide-react'

interface JobMatch {
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
}

interface JobMatchesProps {
  matches: JobMatch[]
}

const JobCard = ({ job }: { job: JobMatch }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const previewLength = 150

  const description = job.metadata.description
  const previewText = description
    .replace(/<[^>]*>/g, '')
    .slice(0, previewLength) + (description.length > previewLength ? '...' : '')

  const formatSalary = () => {
    if (!job.metadata.min_amount && !job.metadata.max_amount) return null
    const currency = job.metadata.currency || 'USD'
    const interval = job.metadata.interval ? `/${job.metadata.interval.replace('ly', '')}` : ''
    
    if (job.metadata.min_amount === job.metadata.max_amount) {
      return `${currency} ${job.metadata.min_amount}${interval}`
    }
    return `${currency} ${job.metadata.min_amount}-${job.metadata.max_amount}${interval}`
  }

  const createMarkup = (html: string) => {
    return { __html: html }
  }

  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-lg font-semibold">{job.metadata.company} - {job.metadata.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <BuildingIcon size={16} />
              <span>{job.metadata.company}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              <MapPinIcon size={16} />
              <span>{job.metadata.location}</span>
            </div>
            {formatSalary() && (
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                <DollarSignIcon size={16} />
                <span>{formatSalary()}</span>
              </div>
            )}
            {job.metadata.date_posted && (
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                <span>Posted: {new Date(job.metadata.date_posted).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          {job.metadata.job_type && (
            <Badge variant="secondary" className="capitalize">
              {job.metadata.job_type.split(',')[0]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isExpanded ? (
          <div
            className="text-sm text-gray-700"
            dangerouslySetInnerHTML={{
              __html: description,
            }}
          />
        ) : (
          <div className="text-sm text-gray-700">
            {previewText}
          </div>
        )}
        <div className="flex justify-between mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(job.metadata.job_url, '_blank')}
          >
            Apply
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export const JobMatches = ({ matches }: JobMatchesProps) => {
  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-lg font-semibold mb-3">Matching Jobs</h3>
      <div className="space-y-4">
        {matches.map((match) => (
          <JobCard key={match.id} job={match} />
        ))}
      </div>
    </div>
  )
}