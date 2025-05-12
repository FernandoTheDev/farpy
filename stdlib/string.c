#include <stdio.h>
#include <string.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdlib.h>
#include <limits.h>

bool str_equals(const char *a, const char *b)
{
    return strcmp(a, b) == 0;
}

size_t str_length(const char *s)
{
    return strlen(s);
}

void str_copy(char *dest, const char *src, size_t max_len)
{
    if (max_len == 0)
        return;
    strncpy(dest, src, max_len - 1);
    dest[max_len - 1] = '\0';
}

void str_concat(char *dest, const char *src, size_t max_len)
{
    size_t len_dest = strlen(dest);
    if (len_dest >= max_len - 1)
        return;
    strncat(dest, src, max_len - len_dest - 1);
}

bool str_starts_with(const char *str, const char *prefix)
{
    size_t len_prefix = strlen(prefix);
    return strncmp(str, prefix, len_prefix) == 0;
}

bool str_ends_with(const char *str, const char *suffix)
{
    size_t len_str = strlen(str);
    size_t len_suffix = strlen(suffix);
    if (len_suffix > len_str)
        return false;
    return strcmp(str + len_str - len_suffix, suffix) == 0;
}

char *str_slice(const char *str, size_t start, size_t end)
{
    // Validate parameters
    size_t str_len = strlen(str);

    // Handle out of bounds indices
    if (start >= str_len)
    {
        // Return empty string if start is beyond string length
        char *result = (char *)malloc(1);
        if (result != NULL)
        {
            result[0] = '\0';
        }
        return result;
    }

    // Clamp end to string length if it's beyond
    if (end > str_len)
    {
        end = str_len;
    }

    // Handle invalid range
    if (end <= start)
    {
        // Return empty string for invalid range
        char *result = (char *)malloc(1);
        if (result != NULL)
        {
            result[0] = '\0';
        }
        return result;
    }

    // Calculate substring length
    size_t slice_len = end - start;

    // Allocate memory for the new string (+1 for null terminator)
    char *result = (char *)malloc(slice_len + 1);
    if (result == NULL)
    {
        // Handle memory allocation failure
        perror("Memory allocation failed in str_slice");
        exit(EXIT_FAILURE);
    }

    // Copy the substring
    memcpy(result, str + start, slice_len);

    // Add null terminator
    result[slice_len] = '\0';

    return result;
}

int str_to_int(const char *str)
{
    // Skip leading whitespace
    while (*str == ' ' || *str == '\t' || *str == '\n')
        str++;

    // Handle empty string
    if (*str == '\0')
        return 0;

    // Handle sign
    int sign = 1;
    if (*str == '-')
    {
        sign = -1;
        str++;
    }
    else if (*str == '+')
    {
        str++;
    }

    // Process digits
    int result = 0;
    while (*str >= '0' && *str <= '9')
    {
        // Check for overflow
        if (result > INT_MAX / 10 ||
            (result == INT_MAX / 10 && *str - '0' > INT_MAX % 10))
        {
            // Handle overflow
            return sign == 1 ? INT_MAX : INT_MIN;
        }

        // Update result
        result = result * 10 + (*str - '0');
        str++;
    }

    return result * sign;
}
