namespace Cadastro.API.AsyncApi.Messages;

/// <summary>Campo `data` do evento cadastro.obra.liberada</summary>
public record ObraLiberadaPayload(Guid ObraId, string Titulo, string? Iswc);

/// <summary>Campo `data` do evento cadastro.obra.bloqueada</summary>
public record ObraBloqueadaPayload(Guid ObraId, string Titulo, string Justificativa);

/// <summary>Campo `data` do evento cadastro.obra.dominio-publico</summary>
public record ObraDominioPublicoPayload(Guid ObraId, string Titulo, bool DominioPublico);

/// <summary>Campo `data` do evento cadastro.obra.depurada</summary>
public record ObraDepuradaPayload(Guid ObraId, string Titulo, string? IswcOriginal, Guid NovaObraId);
