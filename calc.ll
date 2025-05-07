; ModuleID = 'calc.8b5c057857f476b5-cgu.0'
source_filename = "calc.8b5c057857f476b5-cgu.0"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-i128:128-f80:128-n8:16:32:64-S128"
target triple = "x86_64-unknown-linux-gnu"

%"core::fmt::rt::Argument<'_>" = type { %"core::fmt::rt::ArgumentType<'_>" }
%"core::fmt::rt::ArgumentType<'_>" = type { ptr, [1 x i64] }
%"core::fmt::rt::Placeholder" = type { %"core::fmt::rt::Count", %"core::fmt::rt::Count", i64, i32, i32, i8, [7 x i8] }
%"core::fmt::rt::Count" = type { i64, [1 x i64] }

@vtable.0 = private unnamed_addr constant <{ [24 x i8], ptr, ptr, ptr }> <{ [24 x i8] c"\00\00\00\00\00\00\00\00\08\00\00\00\00\00\00\00\08\00\00\00\00\00\00\00", ptr @"_ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17hebcb72203862eeacE", ptr @"_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17hdf7fc127bc7d2934E", ptr @"_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17hdf7fc127bc7d2934E" }>, align 8
@alloc_3b6cccab34c14ef7a93569b8fdaf81d2 = private unnamed_addr constant <{ [24 x i8] }> <{ [24 x i8] c"Result of complex calc: " }>, align 1
@alloc_49a1e817e911805af64bbc7efb390101 = private unnamed_addr constant <{ [1 x i8] }> <{ [1 x i8] c"\0A" }>, align 1
@alloc_309583548ca76d69388b7d3481d1c1c6 = private unnamed_addr constant <{ ptr, [8 x i8], ptr, [8 x i8] }> <{ ptr @alloc_3b6cccab34c14ef7a93569b8fdaf81d2, [8 x i8] c"\18\00\00\00\00\00\00\00", ptr @alloc_49a1e817e911805af64bbc7efb390101, [8 x i8] c"\01\00\00\00\00\00\00\00" }>, align 8

; std::rt::lang_start
; Function Attrs: nonlazybind uwtable
define hidden i64 @_ZN3std2rt10lang_start17h7eb188b87f8bdb39E(ptr %main, i64 %argc, ptr %argv, i8 %sigpipe) unnamed_addr #0 {
start:
  %_8 = alloca [8 x i8], align 8
  %_5 = alloca [8 x i8], align 8
  store ptr %main, ptr %_8, align 8
; call std::rt::lang_start_internal
  %0 = call i64 @_ZN3std2rt19lang_start_internal17h712a1d4742291d0cE(ptr align 1 %_8, ptr align 8 @vtable.0, i64 %argc, ptr %argv, i8 %sigpipe)
  store i64 %0, ptr %_5, align 8
  %v = load i64, ptr %_5, align 8
  ret i64 %v
}

; std::rt::lang_start::{{closure}}
; Function Attrs: inlinehint nonlazybind uwtable
define internal i32 @"_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17hdf7fc127bc7d2934E"(ptr align 8 %_1) unnamed_addr #1 {
start:
  %self = alloca [1 x i8], align 1
  %_4 = load ptr, ptr %_1, align 8
; call std::sys::backtrace::__rust_begin_short_backtrace
  call void @_ZN3std3sys9backtrace28__rust_begin_short_backtrace17h1f0afb725b591c4bE(ptr %_4)
; call <() as std::process::Termination>::report
  %0 = call i8 @"_ZN54_$LT$$LP$$RP$$u20$as$u20$std..process..Termination$GT$6report17ha54cc58c354e084aE"()
  store i8 %0, ptr %self, align 1
  %_6 = load i8, ptr %self, align 1
  %_0 = zext i8 %_6 to i32
  ret i32 %_0
}

; std::f64::<impl f64>::ln
; Function Attrs: inlinehint nonlazybind uwtable
define internal double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$2ln17hf97ac581f2c93aa9E"(double %self) unnamed_addr #1 {
start:
  %0 = alloca [8 x i8], align 8
  %1 = call double @llvm.log.f64(double %self)
  store double %1, ptr %0, align 8
  %_0 = load double, ptr %0, align 8
  ret double %_0
}

