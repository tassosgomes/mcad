using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.Entities;

/// <summary>
/// Credencial de autenticação do titular no Portal (1:1 com <see cref="Titular"/>).
/// Senha armazenada exclusivamente como hash (RF-04). Implementa lockout
/// exponencial após falhas consecutivas para mitigar brute-force (RF-06, Q-07).
/// </summary>
public class CredencialTitular
{
    private const int LimiteFalhasPorCiclo = 5;

    public Guid Id { get; private set; }
    public Guid TitularId { get; private set; }
    public string SenhaHash { get; private set; }
    public int TentativasFalhas { get; private set; }
    public DateTime? BloqueadoAte { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime AtualizadoEm { get; private set; }

    /// <summary>Construtor privado para o EF Core.</summary>
    private CredencialTitular()
    {
        SenhaHash = string.Empty;
    }

    /// <summary>
    /// Indica se a credencial está bloqueada no momento (lockout ativo).
    /// Computado: true quando <see cref="BloqueadoAte"/> está no futuro.
    /// </summary>
    public bool EstaBloqueado => BloqueadoAte.HasValue && BloqueadoAte.Value > DateTime.UtcNow;

    /// <summary>
    /// Factory method — único ponto de criação de uma credencial válida.
    /// <para>
    /// <paramref name="senhaHash"/> deve conter apenas o hash ( nunca a senha em texto plano — RF-04).
    /// A geração do hash é responsabilidade da camada de aplicação (BCrypt work factor 12).
    /// </para>
    /// </summary>
    public static CredencialTitular Criar(Guid titularId, string senhaHash)
    {
        if (titularId == Guid.Empty)
            throw new DomainException("TitularId é obrigatório");
        if (string.IsNullOrWhiteSpace(senhaHash))
            throw new DomainException("SenhaHash é obrigatório");

        return new CredencialTitular
        {
            Id = Guid.NewGuid(),
            TitularId = titularId,
            SenhaHash = senhaHash,
            TentativasFalhas = 0,
            BloqueadoAte = null,
            CriadoEm = DateTime.UtcNow,
            AtualizadoEm = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Registra uma falha de autenticação e aplica lockout exponencial quando atinge
    /// múltiplos de <see cref="LimiteFalhasPorCiclo"/>. Duração cresce por ciclo:
    /// 1º ciclo (5 falhas) → 1min; 2º ciclo (10 falhas) → 5min; 3º ciclo em diante → 15min.
    /// </summary>
    public void IncrementarFalha()
    {
        TentativasFalhas++;

        if (TentativasFalhas % LimiteFalhasPorCiclo != 0)
        {
            AtualizadoEm = DateTime.UtcNow;
            return;
        }

        var ciclo = TentativasFalhas / LimiteFalhasPorCiclo;
        BloqueadoAte = DateTime.UtcNow.Add(DuracaoLockout(ciclo));
        AtualizadoEm = DateTime.UtcNow;
    }

    /// <summary>
    /// Reseta tentativas e limpa o bloqueio. Deve ser chamado em login bem-sucedido.
    /// </summary>
    public void ResetarFalhas()
    {
        TentativasFalhas = 0;
        BloqueadoAte = null;
        AtualizadoEm = DateTime.UtcNow;
    }

    /// <summary>
    /// Substitui o hash de senha (RF-07 — alterar senha do titular autenticado).
    /// <paramref name="novoSenhaHash"/> deve ser o hash BCrypt gerado pela camada
    /// de aplicação (work factor 12). Reseta tentativas falhas e bloqueio para
    /// evitar estado inconsistente após troca de senha.
    /// </summary>
    public void AtualizarSenhaHash(string novoSenhaHash)
    {
        if (string.IsNullOrWhiteSpace(novoSenhaHash))
            throw new DomainException("SenhaHash é obrigatório");

        SenhaHash = novoSenhaHash;
        TentativasFalhas = 0;
        BloqueadoAte = null;
        AtualizadoEm = DateTime.UtcNow;
    }

    private static TimeSpan DuracaoLockout(int ciclo) => ciclo switch
    {
        1 => TimeSpan.FromMinutes(1),
        2 => TimeSpan.FromMinutes(5),
        _ => TimeSpan.FromMinutes(15)
    };
}
