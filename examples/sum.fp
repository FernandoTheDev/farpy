import "io"

/*fn hello() {
    print("Hello\n")
}*/

fn sum(x: int, y: int): int {
    return x + y
}

new x = 2 ** 2
new y = 1999

new z = sum(x, y)
printf("z = %d\n", z)
