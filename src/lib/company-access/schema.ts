import type { MetaArchitectureDossier } from '@/shared/terminal';
import schema from '@/shared/schemas/financial-entity.json';
import { compileParser } from '@/shared/validate-json';

export const parseCompanyAnalysis = compileParser<MetaArchitectureDossier>({
  $ref: '#/definitions/MetaArchitectureDossier', definitions: schema.definitions,
}, 'CompanyAnalysis');
