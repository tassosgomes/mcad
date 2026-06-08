package br.com.ecad.distribuicao.domain.entities;

import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Linha de alocação de um ajuste de estorno sobre um crédito específico.
 *
 * <p>Regras:
 * <ul>
 *   <li>{@code valorAjuste} é sempre negativo ou zero (≤ 0).</li>
 *   <li>{@code valorCreditoOrigem} é sempre positivo (&gt; 0).</li>
 *   <li>É um snapshot: titular/obra/fonograma não devem ser buscados do Cadastro.</li>
 * </ul>
 */
@Entity
@Table(name = "ajuste_estorno_linhas", schema = "distribuicao")
public class AjusteEstornoLinha {

    @Id
    private UUID id;

    @Column(name = "ajuste_id", nullable = false)
    private UUID ajusteId;

    @Column(name = "processo_origem_id", nullable = false)
    private UUID processoOrigemId;

    @Column(name = "processo_aplicacao_id", nullable = false)
    private UUID processoAplicacaoId;

    @Column(name = "credito_origem_id", nullable = false)
    private UUID creditoOrigemId;

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

    @Column(name = "valor_credito_origem", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorCreditoOrigem;

    @Column(name = "valor_ajuste", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorAjuste;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected AjusteEstornoLinha() {}

    public AjusteEstornoLinha(
            UUID ajusteId,
            UUID processoOrigemId,
            UUID processoAplicacaoId,
            UUID creditoOrigemId,
            UUID titularId,
            String titularNome,
            UUID obraId,
            String obraTitulo,
            UUID fonogramaId,
            CategoriaCredito categoria,
            SubcategoriaConexa subcategoriaConexa,
            BigDecimal valorCreditoOrigem,
            BigDecimal valorAjuste) {
        if (valorAjuste != null && valorAjuste.compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalArgumentException("valorAjuste deve ser negativo ou zero");
        }
        if (valorCreditoOrigem == null || valorCreditoOrigem.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("valorCreditoOrigem deve ser positivo");
        }
        this.id = UUID.randomUUID();
        this.ajusteId = ajusteId;
        this.processoOrigemId = processoOrigemId;
        this.processoAplicacaoId = processoAplicacaoId;
        this.creditoOrigemId = creditoOrigemId;
        this.titularId = titularId;
        this.titularNome = titularNome;
        this.obraId = obraId;
        this.obraTitulo = obraTitulo;
        this.fonogramaId = fonogramaId;
        this.categoria = categoria;
        this.subcategoriaConexa = subcategoriaConexa;
        this.valorCreditoOrigem = valorCreditoOrigem;
        this.valorAjuste = valorAjuste;
        this.criadoEm = Instant.now();
    }

    // -------------------------------------------------------------------------
    // Getters
    // -------------------------------------------------------------------------

    public UUID getId() { return id; }
    public UUID getAjusteId() { return ajusteId; }
    public UUID getProcessoOrigemId() { return processoOrigemId; }
    public UUID getProcessoAplicacaoId() { return processoAplicacaoId; }
    public UUID getCreditoOrigemId() { return creditoOrigemId; }
    public UUID getTitularId() { return titularId; }
    public String getTitularNome() { return titularNome; }
    public UUID getObraId() { return obraId; }
    public String getObraTitulo() { return obraTitulo; }
    public UUID getFonogramaId() { return fonogramaId; }
    public CategoriaCredito getCategoria() { return categoria; }
    public SubcategoriaConexa getSubcategoriaConexa() { return subcategoriaConexa; }
    public BigDecimal getValorCreditoOrigem() { return valorCreditoOrigem; }
    public BigDecimal getValorAjuste() { return valorAjuste; }
    public Instant getCriadoEm() { return criadoEm; }
}
