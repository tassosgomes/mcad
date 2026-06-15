using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Command de abertura de ocorrência pelo titular autenticado (RF-27, RF-28, RF-32).
/// <para>
/// <c>TitularId</c> vem do <c>ICurrentTitular</c> (extraído do JWT), nunca do body —
/// anti-tampering: um titular não pode abrir ocorrências em nome de outro (RF-31).
/// </para>
/// <para>
/// <c>Tipo</c> é a string SCREAMING_SNAKE_CASE de <c>TipoOcorrencia</c>
/// (ex: <c>TITULARIDADE_DIVERGENTE</c>, <c>FONOGRAMA_INCORRETO</c>, <c>DADO_CADASTRAL</c>,
/// <c>OBRA_AUSENTE</c>).
/// </para>
/// <para>
/// <c>ObraId</c> e <c>FonogramaId</c> são mutuamente opcionais — referência fraca (sem FK)
/// conforme techspec. <c>Descricao</c> mín. 10 chars.
/// </para>
/// </summary>
public record CriarOcorrenciaCommand(
    Guid TitularId,
    string Tipo,
    Guid? ObraId,
    Guid? FonogramaId,
    string Descricao) : ICommand<OcorrenciaResponse>;
