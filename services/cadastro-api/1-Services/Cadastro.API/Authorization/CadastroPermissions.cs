namespace Cadastro.API.Authorization;

public static class CadastroPermissions
{
    public const string AssociacaoListar = "cadastro:associacao:listar";
    public const string AssociacaoVisualizar = "cadastro:associacao:visualizar";

    public const string TitularListar = "cadastro:titular:listar";
    public const string TitularVisualizar = "cadastro:titular:visualizar";
    public const string TitularBuscar = "cadastro:titular:buscar";
    public const string TitularCriar = "cadastro:titular:criar";
    public const string TitularEditar = "cadastro:titular:editar";
    public const string TitularExcluir = "cadastro:titular:excluir";

    public const string ObraListar = "cadastro:obra:listar";
    public const string ObraVisualizar = "cadastro:obra:visualizar";
    public const string ObraCriar = "cadastro:obra:criar";
    public const string ObraEditar = "cadastro:obra:editar";
    public const string ObraExcluir = "cadastro:obra:excluir";
    public const string ObraGerarIswc = "cadastro:obra:gerar-iswc";
    public const string ObraDepurar = "cadastro:obra:depurar";
    public const string ObraDominioPublico = "cadastro:obra:dp";

    public const string TitularidadeListar = "cadastro:titularidade:listar";
    public const string TitularidadeBuscar = "cadastro:titularidade:buscar";
    public const string TitularidadeAdicionar = "cadastro:titularidade:adicionar";
    public const string TitularidadeEditar = "cadastro:titularidade:editar";
    public const string TitularidadeRemover = "cadastro:titularidade:remover";

    public const string FonogramaListar = "cadastro:fonograma:listar";
    public const string FonogramaVisualizar = "cadastro:fonograma:visualizar";
    public const string FonogramaListarPorObra = "cadastro:fonograma:listar-por-obra";
    public const string FonogramaCriar = "cadastro:fonograma:criar";
    public const string FonogramaEditar = "cadastro:fonograma:editar";
    public const string FonogramaExcluir = "cadastro:fonograma:excluir";
    public const string FonogramaDepurar = "cadastro:fonograma:depurar";

    public const string ParticipacaoListar = "cadastro:participacao:listar";
    public const string ParticipacaoAdicionar = "cadastro:participacao:adicionar";
    public const string ParticipacaoAjustar = "cadastro:participacao:ajustar";
    public const string ParticipacaoRemover = "cadastro:participacao:remover";
    public const string ParticipacaoCalcular = "cadastro:participacao:calcular";

    public const string StatusVisualizarHistoricoObra = "cadastro:status:visualizar-historico-obra";
    public const string StatusVisualizarHistoricoFonograma = "cadastro:status:visualizar-historico-fonograma";
    public const string StatusLiberarObra = "cadastro:status:liberar-obra";
    public const string StatusBloquearObra = "cadastro:status:bloquear-obra";
    public const string StatusDesbloquearObra = "cadastro:status:desbloquear-obra";
    public const string StatusLiberarFonograma = "cadastro:status:liberar-fonograma";
    public const string StatusBloquearFonograma = "cadastro:status:bloquear-fonograma";
    public const string StatusDesbloquearFonograma = "cadastro:status:desbloquear-fonograma";
}
