; ModuleID = '/tmp/d19335fe7be4c587.bc'
source_filename = "llvm-link"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-i128:128-f80:128-n8:16:32:64-S128"
target triple = "x86_64-redhat-linux-gnu"

@.str0 = private constant [9 x i8] c"FIB: %d\0A\00"
@.str = private unnamed_addr constant [3 x i8] c"%s\00", align 1
@memo = dso_local global [1000 x i32] zeroinitializer, align 16

define i32 @main() {
entry:
  call void @init_fib()
  %farpy_1 = getelementptr inbounds [9 x i8], ptr @.str0, i32 0, i32 0
  %farpy_2 = call i32 @fibonacci(i32 40)
  %farpy_3 = call i32 @printf(ptr %farpy_1, i32 %farpy_2)
  ret i32 0
}

declare i32 @printf(ptr, ...)

; Function Attrs: noinline nounwind optnone uwtable
define dso_local void @print(ptr noundef %0) #0 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
  %3 = load ptr, ptr %2, align 8
  %4 = call i32 (ptr, ...) @printf(ptr noundef @.str, ptr noundef %3)
  ret void
}

; Function Attrs: noinline nounwind optnone uwtable
define dso_local void @init_fib() #0 {
  %1 = alloca i32, align 4
  store i32 0, ptr %1, align 4
  br label %2

2:                                                ; preds = %9, %0
  %3 = load i32, ptr %1, align 4
  %4 = icmp slt i32 %3, 1000
  br i1 %4, label %5, label %12

5:                                                ; preds = %2
  %6 = load i32, ptr %1, align 4
  %7 = sext i32 %6 to i64
  %8 = getelementptr inbounds [1000 x i32], ptr @memo, i64 0, i64 %7
  store i32 -1, ptr %8, align 4
  br label %9

9:                                                ; preds = %5
  %10 = load i32, ptr %1, align 4
  %11 = add nsw i32 %10, 1
  store i32 %11, ptr %1, align 4
  br label %2, !llvm.loop !4

12:                                               ; preds = %2
  ret void
}

; Function Attrs: noinline nounwind optnone uwtable
define dso_local i32 @fibonacci(i32 noundef %0) #0 {
  %2 = alloca i32, align 4
  %3 = alloca i32, align 4
  store i32 %0, ptr %3, align 4
  %4 = load i32, ptr %3, align 4
  %5 = icmp sle i32 %4, 0
  br i1 %5, label %6, label %7

6:                                                ; preds = %1
  store i32 0, ptr %2, align 4
  br label %38

7:                                                ; preds = %1
  %8 = load i32, ptr %3, align 4
  %9 = icmp eq i32 %8, 1
  br i1 %9, label %10, label %11

10:                                               ; preds = %7
  store i32 1, ptr %2, align 4
  br label %38

11:                                               ; preds = %7
  br label %12

12:                                               ; preds = %11
  %13 = load i32, ptr %3, align 4
  %14 = sext i32 %13 to i64
  %15 = getelementptr inbounds [1000 x i32], ptr @memo, i64 0, i64 %14
  %16 = load i32, ptr %15, align 4
  %17 = icmp ne i32 %16, -1
  br i1 %17, label %18, label %23

18:                                               ; preds = %12
  %19 = load i32, ptr %3, align 4
  %20 = sext i32 %19 to i64
  %21 = getelementptr inbounds [1000 x i32], ptr @memo, i64 0, i64 %20
  %22 = load i32, ptr %21, align 4
  store i32 %22, ptr %2, align 4
  br label %38

23:                                               ; preds = %12
  %24 = load i32, ptr %3, align 4
  %25 = sub nsw i32 %24, 1
  %26 = call i32 @fibonacci(i32 noundef %25)
  %27 = load i32, ptr %3, align 4
  %28 = sub nsw i32 %27, 2
  %29 = call i32 @fibonacci(i32 noundef %28)
  %30 = add nsw i32 %26, %29
  %31 = load i32, ptr %3, align 4
  %32 = sext i32 %31 to i64
  %33 = getelementptr inbounds [1000 x i32], ptr @memo, i64 0, i64 %32
  store i32 %30, ptr %33, align 4
  %34 = load i32, ptr %3, align 4
  %35 = sext i32 %34 to i64
  %36 = getelementptr inbounds [1000 x i32], ptr @memo, i64 0, i64 %35
  %37 = load i32, ptr %36, align 4
  store i32 %37, ptr %2, align 4
  br label %38

38:                                               ; preds = %23, %18, %10, %6
  %39 = load i32, ptr %2, align 4
  ret i32 %39
}

attributes #0 = { noinline nounwind optnone uwtable "frame-pointer"="all" "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.ident = !{!0, !0}
!llvm.module.flags = !{!1, !2, !3}

!0 = !{!"clang version 18.1.8 (Fedora 18.1.8-2.fc40)"}
!1 = !{i32 1, !"wchar_size", i32 4}
!2 = !{i32 7, !"uwtable", i32 2}
!3 = !{i32 7, !"frame-pointer", i32 2}
!4 = distinct !{!4, !5}
!5 = !{!"llvm.loop.mustprogress"}
