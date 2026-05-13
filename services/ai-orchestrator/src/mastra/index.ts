import { Mastra } from '@mastra/core';
import type { AiOrchestratorConfig } from '../config/env.js';
import { createMcadOperationalAgent } from './agents/mcad-operational-agent.js';

export function createMastra(config: AiOrchestratorConfig) {
  return new Mastra({
    agents: {
      mcadOperationalAgent: createMcadOperationalAgent(config),
    },
  });
}
