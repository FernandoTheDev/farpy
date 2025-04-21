; ModuleID = 'stdlib/io.c'
source_filename = "stdlib/io.c"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-i128:128-f80:128-n8:16:32:64-S128"
target triple = "x86_64-redhat-linux-gnu"

@.str = private unnamed_addr constant [3 x i8] c"%s\00", align 1, !dbg !0
@stdin = external dso_local global ptr, align 8

; Function Attrs: noinline nounwind optnone uwtable
define dso_local void @print(ptr noundef %0) #0 !dbg !15 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
  call void @llvm.dbg.declare(metadata ptr %2, metadata !20, metadata !DIExpression()), !dbg !21
  %3 = load ptr, ptr %2, align 8, !dbg !22
  %4 = call i32 (ptr, ...) @printf(ptr noundef @.str, ptr noundef %3), !dbg !23
  ret void, !dbg !24
}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare void @llvm.dbg.declare(metadata, metadata, metadata) #1

declare dso_local i32 @printf(ptr noundef, ...) #2

; Function Attrs: noinline nounwind optnone uwtable
define dso_local ptr @read_line() #0 !dbg !25 {
  %1 = alloca ptr, align 8
  %2 = alloca i64, align 8
  call void @llvm.dbg.declare(metadata ptr %1, metadata !28, metadata !DIExpression()), !dbg !29
  store ptr null, ptr %1, align 8, !dbg !29
  call void @llvm.dbg.declare(metadata ptr %2, metadata !30, metadata !DIExpression()), !dbg !34
  store i64 0, ptr %2, align 8, !dbg !34
  %3 = load ptr, ptr @stdin, align 8, !dbg !35
  %4 = call i64 @getline(ptr noundef %1, ptr noundef %2, ptr noundef %3), !dbg !36
  %5 = load ptr, ptr %1, align 8, !dbg !37
  ret ptr %5, !dbg !38
}

declare dso_local i64 @getline(ptr noundef, ptr noundef, ptr noundef) #2

attributes #0 = { noinline nounwind optnone uwtable "frame-pointer"="all" "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }
attributes #1 = { nocallback nofree nosync nounwind speculatable willreturn memory(none) }
attributes #2 = { "frame-pointer"="all" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }

!llvm.dbg.cu = !{!7}
!llvm.module.flags = !{!9, !10, !11, !12, !13}
!llvm.ident = !{!14}

!0 = !DIGlobalVariableExpression(var: !1, expr: !DIExpression())
!1 = distinct !DIGlobalVariable(scope: null, file: !2, line: 5, type: !3, isLocal: true, isDefinition: true)
!2 = !DIFile(filename: "stdlib/io.c", directory: "/home/fernandodev/farpy", checksumkind: CSK_MD5, checksum: "329d54fe76e04c37244778b006a1243f")
!3 = !DICompositeType(tag: DW_TAG_array_type, baseType: !4, size: 24, elements: !5)
!4 = !DIBasicType(name: "char", size: 8, encoding: DW_ATE_signed_char)
!5 = !{!6}
!6 = !DISubrange(count: 3)
!7 = distinct !DICompileUnit(language: DW_LANG_C11, file: !2, producer: "clang version 18.1.8 (Fedora 18.1.8-2.fc40)", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug, globals: !8, splitDebugInlining: false, nameTableKind: None)
!8 = !{!0}
!9 = !{i32 7, !"Dwarf Version", i32 5}
!10 = !{i32 2, !"Debug Info Version", i32 3}
!11 = !{i32 1, !"wchar_size", i32 4}
!12 = !{i32 7, !"uwtable", i32 2}
!13 = !{i32 7, !"frame-pointer", i32 2}
!14 = !{!"clang version 18.1.8 (Fedora 18.1.8-2.fc40)"}
!15 = distinct !DISubprogram(name: "print", scope: !2, file: !2, line: 3, type: !16, scopeLine: 4, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !7, retainedNodes: !19)
!16 = !DISubroutineType(types: !17)
!17 = !{null, !18}
!18 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !4, size: 64)
!19 = !{}
!20 = !DILocalVariable(name: "message", arg: 1, scope: !15, file: !2, line: 3, type: !18)
!21 = !DILocation(line: 3, column: 18, scope: !15)
!22 = !DILocation(line: 5, column: 18, scope: !15)
!23 = !DILocation(line: 5, column: 5, scope: !15)
!24 = !DILocation(line: 6, column: 1, scope: !15)
!25 = distinct !DISubprogram(name: "read_line", scope: !2, file: !2, line: 8, type: !26, scopeLine: 9, spFlags: DISPFlagDefinition, unit: !7, retainedNodes: !19)
!26 = !DISubroutineType(types: !27)
!27 = !{!18}
!28 = !DILocalVariable(name: "line", scope: !25, file: !2, line: 10, type: !18)
!29 = !DILocation(line: 10, column: 11, scope: !25)
!30 = !DILocalVariable(name: "len", scope: !25, file: !2, line: 11, type: !31)
!31 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_t", file: !32, line: 18, baseType: !33)
!32 = !DIFile(filename: "/usr/bin/../lib/clang/18/include/__stddef_size_t.h", directory: "", checksumkind: CSK_MD5, checksum: "2c44e821a2b1951cde2eb0fb2e656867")
!33 = !DIBasicType(name: "unsigned long", size: 64, encoding: DW_ATE_unsigned)
!34 = !DILocation(line: 11, column: 12, scope: !25)
!35 = !DILocation(line: 12, column: 26, scope: !25)
!36 = !DILocation(line: 12, column: 5, scope: !25)
!37 = !DILocation(line: 13, column: 12, scope: !25)
!38 = !DILocation(line: 13, column: 5, scope: !25)
