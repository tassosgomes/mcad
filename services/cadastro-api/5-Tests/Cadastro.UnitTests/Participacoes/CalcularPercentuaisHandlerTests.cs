using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Participacoes.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.Services;
using Cadastro.Domain.ValueObjects;
using FluentAssertions;
using Moq;
using Xunit;
using Cadastro.UnitTests;

namespace Cadastro.UnitTests.Participacoes;

public class CalcularPercentuaisHandlerTests
{
    private readonly Mock<IParticipacaoRepository> _participacaoRepo = new();
    private readonly Mock<IFonogramaRepository> _fonogramaRepo = new();
    private readonly CalcularPercentuaisCommandHandler _handler;

    public CalcularPercentuaisHandlerTests()
    {
        _handler = new CalcularPercentuaisCommandHandler(
            _participacaoRepo.Object,
            _fonogramaRepo.Object,
            Mock.Of<IParticipacaoAuditPublisher>(),
            PermissionsTestHelper.With(true));
    }

    private Fonograma CriarFonograma(StatusFonograma status = StatusFonograma.PendenteValidacao)
    {
        var fono = Fonograma.Criar(Isrc.Create("BRXYZ2300099"), Guid.NewGuid(), "BR");
        if (status != StatusFonograma.PendenteValidacao)
            typeof(Fonograma).GetProperty("Status")!.SetValue(fono, status);
        return fono;
    }

    private List<ParticipacaoConexa> CriarParticipacoes(Guid fonoId, params CategoriaConexo[] categorias)
    {
        var titular = Titular.CriarPessoaFisica("Artista", Cpf.Create("12345678909"), "BR", Guid.NewGuid());
        return categorias.Select(c =>
        {
            var p = ParticipacaoConexa.Criar(fonoId, titular.Id, c);
            typeof(ParticipacaoConexa).GetProperty("Titular")!.SetValue(p, titular);
            return p;
        }).ToList();
    }

    [Fact]
    public async Task HandleAsync_SemInterprete_ThrowsDomainException()
    {
        var fonograma = CriarFonograma();
        var participacoes = CriarParticipacoes(fonograma.Id, CategoriaConexo.ProdutorFonografico);

        _fonogramaRepo.Setup(r => r.GetByIdAsync(fonograma.Id, It.IsAny<CancellationToken>())).ReturnsAsync(fonograma);
        _participacaoRepo.Setup(r => r.GetByFonogramaIdAsync(fonograma.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participacoes);

        var act = () => _handler.HandleAsync(new CalcularPercentuaisCommand(fonograma.Id), CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>().WithMessage("*Intérprete*");
    }

    [Fact]
    public async Task HandleAsync_FonogramaLiberado_ThrowsDepuracaoException()
    {
        var fonograma = CriarFonograma(StatusFonograma.Liberado);

        _fonogramaRepo.Setup(r => r.GetByIdAsync(fonograma.Id, It.IsAny<CancellationToken>())).ReturnsAsync(fonograma);

        var act = () => _handler.HandleAsync(new CalcularPercentuaisCommand(fonograma.Id), CancellationToken.None);

        await act.Should().ThrowAsync<DepuracaoNecessariaException>();
    }

}
