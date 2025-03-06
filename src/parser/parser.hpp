#ifndef PARSER_HPP
#define PARSER_HPP

#include "./ast/ast.hpp"

class Parser
{
public:
    Parser(const std::vector<Token> &tokens) : tokens(tokens), pos(0) {}
    std::vector<std::shared_ptr<ASTNode>> parse();

private:
    const std::vector<Token> &tokens;
    std::vector<std::shared_ptr<ASTNode>> statements;
    size_t pos;

    std::shared_ptr<ASTNode> expression(int rbp = 0);
    bool isAtEnd();
    const Token &peek() const;
    const Token &advance();
    std::shared_ptr<ASTNode> nud(const Token &token);
    std::shared_ptr<ASTNode> led(std::shared_ptr<ASTNode> left, const Token &token);
    int getPrecedence(TokenType type);
};

#endif
