; External Declarations
source_filename = "examples/if.fp"
target triple = "x86_64-redhat-linux-gnu"

declare i32 @printf(i8*, ...)

; Global Declarations
@.str0 = private constant [11 x i8] c"Before if
\00"
@.str1 = private constant [4 x i8] c"oi
\00"
@.str2 = private constant [8 x i8] c"second
\00"
@.str3 = private constant [8 x i8] c"h4ck3r
\00"
@.str4 = private constant [6 x i8] c"else
\00"
@.str5 = private constant [10 x i8] c"After if
\00"

define i32 @main() {
entry:
  %farpy_0 = getelementptr inbounds [11 x i8], [11 x i8]* @.str0, i32 0, i32 0
  %farpy_1 = call i32 @printf(i8* %farpy_0)
  %farpy_2 = icmp ne i32 10, 10
  br i1 %farpy_2, label %if_label0, label %else_label1
if_label0:
  %farpy_3 = getelementptr inbounds [4 x i8], [4 x i8]* @.str1, i32 0, i32 0
  %farpy_4 = call i32 @printf(i8* %farpy_3)
  br label %continue_label2
else_label1:
  %farpy_5 = icmp sgt i32 1, 1
  br i1 %farpy_5, label %if_label3, label %else_label4
continue_label2:
  %farpy_13 = getelementptr inbounds [10 x i8], [10 x i8]* @.str5, i32 0, i32 0
  %farpy_14 = call i32 @printf(i8* %farpy_13)
  ret i32 0
if_label3:
  %farpy_6 = getelementptr inbounds [8 x i8], [8 x i8]* @.str2, i32 0, i32 0
  %farpy_7 = call i32 @printf(i8* %farpy_6)
  br label %continue_label2
else_label4:
  %farpy_8 = icmp sle i32 9, 9
  br i1 %farpy_8, label %if_label5, label %else_label6
if_label5:
  %farpy_9 = getelementptr inbounds [8 x i8], [8 x i8]* @.str3, i32 0, i32 0
  %farpy_10 = call i32 @printf(i8* %farpy_9)
  br label %continue_label2
else_label6:
  %farpy_11 = getelementptr inbounds [6 x i8], [6 x i8]* @.str4, i32 0, i32 0
  %farpy_12 = call i32 @printf(i8* %farpy_11)
  br label %continue_label2
}