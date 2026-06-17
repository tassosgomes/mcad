package br.com.ecad.arrecadacao.domain.services;

import br.com.ecad.arrecadacao.domain.entities.BoletoFakeData;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

public final class BoletoFakeCalculator {

    private static final String BANK_CODE = "000";
    private static final String CURRENCY_CODE = "9";
    private static final LocalDate FACTOR_BASE_DATE = LocalDate.of(2025, 2, 22);

    private BoletoFakeCalculator() {
    }

    public static BoletoFakeData generate(UUID paymentId, BigDecimal amount, LocalDate dueDate) {
        if (paymentId == null) {
            throw new IllegalArgumentException("PaymentId is required");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        if (dueDate == null) {
            throw new IllegalArgumentException("DueDate is required");
        }

        String dueFactor = leftPad(String.valueOf(ChronoUnit.DAYS.between(FACTOR_BASE_DATE, dueDate)), 4);
        String amountField = amount.movePointRight(2)
                .setScale(0, RoundingMode.HALF_UP)
                .toPlainString();
        amountField = leftPad(amountField, 10);
        String freeField = buildFreeField(paymentId);
        String partial = BANK_CODE + CURRENCY_CODE + dueFactor + amountField + freeField;
        String generalDigit = String.valueOf(mod11General(partial));
        String barcode = BANK_CODE + CURRENCY_CODE + generalDigit + dueFactor + amountField + freeField;
        String line = buildLinhaDigitavel(barcode, freeField, generalDigit, dueFactor, amountField);
        String nossoNumero = freeField.substring(freeField.length() - 12);
        return new BoletoFakeData(nossoNumero, barcode, line);
    }

    private static String buildLinhaDigitavel(
            String barcode,
            String freeField,
            String generalDigit,
            String dueFactor,
            String amountField
    ) {
        if (barcode.length() != 44) {
            throw new IllegalArgumentException("Barcode must have 44 digits");
        }
        String field1 = BANK_CODE + CURRENCY_CODE + freeField.substring(0, 5);
        String field2 = freeField.substring(5, 15);
        String field3 = freeField.substring(15, 25);
        return formatField(field1) + mod10(field1) + " "
                + formatField(field2) + mod10(field2) + " "
                + formatField(field3) + mod10(field3) + " "
                + generalDigit + " "
                + dueFactor + amountField;
    }

    private static String formatField(String value) {
        return value.substring(0, 5) + "." + value.substring(5);
    }

    private static String buildFreeField(UUID paymentId) {
        String numericSeed = paymentId.toString().chars()
                .mapToObj(character -> String.valueOf(character % 10))
                .reduce("", String::concat);
        return right(numericSeed + Math.abs(paymentId.hashCode()), 25);
    }

    private static int mod10(String value) {
        int sum = 0;
        int weight = 2;
        for (int index = value.length() - 1; index >= 0; index--) {
            int result = Character.digit(value.charAt(index), 10) * weight;
            sum += result > 9 ? result - 9 : result;
            weight = weight == 2 ? 1 : 2;
        }
        int remainder = sum % 10;
        return remainder == 0 ? 0 : 10 - remainder;
    }

    private static int mod11General(String value) {
        int sum = 0;
        int weight = 2;
        for (int index = value.length() - 1; index >= 0; index--) {
            sum += Character.digit(value.charAt(index), 10) * weight;
            weight = weight == 9 ? 2 : weight + 1;
        }
        int digit = 11 - (sum % 11);
        return digit == 0 || digit == 10 || digit == 11 ? 1 : digit;
    }

    private static String leftPad(String value, int size) {
        if (value.length() >= size) {
            return value.substring(value.length() - size);
        }
        return "0".repeat(size - value.length()) + value;
    }

    private static String right(String value, int size) {
        if (value.length() >= size) {
            return value.substring(value.length() - size);
        }
        return leftPad(value, size);
    }
}
