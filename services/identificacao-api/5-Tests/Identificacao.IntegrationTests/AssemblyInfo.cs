using System.Runtime.CompilerServices;

// Necessário para que o dynamic binder de Identificacao.Infra acesse os tipos
// anônimos usados como filtro no CaptacaoRepository.ListarAsync(dynamic filtro).
[assembly: InternalsVisibleTo("Identificacao.Infra")]
