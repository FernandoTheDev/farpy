#ifndef ERROR_HPP
#define ERROR_HPP

#include "lexer.hpp"

class Error
{
public:
    static void errorMessage(const std::string &local, const std::string &message, const Loc &loc);
};

#endif
