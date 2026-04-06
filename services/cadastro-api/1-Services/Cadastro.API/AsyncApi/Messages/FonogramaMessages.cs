namespace Cadastro.API.AsyncApi.Messages;

/// <summary>Campo `data` do evento cadastro.fonograma.liberado</summary>
public record FonogramaLiberadoPayload(Guid FonogramaId, string Isrc, Guid ObraId);

/// <summary>Campo `data` do evento cadastro.fonograma.bloqueado</summary>
public record FonogramaBloqueadoPayload(Guid FonogramaId, string Isrc, string Justificativa);

/// <summary>Campo `data` do evento cadastro.fonograma.depurado</summary>
public record FonogramaDepuradoPayload(Guid FonogramaId, string IsrcOriginal, Guid NovoFonogramaId, Guid ObraId);
