; main.ll - Código principal

declare void @print_hello()  ; Declaração de print_hello da biblioteca io

define i32 @main() {
entry:
  ; Chamar a função print_hello que imprime "Hello, world!"
  call void @print_hello()
  ret i32 0
}
