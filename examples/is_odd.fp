import "io"

fn isOdd(n: int): bool {
    return n % 2 != 0
}

fn isEven(n: int): bool {
    return !isOdd(n)
}

printf("%d %d\n", (int)isOdd(3), (int)isOdd(2))
new x = -2

if isOdd(x) {
    printf("it's odd\n")
} else {
    printf("it's even\n")
}

printf("%d %d\n", (int)(bool)0, (int)(bool)10)
