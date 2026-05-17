package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.CreditoRetidoReavaliacao;
import java.util.List;

public interface CreditoRetidoReavaliacaoRepository {

    List<CreditoRetidoReavaliacao> saveAll(List<CreditoRetidoReavaliacao> reavaliacoes);
}