; std::f64::<impl f64>::cos
; Function Attrs: inlinehint nonlazybind uwtable
define internal double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$3cos17hf21cbe24efdcf595E"(double %self) unnamed_addr #1 {
start:
  %0 = alloca [8 x i8], align 8
  %1 = call double @llvm.cos.f64(double %self)
  store double %1, ptr %0, align 8
  %_0 = load double, ptr %0, align 8
  ret double %_0
}

; std::f64::<impl f64>::sin
; Function Attrs: inlinehint nonlazybind uwtable
define internal double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$3sin17h9918c9ff950957a3E"(double %self) unnamed_addr #1 {
start:
  %0 = alloca [8 x i8], align 8
  %1 = call double @llvm.sin.f64(double %self)
  store double %1, ptr %0, align 8
  %_0 = load double, ptr %0, align 8
  ret double %_0
}

; std::f64::<impl f64>::tan
; Function Attrs: inlinehint nonlazybind uwtable
define internal double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$3tan17hd943e9287924a08cE"(double %self) unnamed_addr #1 {
start:
  %_0 = call double @tan(double %self) #7
  ret double %_0
}

; std::f64::<impl f64>::powi
; Function Attrs: inlinehint nonlazybind uwtable
define internal double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$4powi17h99757ea01c998592E"(double %self, i32 %n) unnamed_addr #1 {
start:
  %0 = alloca [8 x i8], align 8
  %1 = call double @llvm.powi.f64.i32(double %self, i32 %n)
  store double %1, ptr %0, align 8
  %_0 = load double, ptr %0, align 8
  ret double %_0
}

; std::f64::<impl f64>::sqrt
; Function Attrs: inlinehint nonlazybind uwtable
define internal double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$4sqrt17h23c9d61fbb1be709E"(double %self) unnamed_addr #1 {
start:
  %0 = alloca [8 x i8], align 8
  %1 = call double @llvm.sqrt.f64(double %self)
  store double %1, ptr %0, align 8
  %_0 = load double, ptr %0, align 8
  ret double %_0
}

; std::sys::backtrace::__rust_begin_short_backtrace
; Function Attrs: noinline nonlazybind uwtable
define internal void @_ZN3std3sys9backtrace28__rust_begin_short_backtrace17h1f0afb725b591c4bE(ptr %f) unnamed_addr #2 {
start:
; call core::ops::function::FnOnce::call_once
  call void @_ZN4core3ops8function6FnOnce9call_once17h2e1079d3bad1eda5E(ptr %f)
  call void asm sideeffect "", "~{memory}"(), !srcloc !4
  ret void
}

; core::fmt::Arguments::new_v1_formatted
; Function Attrs: inlinehint nonlazybind uwtable
define internal void @_ZN4core3fmt9Arguments16new_v1_formatted17had91ebb836c22ca2E(ptr sret([48 x i8]) align 8 %_0, ptr align 8 %pieces.0, i64 %pieces.1, ptr align 8 %args.0, i64 %args.1, ptr align 8 %fmt.0, i64 %fmt.1) unnamed_addr #1 {
start:
  %_5 = alloca [16 x i8], align 8
  store ptr %fmt.0, ptr %_5, align 8
  %0 = getelementptr inbounds i8, ptr %_5, i64 8
  store i64 %fmt.1, ptr %0, align 8
  store ptr %pieces.0, ptr %_0, align 8
  %1 = getelementptr inbounds i8, ptr %_0, i64 8
  store i64 %pieces.1, ptr %1, align 8
  %2 = load ptr, ptr %_5, align 8
  %3 = getelementptr inbounds i8, ptr %_5, i64 8
  %4 = load i64, ptr %3, align 8
  %5 = getelementptr inbounds i8, ptr %_0, i64 32
  store ptr %2, ptr %5, align 8
  %6 = getelementptr inbounds i8, ptr %5, i64 8
  store i64 %4, ptr %6, align 8
  %7 = getelementptr inbounds i8, ptr %_0, i64 16
  store ptr %args.0, ptr %7, align 8
  %8 = getelementptr inbounds i8, ptr %7, i64 8
  store i64 %args.1, ptr %8, align 8
  ret void
}

; core::ops::function::FnOnce::call_once{{vtable.shim}}
; Function Attrs: inlinehint nonlazybind uwtable
define internal i32 @"_ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17hebcb72203862eeacE"(ptr %_1) unnamed_addr #1 {
start:
  %_2 = alloca [0 x i8], align 1
  %0 = load ptr, ptr %_1, align 8
