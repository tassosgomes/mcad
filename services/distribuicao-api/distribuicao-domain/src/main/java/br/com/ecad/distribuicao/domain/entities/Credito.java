package br.com.ecad.distribuicao.domain.entities;

import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "creditos", schema = "distribuicao")
public class Credito {

    @Id
    private UUID id;

    @Column(name = "processo_id", nullable = false)
    private UUID processoId;

    @Column(name = "titular_id", nullable = false)
    private UUID titularId;

    @Column(name = "titular_nome", nullable = false, length = 200)
    private String titularNome;

    @Column(name = "obra_id", nullable = false)
    private UUID obraId;

    @Column(name = "obra_titulo", nullable = false, length = 300)
    private String obraTitulo;

    @Column(name = "fonograma_id")
    private UUID fonogramaId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CategoriaCredito categoria;

    @Enumerated(EnumType.STRING)
    @Column(name = "subcategoria_conexa", length = 20)
    private SubcategoriaConexa subcategoriaConexa;

    @Column(name = "percentual_aplicado", nullable = false, precision = 9, scale = 6)
    private BigDecimal percentualAplicado;

    @Column(name = "valor_obra", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorObra;

    @Column(name = "valor_credito", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorCredito;

    @Column(name = "pontos_obra", nullable = false, precision = 18, scale = 6)
    private BigDecimal pontosObra;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusCredito status;

    @Enumerated(EnumType.STRING)
    @Column(name = "motivo_retencao", length = 40)
    private MotivoRetencao motivoRetencao;

    @Column(name = "retido_em")
    private Instant retidoEm;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected Credito() {
    }

    public static Credito calculado(
            UUID processoId,
            UUID titularId,
            String titularNome,
            UUID obraId,
            String obraTitulo,
            UUID fonogramaId,
            CategoriaCredito categoria,
            SubcategoriaConexa subcategoriaConexa,
            BigDecimal percentualAplicado,
            BigDecimal valorObra,
            BigDecimal valorCredito,
            BigDecimal pontosObra,
            Instant criadoEm) {
        Credito credito = new Credito();
        credito.id = UUID.randomUUID();
        credito.processoId = Objects.requireNonNull(processoId, "processoId must not be null");
        credito.titularId = Objects.requireNonNull(titularId, "titularId must not be null");
        credito.titularNome = Objects.requireNonNull(titularNome, "titularNome must not be null").trim();
        credito.obraId = Objects.requireNonNull(obraId, "obraId must not be null");
        credito.obraTitulo = Objects.requireNonNull(obraTitulo, "obraTitulo must not be null").trim();
        credito.fonogramaId = fonogramaId;
        credito.categoria = Objects.requireNonNull(categoria, "categoria must not be null");
        credito.subcategoriaConexa = subcategoriaConexa;
        credito.percentualAplicado = Objects.requireNonNull(percentualAplicado, "percentualAplicado must not be null");
        credito.valorObra = Objects.requireNonNull(valorObra, "valorObra must not be null");
        credito.valorCredito = Objects.requireNonNull(valorCredito, "valorCredito must not be null");
        credito.pontosObra = Objects.requireNonNull(pontosObra, "pontosObra must not be null");
        credito.status = StatusCredito.CALCULADO;
        credito.motivoRetencao = null;
        credito.retidoEm = null;
        credito.criadoEm = Objects.requireNonNull(criadoEm, "criadoEm must not be null");
        return credito;
    }

    public static Credito retido(
            UUID processoId,
            UUID titularId,
            String titularNome,
            UUID obraId,
            String obraTitulo,
            UUID fonogramaId,
            CategoriaCredito categoria,
            SubcategoriaConexa subcategoriaConexa,
            BigDecimal percentualAplicado,
            BigDecimal valorObra,
            BigDecimal valorCredito,
            BigDecimal pontosObra,
            MotivoRetencao motivoRetencao,
            Instant retidoEm,
            Instant criadoEm) {
        Credito credito = calculado(
                processoId,
                titularId,
                titularNome,
                obraId,
                obraTitulo,
                fonogramaId,
                categoria,
                subcategoriaConexa,
                percentualAplicado,
                valorObra,
                valorCredito,
                pontosObra,
                criadoEm);
        credito.status = StatusCredito.RETIDO;
        credito.motivoRetencao = Objects.requireNonNull(motivoRetencao, "motivoRetencao must not be null");
        credito.retidoEm = Objects.requireNonNull(retidoEm, "retidoEm must not be null");
        return credito;
    }

    public UUID getId() {
        return id;
    }

    public UUID getProcessoId() {
        return processoId;
    }

    public UUID getTitularId() {
        return titularId;
    }

    public String getTitularNome() {
        return titularNome;
    }

    public UUID getObraId() {
        return obraId;
    }

    public String getObraTitulo() {
        return obraTitulo;
    }

    public UUID getFonogramaId() {
        return fonogramaId;
    }

    public CategoriaCredito getCategoria() {
        return categoria;
    }

    public SubcategoriaConexa getSubcategoriaConexa() {
        return subcategoriaConexa;
    }

    public BigDecimal getPercentualAplicado() {
        return percentualAplicado;
    }

    public BigDecimal getValorObra() {
        return valorObra;
    }

    public BigDecimal getValorCredito() {
        return valorCredito;
    }

    public BigDecimal getPontosObra() {
        return pontosObra;
    }

    public StatusCredito getStatus() {
        return status;
    }

    public MotivoRetencao getMotivoRetencao() {
        return motivoRetencao;
    }

    public Instant getRetidoEm() {
        return retidoEm;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }
}
