namespace Cadastro.Application.Titulares;

public static class DocumentoMasking
{
    public static (string Documento, string DocumentoFormatado) Apply(
        string documento,
        string documentoFormatado,
        bool fullAllowed)
    {
        if (fullAllowed)
        {
            return (documento, documentoFormatado);
        }

        // CPF: exibe os 3 primeiros dígitos para confirmação de identidade.
        // CNPJ: exibe os 5 primeiros dígitos (raiz da empresa).
        return documento.Length switch
        {
            11 => (
                documento[..3] + "XXXXXXXX",
                documento[..3] + ".***.***-XX"
            ),
            14 => (
                documento[..5] + "XXXXXXXXX",
                documento[..2] + "." + documento[2..5] + ".***/****-XX"
            ),
            _ => (new string('X', documento.Length), documentoFormatado)
        };
    }
}
