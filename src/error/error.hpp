#ifndef ERROR_HPP
#define ERROR_HPP

#include "../lexer/lexer.hpp"
#include <string>

class Error
{
public:
    static void errorMessage(const std::string &local, const std::string &message, const Loc &loc, std::string &filename, std::string& Contents);
};

#endif
