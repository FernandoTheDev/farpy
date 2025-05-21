// TODO
import "io"
import "string"

fn next_token(code: string, idx: i32, tok: string): bool {
    // pula espaços
    while idx < str_length(code) && str_equals(str_slice(code, idx, idx+1), " ") {
        idx = (i32)idx + 1
    }
    if idx >= str_length(code) {
        tok = ""
        return false
    }
    // lê até próximo espaço
    new mut start_ = idx
    while idx < str_length(code) && !str_equals(str_slice(code, idx, idx+1), " ") {
        idx = (i32)idx + 1
    }
    tok = str_slice(code, start_, idx)
    return true
}

fn run_bytecode(code: string): i32 {
    // pilha de até 4 valores
    new mut slot1: i32 = 0
    new mut slot2: i32 = 0
    new mut slot3: i32 = 0
    new mut slot4: i32 = 0
    new mut topo: i32 = 0
    new mut idx = 0
    new mut token = ""
    // loop de leitura de tokens
    while next_token(code, idx, token) {
        // se for número, faz push
        new mut is_num = 1 == 1 // true
        // tenta parsear char a char
        new len: i32 = str_length(token)
        for 0..len as j {
            new str_digit = str_slice(token, j, j+1)
            if !str_equals(str_digit, "0") &&
            !str_equals(str_digit, "1") &&
            !str_equals(str_digit, "2") &&
            !str_equals(str_digit, "3") &&
            !str_equals(str_digit, "4") &&
            !str_equals(str_digit, "5") &&
            !str_equals(str_digit, "6") &&
            !str_equals(str_digit, "7") &&
            !str_equals(str_digit, "8") &&
            !str_equals(str_digit, "9") {
                is_num = false
            }
            printf("Hello")
        }
        if is_num {
            // convertendo token pra int (usa seu char_para_int + matemática)
            new val: i32 = atoi(token)    // supondo que você tenha um atoi
            topo = topo + 1
            if topo == 1 { slot1 = val }
            if topo == 2 { slot2 = val }
            if topo == 3 { slot3 = val }
            if topo == 4 { slot4 = val }
        } else {
            // senão, é uma instrução: add, sub, mul, div, pop
            // pop recupera o topo e decrementa
            if str_equals(token, "pop") {
                if topo == 4 { slot4 = 0 }
                if topo == 3 { slot3 = 0 }
                if topo == 2 { slot2 = 0 }
                if topo == 1 { slot1 = 0 }
                topo = topo - 1
            }
            // operações binárias: pega os dois topos, calcula e faz push do resultado
            elif str_equals(token, "add") {
                // x = pop(); y = pop()
                new mut x: i32 = 0
                new mut y: i32 = 0
                if topo == 4 { x = slot4 slot4 = 0 }
                if topo == 3 { x = slot3 slot3 = 0 }
                if topo == 2 { x = slot2 slot2 = 0 }
                if topo == 1 { x = slot1 slot1 = 0 }
                topo = topo - 1
                if topo == 4 { y = slot4 slot4 = 0 }
                if topo == 3 { y = slot3 slot3 = 0 }
                if topo == 2 { y = slot2 slot2 = 0 }
                if topo == 1 { y = slot1 slot1 = 0 }
                topo = topo - 1
                // resultado e push
                new res: i32 = y + x
                topo = topo + 1
                if topo == 1 { slot1 = res }
                if topo == 2 { slot2 = res }
                if topo == 3 { slot3 = res }
                if topo == 4 { slot4 = res }
            } else {
                printf("Instr invalida: %s\n", token)
            }
        }
    }
    // ao final, devolve o topo se houver
    if topo == 1 { return slot1 }
    if topo == 2 { return slot2 }
    if topo == 3 { return slot3 }
    if topo == 4 { return slot4 }
    return 0
}

// exemplo: (10 + 20) * 5 = 150
new prog = "push 10 push 20 add push 5 mul"
new resultado: i32 = run_bytecode(prog)
printf("Resultado da VM: %d\n", resultado)  // deve imprimir 150
