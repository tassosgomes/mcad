package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.calculo.OwnershipSnapshot;
import java.util.Set;
import java.util.UUID;

public interface CadastroOwnershipClient {

    OwnershipSnapshot buscarOwnership(
            Set<UUID> obraIds,
            Set<UUID> fonogramaIds,
            String bearerToken);
}
