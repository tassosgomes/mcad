package br.com.ecad.arrecadacao.infra.services;

import br.com.ecad.arrecadacao.application.ports.BoletoPdfData;
import br.com.ecad.arrecadacao.application.ports.BoletoPdfGenerator;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
public class SimpleBoletoPdfGenerator implements BoletoPdfGenerator {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Override
    public byte[] generate(BoletoPdfData data) {
        String content = buildContentStream(data);
        return buildPdf(content);
    }

    private String buildContentStream(BoletoPdfData data) {
        StringBuilder content = new StringBuilder();
        content.append("0.95 0.95 0.95 rg 40 730 515 55 re f\n");
        content.append("0 0 0 rg BT /F1 20 Tf 55 765 Td (BOLETO FAKE - SEM VALOR BANCARIO) Tj ET\n");
        content.append("BT /F1 10 Tf 55 745 Td (Uso academico/POC. Nao registrar em rede bancaria.) Tj ET\n");
        appendText(content, 55, 705, "Banco de Testes Academicos: 000");
        appendText(content, 55, 685, "Pagamento: " + data.pagamentoId());
        appendText(content, 55, 665, "Pagador: " + data.razaoSocial());
        appendText(content, 55, 645, "Documento: " + data.documento());
        appendText(content, 55, 625, "Rubrica: " + data.rubrica());
        appendText(content, 55, 605, "Periodo: " + data.periodo());
        appendText(content, 55, 585, "Valor: R$ " + data.valor());
        appendText(content, 55, 565, "Vencimento: " + data.vencimento().format(DATE_FORMAT));
        appendText(content, 55, 545, "Nosso numero fake: " + data.nossoNumero());
        appendText(content, 55, 505, "Linha digitavel:");
        appendText(content, 55, 485, data.linhaDigitavel());
        appendText(content, 55, 445, "Codigo de barras fake: " + data.codigoBarras());
        appendFakeBarcode(content, data.codigoBarras());
        appendText(content, 55, 250, "Este documento nao representa cobranca bancaria real.");
        appendText(content, 55, 232, "Arquivo gerado para fins academicos e de estudo.");
        return content.toString();
    }

    private void appendText(StringBuilder content, int x, int y, String text) {
        content.append("BT /F1 11 Tf ")
                .append(x)
                .append(' ')
                .append(y)
                .append(" Td (")
                .append(escape(text))
                .append(") Tj ET\n");
    }

    private void appendFakeBarcode(StringBuilder content, String barcode) {
        int x = 55;
        int y = 320;
        content.append("0 0 0 rg\n");
        for (int index = 0; index < barcode.length(); index++) {
            int digit = Character.digit(barcode.charAt(index), 10);
            int width = digit % 3 + 1;
            int height = 70 + (digit % 4) * 8;
            content.append(x)
                    .append(' ')
                    .append(y)
                    .append(' ')
                    .append(width)
                    .append(' ')
                    .append(height)
                    .append(" re f\n");
            x += width + 3;
        }
    }

    private byte[] buildPdf(String contentStream) {
        List<byte[]> objects = new ArrayList<>();
        objects.add("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n".getBytes(StandardCharsets.ISO_8859_1));
        objects.add("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n".getBytes(StandardCharsets.ISO_8859_1));
        objects.add(("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
                + "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n")
                .getBytes(StandardCharsets.ISO_8859_1));
        objects.add("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
                .getBytes(StandardCharsets.ISO_8859_1));
        byte[] streamBytes = contentStream.getBytes(StandardCharsets.ISO_8859_1);
        objects.add(("5 0 obj << /Length " + streamBytes.length + " >> stream\n"
                + contentStream
                + "endstream endobj\n").getBytes(StandardCharsets.ISO_8859_1));

        ByteArrayOutputStream pdf = new ByteArrayOutputStream();
        write(pdf, "%PDF-1.4\n");
        List<Integer> offsets = new ArrayList<>();
        offsets.add(0);
        for (byte[] object : objects) {
            offsets.add(pdf.size());
            pdf.writeBytes(object);
        }
        int xrefOffset = pdf.size();
        write(pdf, "xref\n0 " + (objects.size() + 1) + "\n");
        write(pdf, "0000000000 65535 f \n");
        for (int index = 1; index < offsets.size(); index++) {
            write(pdf, String.format("%010d 00000 n \n", offsets.get(index)));
        }
        write(pdf, "trailer << /Size " + (objects.size() + 1) + " /Root 1 0 R >>\n");
        write(pdf, "startxref\n" + xrefOffset + "\n%%EOF\n");
        return pdf.toByteArray();
    }

    private void write(ByteArrayOutputStream output, String value) {
        output.writeBytes(value.getBytes(StandardCharsets.ISO_8859_1));
    }

    private String escape(String text) {
        return text == null ? "" : text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }
}
