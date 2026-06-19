using System.Net.Http.Headers;
using Microsoft.Extensions.Logging;

namespace Identificacao.Infra.ExternalServices;

public class CadastroAuthHandler : DelegatingHandler
{
    private readonly CadastroM2MTokenService _tokenService;
    private readonly ILogger<CadastroAuthHandler> _logger;

    public CadastroAuthHandler(CadastroM2MTokenService tokenService, ILogger<CadastroAuthHandler> logger)
    {
        _tokenService = tokenService;
        _logger = logger;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (_tokenService.Configurado)
        {
            var token = await _tokenService.ObterTokenAsync(cancellationToken);
            if (!string.IsNullOrEmpty(token))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            }
        }
        else
        {
            _logger.LogWarning("Cadastro M2M nao configurado (CADASTRO_LOGTO_CLIENT_ID vazio); chamadas ao cadastro-api podem receber 401 em ambientes com AUTH habilitado");
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
