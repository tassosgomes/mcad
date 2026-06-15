---
status: pending
parallelizable: false
blocked_by: ["3.0", "4.0"]
---

<task_context>
<domain>cadastro/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server,database</dependencies>
<unblocks>"6.0", "7.0", "8.0", "9.0", "13.0"</unblocks>
</task_context>

# Tarefa 5.0: Auto-cadastro, Login e Alteração de Senha do Titular (RF-01 a RF-07)

## Visão Geral

Implementar os handlers CQRS e endpoints de auto-cadastro (`POST /portal/auto-cadastro`), login (`POST /portal/auth/login`) e alteração de senha (`PUT /portal/me/senha`). Inclui hash BCrypt, validação de CPF/CNPJ + CAE/IPI contra o cadastro existente, lockout exponencial e mensagem genérica de erro.

## Requisitos

- RF-01 a RF-07 (auto-cadastro, validação, senha hash, autenticação, credenciais inválidas genéricas, alterar senha)
- RF-03 (uma conta por CPF/CNPJ)
- Tech Spec — seção *Fluxo de Login* e *Endpoints de API*

## Subtarefas

- [ ] 5.1 Criar `2-Application/Cadastro.Application/Portal/Commands/AutoCadastroTitularCommand.cs` (`record AutoCadastroTitularCommand(string Documento, string CaeIpi, string Senha) : ICommand<AutoCadastroResponse>`).
- [ ] 5.2 Criar `AutoCadastroTitularCommandValidator.cs` — valida que `Documento` não é vazio, `CaeIpi` não vazio, `Senha` ≥ 8 caracteres.
- [ ] 5.3 Criar `AutoCadastroTitularCommandHandler.cs`:
  1. Normalizar `Documento` via `Cpf.Create`/`Cnpj.Create` (reusa VOs — `DomainException` se inválido).
  2. Buscar titular por documento → `NotFoundException`? **Não** — RF-02: se titular não existe, lançar `AutenticacaoTitularException` com mensagem orientando procurar o ECAD (não revelar que é o CPF).
  3. Validar que `titular.CaeIpi` corresponde ao `CaeIpi` informado (RF-02). Se divergente → `AutenticacaoTitularException`.
  4. Verificar se já existe `CredencialTitular` para o `titularId` → `ConflictException` ("Já existe conta para este CPF/CNPJ") (RF-03).
  5. `senhaHash = BCrypt.Net.BCrypt.HashPassword(senha, workFactor: 12)` (RF-04).
  6. `CredencialTitular.Criar(titularId, senhaHash)` + `repo.AddAsync` + `repo.SaveChangesAsync`.
  7. Retornar `{ titular: { id, nome } }` (sem token — titular deve logar em seguida).
- [ ] 5.4 Criar `2-Application/Cadastro.Application/Portal/Commands/LoginTitularCommand.cs` (`record LoginTitularCommand(string Documento, string Senha) : ICommand<LoginResponse>`).
- [ ] 5.5 Criar `LoginTitularCommandHandler.cs` — seguir o fluxo da Tech Spec (*Fluxo de Login*):
  1. Normalizar documento.
  2. `credencial = repo.ByDocumentoAsync(documento)` (busca via titular).
  3. Se `credencial == null` OU `credencial.EstaBloqueado` → `AutenticacaoTitularException` (genérico, RF-06).
  4. Se `!BCrypt.Verify(senha, credencial.SenhaHash)`: `credencial.IncrementarFalha()`; `repo.SaveChangesAsync`; → `AutenticacaoTitularException`.
  5. `credencial.ResetarFalhas()`; `repo.SaveChangesAsync`.
  6. `token = _tokenService.Gerar(titular)`; retornar `{ token, expiraEm, titular: { id, nome } }`.
  7. **Log:** scope `{TitularId}` — nunca logar documento/senha (LGPD).
