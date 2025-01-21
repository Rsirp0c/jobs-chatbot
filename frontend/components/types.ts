export interface MessageWithCitations {
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
  
  export interface ChatFormProps extends React.ComponentProps<'form'> {
    className?: string
  }
  
  export interface QueryAnalysisResponse {
    needs_vector_search: boolean
    reasoning: string
    modified_query: string
  }
  
  export interface JobMatch {
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
  
  export interface Citation {
    start: number
    end: number
    text: string
    document_id: string
  }