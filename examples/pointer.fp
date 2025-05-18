import "io"

extern "C" start
    int* pointer(int* z) {
        printf("C: %d\n", *z);

        static int x = 10;
        return &x;
    }
end

new x: int = 100
new y: *int = &x
new z: **int = &y

printf("%d\n", *pointer(y))
printf("%d %d %d\n", x, *y, **z)

