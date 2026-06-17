using Identificacao.API.AsyncApi.Messages;
using Saunter.Attributes;

namespace Identificacao.API.AsyncApi;

/// <summary>
/// Definição dos canais assíncronos do domínio Identificação.
/// Saunter escaneia esta classe e gera a documentação AsyncAPI automaticamente.
/// Todos os eventos são publicados no exchange `identificacao.events` (topic, durable)
/// no formato CloudEvents 1.0 via padrão Transactional Outbox.
/// </summary>
[AsyncApi]
public class IdentificacaoChannels
{
    [Channel("identificacao.rol.fechado",
        Description = "Publicado quando um Rol de Execuções é fechado pelo analista. " +
                      "Contém todas as execuções musicais da captação no período informado. " +
                      "Downstream: Distribuição consome este evento para iniciar o cálculo de créditos.",
        BindingsRef = "amqp")]
    [PublishOperation(typeof(RolFechadoPayload), "fechamento",
        Summary = "Rol de execuções fechado",
        OperationId = "publicarRolFechado")]
    [Message(typeof(RolFechadoPayload),
        Name = "RolFechado",
        Title = "Rol Fechado",
        Summary = "Rol de execuções musicais fechado — pronto para distribuição de créditos")]
    public void RolFechado(RolFechadoPayload payload) { }

    [Channel("identificacao.rol.cancelado",
        Description = "Publicado quando uma captação/rol é cancelada pelo analista responsável " +
                      "(opcionalmente com recriação). Downstream: Distribuição consome este evento " +
                      "para invalidar cálculos associados ao rol anterior.",
        BindingsRef = "amqp")]
    [PublishOperation(typeof(RolCanceladoPayload), "cancelamento",
        Summary = "Rol de execuções cancelado",
        OperationId = "publicarRolCancelado")]
    [Message(typeof(RolCanceladoPayload),
        Name = "RolCancelado",
        Title = "Rol Cancelado",
        Summary = "Rol de execuções musicais cancelado")]
    public void RolCancelado(RolCanceladoPayload payload) { }
}
