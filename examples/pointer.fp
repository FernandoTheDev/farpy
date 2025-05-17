import "io"

new x: int = 100
new y: *int = &x
new z: *int = y

printf("%d %d %d\n", x, *y, *z)
