import type { StrategyRequest, SynthesizedIdeas } from './strategy';
import requestSchema from './schemas/strategy-request.json';
import ideasSchema from './schemas/synthesized-ideas.json';
import { compileParser } from './validate-json';

export const parseStrategyRequest = compileParser<StrategyRequest>(requestSchema, 'strategy request');
export const parseSynthesizedIdeas = compileParser<SynthesizedIdeas>(ideasSchema, 'AI synthesis');
