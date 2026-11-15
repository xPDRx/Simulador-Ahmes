; Demonstra JZ: como 5 - 5 resulta em zero, o programa desvia para o endereço 8.
; A instrução LDA 129 no endereço 4 será ignorada.
        LDA 128
        SUB 129
        JZ 8
        LDA 130
        HLT
        ORG 8
        LDA 131
        HLT

        ORG 128
        DB 5
        DB 5
        DB 99
        DB 42
