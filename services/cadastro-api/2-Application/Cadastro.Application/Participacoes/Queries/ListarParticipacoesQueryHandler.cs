using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Participacoes.Responses;
using Cadastro.Application.Titulares;
using Cadastro.Application.Titularidades.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Participacoes.Queries;

public class ListarParticipacoesQueryHandler : IQueryHandler<ListarParticipacoesQuery, ParticipacoesResponse>
{
    private readonly IParticipacaoRepository _repository;
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly ICurrentUserPermissions _permissions;

    public ListarParticipacoesQueryHandler(
        IParticipacaoRepository repository,
        IFonogramaRepository fonogramaRepository,
        ICurrentUserPermissions permissions)
    {
        _repository = repository;
        _fonogramaRepository = fonogramaRepository;
        _permissions = permissions;
    }

    public async Task<ParticipacoesResponse> HandleAsync(ListarParticipacoesQuery query, CancellationToken cancellationToken)
    {
        var fonograma = await _fonogramaRepository.GetByIdAsync(query.FonogramaId, cancellationToken)
            ?? throw new NotFoundException(nameof(Fonograma), query.FonogramaId);

        var participacoes = await _repository.GetByFonogramaIdAsync(query.FonogramaId, cancellationToken);
        var lista = participacoes.ToList();

        // Soma é null se algum percentual ainda não foi calculado
        bool somaCalculada = lista.Any() && lista.All(p => p.Percentual.HasValue);
        decimal? soma = somaCalculada ? lista.Sum(p => p.Percentual!.Value) : null;

        var fullDocumentAllowed = _permissions.Has(CadastroPermissionNames.TitularVerCpfCompleto);

        return new ParticipacoesResponse(
            query.FonogramaId,
            lista.Select(p => MapToItemResponse(p, fullDocumentAllowed)).ToList(),
            soma,
            somaCalculada,
            fonograma.PercentuaisDesatualizados
        );
    }

    internal static ParticipacoesResponse BuildResponse(
        Guid fonogramaId, 
        IEnumerable<ParticipacaoConexa> participacoes, 
        bool percentuaisDesatualizados,
        bool fullDocumentAllowed)
    {
        var lista = participacoes.ToList();
        bool somaCalculada = lista.Any() && lista.All(p => p.Percentual.HasValue);
        decimal? soma = somaCalculada ? lista.Sum(p => p.Percentual!.Value) : null;

        return new ParticipacoesResponse(
            fonogramaId,
            lista.Select(p => MapToItemResponse(p, fullDocumentAllowed)).ToList(),
            soma,
            somaCalculada,
            percentuaisDesatualizados
        );
    }

    internal static ParticipacaoItemResponse MapToItemResponse(ParticipacaoConexa p, bool fullDocumentAllowed)
    {
        var documentoFormatado = DocumentoMasking.Apply(
            p.Titular.Documento,
            p.Titular.DocumentoFormatado,
            fullDocumentAllowed).DocumentoFormatado;

        return new ParticipacaoItemResponse(
            p.Id,
            new TitularResumoResponse(
                p.TitularId,
                p.Titular.Codigo,
                p.Titular.Nome,
                p.Titular.Tipo.ToString().ToUpperInvariant(),
                documentoFormatado,
                p.Titular.Associacao?.Sigla
            ),
            CategoriaToString(p.Categoria),
            p.Percentual,
            p.Editavel
        );
    }

    private static string CategoriaToString(CategoriaConexo categoria) => categoria switch
    {
        CategoriaConexo.ProdutorFonografico => "PRODUTOR_FONOGRAFICO",
        CategoriaConexo.MusicoExecutante   => "MUSICO_EXECUTANTE",
        _                                  => "INTERPRETE"
    };
}
