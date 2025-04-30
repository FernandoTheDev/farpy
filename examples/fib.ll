; External Declarations
source_filename = "examples/fib.fp"
target triple = "x86_64-redhat-linux-gnu"

declare i32 @printf(i8*, ...)

; Global Declarations
@.str0 = private constant [8 x i8] c"FIB: %d\00"

define i32 @fibonacci(i32 %n) {
entry:
  %farpy_0 = alloca i32, align 4
  store i32 %n, i32* %farpy_0, align 4
  %farpy_1 = load i32, i32* %farpy_0, align 4
  %farpy_2 = icmp sle i32 %farpy_1, 0
  br i1 %farpy_2, label %if_label0, label %else_label1
if_label0:
  ret i32 0
else_label1:
  %farpy_3 = load i32, i32* %farpy_0, align 4
  %farpy_4 = icmp eq i32 %farpy_3, 1
  br i1 %farpy_4, label %if_label3, label %else_label4
continue_label2:
  %farpy_5 = load i32, i32* %farpy_0, align 4
  %farpy_6 = sub i32 %farpy_5, 1
  %farpy_7 = call i32 @fibonacci(i32 %farpy_6)
  %farpy_8 = load i32, i32* %farpy_0, align 4
  %farpy_9 = sub i32 %farpy_8, 2
  %farpy_10 = call i32 @fibonacci(i32 %farpy_9)
  %farpy_11 = add i32 %farpy_7, %farpy_10
  ret i32 %farpy_11
if_label3:
  ret i32 1
else_label4:
  br label %continue_label2
}

define i32 @main() {
entry:
  %farpy_0 = getelementptr inbounds [8 x i8], [8 x i8]* @.str0, i32 0, i32 0
  %farpy_1 = call i32 @fibonacci(i32 5)
  %farpy_2 = call i32 @printf(i8* %farpy_0, i32 %farpy_1)
  ret i32 0
}