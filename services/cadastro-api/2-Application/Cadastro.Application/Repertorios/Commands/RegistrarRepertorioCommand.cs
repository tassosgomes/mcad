using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Repertorios.Responses;
using Cadastro.Domain.Enums;

namespace Cadastro.Application.Repertorios.Commands;

public record RegistrarRepertorioCommand(
    DadosObraRepertorio Obra,
    IReadOnlyCollection<TitularRepertorioInput> Titulares,
    IReadOnlyCollection<TitularidadeRepertorioInput> Titularidades,
    IReadOnlyCollection<FonogramaRepertorioInput> Fonogramas,
    bool SalvarComoPendente) : ICommand<CadastroRepertorioResponse>;

public record DadosObraRepertorio(
    string Titulo,
    string? Subtitulo,
    TipoObra Tipo,
    string? Genero);

public record TitularRepertorioInput(
    Guid? TitularId,
    NovoTitularRepertorioInput? NovoTitular);

public record NovoTitularRepertorioInput(
    string Nome,
    TipoTitular TipoPessoa,
    string Documento,
    string Nacionalidade,
    Guid AssociacaoId,
    string? CaeIpi);

public record TitularidadeRepertorioInput(
    string TitularLocalKey,
    CategoriaAutoral Categoria,
    decimal Percentual);

public record FonogramaRepertorioInput(
    string Isrc,
    string Pais,
    DateOnly? DataGravacao,
    DateOnly? DataLancamento,
    string? UrlAudio,
    IReadOnlyCollection<ParticipacaoRepertorioInput> Participacoes);

public record ParticipacaoRepertorioInput(
    string TitularLocalKey,
    CategoriaConexo Papel);
