namespace Cadastro.API.AsyncApi.Messages;

/// <summary>Campo `data` do evento cadastro.titular.criado</summary>
/// <param name="Tipo">PF = Pessoa Física | PJ = Pessoa Jurídica</param>
/// <param name="Documento">CPF formatado (PF) ou CNPJ alfanumérico (PJ)</param>
public record TitularCriadoPayload(Guid TitularId, string Nome, string Tipo, string Documento);
