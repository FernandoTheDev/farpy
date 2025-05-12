# Documentação do Farpy

## Índice

- [Documentação do Farpy](#documentação-do-farpy)
  - [Índice](#índice)
  - [Introdução](#introdução)
  - [Instalação](#instalação)
  - [Olá Mundo](#olá-mundo)
  - [Declaração de Variável](#declaração-de-variável)
    - [Mutáveis](#mutáveis)
    - [Imutáveis](#imutáveis)
  - [Funções](#funções)
  - [Controle de Fluxo](#controle-de-fluxo)
    - [If / Elif / Else](#if--elif--else)
    - [For](#for)
    - [While](#while)
  - [Bibliotecas Padrão](#bibliotecas-padrão)
    - [`io`](#io)
  - [Importando Código Externo](#importando-código-externo)
  - [Tipos Nativos](#tipos-nativos)
  - [FFI (Foreign Function Interface)](#ffi-foreign-function-interface)
  - [Otimização](#otimização)
  - [Versão](#versão)

---

## Introdução

Farpy é uma linguagem de propósito geral que combina simplicidade, segurança e alta performance. Se você já se frustrou com *segmentation faults* em C ou busca velocidade sem comprometer segurança, o Farpy foi feito para você. Com um FFI poderoso, é fácil integrar código C diretamente em seus programas.

> **Atenção:** Use a flexibilidade do Farpy com responsabilidade; não nos responsabilizamos por códigos maliciosos.

---

## Instalação

**Dependências**:

* Deno
* Clang
* UPX
* Git
* LLVM toolchain (`llvm-as`, `llvm-link`, `strip`)

1. Clone o repositório:

   ```bash
   git clone https://github.com/fernandothedev/farpy.git
   cd farpy
   ```
2. Compile o compilador:

   ```bash
   ./build.sh install
   ```

---

## Olá Mundo

Crie `hello.fp` com:

```farpy
import "io"

printf("Olá Mundo\n")
```

Compile e gere o executável:

```bash
farpy hello.fp --o hello
```

Execute:

```bash
# Linux
./hello
```

Saída:

```
Olá Mundo
```

---

## Declaração de Variável

Em Farpy há variáveis **imutáveis** e **mutáveis**, com ou sem tipagem explícita:

### Mutáveis

```farpy
// Com tipagem explícita
new mut name: string = "Fernando"

// Inferência de tipo
new mut name = "Fernando"
```

### Imutáveis

```farpy
// Com tipagem explícita
new name: string = "Fernando"

// Inferência de tipo
new name = "Fernando"

// Estilo C
string name = "Fernando"
```

---

## Funções

Declare todos os parâmetros e retorne tipado:

```farpy
fn hello() {
  // Sem retorno explícito
}

fn sum(x: int, y: int): int {
  return x + y
}
```

---

## Controle de Fluxo

### If / Elif / Else

```farpy
int x = 11

if x > 10 {
  // bloco if
} elif x < 10 {
  // bloco elif
} else {
  // x == 10
}
```

### For

```farpy
// 0 até 99 (100 iterações)
for 0..100 {
  // ...
}

// 0 até 100
for 0..=100 {
  // ...
}

// passo de 2
for 0..=100 step 2 as i {
  // use i
}
```

### While

```farpy
while i < 10 {
  i = i + 1 // i++
  // faça algo
}
```

---

## Bibliotecas Padrão

### `io`

```farpy
print("string")
printf("Formato: %s %d\n", "texto", 42)
```

---

## Importando Código Externo

Centralize lógica em vários arquivos:

**sum.fp**

```farpy
fn sum(x: int, y: int): int {
  return x + y
}
```

**main.fp**

```farpy
import "io"
import "sum.fp"

int x = 9
int y = 60

printf("%d + %d = %d\n", x, y, sum(x, y))
```

Compile:

```bash
farpy main.fp --o app
```

---

## Tipos Nativos

```
int      // alias para i32
i32
i64      // alias long
float    // alias double
double
string
bool
binary   // 0b01
null
void     // sem retorno
```

---

## FFI (Foreign Function Interface)

Insira código C diretamente:

```farpy
import "io"

extern "C" start
    int sum(int x, int y) {
        printf("C: Hello\n");
        return x + y;
    }

    void hello(const char *n) {
        printf("Hello %s\n", n);
    }
end

int x = sum(60, 9)
printf("Calc = %d\n", x)

hello("Fernando")
```

**Observação:** tudo que importar em Farpy afetará o C embutido e vice-versa.

---

## Otimização

Compile com otimização:

```bash
farpy file.fp --opt
```

---

## Versão

* **Versão Atual:** 0.0.2

---

*Feito com ❤️ pela comunidade Farpy*
