using AwesomeAssertions;
using Cadastro.Application.Titulares;

namespace Cadastro.UnitTests.Titulares;

public class DocumentoMaskingTests
{
    [Fact]
    public void Apply_FullAllowedTrue_ReturnsOriginalValues()
    {
        var documento = "12345678909";
        var documentoFormatado = "123.456.789-09";

        var (doc, docFmt) = DocumentoMasking.Apply(documento, documentoFormatado, fullAllowed: true);

        doc.Should().Be(documento);
        docFmt.Should().Be(documentoFormatado);
    }

    [Fact]
    public void Apply_FullAllowedFalseAndCpf_ReturnsMaskedCpf()
    {
        var (doc, docFmt) = DocumentoMasking.Apply("12345678909", "123.456.789-09", fullAllowed: false);

        doc.Should().Be("123XXXXXXXX");
        docFmt.Should().Be("123.***.***-XX");
    }

    [Fact]
    public void Apply_FullAllowedFalseAndCnpj_ReturnsMaskedCnpj()
    {
        var (doc, docFmt) = DocumentoMasking.Apply("12345678000199", "12.345.678/0001-99", fullAllowed: false);

        doc.Should().Be("12345XXXXXXXXX");
        docFmt.Should().Be("12.345.***/****-XX");
    }

    [Fact]
    public void Apply_FullAllowedFalseAndUnknownLength_MasksRawAndKeepsFormatted()
    {
        var (doc, docFmt) = DocumentoMasking.Apply("12345", "12-345", fullAllowed: false);

        doc.Should().Be("XXXXX");
        docFmt.Should().Be("12-345");
    }
}
