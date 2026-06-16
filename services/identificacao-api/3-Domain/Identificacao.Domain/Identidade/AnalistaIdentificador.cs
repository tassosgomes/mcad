using System.Security.Cryptography;
using System.Text;

namespace Identificacao.Domain.Identidade;

public static class AnalistaIdentificador
{
    public static Guid FromSubject(string subject) =>
        Guid.TryParse(subject, out var guid) ? guid
            : new Guid(MD5.HashData(Encoding.UTF8.GetBytes(subject)));
}
