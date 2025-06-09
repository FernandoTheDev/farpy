// TODO
import "io"

new x = 100
new y: *int = &x

printf("%d\n", x) // 100

*y = 1 // pointer assignment

printf("%d\n", x) // 1

