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
        content.append("0 0 0 rg 0.8 w\n");
        appendWatermark(content, 87, 790);
        appendReceiptSection(content, data);
        appendCutLine(content, 414);
        appendCompensationSection(content, data);
        return content.toString();
    }

    private void appendText(StringBuilder content, int x, int y, String text) {
        appendText(content, x, y, 9, text);
    }

    private void appendText(StringBuilder content, int x, int y, int size, String text) {
        content.append("BT /F1 ")
                .append(size)
                .append(" Tf ")
                .append(x)
                .append(' ')
                .append(y)
                .append(" Td (")
                .append(escape(text))
                .append(") Tj ET\n");
    }

    private void appendReceiptSection(StringBuilder content, BoletoPdfData data) {
        appendText(content, 45, 800, 11, "Recibo do Pagador");
        appendText(content, 382, 800, 9, "BOLETO FAKE - SEM VALOR BANCARIO");
        appendHeader(content, 45, 760, data);
        appendCell(content, 45, 716, 365, 36, "Beneficiario", "MCAD Arrecadacao - POC Academica");
        appendCell(content, 410, 716, 140, 36, "Agencia/Codigo Beneficiario", "0000 / 000000");
        appendCell(content, 45, 680, 155, 36, "Pagador", data.razaoSocial());
        appendCell(content, 200, 680, 120, 36, "Documento", data.documento());
        appendCell(content, 320, 680, 90, 36, "Nosso Numero", data.nossoNumero());
        appendCell(content, 410, 680, 140, 36, "Valor do Documento", "R$ " + data.valor());
        appendCell(content, 45, 644, 155, 36, "Rubrica", data.rubrica());
        appendCell(content, 200, 644, 120, 36, "Periodo", data.periodo());
        appendCell(content, 320, 644, 90, 36, "Vencimento", data.vencimento().format(DATE_FORMAT));
        appendCell(content, 410, 644, 140, 36, "Autenticacao Mecanica", "Ficha fake");
        appendText(content, 45, 614, 8, "Uso academico/POC. Nao pagar, nao registrar e nao apresentar em rede bancaria.");
    }

    private void appendCompensationSection(StringBuilder content, BoletoPdfData data) {
        appendText(content, 45, 390, 11, "Ficha de Compensacao");
        appendHeader(content, 45, 354, data);
        appendCell(content, 45, 318, 365, 36, "Local de Pagamento", "Pagavel apenas em ambiente academico/POC");
        appendCell(content, 410, 318, 140, 36, "Vencimento", data.vencimento().format(DATE_FORMAT));
        appendCell(content, 45, 282, 365, 36, "Beneficiario", "MCAD Arrecadacao - Banco de Testes 000");
        appendCell(content, 410, 282, 140, 36, "Agencia/Codigo Beneficiario", "0000 / 000000");
        appendCell(content, 45, 246, 120, 36, "Data Documento", data.vencimento().format(DATE_FORMAT));
        appendCell(content, 165, 246, 125, 36, "Numero Documento", data.pagamentoId().substring(0, 8).toUpperCase());
        appendCell(content, 290, 246, 120, 36, "Nosso Numero", data.nossoNumero());
        appendCell(content, 410, 246, 140, 36, "Valor do Documento", "R$ " + data.valor());
        appendCell(content, 45, 210, 365, 36, "Pagador", data.razaoSocial() + " - " + data.documento());
        appendCell(content, 410, 210, 140, 36, "Quantidade / Moeda", "R$");
        appendCell(content, 45, 174, 505, 36, "Instrucoes", "BOLETO FAKE. Documento sem valor bancario. Gerado para estudo da estrutura de boleto.");
        appendText(content, 45, 142, 8, "Codigo de barras fake:");
        appendFakeBarcode(content, data.codigoBarras(), 45, 58);
        appendText(content, 392, 40, 8, "Autenticacao mecanica - ficha fake");
    }

    private void appendHeader(StringBuilder content, int x, int y, BoletoPdfData data) {
        appendRect(content, x, y, 505, 34);
        appendText(content, x + 8, y + 12, 18, "000-0");
        appendLine(content, x + 72, y, x + 72, y + 34);
        appendText(content, x + 82, y + 13, 11, "Banco de Testes Academicos");
        appendText(content, x + 230, y + 13, 11, data.linhaDigitavel());
    }

    private void appendCell(StringBuilder content, int x, int y, int width, int height, String label, String value) {
        appendRect(content, x, y, width, height);
        appendText(content, x + 4, y + height - 11, 7, label);
        appendText(content, x + 4, y + 8, 9, value);
    }

    private void appendWatermark(StringBuilder content, int x, int y) {
        content.append("0.92 0.92 0.92 rg 45 770 505 36 re f\n");
        content.append("0 0 0 rg\n");
        appendText(content, x, y, 18, "BOLETO FAKE - USO ACADEMICO - SEM VALOR BANCARIO");
    }

    private void appendCutLine(StringBuilder content, int y) {
        content.append("0.6 w [3 3] 0 d 45 ")
                .append(y)
                .append(" m 550 ")
                .append(y)
                .append(" l S [] 0 d\n");
        appendText(content, 45, y + 8, 7, "Corte na linha pontilhada");
    }

    private void appendRect(StringBuilder content, int x, int y, int width, int height) {
        content.append(x)
                .append(' ')
                .append(y)
                .append(' ')
                .append(width)
                .append(' ')
                .append(height)
                .append(" re S\n");
    }

    private void appendLine(StringBuilder content, int x1, int y1, int x2, int y2) {
        content.append(x1)
                .append(' ')
                .append(y1)
                .append(" m ")
                .append(x2)
                .append(' ')
                .append(y2)
                .append(" l S\n");
    }

    private void appendFakeBarcode(StringBuilder content, String barcode, int startX, int y) {
        int x = startX;
        content.append("0 0 0 rg\n");
        for (int index = 0; index < barcode.length(); index++) {
            int digit = Character.digit(barcode.charAt(index), 10);
            int width = digit % 3 + 1;
            int height = 58 + (digit % 4) * 6;
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
