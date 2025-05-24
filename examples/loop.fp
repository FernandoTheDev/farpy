import "io"

new mut i: i32 = 0

while !(i == 10) {
    i = i + 1
    for 0..=100 -> j {
        if j % 2 == 0 {
            printf("j = %d\n", j)
        }
    }
}
    
printf("%d\n", i)
