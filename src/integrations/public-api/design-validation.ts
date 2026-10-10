import schemas from '../../model/design-schema.json'
import { PublicApiError } from './errors'

interface Schema { type?: string; enum?: unknown[]; properties?: Record<string,Schema>; required?: string[]; items?: Schema; minimum?: number; maximum?: number; minItems?: number; maxItems?: number; maxLength?: number; pattern?: string; additionalProperties?: boolean; oneOf?: Schema[] }
export function assertDesignField(field: keyof typeof schemas, value: unknown): void {
  function visit(schema: Schema, input: unknown, path: string) {
    const invalid = () => { throw new PublicApiError('VALIDATION_ERROR', `Invalid ${path}.`,400,{field:path}) }
    if (schema.oneOf) { for (const option of schema.oneOf) { try { visit(option,input,path); return } catch { /* try next variant */ } } invalid() }
    if (schema.enum && !schema.enum.includes(input)) invalid()
    if (schema.type === 'object') {
      if (!input || typeof input !== 'object' || Array.isArray(input)) invalid()
      const obj = input as Record<string,unknown>
      for (const key of schema.required ?? []) if (obj[key] === undefined) invalid()
      for (const [key,v] of Object.entries(obj)) { const child=schema.properties?.[key]; if (!child && schema.additionalProperties === false) invalid(); if (child) visit(child,v,`${path}.${key}`) }
    }
    if (schema.type === 'array') { if (!Array.isArray(input)) invalid(); const list=input as unknown[]; if (list.length < (schema.minItems ?? 0) || list.length > (schema.maxItems ?? Infinity)) invalid(); list.forEach((v,i)=>schema.items && visit(schema.items,v,`${path}.${i}`)) }
    if (schema.type === 'string' && (typeof input !== 'string' || input.length > (schema.maxLength ?? Infinity) || (schema.pattern && !new RegExp(schema.pattern).test(input)))) invalid()
    if (schema.type === 'number' && (typeof input !== 'number' || !Number.isFinite(input) || input < (schema.minimum ?? -Infinity) || input > (schema.maximum ?? Infinity))) invalid()
    if (schema.type === 'boolean' && typeof input !== 'boolean') invalid()
  }
  visit(schemas[field] as Schema,value,field)
}
