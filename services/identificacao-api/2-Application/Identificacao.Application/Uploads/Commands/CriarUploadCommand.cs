using System;
using System.IO;
using Identificacao.Application.Common;
using Identificacao.Application.Uploads.Responses;

namespace Identificacao.Application.Uploads.Commands;

public record CriarUploadCommand(
    Guid CaptacaoId,
    string NomeArquivo,
    Stream ArquivoStream,
    Guid AnalistaId
) : ICommand<UploadResponse>;
