import "io"
import "memory"

// sizet(20) = sizeof(int)
// sizet(20.1) = sizeof(double)
// sizet("") = sizeof(char*)

new buffer: *int = (*int) 10

printf("Buffer: %d\n", *buffer)

free(buffer)
