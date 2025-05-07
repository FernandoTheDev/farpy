/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
#include <stdio.h>
// #include <string.h>
// #include <stdlib.h>

void print(char *message)
{
    printf("%s", message);
}

// char *read_line()
// {
//     size_t buffer_size = 128;
//     size_t len = 0;
//     char *buffer = malloc(buffer_size);
//     if (buffer == NULL)
//     {
//         perror("malloc failed") return NULL;
//     }
//     int c;
//     while ((c = getchar()) != '\n' && c != EOF)
//     {
//         if (len + 1 >= buffer_size)
//         {
//             buffer_size *= 2;
//             char *new_b = realloc(buffer, buffer_size);
//             if (new_b == NULL)
//             {
//                 perror("realloc failed") return NULL;
//             }
//             buffer = new_b;
//         }
//         buffer[len++] = (char)c;
//     }
//     buffer[len] = '\0';
//     return buffer;
// }