- [ ] 5.6 Criar `2-Application/Cadastro.Application/Portal/Commands/AlterarSenhaCommand.cs` (`record AlterarSenhaCommand(Guid TitularId, string SenhaAtual, string NovaSenha) : ICommand<NoContent>`).
- [ ] 5.7 Criar `AlterarSenhaCommandHandler.cs` — carrega credencial por `titularId` (do `ICurrentTitular`), verifica senha atual com `BCrypt.Verify`, valida nova senha (≥ 8 chars), re-hash, salva (RF-07).
- [ ] 5.8 Criar `1-Services/Cadastro.API/Endpoints/PortalAuthEndpoints.cs` — grupo `/api/v1/portal`:
  - `POST /auto-cadastro` — `.AllowAnonymous()`
  - `POST /auth/login` — `.AllowAnonymous()`
  - `PUT /me/senha` — `.RequireAuthorization("PortalTitular")` + injeta `ICurrentTitular` para obter `titularId`.
  - Registrar `MapPortalAuthEndpoints(app)` no `Program.cs`.
- [ ] 5.9 Criar DTOs de resposta: `AutoCadastroResponse`, `LoginResponse` (`record` com `Token`, `ExpiraEm`, `TitularResumo`). Nunca incluir `SenhaHash`.
- [ ] 5.10 Testes unitários (`5-Tests/Cadastro.UnitTests/Portal/`):
  - `AutoCadastroTitularCommandHandlerTests.cs` — CPF+CAE válidos → cria credencial com hash (assertar `BCrypt.Verify`); titular inexistente → `AutenticacaoTitularException`; credencial já existe → `ConflictException`; senha nunca em texto plano no `SenhaHash`.
  - `LoginTitularCommandHandlerTests.cs` — sucesso → token; usuário inexistente → genérico 401; senha errada → genérico + `IncrementarFalha` chamado; 5ª falha → `BloqueadoAte` setado; bloqueado → genérico.
  - `AlterarSenhaCommandHandlerTests.cs` — senha atual incorreta → erro; sucesso re-hasheia.
  - Mockar `ITitularTokenService`, `ICurrentTitular` e repositórios.

## Sequenciamento

- Bloqueado por: 3.0 (migration + repositórios), 4.0 (token service, scheme, exceção)
- Desbloqueia: 6.0, 7.0, 8.0, 9.0 (features do titular precisam de auth), 13.0 (frontend pode integrar login)
- Paralelizável: Não (depende da infra de auth)

## Detalhes de Implementação

**Mensagem genérica (RF-06):** todos os caminhos de falha (usuário inexistente, CAE divergente, senha errada, bloqueado) lançam `AutenticacaoTitularException("Credenciais inválidas")` — mensagem idêntica para não revelar qual campo está incorreto. A única exceção é o auto-cadastro com credencial já existente, que retorna `ConflictException` (o titular sabe que já tem conta).

**`ByDocumentoAsync` — decisão de implementação:** como a credencial não armazena o documento, o repositório faz `Join`:

```csharp
public async Task<CredencialTitular?> ByDocumentoAsync(string documento, CancellationToken ct)
{
    var titular = await _db.Titulares.FirstOrDefaultAsync(
        t => t.Cpf.Valor == documento || t.Cnpj.Valor == documento, ct);
    if (titular == null) return null;
    return await _db.CredenciaisTitular.FirstOrDefaultAsync(c => c.TitularId == titular.Id, ct);
}
```

Alternativamente, o handler normaliza o documento, busca o titular primeiro, depois a credencial. Alinhar com a implementação do repositório na tarefa 3.0.

**Lockout:** a mensagem de bloqueio é a mesma "Credenciais inválidas" — o titular não sabe que está bloqueado (RF-06). O bloqueio expira automaticamente (`EstaBloqueado` checa `BloqueadoAte > now`).

## Critérios de Sucesso

- Auto-cadastro cria credencial com `SenhaHash` BCrypt (senha original não recuperável).
- Login de titular inexistente, senha errada e bloqueado retornam a **mesma** mensagem 401.
- 5 logins falhados consecutivos ativam o lockout exponencial.
- `PUT /me/senha` exige token do titular e senha atual correta.
- `POST /auto-cadastro` e `POST /auth/login` acessíveis sem token (`.AllowAnonymous`).
- Demais endpoints `/portal/*` sem token → 401.
- `dotnet test 5-Tests/Cadastro.UnitTests` passa.
