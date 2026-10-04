"""
WeighReport Engine - Sandboxed AST Decimal Evaluator
Evaluates declarative rule expressions without arbitrary code execution.
"""
import ast
from decimal import Decimal
from typing import Any, Dict

SAFE_NODES = (
    ast.Expression, ast.BoolOp, ast.BinOp, ast.UnaryOp, ast.Compare,
    ast.IfExp, ast.Call, ast.Name, ast.Attribute, ast.Subscript,
    ast.Constant, ast.List, ast.Tuple, ast.Load,
    ast.And, ast.Or, ast.Not, ast.Add, ast.Sub, ast.Mult, ast.Div,
    ast.Mod, ast.USub, ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.Eq, ast.NotEq
)

def evaluate_ast(node: ast.AST, context: Dict[str, Any]) -> Any:
    """Recursively evaluates safe AST nodes with Decimal arithmetic."""
    if isinstance(node, ast.Expression):
        return evaluate_ast(node.body, context)

    elif isinstance(node, ast.Constant):
        val = node.value
        if isinstance(val, (int, float)):
            return Decimal(str(val))
        return val

    elif isinstance(node, ast.Name):
        if node.id in context:
            return context[node.id]
        if node.id == "true":
            return True
        if node.id == "false":
            return False
        if node.id == "null" or node.id == "None":
            return None
        raise NameError(f"Name '{node.id}' is not defined in expression context")

    elif isinstance(node, ast.BinOp):
        left = evaluate_ast(node.left, context)
        right = evaluate_ast(node.right, context)
        if isinstance(node.op, ast.Add):
            return left + right
        elif isinstance(node.op, ast.Sub):
            return left - right
        elif isinstance(node.op, ast.Mult):
            return left * right
        elif isinstance(node.op, ast.Div):
            return left / right
        elif isinstance(node.op, ast.Mod):
            return left % right
        raise NotImplementedError(f"Binary operator {type(node.op)} not supported")

    elif isinstance(node, ast.UnaryOp):
        operand = evaluate_ast(node.operand, context)
        if isinstance(node.op, ast.USub):
            return -operand
        elif isinstance(node.op, ast.Not):
            return not operand
        raise NotImplementedError(f"Unary operator {type(node.op)} not supported")

    elif isinstance(node, ast.Compare):
        left = evaluate_ast(node.left, context)
        for op, comparator in zip(node.ops, node.comparators):
            right = evaluate_ast(comparator, context)
            if isinstance(op, ast.Eq):
                if not (left == right): return False
            elif isinstance(op, ast.NotEq):
                if not (left != right): return False
            elif isinstance(op, ast.Lt):
                if not (left < right): return False
            elif isinstance(op, ast.LtE):
                if not (left <= right): return False
            elif isinstance(op, ast.Gt):
                if not (left > right): return False
            elif isinstance(op, ast.GtE):
                if not (left >= right): return False
            else:
                raise NotImplementedError(f"Comparison operator {type(op)} not supported")
            left = right
        return True

    elif isinstance(node, ast.BoolOp):
        if isinstance(node.op, ast.And):
            for v in node.values:
                if not evaluate_ast(v, context):
                    return False
            return True
        elif isinstance(node.op, ast.Or):
            for v in node.values:
                if evaluate_ast(v, context):
                    return True
            return False

    elif isinstance(node, ast.IfExp):
        test_val = evaluate_ast(node.test, context)
        if test_val:
            return evaluate_ast(node.body, context)
        else:
            return evaluate_ast(node.orelse, context)

    elif isinstance(node, ast.Subscript):
        val = evaluate_ast(node.value, context)
        sub = evaluate_ast(node.slice, context)
        return val[sub]

    elif isinstance(node, ast.Attribute):
        val = evaluate_ast(node.value, context)
        if node.attr.startswith("_"):
            raise ValueError("Dunder and private attributes forbidden")
        if isinstance(val, dict):
            return val.get(node.attr)
        return getattr(val, node.attr)

    elif isinstance(node, ast.Call):
        func_name = getattr(node.func, "id", None)
        args = [evaluate_ast(a, context) for a in node.args]
        
        SAFE_FUNCS = {
            "abs": abs,
            "min": min,
            "max": max,
            "sum": sum,
            "len": len,
            "all": all,
            "any": any,
            "avg": lambda xs: sum(xs) / Decimal(str(len(xs))),
            "range_of": lambda xs: max(xs) - min(xs)
        }
        if func_name in SAFE_FUNCS:
            return SAFE_FUNCS[func_name](*args)
        raise ValueError(f"Function call '{func_name}' not allowed")

    raise TypeError(f"AST node {type(node)} is not supported in rule expressions")

def safe_eval(expr: str, context: Dict[str, Any]) -> Any:
    """Parse and safely evaluate a Python-style expression with Decimal support."""
    tree = ast.parse(expr.strip(), mode="eval")
    # Verify all nodes are allowed
    for n in ast.walk(tree):
        if not isinstance(n, SAFE_NODES):
            raise ValueError(f"Disallowed expression node: {type(n).__name__}")
    return evaluate_ast(tree, context)
