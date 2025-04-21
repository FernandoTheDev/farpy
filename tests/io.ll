; io.ll - Declaração de funções auxiliares

declare i32 @printf(i8*, ...)  ; Declaração de printf

@str = constant [14 x i8] c"Hello, world!\0A"

; Função para imprimir uma string
define void @print_hello() {
entry:
  ; Obter ponteiro para a string
  %fmt = getelementptr inbounds [14 x i8], [14 x i8]* @str, i32 0, i32 0
  ; Chamar printf
  call i32 @printf(i8* %fmt)
  ret void
}