; call core::ops::function::FnOnce::call_once
  %_0 = call i32 @_ZN4core3ops8function6FnOnce9call_once17hdec86038d5dd4640E(ptr %0)
  ret i32 %_0
}

; core::ops::function::FnOnce::call_once
; Function Attrs: inlinehint nonlazybind uwtable
define internal void @_ZN4core3ops8function6FnOnce9call_once17h2e1079d3bad1eda5E(ptr %_1) unnamed_addr #1 {
start:
  %_2 = alloca [0 x i8], align 1
  call void %_1()
  ret void
}

; core::ops::function::FnOnce::call_once
; Function Attrs: inlinehint nonlazybind uwtable
define internal i32 @_ZN4core3ops8function6FnOnce9call_once17hdec86038d5dd4640E(ptr %0) unnamed_addr #1 personality ptr @rust_eh_personality {
start:
  %1 = alloca [16 x i8], align 8
  %_2 = alloca [0 x i8], align 1
  %_1 = alloca [8 x i8], align 8
  store ptr %0, ptr %_1, align 8
; invoke std::rt::lang_start::{{closure}}
  %_0 = invoke i32 @"_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17hdf7fc127bc7d2934E"(ptr align 8 %_1)
          to label %bb1 unwind label %cleanup

bb3:                                              ; preds = %cleanup
  %2 = load ptr, ptr %1, align 8
  %3 = getelementptr inbounds i8, ptr %1, i64 8
  %4 = load i32, ptr %3, align 8
  %5 = insertvalue { ptr, i32 } poison, ptr %2, 0
  %6 = insertvalue { ptr, i32 } %5, i32 %4, 1
  resume { ptr, i32 } %6

cleanup:                                          ; preds = %start
  %7 = landingpad { ptr, i32 }
          cleanup
  %8 = extractvalue { ptr, i32 } %7, 0
  %9 = extractvalue { ptr, i32 } %7, 1
  store ptr %8, ptr %1, align 8
  %10 = getelementptr inbounds i8, ptr %1, i64 8
  store i32 %9, ptr %10, align 8
  br label %bb3

bb1:                                              ; preds = %start
  ret i32 %_0
}

; core::ptr::drop_in_place<std::rt::lang_start<()>::{{closure}}>
; Function Attrs: inlinehint nonlazybind uwtable
define internal void @"_ZN4core3ptr85drop_in_place$LT$std..rt..lang_start$LT$$LP$$RP$$GT$..$u7b$$u7b$closure$u7d$$u7d$$GT$17h182f9019ce820e31E"(ptr align 8 %_1) unnamed_addr #1 {
start:
  ret void
}

; <() as std::process::Termination>::report
; Function Attrs: inlinehint nonlazybind uwtable
define internal i8 @"_ZN54_$LT$$LP$$RP$$u20$as$u20$std..process..Termination$GT$6report17ha54cc58c354e084aE"() unnamed_addr #1 {
start:
  ret i8 0
}

; calc::main
; Function Attrs: nonlazybind uwtable
define internal void @_ZN4calc4main17h68869e5eee45235fE() unnamed_addr #0 {
start:
  %_3.i = alloca [16 x i8], align 8
  %_49 = alloca [16 x i8], align 8
  %_48 = alloca [16 x i8], align 8
  %_47 = alloca [1 x i8], align 1
  %_46 = alloca [56 x i8], align 8
  %_45 = alloca [56 x i8], align 8
  %_41 = alloca [16 x i8], align 8
  %_40 = alloca [16 x i8], align 8
  %_35 = alloca [48 x i8], align 8
  %complex_calc = alloca [8 x i8], align 8
; call std::f64::<impl f64>::sin
  %sine1 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$3sin17h9918c9ff950957a3E"(double 0x3FF0C152382D7365)
; call std::f64::<impl f64>::cos
  %cosine1 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$3cos17hf21cbe24efdcf595E"(double 0x3FF0C152382D7365)
; call std::f64::<impl f64>::tan
  %tangent1 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$3tan17hd943e9287924a08cE"(double 0x3FF0C152382D7365)
; call std::f64::<impl f64>::cos
  %cosine2 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$3cos17hf21cbe24efdcf595E"(double 0x3FE921FB54442D18)
