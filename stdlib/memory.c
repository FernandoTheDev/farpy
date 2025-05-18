
/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
#include <string.h>
#include <stdlib.h>

void *mnew(char *type)
{
    if (type != NULL)
    {
        if (strcmp(type, "int") == 0)
        {
            return malloc(sizeof(int));
        }
        else if (strcmp(type, "float") == 0)
        {
            return malloc(sizeof(float));
        }
        else if (strcmp(type, "double") == 0)
        {
            return malloc(sizeof(double));
        }
    }

    // Fallback
    return malloc(sizeof(void *));
}
