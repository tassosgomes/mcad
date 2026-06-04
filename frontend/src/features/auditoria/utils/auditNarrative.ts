import type { AuditDataAction, AuditEventDetail, AuditEventType, AuditTimelineItem } from '../types/audit-event';
import { formatEntityType } from '../constants/auditEntityTypes';
import { formatScreenLabel } from '../constants/screenCatalog';

const ACTION_VERB: Record<AuditDataAction, string> = {
  CREATE: 'cadastrou',
  UPDATE: 'alterou',
  DELETE: 'excluiu',
};

const TYPE_VERB: Record<AuditEventType, string> = {
  DATA_CHANGE: 'alterou',
  SCREEN_ACCESS: 'abriu',
  USER_ACTION: 'executou',
};

function resolveActorName(actor?: AuditEventDetail['actor'] | AuditTimelineItem['actor']): string {
  if (!actor) return 'Um usuário';
  return actor.displayName ?? actor.username ?? actor.userId ?? 'Um usuário';
}

function pluralFields(count: number): string {
  if (count === 1) return '1 campo';
  return `${count} campos`;
}

/**
 * Frase curta para uso em listas/cards: "Operador cadastrou Obra Musical" ou
 * "Gerente alterou 3 campos em Obra Musical".
 */
export function summarizeTimelineItem(
  item: AuditTimelineItem,
  entityType: string,
): string {
  const actor = resolveActorName(item.actor);
  const entityLabel = formatEntityType(entityType);
  const fields = item.changedFields ?? [];

  if (item.eventType === 'SCREEN_ACCESS') {
    const screen = formatScreenLabel(item.screen?.screenId, item.screen?.screenName);
    return `${actor} abriu ${screen}`;
  }

  if (item.eventType === 'USER_ACTION') {
    const action = item.summary ?? item.action ?? 'uma ação';
    return `${actor} executou “${action}” em ${entityLabel}`;
  }

  const action = item.action ?? '';
  if (action in ACTION_VERB) {
    const verb = ACTION_VERB[action as AuditDataAction];
    if (verb === 'alterou' && fields.length > 0) {
      return `${actor} alterou ${pluralFields(fields.length)} em ${entityLabel}`;
    }
    return `${actor} ${verb} ${entityLabel}`;
  }

  if (fields.length > 0) {
    return `${actor} alterou ${pluralFields(fields.length)} em ${entityLabel}`;
  }

  return `${actor} registrou um evento em ${entityLabel}`;
}

/**
 * Frase completa para o cabeçalho do detalhe: inclui ação, alvo e contexto de
 * tela. Usada no modal/painel de detalhe.
 */
export function describeEventDetail(detail: AuditEventDetail): string {
  const actor = resolveActorName(detail.actor);
  const entityLabel = formatEntityType(detail.data?.entityType ?? null);
  const screen = formatScreenLabel(detail.origin?.screenId, detail.origin?.screenName)
    ?? formatScreenLabel(detail.screen?.screenId, detail.screen?.screenName);
  const fields = detail.data?.changedFields ?? [];

  let core: string;
  if (detail.eventType === 'SCREEN_ACCESS') {
    core = `${actor} abriu ${screen}`;
  } else if (detail.eventType === 'USER_ACTION') {
    const action = detail.action?.label ?? detail.action?.name ?? 'uma ação';
    core = `${actor} executou “${action}”${detail.data?.entityType ? ` em ${entityLabel}` : ''}`;
  } else {
    const action = detail.data?.action;
    if (action && action in ACTION_VERB) {
      const verb = ACTION_VERB[action as AuditDataAction];
      if (verb === 'alterou' && fields.length > 0) {
        core = `${actor} alterou ${pluralFields(fields.length)} em ${entityLabel}`;
      } else {
        core = `${actor} ${verb} ${entityLabel}`;
      }
    } else {
      core = `${actor} ${TYPE_VERB[detail.eventType]} ${entityLabel}`;
    }
  }

  if (screen && screen !== '—' && detail.eventType !== 'SCREEN_ACCESS') {
    return `${core} pela tela ${screen}`;
  }
  return core;
}
