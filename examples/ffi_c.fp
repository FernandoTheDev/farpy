import "io"

fn farpy(msg: string) {
    printf("Hello %s\n", msg)
}

extern "C" start
    int sum(int x, int y) {
        printf("C: Hello\n");
        return x + y;
    }

    void hello(const char *n) {
        farpy(n);
    }
end

new x: i32 = sum(60, 9)
printf("Calc = %d\n", x)

hello("Fernando")
