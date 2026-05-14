namespace Cadastro.API.Authorization;

public static class CadastroPermissions
{
    public const string AssociacaoListar = "cadastro:default:associacao:listar";
    public const string AssociacaoVisualizar = "cadastro:default:associacao:visualizar";

    public const string TitularListar = "cadastro:default:titular:listar";
    public const string TitularVisualizar = "cadastro:default:titular:visualizar";
    public const string TitularBuscar = "cadastro:default:titular:buscar";
    public const string TitularCriar = "cadastro:default:titular:criar";
    public const string TitularEditar = "cadastro:default:titular:editar";
    public const string TitularExcluir = "cadastro:default:titular:excluir";

    public const string ObraListar = "cadastro:default:obra:listar";
    public const string ObraVisualizar = "cadastro:default:obra:visualizar";
    public const string ObraCriar = "cadastro:default:obra:criar";
    public const string ObraEditar = "cadastro:default:obra:editar";
    public const string ObraExcluir = "cadastro:default:obra:excluir";
    public const string ObraGerarIswc = "cadastro:default:obra:gerar-iswc";
    public const string ObraDepurar = "cadastro:default:obra:depurar";
    public const string ObraDominioPublico = "cadastro:default:obra:dp";

    public const string TitularidadeListar = "cadastro:default:titularidade:listar";
    public const string TitularidadeBuscar = "cadastro:default:titularidade:buscar";
    public const string TitularidadeAdicionar = "cadastro:default:titularidade:adicionar";
    public const string TitularidadeEditar = "cadastro:default:titularidade:editar";
    public const string TitularidadeRemover = "cadastro:default:titularidade:remover";

    public const string FonogramaListar = "cadastro:default:fonograma:listar";
    public const string FonogramaVisualizar = "cadastro:default:fonograma:visualizar";
    public const string FonogramaListarPorObra = "cadastro:default:fonograma:listar-por-obra";
    public const string FonogramaCriar = "cadastro:default:fonograma:criar";
    public const string FonogramaEditar = "cadastro:default:fonograma:editar";
    public const string FonogramaExcluir = "cadastro:default:fonograma:excluir";
    public const string FonogramaDepurar = "cadastro:default:fonograma:depurar";

    public const string ParticipacaoListar = "cadastro:default:participacao:listar";
    public const string ParticipacaoAdicionar = "cadastro:default:participacao:adicionar";
    public const string ParticipacaoAjustar = "cadastro:default:participacao:ajustar";
    public const string ParticipacaoRemover = "cadastro:default:participacao:remover";
    public const string ParticipacaoCalcular = "cadastro:default:participacao:calcular";

    public const string StatusVisualizarHistoricoObra = "cadastro:default:status:visualizar-historico-obra";
    public const string StatusVisualizarHistoricoFonograma = "cadastro:default:status:visualizar-historico-fonograma";
    public const string StatusLiberarObra = "cadastro:default:status:liberar-obra";
    public const string StatusBloquearObra = "cadastro:default:status:bloquear-obra";
    public const string StatusDesbloquearObra = "cadastro:default:status:desbloquear-obra";
    public const string StatusLiberarFonograma = "cadastro:default:status:liberar-fonograma";
    public const string StatusBloquearFonograma = "cadastro:default:status:bloquear-fonograma";
    public const string StatusDesbloquearFonograma = "cadastro:default:status:desbloquear-fonograma";
}
