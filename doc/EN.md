# Farpy Documentation

## Table of Contents

- [Farpy Documentation](#farpy-documentation)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Installation](#installation)
  - [Hello World](#hello-world)
  - [Variable Declaration](#variable-declaration)
    - [Mutable](#mutable)
    - [Immutable](#immutable)
  - [Functions](#functions)
  - [Control Flow](#control-flow)
    - [If / Elif / Else](#if--elif--else)
    - [For](#for)
  - [Standard Libraries](#standard-libraries)
    - [`io`](#io)
  - [Importing External Code](#importing-external-code)
  - [Native Types](#native-types)
  - [FFI (Foreign Function Interface)](#ffi-foreign-function-interface)
  - [Optimization](#optimization)
  - [Version](#version)

---

## Introduction

Farpy is a general-purpose language combining simplicity, safety, and high performance. If you've ever been frustrated by segmentation faults in C or need speed without sacrificing safety, Farpy is designed for you. With a powerful FFI, integrating C code directly into your programs is straightforward.

> **Warning:** Use Farpy's flexibility responsibly; we are not liable for malicious code.

---

## Installation

**Dependencies:**

* Deno
* Clang
* UPX
* Git
* LLVM toolchain (`llvm-as`, `llvm-link`, `strip`)

1. Clone the repository:

   ```bash
   git clone https://github.com/fernandothedev/farpy.git
   cd farpy
   ```
2. Compile the compiler:

   ```bash
   deno task compile
   ```
3. Add `farpy` to your PATH (e.g., move it to `/usr/local/bin`).

---

## Hello World

Create `hello.fp` with:

```farpy
import "io"

printf("Hello World\n")
```

Compile and generate the executable:

```bash
farpy hello.fp --o hello
```

Run:

```bash
# Linux
./hello
```

Output:

```
Hello World
```

---

## Variable Declaration

Farpy supports **immutable** and **mutable** variables, with or without explicit typing:

### Mutable

```farpy
// With explicit typing
new mut name: string = "Fernando"

// Type inference
new mut name = "Fernando"
```

### Immutable

```farpy
// With explicit typing
new name: string = "Fernando"

// Type inference
new name = "Fernando"

// C-style
string name = "Fernando"
```

---

## Functions

Declare all parameters and specify a return type:

```farpy
fn hello() {
  // No explicit return
}

fn sum(x: int, y: int): int {
  return x + y
}
```

---

## Control Flow

### If / Elif / Else

```farpy
int x = 11

if x > 10 {
  // if block
} elif x < 10 {
  // elif block
} else {
  // x == 10
}
```

### For

```farpy
// 0 to 99 (100 iterations)
for 0..100 {
  // ...
}

// 0 to 100
for 0..=100 {
  // ...
}

// step by 2
for 0..=100 step 2 as i {
  // use i
}
```

---

## Standard Libraries

### `io`

```farpy
print("string")
printf("Format: %s %d\n", "text", 42)
```

---

## Importing External Code

Organize logic across multiple files:

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

## Native Types

```
int      // alias for i32
i32
i64      // alias for long
float    // alias for double
double
string
bool
binary   // 0b01
null
void     // no return
```

---

## FFI (Foreign Function Interface)

Embed C code directly:

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

**Note:** Anything imported in Farpy affects the embedded C code and vice versa.

---

## Optimization

Compile with optimization:

```bash
farpy file.fp --opt
```

---

## Version

* **Current Version:** 0.0.1

---

*Made with ❤️ by the Farpy community*
