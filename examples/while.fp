import "io"

new mut i: i32 = 1

while !(i >= 100) {
    printf("i = %d\n", i)
    i = i + 1 // i++
}
