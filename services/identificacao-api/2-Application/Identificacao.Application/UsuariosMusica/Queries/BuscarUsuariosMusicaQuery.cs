using Identificacao.Application.Common;
using Identificacao.Application.UsuariosMusica.Responses;

namespace Identificacao.Application.UsuariosMusica.Queries;

public record BuscarUsuariosMusicaQuery(string? Q, string? Cnpj, int Page, int Size)
    : IQuery<UsuarioMusicaListResponse>;
