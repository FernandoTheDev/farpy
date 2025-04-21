#include <stdio.h>

void print(char *message)
{
    printf("%s", message);
}

char *read_line()
{
    char *line = NULL;
    size_t len = 0;
    getline(&line, &len, stdin);
    return line;
}
