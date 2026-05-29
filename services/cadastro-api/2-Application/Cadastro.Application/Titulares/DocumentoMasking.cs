namespace Cadastro.Application.Titulares;

public static class DocumentoMasking
{
    private const string CpfMaskedRaw = "XXXXXXXXXXX";
    private const string CnpjMaskedRaw = "XXXXXXXXXXXXXX";
    private const string CpfMaskedFormatted = "XXX.***.***-XX";
    private const string CnpjMaskedFormatted = "XX.XXX.***/****-XX";

    public static (string Documento, string DocumentoFormatado) Apply(
        string documento,
        string documentoFormatado,
        bool fullAllowed)
    {
        if (fullAllowed)
        {
            return (documento, documentoFormatado);
        }

        return documento.Length switch
        {
            11 => (CpfMaskedRaw, CpfMaskedFormatted),
            14 => (CnpjMaskedRaw, CnpjMaskedFormatted),
            _ => (new string('X', documento.Length), documentoFormatado)
        };
    }
}