; call std::f64::<impl f64>::tan
  %tangent2 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$3tan17hd943e9287924a08cE"(double 0x3FE921FB54442D18)
; call std::f64::<impl f64>::sin
  %sine3 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$3sin17h9918c9ff950957a3E"(double 0x3FE0C152382D7365)
; call std::f64::<impl f64>::cos
  %cosine3 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$3cos17hf21cbe24efdcf595E"(double 0x3FE0C152382D7365)
; call std::f64::<impl f64>::tan
  %tangent3 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$3tan17hd943e9287924a08cE"(double 0x3FE0C152382D7365)
; call std::f64::<impl f64>::powi
  %exp_value1 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$4powi17h99757ea01c998592E"(double 0x4005BF0A8B145769, i32 2)
; call std::f64::<impl f64>::powi
  %exp_value2 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$4powi17h99757ea01c998592E"(double 0x4005BF0A8B145769, i32 3)
; call std::f64::<impl f64>::ln
  %log_value1 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$2ln17hf97ac581f2c93aa9E"(double 0x4005BF0A8B145769)
; call std::f64::<impl f64>::ln
  %log_value2 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$2ln17hf97ac581f2c93aa9E"(double 1.000000e+01)
; call std::f64::<impl f64>::sqrt
  %sqrt_value = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$4sqrt17h23c9d61fbb1be709E"(double 2.500000e+01)
  %_23 = fmul double %sine1, %cosine2
; call std::f64::<impl f64>::powi
  %_24 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$4powi17h99757ea01c998592E"(double %tangent1, i32 2)
  %_22 = fadd double %_23, %_24
  %_25 = fdiv double %exp_value1, 5.000000e+00
  %_21 = fsub double %_22, %_25
  %_26 = fmul double %log_value2, %sqrt_value
  %_20 = fadd double %_21, %_26
  %_29 = fadd double %cosine1, %sine3
  %_30 = fsub double %tangent2, %exp_value2
  %_28 = fmul double %_29, %_30
  %_27 = fadd double %_28, %log_value1
  %_19 = fdiv double %_20, %_27
  %_32 = fsub double %cosine3, %sine1
  %_31 = fmul double %sqrt_value, %_32
  %_18 = fadd double %_19, %_31
; call std::f64::<impl f64>::powi
  %_33 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$4powi17h99757ea01c998592E"(double %tangent3, i32 3)
  %0 = fsub double %_18, %_33
  store double %0, ptr %complex_calc, align 8
  store ptr %complex_calc, ptr %_3.i, align 8
  %1 = getelementptr inbounds i8, ptr %_3.i, i64 8
  store ptr @"_ZN4core3fmt5float52_$LT$impl$u20$core..fmt..Display$u20$for$u20$f64$GT$3fmt17hfe8946112811bdddE", ptr %1, align 8
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %_41, ptr align 8 %_3.i, i64 16, i1 false)
  %2 = getelementptr inbounds [1 x %"core::fmt::rt::Argument<'_>"], ptr %_40, i64 0, i64 0
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %2, ptr align 8 %_41, i64 16, i1 false)
  store i8 3, ptr %_47, align 1
  %3 = getelementptr inbounds i8, ptr %_48, i64 8
  store i64 6, ptr %3, align 8
  store i64 0, ptr %_48, align 8
  store i64 2, ptr %_49, align 8
  %4 = load i8, ptr %_47, align 1
  %5 = load i64, ptr %_48, align 8
  %6 = getelementptr inbounds i8, ptr %_48, i64 8
  %7 = load i64, ptr %6, align 8
  %8 = load i64, ptr %_49, align 8
  %9 = getelementptr inbounds i8, ptr %_49, i64 8
  %10 = load i64, ptr %9, align 8
  %11 = getelementptr inbounds i8, ptr %_46, i64 32
  store i64 0, ptr %11, align 8
  %12 = getelementptr inbounds i8, ptr %_46, i64 40
  store i32 32, ptr %12, align 8
  %13 = getelementptr inbounds i8, ptr %_46, i64 48
  store i8 %4, ptr %13, align 8
  %14 = getelementptr inbounds i8, ptr %_46, i64 44
  store i32 0, ptr %14, align 4
  store i64 %5, ptr %_46, align 8
  %15 = getelementptr inbounds i8, ptr %_46, i64 8
  store i64 %7, ptr %15, align 8
  %16 = getelementptr inbounds i8, ptr %_46, i64 16
  store i64 %8, ptr %16, align 8
  %17 = getelementptr inbounds i8, ptr %16, i64 8
  store i64 %10, ptr %17, align 8
  %18 = getelementptr inbounds [1 x %"core::fmt::rt::Placeholder"], ptr %_45, i64 0, i64 0
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %18, ptr align 8 %_46, i64 56, i1 false)
; call core::fmt::Arguments::new_v1_formatted
  call void @_ZN4core3fmt9Arguments16new_v1_formatted17had91ebb836c22ca2E(ptr sret([48 x i8]) align 8 %_35, ptr align 8 @alloc_309583548ca76d69388b7d3481d1c1c6, i64 2, ptr align 8 %_40, i64 1, ptr align 8 %_45, i64 1)
