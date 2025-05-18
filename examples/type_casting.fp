import "io"

new x: int = 10
new y: double = (double) x

printf("%d %f\n", x, y)

// TODO
// new y_p: *int = &y
// new x_p: *double = (*double) y_p

// printf("%d %f\n", *y_p, *x_p)
