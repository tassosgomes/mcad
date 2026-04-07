package br.com.ecad.arrecadacao.domain.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "uda_valor", schema = "arrecadacao")
public class UdaValor {

    @Id
    private UUID id;

    @Column(name = "valor", precision = 18, scale = 6, nullable = false)
    private BigDecimal valor;

    @Column(name = "data_vigencia", nullable = false)
    private LocalDate dataVigencia;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "criado_por", length = 200)
    private String criadoPor; // nullable for seed

    protected UdaValor() {}

    public static UdaValor criar(BigDecimal valor, LocalDate dataVigencia, String criadoPor) {
        if (valor == null || valor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Valor da UDA deve ser maior que zero");
        }
        if (dataVigencia == null) {
            throw new IllegalArgumentException("DataVigencia da UDA nao pode ser nula");
        }
        UdaValor uda = new UdaValor();
        uda.id = UUID.randomUUID();
        uda.valor = valor;
        uda.dataVigencia = dataVigencia;
        uda.criadoPor = criadoPor;
        uda.criadoEm = Instant.now();
        return uda;
    }

    // Getters — immutable after creation (append-only)
    public UUID getId() { return id; }
    public BigDecimal getValor() { return valor; }
    public LocalDate getDataVigencia() { return dataVigencia; }
    public Instant getCriadoEm() { return criadoEm; }
    public String getCriadoPor() { return criadoPor; }
}
