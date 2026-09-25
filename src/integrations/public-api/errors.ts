export type ApiErrorCode =
  | 'UNAUTHORIZED' | 'FORBIDDEN' | 'INSUFFICIENT_SCOPE'
  | 'PROJECT_NOT_FOUND' | 'DOCUMENT_NOT_FOUND' | 'SLIDE_NOT_FOUND' | 'ELEMENT_NOT_FOUND'
  | 'INVALID_REQUEST' | 'VALIDATION_ERROR' | 'CONFLICT' | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE' | 'EXPORT_FAILED' | 'INTERNAL_ERROR'

export interface ErrorEnvelope {
  error: { code: ApiErrorCode; message: string; requestId: string; details: Record<string, unknown> }
}

export class PublicApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
    public readonly details: Record<string, unknown> = {},
  ) { super(message); this.name = 'PublicApiError' }

  toEnvelope(requestId: string): ErrorEnvelope {
    return { error: { code: this.code, message: this.message, requestId, details: this.details } }
  }
}

export const notFound = (kind: 'PROJECT' | 'DOCUMENT' | 'SLIDE' | 'ELEMENT') => new PublicApiError(`${kind}_NOT_FOUND`, `${kind[0]}${kind.slice(1).toLowerCase()} not found.`, 404)
export const conflict = (expected: number, actual: number) => new PublicApiError('CONFLICT', 'The resource has changed. Fetch it again and retry with the latest revision.', 409, { expectedRevision: expected, actualRevision: actual })

