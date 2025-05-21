import "io"

fn show_b(n: binary) {
    printf("n = %d\n", n)
}

new b: binary = 0b1000101

show_b(b)
