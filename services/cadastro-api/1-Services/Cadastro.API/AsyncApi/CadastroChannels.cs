using Cadastro.API.AsyncApi.Messages;
using Saunter.Attributes;

namespace Cadastro.API.AsyncApi;

/// <summary>
/// Definição dos canais assíncronos do domínio Cadastro.
/// Saunter escaneia esta classe e gera a documentação AsyncAPI automaticamente.
/// Todos os eventos são publicados no exchange `cadastro.events` (topic, durable)
/// no formato CloudEvents 1.0 via padrão Transactional Outbox.
/// </summary>
[AsyncApi]
public class CadastroChannels
{
    // ── Obras ─────────────────────────────────────────────────────────────────

    [Channel("cadastro.obra.liberada",
        Description = "Publicado quando uma obra musical tem seu status alterado para LIBERADA, tornando-a disponível para uso por outros domínios.",
        BindingsRef = "amqp")]
    [PublishOperation(typeof(ObraLiberadaPayload), "obras",
        Summary = "Obra liberada para uso",
        OperationId = "publicarObraLiberada")]
    [Message(typeof(ObraLiberadaPayload),
        Name = "ObraLiberada",
        Title = "Obra Liberada",
        Summary = "Uma obra musical foi liberada para uso por outros domínios")]
    public void ObraLiberada(ObraLiberadaPayload payload) { }

    [Channel("cadastro.obra.bloqueada",
        Description = "Publicado quando uma obra é bloqueada por irregularidade ou pendência, impedindo seu uso até nova liberação.",
        BindingsRef = "amqp")]
    [PublishOperation(typeof(ObraBloqueadaPayload), "obras",
        Summary = "Obra bloqueada com justificativa",
        OperationId = "publicarObraBloqueada")]
    [Message(typeof(ObraBloqueadaPayload),
        Name = "ObraBloqueada",
        Title = "Obra Bloqueada",
        Summary = "Uma obra musical foi bloqueada — uso suspenso até nova liberação")]
    public void ObraBloqueada(ObraBloqueadaPayload payload) { }

    [Channel("cadastro.obra.dominio-publico",
        Description = "Publicado quando o flag de domínio público de uma obra é alterado.",
        BindingsRef = "amqp")]
    [PublishOperation(typeof(ObraDominioPublicoPayload), "obras",
        Summary = "Flag de domínio público alterado",
        OperationId = "publicarObraDominioPublico")]
    [Message(typeof(ObraDominioPublicoPayload),
        Name = "ObraDominioPublico",
        Title = "Obra Domínio Público Alterado",
        Summary = "Flag de domínio público de uma obra foi alterado")]
    public void ObraDominioPublico(ObraDominioPublicoPayload payload) { }

    [Channel("cadastro.obra.depurada",
        Description = "Publicado após depuração de obra duplicada. A obra original é depurada e uma nova obra canônica é criada.",
        BindingsRef = "amqp")]
    [PublishOperation(typeof(ObraDepuradaPayload), "obras",
        Summary = "Obra duplicada depurada",
        OperationId = "publicarObraDepurada")]
    [Message(typeof(ObraDepuradaPayload),
        Name = "ObraDepurada",
        Title = "Obra Depurada",
        Summary = "Obra duplicada depurada — nova obra canônica criada")]
    public void ObraDepurada(ObraDepuradaPayload payload) { }

    // ── Fonogramas ────────────────────────────────────────────────────────────

    [Channel("cadastro.fonograma.liberado",
        Description = "Publicado quando um fonograma tem seu status alterado para LIBERADO, ficando disponível para identificação e distribuição.",
        BindingsRef = "amqp")]
    [PublishOperation(typeof(FonogramaLiberadoPayload), "fonogramas",
        Summary = "Fonograma liberado para uso",
        OperationId = "publicarFonogramaLiberado")]
    [Message(typeof(FonogramaLiberadoPayload),
        Name = "FonogramaLiberado",
        Title = "Fonograma Liberado",
        Summary = "Fonograma liberado para identificação e distribuição")]
    public void FonogramaLiberado(FonogramaLiberadoPayload payload) { }

    [Channel("cadastro.fonograma.bloqueado",
        Description = "Publicado quando um fonograma é bloqueado com justificativa.",
        BindingsRef = "amqp")]
    [PublishOperation(typeof(FonogramaBloqueadoPayload), "fonogramas",
        Summary = "Fonograma bloqueado com justificativa",
        OperationId = "publicarFonogramaBloqueado")]
    [Message(typeof(FonogramaBloqueadoPayload),
        Name = "FonogramaBloqueado",
        Title = "Fonograma Bloqueado",
        Summary = "Fonograma bloqueado — uso suspenso até nova liberação")]
    public void FonogramaBloqueado(FonogramaBloqueadoPayload payload) { }

    [Channel("cadastro.fonograma.depurado",
        Description = "Publicado após depuração de fonograma duplicado. Novo fonograma canônico criado em substituição.",
        BindingsRef = "amqp")]
    [PublishOperation(typeof(FonogramaDepuradoPayload), "fonogramas",
        Summary = "Fonograma duplicado depurado",
        OperationId = "publicarFonogramaDepurado")]
    [Message(typeof(FonogramaDepuradoPayload),
        Name = "FonogramaDepurado",
        Title = "Fonograma Depurado",
        Summary = "Fonograma duplicado depurado — novo fonograma canônico criado")]
    public void FonogramaDepurado(FonogramaDepuradoPayload payload) { }

    // ── Titulares ─────────────────────────────────────────────────────────────

    [Channel("cadastro.titular.criado",
        Description = "Publicado quando um novo titular de direitos (PF ou PJ) é criado. Permite que outros domínios mantenham cópia local.",
        BindingsRef = "amqp")]
    [PublishOperation(typeof(TitularCriadoPayload), "titulares",
        Summary = "Novo titular de direitos cadastrado",
        OperationId = "publicarTitularCriado")]
    [Message(typeof(TitularCriadoPayload),
        Name = "TitularCriado",
        Title = "Titular Criado",
        Summary = "Novo titular de direitos cadastrado no sistema")]
    public void TitularCriado(TitularCriadoPayload payload) { }
}
