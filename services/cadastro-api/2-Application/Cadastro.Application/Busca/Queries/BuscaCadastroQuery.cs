using Cadastro.Application.Busca.Responses;
using Cadastro.Application.Common.CQRS;

namespace Cadastro.Application.Busca.Queries;

public record BuscaCadastroQuery(string Q, string Tipo = "todos", int Size = 20) : IQuery<BuscaCadastroResponse>;