; call std::io::stdio::_print
  call void @_ZN3std2io5stdio6_print17h9d0e58a07bb0d1f1E(ptr align 8 %_35)
  ret void
}

; std::rt::lang_start_internal
; Function Attrs: nonlazybind uwtable
declare i64 @_ZN3std2rt19lang_start_internal17h712a1d4742291d0cE(ptr align 1, ptr align 8, i64, ptr, i8) unnamed_addr #0

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare double @llvm.log.f64(double) #3

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare double @llvm.cos.f64(double) #3

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare double @llvm.sin.f64(double) #3

; Function Attrs: nounwind nonlazybind uwtable
declare double @tan(double) unnamed_addr #4

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare double @llvm.powi.f64.i32(double, i32) #3

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare double @llvm.sqrt.f64(double) #3

; core::fmt::float::<impl core::fmt::Display for f64>::fmt
; Function Attrs: nonlazybind uwtable
declare zeroext i1 @"_ZN4core3fmt5float52_$LT$impl$u20$core..fmt..Display$u20$for$u20$f64$GT$3fmt17hfe8946112811bdddE"(ptr align 8, ptr align 8) unnamed_addr #0

; Function Attrs: nocallback nofree nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memcpy.p0.p0.i64(ptr noalias nocapture writeonly, ptr noalias nocapture readonly, i64, i1 immarg) #5

; Function Attrs: nounwind nonlazybind uwtable
declare i32 @rust_eh_personality(i32, i32, i64, ptr, ptr) unnamed_addr #4

; std::io::stdio::_print
; Function Attrs: nonlazybind uwtable
declare void @_ZN3std2io5stdio6_print17h9d0e58a07bb0d1f1E(ptr align 8) unnamed_addr #0

; Function Attrs: nonlazybind
define i32 @main(i32 %0, ptr %1) unnamed_addr #6 {
top:
  %2 = sext i32 %0 to i64
; call std::rt::lang_start
  %3 = call i64 @_ZN3std2rt10lang_start17h7eb188b87f8bdb39E(ptr @_ZN4calc4main17h68869e5eee45235fE, i64 %2, ptr %1, i8 0)
  %4 = trunc i64 %3 to i32
  ret i32 %4
}

attributes #0 = { nonlazybind uwtable "probe-stack"="inline-asm" "target-cpu"="x86-64" }
attributes #1 = { inlinehint nonlazybind uwtable "probe-stack"="inline-asm" "target-cpu"="x86-64" }
attributes #2 = { noinline nonlazybind uwtable "probe-stack"="inline-asm" "target-cpu"="x86-64" }
attributes #3 = { nocallback nofree nosync nounwind speculatable willreturn memory(none) }
attributes #4 = { nounwind nonlazybind uwtable "probe-stack"="inline-asm" "target-cpu"="x86-64" }
attributes #5 = { nocallback nofree nounwind willreturn memory(argmem: readwrite) }
attributes #6 = { nonlazybind "target-cpu"="x86-64" }
attributes #7 = { nounwind }

!llvm.module.flags = !{!0, !1, !2}
!llvm.ident = !{!3}

!0 = !{i32 8, !"PIC Level", i32 2}
!1 = !{i32 7, !"PIE Level", i32 2}
!2 = !{i32 2, !"RtLibUseGOT", i32 1}
!3 = !{!"rustc version 1.84.1 (e71f9a9a9 2025-01-27)"}
!4 = !{i32 2054354}
