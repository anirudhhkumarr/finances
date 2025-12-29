/**
 * Evaluates a mathematical expression string safely.
 * Supports basic operators: +, -, *, /, (), and decimal numbers.
 * Ignores non-math characters except valid operators.
 * 
 * @param {string|number} expr - The expression to evaluate (e.g., "=100+50" or "100")
 * @returns {number} The evaluated result, or 0 if invalid.
 */
export const evaluateExpression = (expr) => {
    if (expr === '' || expr === null || expr === undefined) return 0;

    // Support implicit formulas (no '=' needed) but strip it if present
    const cleanExpr = expr.toString().startsWith('=') ? expr.substring(1) : expr;

    try {
        // Safe parser: allow numbers, operators, parens, decimal
        // This regex allows digits, dot, plus, minus, star, slash, parens
        const sanitized = cleanExpr.toString().replace(/[^0-9+\-*/().]/g, '');

        if (!sanitized) return parseFloat(cleanExpr) || 0;

        // Evaluate using Function constructor (safer than eval, still powerful)
        // We only allow specific chars, so injection risk is minimal.
        const result = new Function('return ' + sanitized)();
        return isFinite(result) ? result : 0;
    } catch (e) {
        console.error("Formula parse error", e);
        return 0;
    }
};
