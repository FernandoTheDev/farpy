; External Declarations
source_filename = "examples/fib_c_ffi.fp"
target triple = "x86_64-redhat-linux-gnu"

declare i32 @printf(i8*, ...)

; Global Declarations
declare void @init_fib()

declare i32 @fibonacci(i32)

@.str2 = private constant [13 x i8] c"fib(10) = %d\00"

define i32 @main() {
entry:
  call void @init_fib()
  %farpy_1 = getelementptr inbounds [13 x i8], [13 x i8]* @.str2, i32 0, i32 0
  %farpy_2 = call i32 @fibonacci(i32 10)
  %farpy_3 = call i32 @printf(i8* %farpy_1, i32 %farpy_2)
  ret i32 0
}