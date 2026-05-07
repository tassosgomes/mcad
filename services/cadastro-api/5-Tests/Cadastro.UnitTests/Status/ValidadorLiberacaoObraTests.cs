using AwesomeAssertions;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Services;

namespace Cadastro.UnitTests.Status;

public class ValidadorLiberacaoObraTests
{
    [Fact]
    public void Validar_ObraMusical_ComTipoMusical_DeveMarcarTipoComoAtendido()
    {
        var obra = ObraMusical.Criar("Obra Musical", TipoObra.Musical, genero: "MPB");

        var pendencias = ValidadorLiberacaoObra.Validar(obra, 100.0000m, temIswc: true);

        pendencias.Should().ContainSingle(p => p.Item == "Tipo" && p.Atendido);
    }
}
