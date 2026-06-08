---
status: pending
parallelizable: true
blocked_by: ["3.0", "4.0"]
---

<task_context>
<domain>arrecadacao/tests</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>testcontainers</dependencies>
<unblocks>7.0</unblocks>
</task_context>

# Tarefa 6.0: Testes — Unitários e Integração

## Visão Geral

Implementar testes unitários para lógica de negócio e testes de integração para validar endpoints, eventos e sincronização cross-domain.

## Requisitos

- Testes unitários: SiglaSuggester, Commands Handlers, Domain entity
- Testes de integração: Endpoints REST, validações de rubrica inativa, sincronização de eventos
- Cobertura > 70% da lógica de negócio nova

## Subtarefas

- [ ] 6.1 Testes unitários — `SiglaSuggesterTest`
  - Casos: "Rádio", "TV Aberta", "Streaming Vídeo (VOD)", "Show ao Vivo", "Web", "de", ""
  - Validar cada passo do algoritmo
  
- [ ] 6.2 Testes unitários — `CriarRubricaCommandHandlerTest`
  - Criar com sigla sugerida (mock SiglaSuggester)
  - Criar com sigla informada manualmente
  - Falhar com sigla duplicada (mock existsBySigla = true)
  - Publicar evento outbox (verify OutboxEventWriter)
  
- [ ] 6.3 Testes unitários — `InativarRubricaCommandHandlerTest`
  - Inativar rubrica ativa
  - Falhar ao inativar rubrica já inativa
  - Publicar evento outbox
  
- [ ] 6.4 Testes unitários — `AtivarRubricaCommandHandlerTest`
  - Ativar rubrica inativa
  - Falhar ao ativar rubrica já ativa
  
- [ ] 6.5 Testes de integração — `RubricaEndpointsIntegrationTest`
  - `POST /api/v1/rubricas` — criação completa
  - `PUT /api/v1/rubricas/{id}` — atualização
  - `POST /api/v1/rubricas/{id}/inativar` — inativação
  - `POST /api/v1/rubricas/{id}/ativar` — reativação
  - `GET /api/v1/rubricas` — listagem
  - `GET /api/v1/rubricas/{id}` — detalhe
  - Validação de permissões (401/403)
  
- [ ] 6.6 Testes de integração — `LicencaRubricaInativaIntegrationTest`
  - Criar rubrica, inativar
  - Tentar criar licença → HTTP 422
  - Verificar mensagem de erro
  
- [ ] 6.7 Testes de integração — `PagamentoRubricaInativaIntegrationTest`
  - Criar rubrica, criar licença, inativar rubrica
  - Tentar registrar pagamento → HTTP 422
  - Verificar mensagem de erro
  
- [ ] 6.8 Testes de integração — `RubricaEventSyncIT`
  - Criar/atualizar/inativar rubrica na Arrecadação
  - Verificar evento no Outbox (`outbox_events`)
  - Verificar consumo na Distribuição (ou simular listener)
  - Validar que `ativo` foi sincronizado

## Detalhes de Implementação

### SiglaSuggesterTest (exemplo)

```java
class SiglaSuggesterTest {
    private final SiglaSuggester suggester = new SiglaSuggesterImpl();
    
    @Test
    void sugerir_RadioAMFM_DeveRetornarRADIO() {
        assertThat(suggester.sugerir("Rádio AM/FM")).isEqualTo("RADIO");
    }
    
    @Test
    void sugerir_TVAberta_DeveRetornarTV_ABERTA() {
        assertThat(suggester.sugerir("TV Aberta")).isEqualTo("TV_ABERTA");
    }
    
    @Test
    void sugerir_StreamingVideoVOD_DeveRetornarSTREAMING_VIDEO_VOD() {
        assertThat(suggester.sugerir("Streaming Vídeo (VOD)"))
            .isEqualTo("STREAMING_VIDEO_VOD");
    }
    
    @Test
    void sugerir_PalavraCurta_DeveRetornar3Letras() {
        assertThat(suggester.sugerir("Web")).isEqualTo("WEB");
    }
}
```

### CriarRubricaCommandHandlerTest (exemplo)

```java
@ExtendWith(MockitoExtension.class)
class CriarRubricaCommandHandlerTest {
    @Mock RubricaRepository rubricaRepository;
    @Mock SiglaSuggester siglaSuggester;
    @Mock OutboxEventWriter outboxEventWriter;
    
    CriarRubricaCommandHandler handler;
    
    @BeforeEach
    void setUp() {
        handler = new CriarRubricaCommandHandler(
            rubricaRepository, siglaSuggester, outboxEventWriter);
    }
    
    @Test
    void criarComSiglaSugerida_DeveGerarSiglaESalvar() {
        when(siglaSuggester.sugerir("Rádio")).thenReturn("RADIO");
        when(rubricaRepository.existsBySigla("RADIO")).thenReturn(false);
        when(rubricaRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        
        var cmd = new CriarRubricaCommand("Rádio", false, null, actor);
        var response = handler.handle(cmd);
        
        assertThat(response.sigla()).isEqualTo("RADIO");
        verify(outboxEventWriter).addEvent(eq("arrecadacao.rubrica.atualizada"), 
            anyString(), anyMap());
    }
    
    @Test
    void criarComSiglaDuplicada_DeveLancarConflictException() {
        when(rubricaRepository.existsBySigla("RADIO")).thenReturn(true);
        
        var cmd = new CriarRubricaCommand("Rádio", false, "RADIO", actor);
        assertThatThrownBy(() -> handler.handle(cmd))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Sigla 'RADIO' já cadastrada");
    }
}
```

## Critérios de Sucesso

- [ ] Cobertura > 70% da lógica de negócio nova (verificar com `mvn jacoco:report`)
- [ ] Todos os testes unitários passam (`mvn test`)
- [ ] Todos os testes de integração passam com Testcontainers
- [ ] Testes de evento validam payload com campo `ativo`
