#ifndef AST_HPP
#define AST_HPP

#include <memory>
#include <string>
#include <nlohmann/json.hpp>
#include "../../lexer/lexer.hpp"// Supondo que "lexer.hpp" define o tipo Loc

using json = nlohmann::json;

enum class NodeType
{
    Number,
    String,
    Identifier,
    Binary,
};

struct ASTNode
{
    virtual ~ASTNode() = default;

    NodeType kind;
    std::string type;
    Loc loc;

    // Método virtual para converter o nó em JSON
    virtual json toJson() const = 0;
};

struct NumberNode : public ASTNode
{
    double value;

    NumberNode(double value, Loc l)
        : value(value)
    {
        kind = NodeType::Number;
        type = "number";
        loc = l;
    }

    json toJson() const override
    {
        json j;
        j["kind"] = type;
        j["value"] = value;
        j["loc"] = {
            {"line", loc.line},
            {"start_column", loc.start_column},
            {"end_column", loc.end_column},
        };
        return j;
    }
};

struct StringNode : public ASTNode
{
    std::string value;

    StringNode(const std::string &value, Loc l)
        : value(value)
    {
        kind = NodeType::String;
        type = "string";
        loc = l;
    }

    json toJson() const override
    {
        json j;
        j["kind"] = kind;
        j["value"] = value;
        j["loc"] = {
            {"line", loc.line},
            {"start_column", loc.start_column},
            {"end_column", loc.end_column},
            };
        return j;
    }
};

struct IdentifierNode : public ASTNode
{
    std::string value;

    IdentifierNode(const std::string &value, Loc l)
        : value(value)
    {
        kind = NodeType::Identifier;
        type = "identifier";
        loc = l;
    }

    json toJson() const override
    {
        json j;
        j["kind"] = type;
        j["value"] = value;
        j["loc"] = {
            {"line", loc.line},
            {"start_column", loc.start_column},
            {"end_column", loc.end_column},
            };
        return j;
    }
};

struct BinaryOpNode : public ASTNode
{
    std::string op;
    std::shared_ptr<ASTNode> left;
    std::shared_ptr<ASTNode> right;

    BinaryOpNode(const std::string &op, std::shared_ptr<ASTNode> left, std::shared_ptr<ASTNode> right, Loc l)
        : op(op), left(std::move(left)), right(std::move(right))
    {
        kind = NodeType::Binary;
        type = "binaryOp";
        loc = l;
    }

    json toJson() const override
    {
        json j;
        j["kind"] = type;
        j["operator"] = op;
        j["loc"] = {
            {"line", loc.line},
            {"start_column", loc.start_column},
            {"end_column", loc.end_column},
        };
        // Conversão recursiva dos nós filhos
        j["left"] = left ? left->toJson() : json(nullptr);
        j["right"] = right ? right->toJson() : json(nullptr);
        return j;
    }
};

#endif // AST_HPP
