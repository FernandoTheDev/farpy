// TODO

import "io"

fn sum(x: *int, y: *int): int {
    return x + y
}

new o: int = 60
new z: int = 9

printf("%d %d %d %d\n", sum(&o, &z))
