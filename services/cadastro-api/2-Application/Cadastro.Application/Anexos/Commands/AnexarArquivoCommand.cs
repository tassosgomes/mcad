using Cadastro.Application.Anexos.Responses;
using Cadastro.Application.Common.CQRS;
using Cadastro.Domain.Enums;

namespace Cadastro.Application.Anexos.Commands;

/// <summary>
/// Faz upload de um arquivo para o storage-service e registra o Anexo no domínio Cadastro.
/// Se já existir um Anexo ativo para o mesmo (EntidadeId, Categoria), ele é substituído
/// automaticamente (soft delete do anterior + evento de remoção + criação do novo).
/// </summary>
public record AnexarArquivoCommand(
    TipoEntidadeAnexo EntidadeTipo,
    Guid EntidadeId,
    CategoriaAnexo Categoria,
    Stream Conteudo,
    string NomeArquivo,
    string ContentType,
    long TamanhoBytes,
    string UploadadoPor
) : ICommand<AnexoResponse>;
