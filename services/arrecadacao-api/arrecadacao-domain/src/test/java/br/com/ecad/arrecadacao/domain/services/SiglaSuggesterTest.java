package br.com.ecad.arrecadacao.domain.services;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SiglaSuggesterTest {

    private final SiglaSuggester suggester = new SiglaSuggesterImpl();

    @Test
    void sugerir_Radio_DeveRetornarRADIO() {
        assertThat(suggester.sugerir("Rádio")).isEqualTo("RADIO");
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
    void sugerir_ShowAoVivo_DeveRetornarSHOW_AO_VIVO() {
        assertThat(suggester.sugerir("Show ao Vivo")).isEqualTo("SHOW_AO_VIVO");
    }

    @Test
    void sugerir_Web_DeveRetornarWEB() {
        assertThat(suggester.sugerir("Web")).isEqualTo("WEB");
    }

    @Test
    void sugerir_ApenasPreposicoes_DeveFallbackParaPrimeirasLetras() {
        assertThat(suggester.sugerir("de da do")).isEqualTo("D_D_D");
    }

    @Test
    void sugerir_NomeNulo_DeveRetornarVazio() {
        assertThat(suggester.sugerir(null)).isEmpty();
    }

    @Test
    void sugerir_NomeBlank_DeveRetornarVazio() {
        assertThat(suggester.sugerir("   ")).isEmpty();
    }
}
