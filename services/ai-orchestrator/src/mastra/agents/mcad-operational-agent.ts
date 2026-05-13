import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import type { AiOrchestratorConfig } from '../../config/env.js';
import { runtimeContextToObject, type McadRuntimeContext } from '../../schemas/runtime-context.js';
import { consultarPermissoesUsuario } from '../tools/authz-tool.js';
import { createCadastroTools } from '../tools/cadastro-tools.js';
import { createArrecadacaoTools } from '../tools/arrecadacao-tools.js';
import { createDistribuicaoTools } from '../tools/distribuicao-tools.js';
import { createAuditoriaTools } from '../tools/auditoria-tools.js';

export function createMcadOperationalAgent(config: AiOrchestratorConfig) {
  const cadastroTools = createCadastroTools({ config });
  const arrecadacaoTools = createArrecadacaoTools({ config });
  const distribuicaoTools = createDistribuicaoTools({ config });
  const auditoriaTools = createAuditoriaTools({ config });

  return new Agent({
    name: 'mcad-operational-agent',
    instructions: ({ runtimeContext }) => {
      const values = runtimeContextToObject(runtimeContext as McadRuntimeContext);

      return [
        'Voce e o copiloto operacional do MCAD.',
        'Responda sempre em portugues do Brasil.',
        'Use tools para consultar dados de Cadastro, Arrecadacao, Identificacao, Distribuicao e Auditoria.',
        'Nunca invente dados operacionais; diferencie dados consultados de inferencias.',
        'Nao exponha dados quando uma tool negar permissao.',
        'Proponha acoes sensiveis como plano, nao as execute automaticamente.',
        `Permissoes efetivas do usuario: ${JSON.stringify(values.permissions)}`,
      ].join('\n');
    },
    model: openai(config.openAiModel),
    tools: {
      consultarPermissoesUsuario,
      ...cadastroTools,
      ...arrecadacaoTools,
      ...distribuicaoTools,
      ...auditoriaTools,
    },
  });
}
