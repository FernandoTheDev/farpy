import "io"

extern "C" start
    int sum(int x, int y) {
        printf("C: Hello\n");
        return x + y;
    }

    void hello(const char *n) {
        printf("Hello %s\n", n);
    }
end

int x = sum(60, 9)
printf("Calc = %d\n", x)

hello("Fernando")
