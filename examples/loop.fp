import "io"

new mut i: i32 = 0

while !(i == 10) {
    for 0..=100 -> j {
        if j % 2 == 0 {
            printf("j = %d\n", j)
        }
    }
    i++
}
    
printf("%d\n", i)
