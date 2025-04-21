	.text
	.file	"llvm-link"
	.globl	main                            # -- Begin function main
	.p2align	4, 0x90
	.type	main,@function
main:                                   # @main
	.cfi_startproc
# %bb.0:                                # %entry
	pushq	%rax
	.cfi_def_cfa_offset 16
	movq	str@GOTPCREL(%rip), %rdi
	callq	printf@PLT
	xorl	%eax, %eax
	popq	%rcx
	.cfi_def_cfa_offset 8
	retq
.Lfunc_end0:
	.size	main, .Lfunc_end0-main
	.cfi_endproc
                                        # -- End function
	.globl	print_hello                     # -- Begin function print_hello
	.p2align	4, 0x90
	.type	print_hello,@function
print_hello:                            # @print_hello
	.cfi_startproc
# %bb.0:                                # %entry
	movq	str@GOTPCREL(%rip), %rdi
	jmp	printf@PLT                      # TAILCALL
.Lfunc_end1:
	.size	print_hello, .Lfunc_end1-print_hello
	.cfi_endproc
                                        # -- End function
	.type	str,@object                     # @str
	.section	.rodata,"a",@progbits
	.globl	str
str:
	.ascii	"Hello, world!\n"
	.size	str, 14

	.section	".note.GNU-stack","",@progbits
