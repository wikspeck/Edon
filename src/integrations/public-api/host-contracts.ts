import type { ApiPrincipal, ApiScope } from './contract'

export interface VerifiedAccessToken {
  principal: ApiPrincipal
  issuer: string
  audience: string
  expiresAt: string
  tokenId?: string
}

export interface AccessTokenVerifier {
  verify(bearerToken: string, requiredScopes: readonly ApiScope[]): Promise<VerifiedAccessToken>
}

export interface RateLimitDecision { allowed: boolean; limit: number; remaining: number; retryAfterSeconds?: number }
export interface IntegrationRateLimiter {
  check(input: { subject: string; clientId: string; ip?: string; operationId: string; category: 'read' | 'write' | 'batch' | 'asset' | 'export' }): Promise<RateLimitDecision>
}

export interface AuditRecord {
  id: string
  requestId: string
  occurredAt: string
  subject: string
  clientId: string
  operationId: string
  outcome: 'success' | 'failure'
  resourceType?: 'project' | 'document' | 'slide' | 'element' | 'asset' | 'export'
  resourceId?: string
  changedFields?: string[]
  errorCode?: string
}

export interface AuditSink { write(record: AuditRecord): Promise<void> }

export interface IntegrationLogEvent {
  requestId: string
  operationId: string
  status: number
  latencyMs: number
  clientId?: string
  pseudonymousSubject?: string
  errorCode?: string
}

export interface IntegrationLogger { write(event: IntegrationLogEvent): void }

export interface PublicApiHostConfig {
  enabled: boolean
  apiOrigin: string
  oauthIssuer: string
  oauthAudience: string
  allowedOrigins: readonly string[]
  maxRequestBytes: number
}

